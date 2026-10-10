import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PorteriaDashboardComponent } from './porteria-dashboard.component';

describe('PorteriaDashboardComponent', () => {
  let component: PorteriaDashboardComponent;
  let fixture: ComponentFixture<PorteriaDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PorteriaDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PorteriaDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
