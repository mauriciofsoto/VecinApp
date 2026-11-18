import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { DetalleIncidencia, EstadoIncidenciaDto, Incidencia } from '../models/incidencia';
import { MensajeIncidencia, RolEmisorMensaje } from '../models/mensaje-incidencia';
import { AuthService } from '../../../../core/services/auth';

export type { DetalleIncidencia, EstadoIncidencia, EstadoIncidenciaDto } from '../models/incidencia';

export interface CategoriaIncidenciaDto {
  idCategoriaIncidencia: number;
  nombre: string;
}
export interface UnidadDisponibleDto {
  idUnidad: number;
  piso: string;
  identificacion: string;
}
export interface CrearIncidenciaRequest {
  idCategoriaIncidencia: number;
  idUnidad: number | null;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  prioridad: 'baja' | 'media' | 'alta';
}
export interface IncidenciaDashboardDto {
  idIncidencia: number;
  titulo: string;
  descripcion: string;
  fechaCreacion: string;
  estado: string;
}

export interface DerivacionIncidenciaDto {
  idDerivacion: number;
  idIncidencia: number;
  tipoDestinatario: 'Propietario' | 'Personal';
  fechaDerivacion: string;
  administrador: string;
  titulo: string;
  descripcion: string;
  fechaCreacion: string;
  estado: string;
  prioridad: string;
  categoria: string;
  reportante: string;
  ubicacion: string | null;
  unidad: string | null;
}

export interface DestinatarioDerivacionDto {
  id: string;
  nombre: string;
  apellido: string;
}


interface IncidenciaApiDto {
  idIncidencia: number;
  idUnidad: number | null;
  unidad: string | null;
  piso: string | null;
  identificacion: string | null;
  idEstadoIncidencia: number;
  idCategoriaIncidencia: number;
  idUsuarioReportante: string;
  idUsuarioResponsable: string | null;
  titulo: string;
  descripcion: string;
  ubicacion: string | null;
  prioridad: string;
  fechaCreacion: string;
  estado: string;
  categoria: string;
  reportante: string;
  responsable: string | null;
  comentarioResolucion: string | null;
}

interface MensajeIncidenciaApiDto {
  idMensajeIncidencia: number;
  idIncidencia: number;
  idUsuarioEmisor: string;
  emisorNombre: string;
  rolEmisor: string;
  contenido: string;
  fechaCreacion: string;
}

