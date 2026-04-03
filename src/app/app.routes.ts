import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
        // loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes)
    },
    {
        path: 'home',
        loadComponent: () => import('./home/home.component').then( m => m.HomeComponent)
    },
    {
        path: 'factory',
        loadComponent: () => import('./factory/factory.component').then( m => m.FactoryComponent)
    }
];
