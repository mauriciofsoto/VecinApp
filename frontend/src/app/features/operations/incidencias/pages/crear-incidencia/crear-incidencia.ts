
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import { SelectComponent, SelectOption } from '../../../../../shared/components/atoms/select/select';
import { FormLayout } from '../../../../../shared/components/molecules/form-layout/form-layout';
import { PrioridadIncidencia } from '../../models/incidencia';
import {
  CategoriaIncidenciaDto,
  UnidadDisponibleDto,
} from '../../services/incidencias';

export interface CrearIncidenciaPayload {
  titulo: string;
  descripcion: string;
  idCategoriaIncidencia: number;
  idUnidad: number | null;
  ubicacion: string;
  prioridad: PrioridadIncidencia;
}

@Component({
  selector: 'app-crear-incidencia',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    FormLayout,
  ],
  templateUrl: './crear-incidencia.html',
  styleUrl: './crear-incidencia.scss',
})
export class CrearIncidencia {
  readonly categoriasDisponibles = input<CategoriaIncidenciaDto[]>([]);
  readonly unidadesDisponibles = input<UnidadDisponibleDto[]>([]);
  readonly enviando = input(false);
  readonly guardar = output<CrearIncidenciaPayload>();

  protected readonly titulo = signal('');
  protected readonly descripcion = signal('');
  protected readonly categoria = signal('');
  protected readonly idUnidadSeleccionada = signal('');
  protected readonly ubicacion = signal('');
  protected readonly prioridad = signal<PrioridadIncidencia>('media');
  protected readonly error = signal('');

  protected readonly categorias = computed<SelectOption[]>(() =>
    this.categoriasDisponibles().map(categoria => ({
      label: categoria.nombre,
      value: String(categoria.idCategoriaIncidencia),
    })),
  );

  protected readonly unidades = computed<SelectOption[]>(() => [
    ...this.unidadesDisponibles().map(unidad => ({
      label: `Piso ${unidad.piso} - Unidad ${unidad.identificacion}`,
      value: String(unidad.idUnidad),
    })),
    {
      label: 'Espacios comunes',
      value: 'comunes',
    },
  ]);

  protected readonly prioridades: SelectOption[] = [
    { label: 'Baja', value: 'baja' },
    { label: 'Media', value: 'media' },
    { label: 'Alta', value: 'alta' },
  ];

  protected publicarIncidencia(): void {
    this.error.set('');

    const titulo = this.titulo().trim();
    const descripcion = this.descripcion().trim();
    const idCategoriaIncidencia = Number(this.categoria());
    const seleccionUnidad = this.idUnidadSeleccionada();
    const ubicacion = this.ubicacion().trim();

    if (
      !titulo ||
      !descripcion ||
      !Number.isInteger(idCategoriaIncidencia) ||
      idCategoriaIncidencia <= 0 ||
      !seleccionUnidad ||
      !ubicacion
    ) {
      this.error.set('Completá todos los campos obligatorios.');
      return;
    }

    const idUnidad = seleccionUnidad === 'comunes'
      ? null
      : Number(seleccionUnidad);

    if (
      seleccionUnidad !== 'comunes' &&
      (!Number.isInteger(idUnidad) || idUnidad! <= 0)
    ) {
      this.error.set('Seleccioná una unidad válida.');
      return;
    }

    this.guardar.emit({
      titulo,
      descripcion,
      idCategoriaIncidencia,
      idUnidad,
      ubicacion,
      prioridad: this.prioridad(),
    });
  }

  protected limpiarFormulario(): void {
    this.titulo.set('');
    this.descripcion.set('');
    this.categoria.set('');
    this.idUnidadSeleccionada.set('');
    this.ubicacion.set('');
    this.prioridad.set('media');
    this.error.set('');
  }
}
