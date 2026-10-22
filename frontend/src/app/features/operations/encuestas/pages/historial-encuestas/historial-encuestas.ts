import { Component, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Badge } from '../../../../../shared/components/ui/badge/badge';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../../../shared/components/ui/card/card.component';

import { EventEmitter, Output } from '@angular/core';

type EstadoEncuesta = 'en-proceso' | 'cerrada';

export interface Encuesta {
  id: string;
  titulo: string;
  descripcion: string;
  estado: EstadoEncuesta;
  fechaPublicacion: string;
  fechaLimite: string | null;
  votacionActiva: boolean;
  comentariosActivos: boolean;
  prioritaria: boolean;
  totalVotos: number;
  opciones: string[];
}

@Component({
  selector: 'app-historial-encuestas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Badge,
    ButtonComponent,
    CardComponent,
  ],
  templateUrl: './historial-encuestas.html',
  styleUrl: './historial-encuestas.scss',
})
export class HistorialEncuestas {
  // Evento que avisa al componente padre que debe abrir el modal
  readonly solicitarCrear = output<void>();


  readonly encuestas = signal<Encuesta[]>([]);

  readonly estadoFiltro = signal<'todas' | EstadoEncuesta>('todas');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');

  readonly totalEnProceso = computed(
    () => this.encuestas().filter((e) => e.estado === 'en-proceso').length,
  );

  readonly totalCerradas = computed(
    () => this.encuestas().filter((e) => e.estado === 'cerrada').length,
  );

  readonly encuestasFiltradas = computed(() => {
    const estado = this.estadoFiltro();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();

    return this.encuestas().filter((e) => {
      const coincideEstado = estado === 'todas' || e.estado === estado;
      const coincideDesde = !desde || e.fechaPublicacion >= desde;
      const coincideHasta = !hasta || e.fechaPublicacion <= hasta;
      return coincideEstado && coincideDesde && coincideHasta;
    });
  });

  abrirModalCrear(): void {
    this.solicitarCrear.emit();
  }

  agregarEncuestaCreada(nuevaEncuesta: Encuesta): void {
    this.encuestas.update((list) => [nuevaEncuesta, ...list]);
  }

  cerrarEncuesta(id: string): void {
    this.encuestas.update((list) =>
      list.map((e) => (e.id === id ? { ...e, estado: 'cerrada' } : e)),
    );
  }

  limpiarFiltros(): void {
    this.estadoFiltro.set('todas');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
  }
}