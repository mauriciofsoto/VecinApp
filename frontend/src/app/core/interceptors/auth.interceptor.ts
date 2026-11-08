import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  finalize,
  Observable,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { AuthResponse } from '../models/auth';
import { AuthService } from '../services/auth';

// Evita que varias peticiones que reciben 401 disparen refreshes en paralelo.
let refreshInFlight$: Observable<AuthResponse> | null = null;

function refrescarSesion(authService: AuthService): Observable<AuthResponse> {
  if (!refreshInFlight$) {
    refreshInFlight$ = authService.refresh().pipe(
      finalize(() => {
        refreshInFlight$ = null;
      }),
      shareReplay(1),
    );
  }

  return refreshInFlight$;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();

  const authenticatedRequest = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const esPeticionDeAutenticacion = req.url.includes('/auth/');

      if (
        error.status !== 401 ||
        esPeticionDeAutenticacion ||
        !authService.getAccessToken()
      ) {
        return throwError(() => error);
      }

      return refrescarSesion(authService).pipe(
        catchError((refreshError) => {
          authService.clearSession();
          void router.navigate(['/login'], {
            queryParams: { returnUrl: router.url },
          });

          return throwError(() => refreshError);
        }),
        switchMap((response) => {
          const retriedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${response.accessToken}`,
            },
          });

          return next(retriedRequest);
        }),
      );
    }),
  );
};
