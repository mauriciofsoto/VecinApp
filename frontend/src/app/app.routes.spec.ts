import { Route, Routes } from '@angular/router';
import { routes } from './app.routes';
import { incidenciasDerivadasGuard } from './core/guards/auth.guard';

function flattenRoutes(routeList: Routes, parentPath = ''): { path: string; route: Route }[] {
  return routeList.flatMap(route => {
    const currentPath = [parentPath, route.path ?? ''].filter(Boolean).join('/');
    return [
      { path: currentPath, route },
      ...(route.children ? flattenRoutes(route.children, currentPath) : []),
    ];
  });
}

describe('route permissions', () => {
  const flattened = flattenRoutes(routes);
  const routeAt = (path: string): Route => {
    const match = flattened.find(item => item.path === path);
    if (!match) throw new Error(`No se encontró la ruta ${path}`);
    return match.route;
  };

  it('reserva rutas administrativas a Administrador y Edificios a SuperAdministrador', () => {
    for (const path of [
      'admin-dashboard', 'admin/dashboard', 'admin/incidencias', 'admin/reservas',
      'admin/encuestas', 'admin/publicaciones', 'admin/usuarios', 'admin/invitaciones',
      'incidencias', 'administrador/incidencias', 'administrador/incidencias/:id',
      'inquilinos', 'reservas',
    ]) {
      expect(routeAt(path).data?.['roles']).toEqual(['Administrador']);
    }
    expect(routeAt('admin/edificios').data?.['roles']).toEqual(['SuperAdministrador']);
  });

  it('configura Comunidad y Encuestas para los roles comunitarios', () => {
    const roles = ['Administrador', 'Inquilino', 'Propietario', 'Portero'];
    for (const path of ['comunidad', 'encuestas']) {
      expect(routeAt(path).data?.['roles']).toEqual(roles);
      expect(routeAt(path).data?.['ownerAccess']).toBe('community');
    }
  });

  it('limita funciones de residentes y derivaciones por situación del Propietario', () => {
    for (const path of [
      'user-dashboard', 'mis-incidencias', 'incidencias/crear', 'inquilino/incidencias',
      'mis-paquetes', 'mis-reservas',
    ]) {
      expect(routeAt(path).data?.['ownerAccess']).toBe('resident');
    }
    expect(routeAt('incidencias-derivadas').canActivate).toEqual([incidenciasDerivadasGuard]);
    expect(routeAt('recepcion-paquetes').data?.['roles']).toEqual(['Administrador', 'Portero']);
    expect(routeAt('mis-incidencias').data?.['roles']).toEqual(['Inquilino', 'Propietario']);
  });

  it('deja Perfil disponible para todos los roles autenticados', () => {
    expect(routeAt('perfil').data?.['roles']).toEqual([
      'Administrador', 'SuperAdministrador', 'Inquilino', 'Propietario', 'Portero',
    ]);
  });
});
