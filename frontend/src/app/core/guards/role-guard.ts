
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const role = authService.getRole()
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const allowedRoles: string[] = route.data['roles'] ?? [];

  const hasPermission = allowedRoles.some((allowedRole) => {
    const normalizedAllowedRole = allowedRole
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (normalizedAllowedRole === 'administrador') {
      return role === 'administrador' ||
        role === 'administrador de edificio';
    }

    return role === normalizedAllowedRole;
  });

  if (!hasPermission) {
    if (role === 'inquilino') {
      return router.createUrlTree(['/inquilino/incidencias']);
    }

    if (
      role === 'administrador' ||
      role === 'administrador de edificio'
    ) {
      return router.createUrlTree(['/administrador/incidencias']);
    }

    return router.createUrlTree(['/login']);
  }

  return true;
};
