
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (allowedRoles?.length && !authService.hasRole(...allowedRoles)) {
    return router.createUrlTree(['/']);
  }

  return true;
};
