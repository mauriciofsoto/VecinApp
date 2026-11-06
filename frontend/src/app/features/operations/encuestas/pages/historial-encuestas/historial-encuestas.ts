import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Badge } from '../../../../../shared/components/atoms/badge/badge';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/components/atoms/card/card.component';
import { SelectOption } from '../../../../../shared/components/atoms/select/select';
import { EmptyState } from '../../../../../shared/components/molecules/empty-state/empty-state';
import { PollStatistics } from '../../../../../shared/components/organisms/poll-statistics/poll-statistics';
import { PollOption } from '../../../../../shared/models/poll-option.model';
import {
  SearchBar,
  SearchBarFilters,
} from '../../../../../shared/components/molecules/search-bar/search-bar';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';

import { EncuestaAdmin, EstadoEncuesta } from '../../models/encuesta.model';
import { EncuestasService } from '../../services/encuestas';
import { FormularioPublicacion } from '../../components/formulario-publicacion/formulario-publicacion';

@Component({
  selector: 'app-historial-encuestas',
  standalone: true,
  imports: [
    CommonModule,
    Badge,
    ButtonComponent,
    CardComponent,
    EmptyState,
    SearchBar,
    PollStatistics,
    Modal,
    FormularioPublicacion,
  ],
  templateUrl: './historial-encuestas.html',
  styleUrl: './historial-encuestas.scss',
})
export class HistorialEncuestas {
  private readonly encuestasService = inject(EncuestasService);

  readonly isModalCrearOpen = signal(false);

  readonly encuestas = this.encuestasService.encuestas;

  readonly filtros = signal<SearchBarFilters>({
    search: '',
    status: null,
    dateFrom: '',
    dateTo: '',
    sort: 'recent',
  });

  readonly estadosFiltro: SelectOption<EstadoEncuesta>[] = [
    { label: 'En proceso', value: 'en-proceso' },
    { label: 'Cerradas', value: 'cerrada' },
  ];

  readonly totalEnProceso = computed(
    () => this.encuestas().filter(e => e.estado === 'en-proceso').length,
  );

  readonly totalCerradas = computed(
    () => this.encuestas().filter(e => e.estado === 'cerrada').length,
  );

  readonly encuestasFiltradas = computed(() => {
    const { search, status, dateFrom, dateTo, sort } = this.filtros();
    const termino = search.trim().toLocaleLowerCase();

    return this.encuestas()
      .filter(encuesta => {
        const coincideTexto = [encuesta.titulo, encuesta.descripcion]
          .some(valor => valor.toLocaleLowerCase().includes(termino));

        const sinEstado =
          status === null || status === undefined || status === '';

        const coincideEstado = sinEstado || encuesta.estado === status;
        const coincideDesde = !dateFrom || encuesta.fechaPublicacion >= dateFrom;
        const coincideHasta = !dateTo || encuesta.fechaPublicacion <= dateTo;

        return coincideTexto && coincideEstado && coincideDesde && coincideHasta;
      })
      .sort((a, b) => {
        const comparacion = a.fechaPublicacion.localeCompare(b.fechaPublicacion);
        return sort === 'oldest' ? comparacion : -comparacion;
      });
  });

  actualizarFiltros(filtros: SearchBarFilters): void {
    this.filtros.set(filtros);
  }

  abrirModalCrear(): void {
    this.isModalCrearOpen.set(true);
  }

  cerrarModalCrear(): void {
    this.isModalCrearOpen.set(false);
  }

  cerrarEncuesta(id: number): void {
    this.encuestasService.cerrar(id);
  }

  opcionesConResultados(encuesta: EncuestaAdmin): PollOption[] {
    const opciones = encuesta.votosPorOpcion ?? encuesta.opciones.map(
      (texto, index) => ({
        id: String(index),
        texto,
        votos: 0,
      }),
    );

    return opciones.map(opcion => ({
      id: opcion.id,
      text: opcion.texto,
      votes: opcion.votos,
      percentage: encuesta.totalVotos > 0
        ? Math.round(opcion.votos / encuesta.totalVotos * 100)
        : 0,
    }));
  }
}
