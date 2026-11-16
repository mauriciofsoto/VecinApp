import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { EncuestaVotantesResponse } from '../models/encuesta.model';
import { AuthService } from '../../../../core/services/auth';
import { User } from '../../../../core/models/user';
import { EncuestasService } from './encuestas';

describe('EncuestasService', () => {
  let service: EncuestasService;
  let http: HttpTestingController;
  const currentUser = signal<User | null>({
    id: 'inquilino-id',
    nombre: 'Luis',
    apellido: 'Inquilino',
    email: 'inquilino@example.test',
    rol: 'Inquilino',
    declaraUnidadesAlquiladas: false,
  });
  const encuesta = {
    id: 10,
    idPublicacion: 20,
    titulo: 'Reunión',
    descripcion: 'Fecha',
    opciones: [{ id: 3, texto: 'Lunes', votos: 1 }, { id: 4, texto: 'Martes', votos: 0 }],
    votacionActiva: true,
    comentariosActivos: true,
    prioritaria: false,
    fechaLimite: '2026-11-30T02:59:59.999Z',
    fechaPublicacion: '2026-11-16T12:00:00Z',
    estado: 'en-proceso' as const,
    totalVotos: 1,
    yaVote: true,
    miOpcionId: 3,
  };

  beforeEach(() => {
    currentUser.set({
      id: 'inquilino-id',
      nombre: 'Luis',
      apellido: 'Inquilino',
      email: 'inquilino@example.test',
      rol: 'Inquilino',
      declaraUnidadesAlquiladas: false,
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    service = TestBed.inject(EncuestasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recupera encuestas y resultados desde el backend', () => {
    service.cargar();
    http.expectOne(`${environment.apiUrl}/encuestas`).flush([encuesta]);

    expect(service.encuestas()[0].idPublicacion).toBe(20);
    expect(service.encuestas()[0].yaVote).toBe(true);
    expect(service.encuestas()[0].miOpcionId).toBe('3');
    expect(service.encuestas()[0].votosPorOpcion[0].votos).toBe(1);
  });

  it('envía el voto sin identidad elegida por el cliente', () => {
    service.cargar();
    http.expectOne(`${environment.apiUrl}/encuestas`).flush([{ ...encuesta, yaVote: false, miOpcionId: null }]);
    service.registrarVoto(10, '4').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/encuestas/10/votos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idOpcion: 4 });
    expect(req.request.body.usuarioId).toBeUndefined();
    req.flush({ ...encuesta, yaVote: true, miOpcionId: 4 });

    expect(service.encuestas()[0].miOpcionId).toBe('4');
  });

  it('expone el error cuando el backend no puede cargar las encuestas', () => {
    service.cargar();
    http.expectOne(`${environment.apiUrl}/encuestas`).flush('falló', {
      status: 500,
      statusText: 'Server Error',
    });

    expect(service.error()).toBe('No se pudieron cargar las encuestas.');
    expect(service.loading()).toBe(false);
  });

  it('consulta los votantes en el endpoint propio de la encuesta', () => {
    const respuesta = {
      encuestaId: 10,
      titulo: 'Reunión',
      estado: 'cerrada' as const,
      fechaLimite: encuesta.fechaLimite,
      totalVotos: 1,
      votantes: [{ nombre: 'Ana Pérez', opcion: 'Lunes', fechaVoto: encuesta.fechaPublicacion }],
    };
    let recibido: EncuestaVotantesResponse | undefined;
    service.obtenerVotantes(10).subscribe(value => recibido = value);

    const req = http.expectOne(`${environment.apiUrl}/encuestas/10/votantes`);
    expect(req.request.method).toBe('GET');
    req.flush(respuesta);

    expect(recibido).toEqual(respuesta);
  });

  it('vacía el estado entre cuentas e ignora respuestas tardías de la sesión anterior', () => {
    service.cargar();
    const respuestaAnterior = http.expectOne(`${environment.apiUrl}/encuestas`);

    currentUser.set({
      id: 'fio-id',
      nombre: 'Fio',
      apellido: 'Vecina',
      email: 'fio@example.test',
      rol: 'Inquilino',
      declaraUnidadesAlquiladas: false,
    });
    service.cargar();
    expect(service.encuestas()).toEqual([]);
    const respuestaFio = http.expectOne(`${environment.apiUrl}/encuestas`);
    respuestaFio.flush([{ ...encuesta, yaVote: false, miOpcionId: null }]);

    respuestaAnterior.flush([encuesta]);

    expect(service.encuestas()).toHaveLength(1);
    expect(service.encuestas()[0].yaVote).toBe(false);
    expect(service.encuestas()[0].miOpcionId).toBeNull();
  });

  it('invalida los datos en memoria cuando se cierra la sesión', () => {
    service.cargar();
    http.expectOne(`${environment.apiUrl}/encuestas`).flush([encuesta]);
    expect(service.encuestas()[0].yaVote).toBe(true);

    currentUser.set(null);
    expect(service.encuestas()).toEqual([]);
    service.cargar();

    expect(service.encuestas()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
