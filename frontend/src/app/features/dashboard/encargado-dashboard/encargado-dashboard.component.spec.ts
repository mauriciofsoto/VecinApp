import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EncargadoDashboardComponent } from './encargado-dashboard.component';

describe('EncargadoDashboardComponent', () => {
  let component: EncargadoDashboardComponent;
  let fixture: ComponentFixture<EncargadoDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EncargadoDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EncargadoDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
