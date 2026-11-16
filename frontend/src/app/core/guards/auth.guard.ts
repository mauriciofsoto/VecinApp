import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export function getDashboardUrl(authService: AuthService): string {
  if (authService.hasRole('Administrador', 'SuperAdministrador')) {
    return '/admin-dashboard';
  }

  if (authService.hasRole('Portero')) {
    return '/porteria-dashboard';
  }

  if (authService.hasRole('Inquilino', 'Propietario')) {
    return '/user-dashboard';
  }

  return '/login';
}

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
    return router.parseUrl(getDashboardUrl(authService));
  }

  return true;
};

export const incidenciasDerivadasGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (!authService.isAuthenticated() || !user) {
    return router.parseUrl('/login');
  }

  if (user.rol === 'Portero' || user.rol === 'Propietario') {
    return true;
  }

  return router.parseUrl(getDashboardUrl(authService));
};

export const dashboardRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/login');
  }

  return router.parseUrl(getDashboardUrl(authService));
};
