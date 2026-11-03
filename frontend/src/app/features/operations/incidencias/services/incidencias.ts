import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';

import { MensajeIncidencia } from '../models/mensaje-incidencia';
import {
  Incidencia,
  EstadoIncidencia,
  PrioridadIncidencia,
} from '../models/incidencia';

export interface CrearIncidenciaRequest {
  titulo: string;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  prioridad: PrioridadIncidencia;
  adjuntos?: File[];
}

@Injectable({
  providedIn: 'root',
})
export class Incidencias {
  // Usuario simulado para probar la experiencia de usuario.
  private readonly usuarioActualId = 1;
  private readonly usuarioActualNombre = 'Usuario de prueba';

  private readonly incidenciasState = signal<Incidencia[]>([
    {
      id: 1,
      titulo: 'Filtración en el techo',
      descripcion: 'Hay una filtración de agua en el techo del pasillo.',
      categoria: 'Mantenimiento',
      ubicacion: 'Unidad 2B',
      estado: 'pendiente',
      prioridad: 'alta',
      fechaCreacion: '2026-10-28T10:30:00',
      usuarioId: 1,
      usuarioNombre: 'Usuario de prueba',
    },
    {
      id: 2,
      titulo: 'Problema con el ascensor',
      descripcion: 'El ascensor se detiene entre los pisos.',
      categoria: 'Mantenimiento',
      ubicacion: 'Torre A',
      estado: 'en-proceso',
      prioridad: 'alta',
      fechaCreacion: '2026-10-27T15:20:00',
      usuarioId: 1,
      usuarioNombre: 'Usuario de prueba',
    },
    {
      id: 3,
      titulo: 'Luces apagadas',
      descripcion: 'Las luces de la entrada principal no funcionan.',
      categoria: 'Mantenimiento',
      ubicacion: 'Entrada principal',
      estado: 'resuelta',
      prioridad: 'media',
      fechaCreacion: '2026-10-25T09:00:00',
      usuarioId: 2,
      usuarioNombre: 'Carlos Fernández',
    },
    {
      id: 4,
      titulo: 'Limpieza de espacios comunes',
      descripcion: 'Solicito revisar la limpieza del sector de cocheras.',
      categoria: 'Mantenimiento',
      ubicacion: 'Cocheras',
      estado: 'pendiente',
      prioridad: 'baja',
      fechaCreacion: '2026-10-24T12:00:00',
      usuarioId: 2,
      usuarioNombre: 'Carlos Fernández',
    },
  ]);

  private readonly mensajesState = signal<MensajeIncidencia[]>([]);

  readonly incidencias = this.incidenciasState.asReadonly();
  readonly mensajes = this.mensajesState.asReadonly();

  // Incidencias del usuario simulado.
  readonly misIncidencias = computed(() =>
    this.incidenciasState().filter(
      (incidencia) => incidencia.usuarioId === this.usuarioActualId,
    ),
  );

  // Estadísticas generales para administración.
  readonly totalIncidencias = computed(
    () => this.incidenciasState().length,
  );

  readonly totalPendientes = computed(
    () =>
      this.incidenciasState().filter(
        (i) => i.estado === 'pendiente',
      ).length,
  );

  readonly totalEnProceso = computed(
    () =>
      this.incidenciasState().filter(
        (i) => i.estado === 'en-proceso',
      ).length,
  );

  readonly totalResueltas = computed(
    () =>
      this.incidenciasState().filter(
        (i) => i.estado === 'resuelta',
      ).length,
  );

  // Simula la carga de incidencias sin realizar peticiones HTTP.
  cargar(): Observable<Incidencia[]> {
    return of(this.incidenciasState()).pipe(delay(200));
  }

  // Devuelve los mensajes de una incidencia.
  cargarMensajes(
    incidenciaId: number,
  ): Observable<MensajeIncidencia[]> {
    const mensajes = this.mensajesState().filter(
      (mensaje) => mensaje.incidenciaId === incidenciaId,
    );

    return of(mensajes).pipe(delay(200));
  }

  // Guarda un mensaje en memoria.
  enviarMensaje(
    datos: Omit<MensajeIncidencia, 'id' | 'fechaCreacion'>,
  ): Observable<MensajeIncidencia> {
    const nuevoMensaje: MensajeIncidencia = {
      ...datos,
      id: this.generarIdMensaje(),
      fechaCreacion: new Date().toISOString(),
    };

    return of(nuevoMensaje).pipe(
      delay(200),
      tap((mensaje) => {
        this.mensajesState.update((lista) => [...lista, mensaje]);
      }),
    );
  }

  // Crea una incidencia en memoria.
  crear(datos: CrearIncidenciaRequest): Observable<Incidencia> {
    const nuevaIncidencia: Incidencia = {
      id: this.generarId(),
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      categoria: datos.categoria,
      ubicacion: datos.ubicacion,
      prioridad: datos.prioridad,
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
      usuarioId: this.usuarioActualId,
      usuarioNombre: this.usuarioActualNombre,
    };

    return of(nuevaIncidencia).pipe(
      delay(200),
      tap((incidencia) => {
        this.incidenciasState.update((lista) => [
          incidencia,
          ...lista,
        ]);
      }),
    );
  }

  // Actualiza el estado de una incidencia.
  cambiarEstado(
    id: number,
    estado: EstadoIncidencia,
  ): void {
    this.incidenciasState.update((lista) =>
      lista.map((incidencia) =>
        incidencia.id === id
          ? { ...incidencia, estado }
          : incidencia,
      ),
    );
  }

  private generarId(): number {
    return Math.max(
      0,
      ...this.incidenciasState().map((incidencia) => incidencia.id),
    ) + 1;
  }

  private generarIdMensaje(): number {
    return Math.max(
      0,
      ...this.mensajesState().map((mensaje) => mensaje.id),
    ) + 1;
  }
}