import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notes-dialog',
  standalone: true,
    imports: [
        ButtonModule,
        EditorModule,
        FormsModule
    ],
  templateUrl: './notes-dialog.component.html',
  styleUrl: './notes-dialog.component.sass'
})
export class NotesDialogComponent {
    private ref = inject(DynamicDialogRef);
    private config = inject(DynamicDialogConfig);
    note = this.config.data.note;

    cancelEditNote() {
        this.ref.close(undefined);
    }

    saveNote() {
        this.ref.close(this.note);
    }
}
