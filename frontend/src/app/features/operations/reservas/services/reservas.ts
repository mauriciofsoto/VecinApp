
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError, catchError } from 'rxjs';

import {
  EspacioComun,
  Reserva,
  MensajeReserva,
} from '../models/reserva';

import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth';

// DTO de creación (residente)
export interface CrearReserva {
  espacioId: number;
  unidadId: number | null;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cantidadParticipantes: number;
  tipoEvento: string | null;
  categoriaEvento: string | null;
}

// DTO de edición
export interface EditarReserva {
  espacioId: number;
  unidadId: number | null;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cantidadParticipantes: number;
  tipoEvento: string | null;
  categoriaEvento: string | null;
}

// DTO de creación de evento admin
export interface CrearEventoAdmin {
  espacioId: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cantidadParticipantes: number;
  categoriaEvento: string | null;
}

@Injectable({ providedIn: 'root' })
export class Reservas {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/api`;

  // ——— Estado reactivo local ———
  private readonly _reservas = signal<Reserva[]>([]);
  private readonly _espacios = signal<EspacioComun[]>([]);
  private readonly _mensajes = signal<MensajeReserva[]>([]);
  private readonly ownerSession = signal<{ userId: string | null; version: number } | null>(null);
  private readonly _cargando = signal(false);
  private readonly _error = signal<string | null>(null);

  private readonly isOwnerCurrentSession = computed(() => {
    const owner = this.ownerSession();
    return owner !== null
      && owner.userId !== null
      && owner.userId === this.auth.currentUser()?.id
      && owner.version === this.auth.sessionVersion();
  });
  readonly reservas = computed(() => this.isOwnerCurrentSession() ? this._reservas() : []);
  readonly espacios = computed(() => this.isOwnerCurrentSession() ? this._espacios() : []);
  readonly mensajes = computed(() => this.isOwnerCurrentSession() ? this._mensajes() : []);
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();

  readonly pendientes = computed(() =>
    this.reservas().filter(r => r.estado === 'pendiente'),
  );

  readonly confirmadas = computed(() =>
    this.reservas().filter(r => r.estado === 'confirmada'),
  );

  readonly espaciosActivos = computed(() =>
    this.espacios().filter(e => e.activo),
  );

  readonly totalReservas = computed(() => this.reservas().length);

  constructor() {
    effect(() => {
      this.auth.currentUser();
      this.auth.sessionVersion();
      this._reservas.set([]);
      this._mensajes.set([]);
      this._espacios.set([]);
      this.ownerSession.set(null);
      this._cargando.set(false);
      this._error.set(null);
    });
  }

  // ——— Espacios comunes ———

  cargarEspacios(): Observable<EspacioComun[]> {
    const session = this.auth.captureSession();
    return this.http.get<EspacioComun[]>(`${this.apiUrl}/espacios-comunes`).pipe(
      tap(espacios => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._espacios.set(espacios); } }),
    );
  }

  // ——— Reservas: Residente ———

  cargarMisReservas(): Observable<Reserva[]> {
    const session = this.auth.captureSession();
    this._cargando.set(true);
    return this.http.get<Reserva[]>(`${this.apiUrl}/reservas/mis-reservas`).pipe(
      tap(reservas => {
        if (!this.auth.isCurrentSession(session)) return;
        this.ownerSession.set(session);
        this._reservas.set(reservas);
        this._cargando.set(false);
      }),
      catchError(err => {
        if (this.auth.isCurrentSession(session)) this._cargando.set(false);
        return throwError(() => err);
      }),
    );
  }

  // ——— Reservas: Administrador ———

  cargarTodasLasReservas(): Observable<Reserva[]> {
    const session = this.auth.captureSession();
    this._cargando.set(true);
    return this.http.get<Reserva[]>(`${this.apiUrl}/reservas`).pipe(
      tap(reservas => {
        if (!this.auth.isCurrentSession(session)) return;
        this.ownerSession.set(session);
        this._reservas.set(reservas);
        this._cargando.set(false);
      }),
      catchError(err => {
        if (this.auth.isCurrentSession(session)) this._cargando.set(false);
        return throwError(() => err);
      }),
    );
  }

  // ——— Crear reserva (residente) ———

  crear(datos: CrearReserva): Observable<Reserva> {
    const session = this.auth.captureSession();
    const body = {
      espacioId: datos.espacioId,
      unidadId: datos.unidadId,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      fecha: datos.fecha,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      cantidadParticipantes: datos.cantidadParticipantes,
      tipoEvento: datos.tipoEvento ?? 'privado',
      categoriaEvento: datos.categoriaEvento,
    };
    return this.http.post<Reserva>(`${this.apiUrl}/reservas`, body).pipe(
      tap(reserva => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._reservas.update(lista => [reserva, ...lista]); } }),
    );
  }

  // ——— Crear evento comunitario (administrador) ———

  crearEventoAdmin(datos: CrearEventoAdmin): Observable<Reserva> {
    const session = this.auth.captureSession();
    return this.http.post<Reserva>(`${this.apiUrl}/reservas/admin`, datos).pipe(
      tap(reserva => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._reservas.update(lista => [reserva, ...lista]); } }),
    );
  }

  // ——— Editar reserva (residente) ———

  editar(id: number, datos: EditarReserva): Observable<Reserva> {
    const session = this.auth.captureSession();
    return this.http.put<Reserva>(`${this.apiUrl}/reservas/${id}`, datos).pipe(
      tap(reserva => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._reservas.update(lista => lista.map(r => r.id === id ? reserva : r)); } }),
    );
  }

  // ——— Cambiar estado (admin) ———

  confirmar(id: number): Observable<Reserva> {
    const session = this.auth.captureSession();
    return this.http.post<Reserva>(`${this.apiUrl}/reservas/${id}/confirmar`, {}).pipe(
      tap(reserva => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._reservas.update(lista => lista.map(r => r.id === id ? reserva : r)); } }),
    );
  }

  rechazar(id: number, motivo?: string): Observable<Reserva> {
    const session = this.auth.captureSession();
    return this.http.post<Reserva>(`${this.apiUrl}/reservas/${id}/rechazar`, { motivo }).pipe(
      tap(reserva => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._reservas.update(lista => lista.map(r => r.id === id ? reserva : r)); } }),
    );
  }

  cancelar(id: number): Observable<Reserva> {
    const session = this.auth.captureSession();
    return this.http.post<Reserva>(`${this.apiUrl}/reservas/${id}/cancelar`, {}).pipe(
      tap(reserva => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._reservas.update(lista => lista.map(r => r.id === id ? reserva : r)); } }),
    );
  }

  // ——— Mensajes (chat) ———

  cargarMensajes(reservaId: number): Observable<MensajeReserva[]> {
    const session = this.auth.captureSession();
    return this.http.get<MensajeReserva[]>(`${this.apiUrl}/reservas/${reservaId}/mensajes`).pipe(
      tap(mensajes => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._mensajes.update(actuales => [...actuales.filter(m => m.reservaId !== reservaId), ...mensajes]); } }),
    );
  }

  mensajesDe(reservaId: number): MensajeReserva[] {
    return this.mensajes().filter(m => m.reservaId === reservaId);
  }

  enviarMensaje(reservaId: number, contenido: string): Observable<MensajeReserva> {
    const session = this.auth.captureSession();
    return this.http.post<MensajeReserva>(
      `${this.apiUrl}/reservas/${reservaId}/mensajes`,
      { contenido },
    ).pipe(
      tap(mensaje => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this._mensajes.update(lista => [...lista, mensaje]); } }),
    );
  }

  // ——— Ayudantes ———

  reservasDeUsuario(usuarioId: string): Reserva[] {
    return this.reservas()
      .filter(r => r.usuarioId === usuarioId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  reservasDeEspacio(espacioId: number): Reserva[] {
    return this.reservas().filter(r =>
      r.espacioId === espacioId &&
      ['pendiente', 'confirmada'].includes(r.estado),
    );
  }

  // Usado por templates para mostrar el nombre del espacio por ID
  nombreEspacio(espacioId: number): string {
    return this.espacios().find(e => e.id === espacioId)?.nombre ?? 'Espacio';
  }

  // Limpiar mensajes al cambiar de reserva
  limpiarMensajes(): void {
    this._mensajes.set([]);
  }
}
