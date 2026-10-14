import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidenciasAdmin } from './incidencias-admin';

describe('IncidenciasAdmin', () => {
  let component: IncidenciasAdmin;
  let fixture: ComponentFixture<IncidenciasAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidenciasAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidenciasAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
