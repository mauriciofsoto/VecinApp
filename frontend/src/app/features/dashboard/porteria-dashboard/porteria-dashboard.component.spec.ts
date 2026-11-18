import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { PorteriaDashboardComponent } from './porteria-dashboard.component';

describe('PorteriaDashboardComponent', () => {
  let component: PorteriaDashboardComponent;
  let fixture: ComponentFixture<PorteriaDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'token-portero');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 'portero-a',
      nombre: 'Portero',
      apellido: 'Prueba',
      email: 'portero@example.test',
      rol: 'Portero',
    }));

    await TestBed.configureTestingModule({
      imports: [PorteriaDashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PorteriaDashboardComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should create', () => {
    http.expectOne(`${environment.apiUrl}/api/paqueteria`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/incidencias/derivadas`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/reservas`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/espacios-comunes`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).flush({
      edificioNombre: 'Edificio Prueba',
    });

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.paquetesPendientes()).toEqual([]);
    expect(component.incidenciasActivas()).toEqual([]);
    expect(component.proximasReservas()).toEqual([]);
    expect(component.edificioNombre()).toBe('Edificio Prueba');
  });
});
