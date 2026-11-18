import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { PerfilUsuario } from '../../features/profile/models/perfil-usuario';
import { PerfilService } from '../../features/profile/services/perfil.service';
import { AuthService } from '../services/auth';

type OwnerAccess = 'resident' | 'community' | 'rental';

function hasConfirmedRental(profile: PerfilUsuario): boolean {
  return profile.unidadesVinculadas.some(unit => unit.tipoRelacion === 'Propietario');
}

export function ownerHasAccess(profile: PerfilUsuario, access: OwnerAccess): boolean {
  switch (access) {
    case 'resident': return profile.viveEnEdificio === true;
    case 'community': return true;
    case 'rental': return hasConfirmedRental(profile);
  }
}

export function getDashboardUrl(authService: AuthService, profile?: PerfilUsuario): string {
  if (authService.hasRole('SuperAdministrador')) return '/admin/edificios';
  if (authService.hasRole('Administrador')) return '/admin-dashboard';
  if (authService.hasRole('Portero')) return '/porteria-dashboard';
  if (authService.hasRole('Inquilino')) return '/user-dashboard';
  if (authService.hasRole('Propietario') && profile) {
    return profile.viveEnEdificio === true ? '/user-dashboard' : '/comunidad';
  }
  // Compatibilidad para flujos que todavía no tienen el perfil cargado.
  // Las rutas protegidas vuelven a comprobar el acceso contra PerfilService.
  if (authService.hasRole('Propietario')) return '/user-dashboard';
  return '/login';
}

function ownerDestination(authService: AuthService, router: Router) {
  return inject(PerfilService).obtenerMiPerfil().pipe(
    map(profile => router.parseUrl(getDashboardUrl(authService, profile))),
    catchError(() => of(router.parseUrl('/perfil'))),
  );
}

function safeDashboardDestination(authService: AuthService, router: Router) {
  return authService.hasRole('Propietario')
    ? ownerDestination(authService, router)
    : router.parseUrl(getDashboardUrl(authService));
}

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (allowedRoles?.length && !authService.hasRole(...allowedRoles)) {
    return safeDashboardDestination(authService, router);
  }

  const ownerAccess = route.data?.['ownerAccess'] as OwnerAccess | undefined;
  if (authService.hasRole('Propietario') && ownerAccess) {
    return inject(PerfilService).obtenerMiPerfil().pipe(
      map(profile => ownerHasAccess(profile, ownerAccess)
        ? true
        : router.parseUrl(getDashboardUrl(authService, profile))),
      catchError(() => of(router.parseUrl('/perfil'))),
    );
  }
  return true;
};

export const incidenciasDerivadasGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();
  if (!authService.isAuthenticated() || !user) return router.parseUrl('/login');
  if (user.rol === 'Portero') return true;
  if (user.rol === 'Propietario') {
    return inject(PerfilService).obtenerMiPerfil().pipe(
      map(profile => ownerHasAccess(profile, 'rental')
        ? true
        : router.parseUrl(getDashboardUrl(authService, profile))),
      catchError(() => of(router.parseUrl('/perfil'))),
    );
  }
  return router.parseUrl(getDashboardUrl(authService));
};

export const dashboardRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) return router.parseUrl('/login');
  return safeDashboardDestination(authService, router);
};