interface CambiarEstadoResponse {
  idIncidencia: number;
  estado: string;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class Incidencias {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/api/incidencias`;

  private readonly adminItems = signal<Incidencia[]>([]);
  private readonly residentItems = signal<Incidencia[]>([]);
  private readonly adminOwner = signal<{ userId: string | null; version: number } | null>(null);
  private readonly residentOwner = signal<{ userId: string | null; version: number } | null>(null);
  private readonly isCurrentOwner = (owner: { userId: string | null; version: number } | null): boolean =>
    owner !== null
      && owner.userId !== null
      && owner.userId === this.auth.currentUser()?.id
      && owner.version === this.auth.sessionVersion();
  readonly incidencias = computed(() => this.isCurrentOwner(this.adminOwner()) ? this.adminItems() : []);
  readonly misIncidencias = computed(() => this.isCurrentOwner(this.residentOwner()) ? this.residentItems() : []);

  readonly totalIncidencias = computed(() => this.incidencias().length);
  readonly totalPendientes = computed(() => this.countByState('pendiente'));
  readonly totalEnProceso = computed(() => this.countByState('en-proceso'));
  readonly totalResueltas = computed(() => this.countByState('resuelta'));
  readonly totalCerradas = computed(() => this.countByState('cerrada'));

  constructor() {
    effect(() => {
      this.auth.currentUser();
      this.auth.sessionVersion();
      this.adminItems.set([]);
      this.residentItems.set([]);
      this.adminOwner.set(null);
      this.residentOwner.set(null);
    });
  }

  cargarParaDashboard(): Observable<IncidenciaDashboardDto[]> {
    return this.http.get<IncidenciaDashboardDto[]>(this.apiUrl);
  }
  cargarMisUnidades(): Observable<UnidadDisponibleDto[]> {
    return this.http.get<UnidadDisponibleDto[]>(`${this.apiUrl}/mis-unidades`);
  }
  cargarAdmin(): Observable<Incidencia[]> {
    const session = this.auth.captureSession();
    return this.http.get<IncidenciaApiDto[]>(this.apiUrl).pipe(
      map(items => items.map(item => this.mapIncidencia(item))),
      tap(items => { if (this.auth.isCurrentSession(session)) { this.adminOwner.set(session); this.adminItems.set(items); } }),
    );
  }

  cargarMisIncidencias(): Observable<Incidencia[]> {
    const session = this.auth.captureSession();
    return this.http.get<IncidenciaApiDto[]>(`${this.apiUrl}/mis-incidencias`).pipe(
      map(items => items.map(item => this.mapIncidencia(item))),
      tap(items => { if (this.auth.isCurrentSession(session)) { this.residentOwner.set(session); this.residentItems.set(items); } }),
    );
  }

  cargarCategorias(): Observable<CategoriaIncidenciaDto[]> {
    return this.http.get<CategoriaIncidenciaDto[]>(`${this.apiUrl}/categorias`);
  }

  cargarEstados(): Observable<EstadoIncidenciaDto[]> {
    return this.http.get<EstadoIncidenciaDto[]>(`${this.apiUrl}/estados`);
  }

  cargarDerivaciones(): Observable<DerivacionIncidenciaDto[]> {
    return this.http.get<DerivacionIncidenciaDto[]>(`${this.apiUrl}/derivadas`);
  }

  cargarDestinatarios(
    idIncidencia: number,
    tipo: 'Propietario' | 'Personal',
  ): Observable<DestinatarioDerivacionDto[]> {
    return this.http.get<DestinatarioDerivacionDto[]>(
      `${this.apiUrl}/${idIncidencia}/derivaciones/destinatarios`,
      { params: { tipo } },
    );
  }

  derivar(
    id: number,
    request: {
      idUsuarioDestinatario: string;
      tipoDestinatario: 'Propietario' | 'Personal';
    },
  ): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${id}/derivaciones`, request);
  }

  obtenerDetalle(id: number): Observable<DetalleIncidencia> {
    return this.http.get<IncidenciaApiDto>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapIncidencia(item) as DetalleIncidencia),
    );
  }

  crear(request: CrearIncidenciaRequest): Observable<Incidencia> {
    const session = this.auth.captureSession();
    return this.http.post<IncidenciaApiDto>(this.apiUrl, request).pipe(
      map(item => this.mapIncidencia(item)),
      tap(item => { if (this.auth.isCurrentSession(session)) { this.residentOwner.set(session); this.residentItems.update(items => [item, ...items]); } }),
    );
  }

  cambiarEstado(id: number, value: number | { idEstadoIncidencia: number; comentarioResolucion?: string }): Observable<CambiarEstadoResponse> {
    const session = this.auth.captureSession();
    const idEstadoIncidencia = typeof value === 'number' ? value : value.idEstadoIncidencia;
    const comentarioResolucion = typeof value === 'number' ? undefined : value.comentarioResolucion;
    return this.http.put<CambiarEstadoResponse>(`${this.apiUrl}/${id}/estado`, {
      idEstadoIncidencia,
      comentarioResolucion,
    }).pipe(
      tap(response => {
        if (!this.auth.isCurrentSession(session)) return;
        const estado = this.normalizeState(response.estado);
        this.adminItems.update(items => items.map(item =>
          item.id === id ? { ...item, estado } : item,
        ));
        this.adminOwner.set(session);
      }),
    );
  }

  listarMisIncidencias(): Observable<Incidencia[]> {
    return this.cargarMisIncidencias();
  }

  listarEstados(): Observable<EstadoIncidenciaDto[]> {
    return this.cargarEstados();
  }

  cargarMensajes(incidenciaId: number): Observable<MensajeIncidencia[]> {
    return this.http.get<MensajeIncidenciaApiDto[]>(`${this.apiUrl}/${incidenciaId}/mensajes`).pipe(
      map(items => items.map(item => this.mapMensaje(item))),
    );
  }

  enviarMensaje(incidenciaId: number, contenido: string): Observable<MensajeIncidencia> {
    return this.http.post<MensajeIncidenciaApiDto>(
      `${this.apiUrl}/${incidenciaId}/mensajes`,
      { contenido },
    ).pipe(map(item => this.mapMensaje(item)));
  }

  private mapIncidencia(item: IncidenciaApiDto): Incidencia {
    return {
      id: item.idIncidencia,
      idIncidencia: item.idIncidencia,
      idEstadoIncidencia: item.idEstadoIncidencia,
      idUnidad: item.idUnidad ?? null,
      unidad: item.unidad ?? null,
      piso: item.piso ?? null,
      identificacion: item.identificacion ?? null,
      titulo: item.titulo,
      descripcion: item.descripcion,
      categoria: item.categoria,
      categoriaId: item.idCategoriaIncidencia,
      ubicacion: item.ubicacion ?? '',
      estado: this.normalizeState(item.estado),
      prioridad: item.prioridad.toLocaleLowerCase('es-AR'),
      fechaCreacion: item.fechaCreacion,
      usuarioId: item.idUsuarioReportante,
      usuarioNombre: item.reportante,
      responsableId: item.idUsuarioResponsable,
      responsableNombre: item.responsable,
      responsable: item.responsable,
      reportante: item.reportante,
      comentarioResolucion: item.comentarioResolucion,
      idCategoriaIncidencia: item.idCategoriaIncidencia,
    };
  }

  private mapMensaje(item: MensajeIncidenciaApiDto): MensajeIncidencia {
    const rolEmisor: RolEmisorMensaje =
      item.rolEmisor.toLocaleLowerCase('es-AR') === 'administrador'
        ? 'administrador'
        : 'usuario';

    return {
      id: item.idMensajeIncidencia,
      incidenciaId: item.idIncidencia,
      emisorId: item.idUsuarioEmisor,
      emisorNombre: item.emisorNombre,
      rolEmisor,
      contenido: item.contenido,
      fechaCreacion: item.fechaCreacion,
    };
  }

  private normalizeState(value: string): string {
    return value.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }

  private countByState(state: string): number {
    return this.incidencias().filter(item => item.estado === state).length;
  }
}
