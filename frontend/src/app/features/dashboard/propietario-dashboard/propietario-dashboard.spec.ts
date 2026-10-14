import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropietarioDashboard } from './propietario-dashboard';

describe('PropietarioDashboard', () => {
  let component: PropietarioDashboard;
  let fixture: ComponentFixture<PropietarioDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropietarioDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PropietarioDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
