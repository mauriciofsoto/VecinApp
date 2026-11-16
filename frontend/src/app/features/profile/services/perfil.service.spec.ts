import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { PerfilService } from './perfil.service';

describe('PerfilService', () => {
  let service: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el perfil del usuario autenticado sin enviar un identificador de usuario', () => {
    const perfil = {
      nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test', rol: 'Inquilino',
      edificioNombre: 'Edificio A', unidadesVinculadas: [], unidadesDeclaradas: [],
      viveEnEdificio: true, tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null,
      modalidadAlquiler: 'Contrato', funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    };
    let recibido: unknown;

    service.obtenerMiPerfil().subscribe(value => recibido = value);

    const request = http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`);
    expect(request.request.method).toBe('GET');
    expect(request.request.urlWithParams).toBe(`${environment.apiUrl}/api/usuarios/me/perfil`);
    request.flush(perfil);
    expect(recibido).toEqual(perfil);
  });

  it('actualiza el perfil autenticado mediante PUT con los campos permitidos', () => {
    const body = { nombre: 'Ana María', apellido: 'Pérez', telefono: '+54 11 5555-1234' };
    let recibido: unknown;

    service.actualizarMiPerfil(body).subscribe(value => recibido = value);

    const request = http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ nombre: body.nombre, apellido: body.apellido, telefono: body.telefono });
    expect(recibido).toEqual({ nombre: body.nombre, apellido: body.apellido, telefono: body.telefono });
  });
});
