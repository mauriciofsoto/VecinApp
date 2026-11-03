import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';

import { Incidencias } from './incidencias';

describe('Incidencias', () => {
  let service: Incidencias;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Incidencias);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('maps the administrator endpoint contract and keeps normalized states and location', () => {
    let received: ReturnType<typeof service.incidencias> | undefined;
    service.cargarAdmin().subscribe(items => { received = items; });

    http.expectOne(`${environment.apiUrl}/api/incidencias`).flush([{
      idIncidencia: 14,
      idEstadoIncidencia: 2,
      idCategoriaIncidencia: 3,
      idUsuarioReportante: 'resident-1',
      idUsuarioResponsable: 'admin-1',
      titulo: 'Filtración',
      descripcion: 'Hay agua en el pasillo',
      ubicacion: 'Piso 2',
      prioridad: 'Alta',
      fechaCreacion: '2026-11-03T12:00:00Z',
      estado: 'En proceso',
      categoria: 'Plomería',
      reportante: 'Ana Pérez',
      responsable: 'Luis Gómez',
    }]);

    expect(received?.[0]).toMatchObject({
      id: 14,
      idIncidencia: 14,
      idEstadoIncidencia: 2,
      titulo: 'Filtración',
      ubicacion: 'Piso 2',
      estado: 'en-proceso',
      categoria: 'Plomería',
      usuarioNombre: 'Ana Pérez',
      responsableNombre: 'Luis Gómez',
    });
    expect(service.incidencias()).toEqual(received);
    expect(service.totalEnProceso()).toBe(1);
  });

  it('loads only the signed-in resident incidents from the resident endpoint', () => {
    let received: unknown;
    service.cargarMisIncidencias().subscribe(items => { received = items; });

    http.expectOne(`${environment.apiUrl}/api/incidencias/mis-incidencias`).flush([{
      idIncidencia: 21,
      idEstadoIncidencia: 1,
      idCategoriaIncidencia: 2,
      idUsuarioReportante: 'resident-1',
      idUsuarioResponsable: null,
      titulo: 'Luz del hall',
      descripcion: 'La luz está apagada',
      ubicacion: 'Entrada',
      prioridad: 'Media',
      fechaCreacion: '2026-11-03T12:00:00Z',
      estado: 'Pendiente',
      categoria: 'Electricidad',
      reportante: 'Ana Pérez',
      responsable: null,
    }]);

    expect(received).toMatchObject([{ id: 21, estado: 'pendiente', ubicacion: 'Entrada' }]);
    expect(service.misIncidencias()).toEqual(received);
  });
});
