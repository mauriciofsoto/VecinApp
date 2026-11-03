
import { Routes } from '@angular/router';

import {
  authGuard,
  roleGuard,
  dashboardRedirectGuard,
} from './core/guards/auth.guard';

import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

const ADMIN_ROLES = ['Administrador', 'SuperAdministrador'];
const RESIDENT_ROLES = ['Inquilino', 'Propietario'];

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login),
  },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [dashboardRedirectGuard],
        children: [],
      },

      // DASHBOARDS
      {
        path: 'admin-dashboard',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ROLES },
        loadComponent: () =>
          import('./features/dashboard/admin-dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent),
      },
      {
        path: 'porteria-dashboard',
        canActivate: [roleGuard],
        data: { roles: ['Porteria'] },
        loadComponent: () =>
          import('./features/dashboard/porteria-dashboard/porteria-dashboard.component')
            .then(m => m.PorteriaDashboardComponent),
      },
      {
        path: 'user-dashboard',
        canActivate: [roleGuard],
        data: { roles: RESIDENT_ROLES },
        loadComponent: () =>
          import('./features/dashboard/user-dashboard/user-dashboard.component')
            .then(m => m.UserDashboardComponent),
      },

      // COMUNIDAD
      {
        path: 'comunidad',
        canActivate: [roleGuard],
        data: { roles: [...ADMIN_ROLES, ...RESIDENT_ROLES] },
        loadComponent: () =>
          import('./features/community/feed/pages/feed-principal/feed-principal')
            .then(m => m.FeedPrincipal),
      },

      // ENCUESTAS
      {
        path: 'encuestas',
        canActivate: [roleGuard],
        data: { roles: [...ADMIN_ROLES, ...RESIDENT_ROLES] },
        loadComponent: () =>
          import('./features/operations/encuestas/pages/historial-encuestas/historial-encuestas')
            .then(m => m.HistorialEncuestas),
      },

      // INCIDENCIAS
      {
        path: 'incidencias',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ROLES },
        loadComponent: () =>
          import('./features/operations/incidencias/pages/incidencias-admin/incidencias-admin')
            .then(m => m.IncidenciasAdmin),
      },
      {
        path: 'mis-incidencias',
        canActivate: [roleGuard],
        data: { roles: RESIDENT_ROLES },
        loadComponent: () =>
          import('./features/operations/incidencias/pages/mis-incidencias/mis-incidencias')
            .then(m => m.MisIncidencias),
      },

      // PAQUETERÍA
      {
        path: 'recepcion-paquetes',
        canActivate: [roleGuard],
        data: { roles: [...ADMIN_ROLES, 'Porteria'] },
        loadComponent: () =>
          import('./features/operations/paqueteria/pages/recepcion-paquetes/recepcion-paquetes')
            .then(m => m.RecepcionPaquetes),
      },
      {
        path: 'mis-paquetes',
        canActivate: [roleGuard],
        data: { roles: RESIDENT_ROLES },
        loadComponent: () =>
          import('./features/operations/paqueteria/pages/mis-paquetes/mis-paquetes')
            .then(m => m.MisPaquetes),
      },

      // INQUILINOS
      {
        path: 'inquilinos',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ROLES },
        loadComponent: () =>
          import('./features/operations/inquilinos/pages/inquilinos-list/inquilinos-list')
            .then(m => m.InquilinosList),
      },

      // RESERVAS
      {
        path: 'reservas',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ROLES },
        loadComponent: () =>
          import('./features/operations/reservas/pages/gestionar-reservas/gestionar-reservas')
            .then(m => m.GestionarReservas),
      },
      {
        path: 'mis-reservas',
        canActivate: [roleGuard],
        data: { roles: RESIDENT_ROLES },
        loadComponent: () =>
          import('./features/operations/reservas/pages/mis-reservas/mis-reservas')
            .then(m => m.MisReservas),
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];
