import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AdminDashboardComponent } from './admin-dashboard.component';
import { environment } from '../../../../environments/environment';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'token-admin');
    localStorage.setItem('currentUser', JSON.stringify({ id: 'admin-a', nombre: 'Admin', apellido: 'Prueba', email: 'admin@example.test', rol: 'Administrador', declaraUnidadesAlquiladas: false }));
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
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
    http.expectOne(`${environment.apiUrl}/publicaciones`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/incidencias`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/reservas`).flush([]);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.incidents()).toEqual([]);
    expect(component.reservations()).toEqual([]);
    expect(component.calendarReservations()).toEqual([]);
  });
});
