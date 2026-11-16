import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EncuestasService } from '../../services/encuestas';

import { Feed } from '../../../../community/feed/services/feed';

import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import { MediaAttachments } from '../../../../../shared/components/molecules/media-attachments/media-attachments';

export type TipoPublicacion = 'aviso' | 'encuesta';

@Component({
  selector: 'app-formulario-publicacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    InputComponent,
    MediaAttachments,
  ],
  templateUrl: './formulario-publicacion.html',
  styleUrl: './formulario-publicacion.scss',
})
export class FormularioPublicacion {
  private readonly encuestasService = inject(EncuestasService);
  private readonly feedService = inject(Feed);

  readonly publicada = output<void>();

  tipoPublicacion: TipoPublicacion = 'encuesta';

  titulo = '';
  descripcion = '';
  opciones: string[] = ['', ''];

  comentariosActivos = true;
  prioritaria = false;
  establecerVencimiento = false;
  fechaLimite = '';
  errorFormulario = '';

  readonly fechaActual = this.obtenerFechaLocal();
  readonly archivosAdjuntos = signal<File[]>([]);

  cambiarTipo(tipo: TipoPublicacion): void {
    this.tipoPublicacion = tipo;
    this.errorFormulario = '';

    if (tipo === 'aviso') {
      this.comentariosActivos = true;
    }
  }

  cambiarArchivosAdjuntos(archivos: File[]): void {
    this.archivosAdjuntos.set(archivos);
  }

  agregarOpcion(): void {
    this.opciones = [...this.opciones, ''];
  }

  eliminarOpcion(indice: number): void {
    if (this.opciones.length <= 2) return;

    this.opciones = this.opciones.filter(
      (_, index) => index !== indice,
    );
  }

  publicar(): void {
    this.errorFormulario = '';

    const titulo = this.titulo.trim();
    const descripcion = this.descripcion.trim();

    if (!titulo) {
      this.errorFormulario = 'Ingresá un título.';
      return;
    }

    if (!descripcion) {
      this.errorFormulario = 'Agregá una descripción.';
      return;
    }

    if (this.establecerVencimiento && !this.fechaLimite) {
      this.errorFormulario = 'Seleccioná una fecha límite.';
      return;
    }

    if (
      this.establecerVencimiento &&
      this.fechaLimite < this.fechaActual
    ) {
      this.errorFormulario =
        'La fecha límite no puede estar en el pasado.';
      return;
    }

    if (this.tipoPublicacion === 'aviso') {
      this.publicarAviso(titulo, descripcion);
      return;
    }

    const opcionesValidas = this.opciones
      .map(opcion => opcion.trim())
      .filter(Boolean);

    if (opcionesValidas.length < 2) {
      this.errorFormulario =
        'Una encuesta necesita al menos dos opciones válidas.';
      return;
    }

    this.publicarEncuesta(titulo, descripcion, opcionesValidas);
  }

  private publicarAviso(titulo: string, descripcion: string): void {
    this.feedService.createAdministrativePublication({
      titulo,
      tipo: 'aviso',
      contenido: descripcion,
      prioritaria: this.prioritaria,
      comentariosActivos: this.comentariosActivos,
      fechaLimite: this.establecerVencimiento ? this.fechaLimite : undefined,
    }).subscribe({
      next: () => {
        this.feedService.loadPosts();
        this.finalizarPublicacion();
      },
      error: () => {
        this.errorFormulario = 'No se pudo publicar el aviso. Intentá nuevamente.';
      },
    });
  }

  private publicarEncuesta(
    titulo: string,
    descripcion: string,
    opciones: string[],
  ): void {
    this.encuestasService.publicar({
      titulo,
      descripcion,
      opciones,
      comentariosActivos: this.comentariosActivos,
      prioritaria: this.prioritaria,
      fechaLimite: this.establecerVencimiento ? this.fechaLimite : undefined,
    }).subscribe({
      next: () => {
        this.feedService.loadPosts();
        this.finalizarPublicacion();
      },
      error: () => {
        this.errorFormulario = 'No se pudo publicar la encuesta. Intentá nuevamente.';
      },
    });
  }

  private finalizarPublicacion(): void {
    this.limpiarFormulario();
    this.publicada.emit();
  }

  limpiarFormulario(): void {
    this.tipoPublicacion = 'encuesta';
    this.titulo = '';
    this.descripcion = '';
    this.opciones = ['', ''];
    this.comentariosActivos = true;
    this.prioritaria = false;
    this.establecerVencimiento = false;
    this.fechaLimite = '';
    this.errorFormulario = '';
    this.archivosAdjuntos.set([]);
  }

  private obtenerFechaLocal(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }
}
