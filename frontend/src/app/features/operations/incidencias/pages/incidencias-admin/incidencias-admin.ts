import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Incidencia,
  EstadoIncidencia,
} from '../../models/incidencia';

import { Incidencias } from '../../services/incidencias';

import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../../../shared/components/ui/card/card.component';
import { Modal } from '../../../../../shared/components/ui/modal/modal';

@Component({
  selector: 'app-incidencias-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    Modal,
  ],
  templateUrl: './incidencias-admin.html',
  styleUrl: './incidencias-admin.scss',
})
export class IncidenciasAdmin {
  private readonly incidenciasService = inject(Incidencias);

  readonly incidencias = this.incidenciasService.incidencias;

  readonly totalIncidencias = this.incidenciasService.totalIncidencias;
  readonly pendientes = this.incidenciasService.totalPendientes;
  readonly enProceso = this.incidenciasService.totalEnProceso;
  readonly resueltas = this.incidenciasService.totalResueltas;

  readonly busqueda = signal('');
  readonly estadoSeleccionado = signal('todos');
  readonly categoriaSeleccionada = signal('todas');

  readonly incidenciaSeleccionada = signal<Incidencia | null>(null);
  readonly estadoNuevo = signal<EstadoIncidencia>('pendiente');

  readonly modalDetalleAbierto = signal(false);

  readonly incidenciasFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const estado = this.estadoSeleccionado();
    const categoria = this.categoriaSeleccionada();

    return this.incidencias()
      .filter((incidencia) => {
        const coincideBusqueda = [
          incidencia.titulo,
          incidencia.descripcion,
          incidencia.categoria,
          incidencia.ubicacion,
          incidencia.usuarioNombre,
        ].some((valor) => valor.toLowerCase().includes(termino));

        const coincideEstado =
          estado === 'todos' || incidencia.estado === estado;

        const coincideCategoria =
          categoria === 'todas' ||
          incidencia.categoria === categoria;

        return (
          coincideBusqueda &&
          coincideEstado &&
          coincideCategoria
        );
      })
      .sort(
        (a, b) =>
          new Date(b.fechaCreacion).getTime() -
          new Date(a.fechaCreacion).getTime(),
      );
  });

  readonly categorias = computed(() => [
    ...new Set(
      this.incidencias().map((incidencia) => incidencia.categoria),
    ),
  ]);

  verIncidencia(incidencia: Incidencia): void {
    this.incidenciaSeleccionada.set(incidencia);
    this.estadoNuevo.set(incidencia.estado);
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.incidenciaSeleccionada.set(null);
  }

  cambiarEstado(estado: EstadoIncidencia): void {
    this.estadoNuevo.set(estado);
  }

  guardarEstado(): void {
    const incidencia = this.incidenciaSeleccionada();

    if (!incidencia) return;

    this.incidenciasService.cambiarEstado(
      incidencia.id,
      this.estadoNuevo(),
    );

    this.cerrarDetalle();
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoSeleccionado.set(valor);
  }

  actualizarCategoriaFiltro(valor: string): void {
    this.categoriaSeleccionada.set(valor);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoSeleccionado.set('todos');
    this.categoriaSeleccionada.set('todas');
  }

  obtenerEstado(estado: EstadoIncidencia): string {
    const estados: Record<EstadoIncidencia, string> = {
      pendiente: 'Pendiente',
      'en-proceso': 'En proceso',
      resuelta: 'Resuelta',
      rechazada: 'Rechazada',
    };

    return estados[estado];
  }
}
