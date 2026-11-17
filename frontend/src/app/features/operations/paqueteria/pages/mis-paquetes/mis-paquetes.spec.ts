import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';

import { MisPaquetes } from './mis-paquetes';

describe('MisPaquetes', () => {
  let component: MisPaquetes;
  let fixture: ComponentFixture<MisPaquetes>;
  let http: HttpTestingController;
  const paquete = {
    id: 17,
    identificacion: 'Caja 17',
    remitente: 'Correo',
    idUsuarioDestinatario: 'identity-abc',
    nombreDestinatario: 'Ana',
    apellidoDestinatario: 'Pérez',
    estado: 'Entregado',
    fechaRecepcion: '2026-11-15T10:00:00Z',
    fechaEntrega: '2026-11-15T11:00:00Z',
    fechaConfirmacion: null,
    observaciones: null,
  };

  beforeEach(async () => {
    localStorage.setItem('accessToken', 'test-token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 'identity-abc', nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test', rol: 'Inquilino',
    }));
    await TestBed.configureTestingModule({
      imports: [MisPaquetes],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MisPaquetes);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authSessionRevision');
  });

  it('consulta mis-paquetes sin enviar ID de usuario y confirma solo después de entrega física', () => {
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria/mis-paquetes`);
    expect(request.request.method).toBe('GET');
    expect(request.request.url).not.toContain('residenteId');
    request.flush([paquete]);
    expect(component.misPaquetes()).toEqual([paquete]);

    component.seleccionarPaquete(paquete as never);
    component.abrirConfirmacion();
    expect(component.confirmacionAbierta()).toBe(true);
    component.confirmarRecepcion();

    const confirm = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/confirmacion`);
    expect(confirm.request.method).toBe('POST');
    confirm.flush(null);

    const refresh = http.expectOne(`${environment.apiUrl}/api/paqueteria/mis-paquetes`);
    refresh.flush([{ ...paquete, estado: 'Confirmado', fechaConfirmacion: '2026-11-15T11:30:00Z' }]);
    expect(component.misPaquetes()[0].estado).toBe('Confirmado');
    expect(component.confirmacionAbierta()).toBe(false);
  });

  it('no abre confirmación si el backend todavía no registró entrega física', () => {
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria/mis-paquetes`);
    request.flush([{ ...paquete, estado: 'Pendiente', fechaEntrega: null }]);
    component.seleccionarPaquete({ ...paquete, estado: 'Pendiente', fechaEntrega: null } as never);
    component.abrirConfirmacion();
    expect(component.confirmacionAbierta()).toBe(false);
  });
});
