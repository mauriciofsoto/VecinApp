
import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Incidencia, EstadoIncidencia } from '../../models/incidencia';

import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../shared/components/atoms/select/select';

@Component({
  selector: 'app-historial-incidencias',
  standalone: true,
  imports: [CommonModule, InputComponent, SelectComponent],
  templateUrl: './historial-incidencias.html',
  styleUrl: './historial-incidencias.scss',
})
export class HistorialIncidencias {
  readonly incidencias = input.required<Incidencia[]>();
  readonly mostrarReportante = input(false);

  readonly abrirConversacion = output<Incidencia>();

  protected readonly busqueda = signal('');
  protected readonly estadoSeleccionado = signal('todos');

  protected readonly opcionesEstado: SelectOption[] = [
    { label: 'Todos los estados', value: 'todos' },
    { label: 'Pendientes', value: 'pendiente' },
    { label: 'En proceso', value: 'en-proceso' },
    { label: 'Resueltas', value: 'resuelta' },
    { label: 'Rechazadas', value: 'rechazada' },
  ];

  protected readonly incidenciasFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const estado = this.estadoSeleccionado();

    return this.incidencias()
      .filter((incidencia) => {
        const campos = [
          incidencia.titulo,
          incidencia.descripcion,
          incidencia.categoria,
          incidencia.ubicacion,
          ...(this.mostrarReportante() ? [incidencia.usuarioNombre] : []),
        ];

        const coincideBusqueda = campos.some((valor) =>
          (valor ?? '').toLowerCase().includes(termino),
        );

        const coincideEstado =
          estado === 'todos' || incidencia.estado === estado;

        return coincideBusqueda && coincideEstado;
      })
      .sort(
        (a, b) =>
          new Date(b.fechaCreacion).getTime() -
          new Date(a.fechaCreacion).getTime(),
      );
  });

  protected obtenerEstado(estado: EstadoIncidencia): string {
    const estados: Record<EstadoIncidencia, string> = {
      pendiente: 'Pendiente',
      'en-proceso': 'En proceso',
      resuelta: 'Resuelta',
      rechazada: 'Rechazada',
    };

    return estados[estado];
  }

  protected solicitarConversacion(incidencia: Incidencia): void {
    if (incidencia.estado === 'en-proceso') {
      this.abrirConversacion.emit(incidencia);
    }
  }

  protected actualizarBusqueda(valor: string | number): void {
  this.busqueda.set(String(valor));
}

protected actualizarEstado(valor: unknown): void {
  if (typeof valor === 'string') {
    this.estadoSeleccionado.set(valor);
  }
}
}
