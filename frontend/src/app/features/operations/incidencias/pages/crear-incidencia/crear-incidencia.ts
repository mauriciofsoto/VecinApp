
import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import { SelectComponent, SelectOption } from '../../../../../shared/components/atoms/select/select';
import { FormLayout } from '../../../../../shared/components/molecules/form-layout/form-layout';
import { MediaAttachments } from '../../../../../shared/components/molecules/media-attachments/media-attachments';

import { PrioridadIncidencia } from '../../models/incidencia';

export interface CrearIncidenciaPayload {
  titulo: string;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  prioridad: PrioridadIncidencia;
  adjuntos: File[];
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
    MediaAttachments,
  ],
  templateUrl: './crear-incidencia.html',
  styleUrl: './crear-incidencia.scss',
})
export class CrearIncidencia {
  readonly guardar = output<CrearIncidenciaPayload>();

  protected readonly titulo = signal('');
  protected readonly descripcion = signal('');
  protected readonly categoria = signal('');
  protected readonly ubicacion = signal('');
  protected readonly prioridad = signal<PrioridadIncidencia>('media');
  protected readonly adjuntos = signal<File[]>([]);

  protected readonly error = signal('');

  protected readonly categorias: SelectOption[] = [
    { label: 'Mantenimiento', value: 'Mantenimiento' },
  ];

  protected readonly prioridades: SelectOption[] = [
    { label: 'Baja', value: 'baja' },
    { label: 'Media', value: 'media' },
    { label: 'Alta', value: 'alta' },
  ];

  protected actualizarAdjuntos(archivos: File[]): void {
    this.adjuntos.set(archivos);
  }

  protected publicarIncidencia(): void {
    this.error.set('');

    const titulo = this.titulo().trim();
    const descripcion = this.descripcion().trim();
    const categoria = this.categoria();
    const ubicacion = this.ubicacion().trim();

    if (!titulo || !descripcion || !categoria || !ubicacion) {
      this.error.set('Completá todos los campos obligatorios.');
      return;
    }

    this.guardar.emit({
      titulo,
      descripcion,
      categoria,
      ubicacion,
      prioridad: this.prioridad(),
      adjuntos: this.adjuntos(),
    });
  }

  protected limpiarFormulario(): void {
    this.titulo.set('');
    this.descripcion.set('');
    this.categoria.set('');
    this.ubicacion.set('');
    this.prioridad.set('media');
    this.adjuntos.set([]);
    this.error.set('');
  }
}
