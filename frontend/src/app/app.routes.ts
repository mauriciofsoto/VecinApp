import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

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
        redirectTo: 'admin-dashboard',
      },
      {
        path: 'admin-dashboard',
        canActivate: [roleGuard],
        data: { roles: ['Administrador', 'SuperAdministrador'] },
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
        data: { roles: ['Inquilino', 'Propietario'] },
        loadComponent: () =>
          import('./features/dashboard/user-dashboard/user-dashboard.component')
            .then(m => m.UserDashboardComponent),
      },
    ],
  },
];
