import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth';
import { environment } from '../../../environments/environment';

function ownApiUrl(url: string): URL | null {
  try {
    const base = new URL(environment.apiUrl);
    const target = new URL(url, base);
    const basePath = base.pathname.replace(/\/$/, '');
    const sameApiPath = !basePath
      || target.pathname === basePath
      || target.pathname.startsWith(`${basePath}/`);
    return target.origin === base.origin && sameApiPath ? target : null;
  } catch {
    return null;
  }
}

function isAuthEndpoint(pathname: string): boolean {
  return /\/auth\/(login|refresh|logout)\/?$/i.test(pathname);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const apiUrl = ownApiUrl(req.url);
  if (!apiUrl || isAuthEndpoint(apiUrl.pathname)) return next(req);

  const token = authService.getAccessToken();

  if (!token) {
    return next(req);
  }

  const session = authService.captureSession();
  const authenticatedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)
        || error.status !== 401
        || !authService.isCurrentSession(session)) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap(() => {
          if (!authService.isCurrentSession(session)) return throwError(() => error);
          const refreshedToken = authService.getAccessToken();
          if (!refreshedToken) return throwError(() => error);

          const retry = req.clone({ setHeaders: { Authorization: `Bearer ${refreshedToken}` } });
          return next(retry).pipe(
            catchError((retryError: unknown) => {
              if (retryError instanceof HttpErrorResponse
                && retryError.status === 401
                && authService.isCurrentSession(session)) {
                authService.clearSession();
              }
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
