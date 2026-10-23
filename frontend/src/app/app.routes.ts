
import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role-guard';


export const routes: Routes = [
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/registro/registro').then((module) => module.Registro),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((module) => module.Login),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (module) => module.ForgotPassword
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then(
        (module) => module.ResetPassword
      ),
  },
  {
    path: 'incidencias/crear',
    canActivate: [roleGuard],
    data: { roles: ['inquilino'] },
    loadComponent: () =>
      import('./features/operations/incidencias/pages/crear-incidencia/crear-incidencia')
        .then((module) => module.CrearIncidencia),
  },
  {
    path: 'incidencias/admin',
    redirectTo: 'administrador/incidencias',
    pathMatch: 'full',
  },
  {
    path: 'administrador/incidencias',
    canActivate: [roleGuard],
    data: { roles: ['administrador'] },
    loadComponent: () =>
      import('./features/operations/incidencias/pages/incidencias-admin/incidencias-admin')
        .then((module) => module.IncidenciasAdminComponent),
  },
  {
    path: 'administrador/incidencias/:id',
    canActivate: [roleGuard],
    data: { roles: ['administrador'] },
    loadComponent: () =>
      import('./features/operations/incidencias/pages/detalle-incidencia/detalle-incidencia')
        .then((module) => module.DetalleIncidenciaComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'inquilino/incidencias',
    canActivate: [roleGuard],
    data: { roles: ['inquilino'] },
    loadComponent: () =>
      import('./features/operations/incidencias/pages/incidencias-inquilino/incidencias-inquilino')
        .then((module) => module.IncidenciasInquilinoComponent),
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
