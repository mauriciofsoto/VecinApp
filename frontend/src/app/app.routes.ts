import { Routes } from '@angular/router';

export const routes: Routes = [


    {path:'', 
        loadComponent:() =>import('./features/dashboard/admin-dashboard/admin-dashboard.component').then(m=>m.AdminDashboardComponent)
    },


    {path:'admin-dashboard', 
        loadComponent:() =>import('./features/dashboard/admin-dashboard/admin-dashboard.component').then(m=>m.AdminDashboardComponent)
    },

    {path:'porteria-dashboard', 
        loadComponent:() =>import('./features/dashboard/porteria-dashboard/porteria-dashboard.component').then(m=>m.PorteriaDashboardComponent)
    },

    {path:'user-dashboard', 
        loadComponent:() =>import('./features/dashboard/user-dashboard/user-dashboard.component').then(m=>m.UserDashboardComponent)
    },



];
