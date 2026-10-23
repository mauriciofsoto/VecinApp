
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../app/features/auth/login/login')
        .then(m => m.Login)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
  },
  {
    path: 'admin-dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrador', 'SuperAdministrador'] },
    loadComponent: () =>
      import('./features/dashboard/admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
  },
  {
    path: 'porteria-dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Porteria'] },
    loadComponent: () =>
      import('./features/dashboard/porteria-dashboard/porteria-dashboard.component')
        .then(m => m.PorteriaDashboardComponent),
  },
  {
    path: 'user-dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Inquilino', 'Propietario'] },
    loadComponent: () =>
      import('./features/dashboard/user-dashboard/user-dashboard.component')
        .then(m => m.UserDashboardComponent),
  },
];
