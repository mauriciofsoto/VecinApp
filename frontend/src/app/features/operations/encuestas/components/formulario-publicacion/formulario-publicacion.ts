import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EncuestaAdmin } from '../../models/encuesta.model';
import { EncuestasService } from '../../services/encuestas';
import { AuthService } from '../../../../../core/services/auth';
import { Feed } from '../../../../community/feed/services/feed';
import {
  AuthorRole,
  PostAttachment,
} from '../../../../community/feed/models/post';

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
  private readonly auth = inject(AuthService);

  readonly esAdministrador = this.auth.hasRole('Administrador');
  readonly publicada = output<void>();

  tipoPublicacion: TipoPublicacion = 'encuesta';

  titulo = '';
  descripcion = '';
  opciones: string[] = ['', ''];

  prioritaria = false;
  establecerVencimiento = false;
  fechaLimite = '';
  errorFormulario = '';

  readonly fechaActual = this.obtenerFechaLocal();
  readonly archivosAdjuntos = signal<File[]>([]);

  cambiarTipo(tipo: TipoPublicacion): void {
    this.tipoPublicacion = tipo;
    this.errorFormulario = '';
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
    if (!this.esAdministrador) {
      this.prioritaria = false;
    }
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

  private obtenerAdjuntos(): PostAttachment[] {
    return this.archivosAdjuntos().map((archivo, index) => ({
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(archivo),
      type: archivo.type.startsWith('video/') ? 'video' : 'image',
      name: archivo.name,
    }));
  }
  private publicarAviso(titulo: string, descripcion: string): void {
    this.feedService.createPost({
      title: titulo,
      type: 'aviso',
      content: descripcion,
      prioritaria: this.prioritaria,
      fechaLimite: this.establecerVencimiento
        ? this.fechaLimite
        : null,
    }).subscribe({
      next: post => {
        this.feedService.addPost({
          ...post,
          reactions: post.reactions ?? [],
          comments: post.comments ?? [],
          commentsCount: post.commentsCount ?? 0,
        });

        this.finalizarPublicacion();
      },
      error: error => {
        console.error('Error al guardar el aviso:', error);
        this.errorFormulario =
          'No se pudo guardar el aviso. Intentá nuevamente.';
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
      fechaFin: this.establecerVencimiento
        ? this.fechaLimite
        : null,
    }).subscribe({
      next: () => {
        // Recargamos las publicaciones desde el backend para obtener
        // los datos reales de la publicación y de la encuesta.
        this.feedService.loadPosts();

        this.finalizarPublicacion();
      },
      error: error => {
        console.error('Error al guardar la encuesta:', error);
        this.errorFormulario =
          error.error?.message ??
          'No se pudo guardar la encuesta. Intentá nuevamente.';
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
