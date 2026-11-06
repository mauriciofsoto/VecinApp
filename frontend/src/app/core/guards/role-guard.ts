
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const roles = route.data['roles'] as string[] | undefined;

  if (roles?.length && !auth.hasRole(...roles)) {
    return router.createUrlTree(['/']);
  }

  return true;
};
