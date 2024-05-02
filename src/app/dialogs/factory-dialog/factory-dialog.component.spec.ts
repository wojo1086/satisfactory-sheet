import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FactoryDialogComponent } from './factory-dialog.component';

describe('FactoryDialogComponent', () => {
  let component: FactoryDialogComponent;
  let fixture: ComponentFixture<FactoryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FactoryDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FactoryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
