import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { IncidenciasAdmin } from './incidencias-admin';

describe('IncidenciasAdmin', () => {
  let component: IncidenciasAdmin;
  let fixture: ComponentFixture<IncidenciasAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidenciasAdmin],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
