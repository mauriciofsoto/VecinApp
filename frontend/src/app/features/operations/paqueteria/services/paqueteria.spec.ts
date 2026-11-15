import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { Paqueteria } from './paqueteria';

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
      rol: 'Inquilino',
      unidadesDeclaradas: [],
    }]);

    expect(resultado).toEqual([{
      id: 'identity-abc',
      nombre: 'Ana',
      apellido: 'Pérez',
      rol: 'Inquilino',
      unidadesDeclaradas: [],
    }]);
  });
});
