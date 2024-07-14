import { Component, inject } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-factory-dialog',
    standalone: true,
    imports: [
        InputTextModule,
        ButtonModule
    ],
    templateUrl: './factory-dialog.component.html',
    styleUrl: './factory-dialog.component.sass'
})
export class FactoryDialogComponent {
    private dynamicDialogRef = inject(DynamicDialogRef);

    createFactory() {
        this.dynamicDialogRef.close();
    }
}
