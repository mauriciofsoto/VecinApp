import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Incidencia } from '../../models/incidencia';
import { Incidencias } from '../../services/incidencias';

import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../../../shared/components/ui/card/card.component';

import { CrearIncidencia } from '../crear-incidencia/crear-incidencia';
import { Modal } from '../../../../../shared/components/ui/modal/modal';



@Component({
  selector: 'app-historial-incidencias',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    CardComponent,
    CrearIncidencia,
    Modal
  ],
  templateUrl: './historial-incidencias.html',
  styleUrl: './historial-incidencias.scss'
})
export class HistorialIncidencias implements OnInit {
  private readonly incidenciasService = inject(Incidencias);

  readonly incidencias = this.incidenciasService.incidencias;

  // Reutilizamos los contadores del servicio.
  readonly totalIncidencias = this.incidenciasService.totalIncidencias;
  readonly pendientes = this.incidenciasService.totalPendientes;
  readonly enProceso = this.incidenciasService.totalEnProceso;
  readonly resueltas = this.incidenciasService.totalResueltas;

  readonly modalAbierto = signal(false);

  readonly busqueda = signal('');
  readonly estadoSeleccionado = signal('todos');

  readonly incidenciasFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const estado = this.estadoSeleccionado();

    return this.incidencias()
      .filter((incidencia: Incidencia) => {
        const coincideBusqueda = [
          incidencia.titulo,
          incidencia.categoria,
          incidencia.ubicacion
        ].some(valor => valor.toLowerCase().includes(termino));

        const coincideEstado =
          estado === 'todos' || incidencia.estado === estado;

        return coincideBusqueda && coincideEstado;
      })
      .sort(
        (a, b) =>
          new Date(b.fechaCreacion).getTime() -
          new Date(a.fechaCreacion).getTime()
      );
  });
  ngOnInit(): void {
  this.incidenciasService.cargar().subscribe({
    error: (error) => {
      console.error('Error al cargar incidencias:', error);
    },
  });
}



  abrirModal(): void {
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarEstado(valor: string): void {
    this.estadoSeleccionado.set(valor);
  }

  obtenerEstado(estado: string): string {
    const estados: Record<string, string> = {
      pendiente: 'Pendiente',
      'en-proceso': 'En proceso',
      resuelta: 'Resuelta',
      rechazada: 'Rechazada'
    };

    return estados[estado] ?? estado;
  }
}
