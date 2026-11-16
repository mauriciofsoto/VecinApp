import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { Paqueteria } from './paqueteria';

const paquete = {
  id: 17,
  identificacion: 'Caja 17',
  remitente: 'Correo',
  idUsuarioDestinatario: 'identity-abc',
  nombreDestinatario: 'Ana',
  apellidoDestinatario: 'Pérez',
  estado: 'Pendiente',
  fechaRecepcion: '2026-11-15T10:00:00Z',
  fechaEntrega: null,
  fechaConfirmacion: null,
  observaciones: null,
};

describe('Paqueteria', () => {
  let service: Paqueteria;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Paqueteria);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('consulta destinatarios al endpoint dedicado y mantiene los IDs Identity como string', () => {
    let resultado: unknown;
    service.obtenerDestinatarios().subscribe(value => resultado = value);

    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria/destinatarios`);
    expect(request.request.method).toBe('GET');
    request.flush([{
      id: 'identity-abc',
      nombre: 'Ana',
      apellido: 'Pérez',
      unidadesDeclaradas: [],
    }]);

    expect(resultado).toEqual([{
      id: 'identity-abc',
      nombre: 'Ana',
      apellido: 'Pérez',
      unidadesDeclaradas: [],
    }]);
  });

  it('consulta el listado del personal y cachea los paquetes del servidor', () => {
    service.listar().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria`);
    expect(request.request.method).toBe('GET');
    request.flush([paquete]);
    expect(service.paquetes()).toEqual([paquete]);
  });

  it('consulta los paquetes propios sin aceptar un ID de usuario del cliente', () => {
    service.misPaquetes().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria/mis-paquetes`);
    expect(request.request.method).toBe('GET');
    request.flush([paquete]);
    expect(service.paquetes()).toEqual([paquete]);
  });

  it('registra con el contrato real y agrega la respuesta real al estado', () => {
    let resultado: unknown;
    const datos = {
      idUsuarioDestinatario: 'identity-abc',
      remitente: 'Correo',
      identificacion: 'Caja 17',
      observaciones: null,
    };
    service.registrar(datos).subscribe(value => resultado = value);
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(datos);
    request.flush(paquete);
    expect(resultado).toEqual(paquete);
    expect(service.paquetes()).toEqual([paquete]);
  });

  it('usa los endpoints de entrega física y confirmación sin inventar campos del request', () => {
    service.registrarEntrega(17).subscribe();
    const entrega = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/entrega`);
    expect(entrega.request.method).toBe('POST');
    expect(entrega.request.body).toBeNull();
    entrega.flush(null);

    service.confirmarRecepcion(17).subscribe();
    const confirmacion = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/confirmacion`);
    expect(confirmacion.request.method).toBe('POST');
    expect(confirmacion.request.body).toBeNull();
    confirmacion.flush(null);
  });

  it('obtiene mensajes ordenados y envía solamente contenido', () => {
    service.obtenerMensajes(17).subscribe();
    const get = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/mensajes`);
    expect(get.request.method).toBe('GET');
    get.flush([{ id: 5, nombreEmisor: 'Ana', apellidoEmisor: 'Pérez', contenido: 'Hola', fechaEnvio: '2026-11-15T10:00:00Z' }]);
    expect(service.mensajesDe(17)).toEqual([{
      id: 5, paqueteId: 17, nombreEmisor: 'Ana', apellidoEmisor: 'Pérez',
      contenido: 'Hola', fechaEnvio: '2026-11-15T10:00:00Z',
    }]);

    service.enviarMensaje(17, { contenido: 'Recibido' }).subscribe();
    const post = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/mensajes`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ contenido: 'Recibido' });
    post.flush({ id: 6, nombreEmisor: 'Ana', apellidoEmisor: 'Pérez', contenido: 'Recibido', fechaEnvio: '2026-11-15T10:01:00Z' });
    expect(service.mensajesDe(17).at(-1)).toEqual({
      id: 6, paqueteId: 17, propio: true, nombreEmisor: 'Ana', apellidoEmisor: 'Pérez',
      contenido: 'Recibido', fechaEnvio: '2026-11-15T10:01:00Z',
    });
  });
});
