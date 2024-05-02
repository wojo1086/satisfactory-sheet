import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FactoryDialogComponent } from '../dialogs/factory-dialog/factory-dialog.component';

@Component({
    selector: 'app-factory',
    standalone: true,
    imports: [
        ButtonModule
    ],
    providers: [DialogService],
    templateUrl: './factory.component.html',
    styleUrl: './factory.component.sass'
})
export class FactoryComponent {
    private dialogService = inject(DialogService);
    private ref: DynamicDialogRef | undefined;

    addFactory() {
        this.ref = this.dialogService.open(FactoryDialogComponent, {
            header: 'Create Factory',
            width: '50vw',
            breakpoints: {
                '1500px': '75vw',
                '992px': '100vw'
            }
        });
        this.ref.onClose.subscribe((res: any) => {
            console.log(res);
        });
    }
}
