import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';

import { GestionarReservas } from './gestionar-reservas';

describe('GestionarReservas', () => {
  let component: GestionarReservas;
  let fixture: ComponentFixture<GestionarReservas>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'admin-token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 'admin-test', nombre: 'Admin', apellido: 'Test', email: 'admin@example.test', rol: 'Administrador',
    }));
    await TestBed.configureTestingModule({
      imports: [GestionarReservas],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarReservas);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/reservas`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/espacios-comunes`).flush([]);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
