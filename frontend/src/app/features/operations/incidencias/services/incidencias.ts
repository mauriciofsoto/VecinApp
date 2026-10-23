import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import {
  Incidencia,
  EstadoIncidencia,
  PrioridadIncidencia,
} from '../models/incidencia';

interface IncidenciaApi {
  id: number;
  titulo: string;
  descripcion: string;
  prioridad: string;
  fechaCreacion: string;
  edificio?: string;
  reportante?: string;
  estado: string;
  categoria: string;
}

interface CrearIncidenciaRequest {
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
}

@Injectable({
  providedIn: 'root',
})
export class Incidencias {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:5062/incidencias';

  private readonly incidenciasState = signal<Incidencia[]>([]);
  readonly incidencias = this.incidenciasState.asReadonly();

  readonly totalIncidencias = computed(() => this.incidenciasState().length);

  readonly totalPendientes = computed(
    () => this.incidenciasState().filter(
      (i) => i.estado === 'pendiente',
    ).length,
  );

  readonly totalEnProceso = computed(
    () => this.incidenciasState().filter(
      (i) => i.estado === 'en-proceso',
    ).length,
  );

  readonly totalResueltas = computed(
    () => this.incidenciasState().filter(
      (i) => i.estado === 'resuelta',
    ).length,
  );

  cargar(): Observable<IncidenciaApi[]> {
    return this.http.get<IncidenciaApi[]>(this.apiUrl).pipe(
      tap((respuesta) => {
        const incidencias: Incidencia[] = respuesta.map((item) => ({
          id: item.id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          categoria: item.categoria,
          ubicacion: item.edificio ?? '',
          estado: this.normalizarEstado(item.estado),
          prioridad: this.normalizarPrioridad(item.prioridad),
          fechaCreacion: item.fechaCreacion,
          usuarioId: 0,
          usuarioNombre: item.reportante ?? '',
        }));

        this.incidenciasState.set(incidencias);
      }),
    );
  }

  crear(datos: CrearIncidenciaRequest): Observable<IncidenciaApi> {
    return this.http.post<IncidenciaApi>(this.apiUrl, datos).pipe(
      tap(() => {
        // Se recarga la lista después de crear la incidencia.
        this.cargar().subscribe({
          error: (error) => {
            console.error('Error al actualizar las incidencias:', error);
          },
        });
      }),
    );
  }

  cambiarEstado(id: number, estado: EstadoIncidencia): void {
    this.incidenciasState.update((lista) =>
      lista.map((incidencia) =>
        incidencia.id === id ? { ...incidencia, estado } : incidencia,
      ),
    );
  }

  private normalizarEstado(estado: string): EstadoIncidencia {
    const valor = estado.toLowerCase().trim();

    const estados: Record<string, EstadoIncidencia> = {
      pendiente: 'pendiente',
      'en proceso': 'en-proceso',
      'en-proceso': 'en-proceso',
      resuelta: 'resuelta',
      resuelto: 'resuelta',
      rechazada: 'rechazada',
    };

    return estados[valor] ?? 'pendiente';
  }

  private normalizarPrioridad(
    prioridad: string,
  ): PrioridadIncidencia {
    const valor = prioridad.toLowerCase().trim();

    if (valor === 'alta' || valor === 'baja') {
      return valor;
    }

    return 'media';
  }
}
