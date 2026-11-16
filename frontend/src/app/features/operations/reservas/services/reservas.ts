
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError, catchError } from 'rxjs';

import {
  EspacioComun,
  Reserva,
  MensajeReserva,
} from '../models/reserva';

import { environment } from '../../../../../environments/environment';

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
  private readonly apiUrl = `${environment.apiUrl}/api`;

  // ——— Estado reactivo local ———
  private readonly _reservas = signal<Reserva[]>([]);
  private readonly _espacios = signal<EspacioComun[]>([]);
  private readonly _mensajes = signal<MensajeReserva[]>([]);
  private readonly _cargando = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly reservas = this._reservas.asReadonly();
  readonly espacios = this._espacios.asReadonly();
  readonly mensajes = this._mensajes.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();

  readonly pendientes = computed(() =>
    this._reservas().filter(r => r.estado === 'pendiente'),
  );

  readonly confirmadas = computed(() =>
    this._reservas().filter(r => r.estado === 'confirmada'),
  );

  readonly espaciosActivos = computed(() =>
    this._espacios().filter(e => e.activo),
  );

  readonly totalReservas = computed(() => this._reservas().length);

  // ——— Espacios comunes ———

  cargarEspacios(): Observable<EspacioComun[]> {
    return this.http.get<EspacioComun[]>(`${this.apiUrl}/espacios-comunes`).pipe(
      tap(espacios => this._espacios.set(espacios)),
    );
  }

  // ——— Reservas: Residente ———

  cargarMisReservas(): Observable<Reserva[]> {
    this._cargando.set(true);
    return this.http.get<Reserva[]>(`${this.apiUrl}/reservas/mis-reservas`).pipe(
      tap(reservas => {
        this._reservas.set(reservas);
        this._cargando.set(false);
      }),
      catchError(err => {
        this._cargando.set(false);
        return throwError(() => err);
      }),
    );
  }

  // ——— Reservas: Administrador ———

  cargarTodasLasReservas(): Observable<Reserva[]> {
    this._cargando.set(true);
    return this.http.get<Reserva[]>(`${this.apiUrl}/reservas`).pipe(
      tap(reservas => {
        this._reservas.set(reservas);
        this._cargando.set(false);
      }),
      catchError(err => {
        this._cargando.set(false);
        return throwError(() => err);
      }),
    );
  }

  // ——— Crear reserva (residente) ———

  crear(datos: CrearReserva): Observable<Reserva> {
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
      tap(reserva => this._reservas.update(lista => [reserva, ...lista])),
    );
  }

  // ——— Crear evento comunitario (administrador) ———

  crearEventoAdmin(datos: CrearEventoAdmin): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.apiUrl}/reservas/admin`, datos).pipe(
      tap(reserva => this._reservas.update(lista => [reserva, ...lista])),
    );
  }

  // ——— Editar reserva (residente) ———

  editar(id: number, datos: EditarReserva): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.apiUrl}/reservas/${id}`, datos).pipe(
      tap(reserva => this._reservas.update(lista =>
        lista.map(r => r.id === id ? reserva : r),
      )),
    );
  }

  // ——— Cambiar estado (admin) ———

  confirmar(id: number): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.apiUrl}/reservas/${id}/confirmar`, {}).pipe(
      tap(reserva => this._reservas.update(lista =>
        lista.map(r => r.id === id ? reserva : r),
      )),
    );
  }

  rechazar(id: number, motivo?: string): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.apiUrl}/reservas/${id}/rechazar`, { motivo }).pipe(
      tap(reserva => this._reservas.update(lista =>
        lista.map(r => r.id === id ? reserva : r),
      )),
    );
  }

  cancelar(id: number): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.apiUrl}/reservas/${id}/cancelar`, {}).pipe(
      tap(reserva => this._reservas.update(lista =>
        lista.map(r => r.id === id ? reserva : r),
      )),
    );
  }

  // ——— Mensajes (chat) ———

  cargarMensajes(reservaId: number): Observable<MensajeReserva[]> {
    return this.http.get<MensajeReserva[]>(`${this.apiUrl}/reservas/${reservaId}/mensajes`).pipe(
      tap(mensajes => this._mensajes.set(mensajes)),
    );
  }

  mensajesDe(reservaId: number): MensajeReserva[] {
    return this._mensajes().filter(m => m.reservaId === reservaId);
  }

  enviarMensaje(reservaId: number, contenido: string): Observable<MensajeReserva> {
    return this.http.post<MensajeReserva>(
      `${this.apiUrl}/reservas/${reservaId}/mensajes`,
      { contenido },
    ).pipe(
      tap(mensaje => this._mensajes.update(lista => [...lista, mensaje])),
    );
  }

  // ——— Ayudantes ———

  reservasDeUsuario(usuarioId: string): Reserva[] {
    return this._reservas()
      .filter(r => r.usuarioId === usuarioId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  reservasDeEspacio(espacioId: number): Reserva[] {
    return this._reservas().filter(r =>
      r.espacioId === espacioId &&
      ['pendiente', 'confirmada'].includes(r.estado),
    );
  }

  // Usado por templates para mostrar el nombre del espacio por ID
  nombreEspacio(espacioId: number): string {
    return this._espacios().find(e => e.id === espacioId)?.nombre ?? 'Espacio';
  }

  // Limpiar mensajes al cambiar de reserva
  limpiarMensajes(): void {
    this._mensajes.set([]);
  }
}
