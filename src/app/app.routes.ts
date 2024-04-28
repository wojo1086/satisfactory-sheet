import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./production/production.component').then(mod => mod.ProductionComponent)
    },
    {
        path: 'diagram',
        loadComponent: () => import('./diagram/diagram.component').then(mod => mod.DiagramComponent)
    }
];
