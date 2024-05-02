import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./sheet/sheet.component').then(m => m.SheetComponent),
    },
    {
        path: 'factory',
        loadComponent: () => import('./factory/factory.component').then(m => m.FactoryComponent),
    }
];
