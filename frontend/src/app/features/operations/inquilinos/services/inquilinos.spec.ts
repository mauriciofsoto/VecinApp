import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { Inquilinos } from './inquilinos';

describe('Inquilinos', () => {
  let service: Inquilinos;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(Inquilinos);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el listado comunitario en la URL configurada', () => {
    const respuesta = [{
      id: 'user-1', nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test',
      rol: 'Inquilino', estado: 'Activo', fechaRegistro: '2026-01-10T00:00:00Z',
      perfilComunitario: null, unidadesDeclaradas: [],
    }];
    let resultado: unknown;

    service.obtenerComunidad().subscribe(value => resultado = value);

    const request = http.expectOne(`${environment.apiUrl}/api/usuarios/comunidad`);
    expect(request.request.method).toBe('GET');
    request.flush(respuesta);
    expect(resultado).toEqual(respuesta);
  });

  it('mantiene disponible el estado local usado por recepción de paquetes', () => {
    expect(service.registrar({
      nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test', documento: '123',
      edificioId: 1, edificioNombre: 'Edificio A', unidad: '2B',
    })).toBe(true);
    expect(service.inquilinos().length).toBe(1);
  });
});
