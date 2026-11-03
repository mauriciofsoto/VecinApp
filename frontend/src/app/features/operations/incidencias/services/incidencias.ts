import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { Incidencia } from '../models/incidencia';
import { MensajeIncidencia, RolEmisorMensaje } from '../models/mensaje-incidencia';

export interface CategoriaIncidenciaDto {
  idCategoriaIncidencia: number;
  nombre: string;
}

export interface EstadoIncidenciaDto {
  idEstadoIncidencia: number;
  nombre: string;
}

export interface CrearIncidenciaRequest {
  idCategoriaIncidencia: number;
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

interface IncidenciaApiDto {
  idIncidencia: number;
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
  private readonly apiUrl = `${environment.apiUrl}/api/incidencias`;

  private readonly adminItems = signal<Incidencia[]>([]);
  private readonly residentItems = signal<Incidencia[]>([]);
  readonly incidencias = this.adminItems.asReadonly();
  readonly misIncidencias = this.residentItems.asReadonly();

  readonly totalIncidencias = computed(() => this.adminItems().length);
  readonly totalPendientes = computed(() => this.countByState('pendiente'));
  readonly totalEnProceso = computed(() => this.countByState('en-proceso'));
  readonly totalResueltas = computed(() => this.countByState('resuelta'));

  cargarParaDashboard(): Observable<IncidenciaDashboardDto[]> {
    return this.http.get<IncidenciaDashboardDto[]>(this.apiUrl);
  }

  cargarAdmin(): Observable<Incidencia[]> {
    return this.http.get<IncidenciaApiDto[]>(this.apiUrl).pipe(
      map(items => items.map(item => this.mapIncidencia(item))),
      tap(items => this.adminItems.set(items)),
    );
  }

  cargarMisIncidencias(): Observable<Incidencia[]> {
    return this.http.get<IncidenciaApiDto[]>(`${this.apiUrl}/mis-incidencias`).pipe(
      map(items => items.map(item => this.mapIncidencia(item))),
      tap(items => this.residentItems.set(items)),
    );
  }

  cargarCategorias(): Observable<CategoriaIncidenciaDto[]> {
    return this.http.get<CategoriaIncidenciaDto[]>(`${this.apiUrl}/categorias`);
  }

  cargarEstados(): Observable<EstadoIncidenciaDto[]> {
    return this.http.get<EstadoIncidenciaDto[]>(`${this.apiUrl}/estados`);
  }

  obtenerDetalle(id: number): Observable<Incidencia> {
    return this.http.get<IncidenciaApiDto>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapIncidencia(item)),
    );
  }

  crear(request: CrearIncidenciaRequest): Observable<Incidencia> {
    return this.http.post<IncidenciaApiDto>(this.apiUrl, request).pipe(
      map(item => this.mapIncidencia(item)),
      tap(item => this.residentItems.update(items => [item, ...items])),
    );
  }

  cambiarEstado(id: number, idEstadoIncidencia: number): Observable<CambiarEstadoResponse> {
    return this.http.put<CambiarEstadoResponse>(`${this.apiUrl}/${id}/estado`, {
      idEstadoIncidencia,
    }).pipe(
      tap(response => {
        const estado = this.normalizeState(response.estado);
        this.adminItems.update(items => items.map(item =>
          item.id === id ? { ...item, estado } : item,
        ));
      }),
    );
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
    return this.adminItems().filter(item => item.estado === state).length;
  }
}
