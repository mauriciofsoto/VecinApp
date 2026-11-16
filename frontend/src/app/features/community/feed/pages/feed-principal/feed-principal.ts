import {
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AuthorRole, } from '../../models/post';
import { CommonModule } from '@angular/common';
import { Feed } from '../../services/feed';
import { PostCard } from '../../components/post-card/post-card';
import {
  CreatePostForm,
  CreatePostData,
} from '../../components/create-post-form/create-post-form';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/components/atoms/card/card.component';
import { EmptyState } from '../../../../../shared/components/molecules/empty-state/empty-state';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';
import { PollOption } from '../../../../../shared/models/poll-option.model';
import { EncuestasService } from '../../../../operations/encuestas/services/encuestas';
import { EncuestaAdmin } from '../../../../operations/encuestas/models/encuesta.model';
import { HistorialEncuestas } from '../../../../operations/encuestas/pages/historial-encuestas/historial-encuestas';
import { FormularioPublicacion } from '../../../../operations/encuestas/components/formulario-publicacion/formulario-publicacion';
import { AuthService } from '../../../../../core/services/auth';

@Component({
  selector: 'app-feed-principal',
  standalone: true,
  imports: [
    CommonModule,
    PostCard,
    CreatePostForm,
    ButtonComponent,
    CardComponent,
    EmptyState,
    Modal,
    HistorialEncuestas,
    FormularioPublicacion
  ],
  templateUrl: './feed-principal.html',
  styleUrl: './feed-principal.scss',
})
export class FeedPrincipal {
  protected readonly feedService = inject(Feed);
  private readonly encuestasService = inject(EncuestasService);
  seccionSeleccionada: 'activas' | 'inactivas' = 'activas';
  protected readonly isCreatePostOpen = signal(false);
  private readonly authService = inject(AuthService);
  readonly puedeAdministrar = computed(() =>
    this.authService.hasRole('Administrador', 'SuperAdministrador')
  );
  readonly userRole = computed(() =>
    this.puedeAdministrar() ? 'admin' : 'vecino'
  );
  protected readonly isPollsOpen = signal(false);
  protected cambiarEstadoPublicacion(event: {
    postId: number;
    activa: boolean;
  }): void {
    this.feedService
      .cambiarEstadoPublicacion(event.postId, event.activa)
      .subscribe({
        error: error => {
          console.error('Error al cambiar el estado:', error);
          alert(
            error.error?.message ??
            error.error ??
            'No se pudo cambiar el estado de la publicación.'
          );
        },
      });
  }
  constructor() {
    this.feedService.loadPosts();
    this.encuestasService.cargar();
  }

  readonly posts = this.feedService.posts;
  readonly encuestas = this.encuestasService.encuestas;



  readonly encuestasActivas = computed(() =>
    this.encuestas().filter(
      encuesta => encuesta.estado === 'en-proceso' && encuesta.votacionActiva,
    ).length,
  );


  readonly publicacionesActivas = computed(() =>
    this.feedService.posts().filter(post => post.activa === true)
  );

  readonly publicacionesInactivas = computed(() =>
    this.feedService.posts().filter(post => post.activa === false)
  );






  protected readonly formularioPublicacion = viewChild(FormularioPublicacion);

  protected createPost(data: CreatePostData): void {
    const { attachments, ...postData } = data;

  

    // La subida de archivos se integrará posteriormente.
    if (attachments.length > 0) {
      console.info(
        `${attachments.length} archivo(s) seleccionado(s), pendiente(s) de subir.`,
      );
    }

    this.feedService.createPost(postData).subscribe({
      next: post => {
        this.feedService.addPost({
          ...post,
          reactions: post.reactions ?? [],
          comments: post.comments ?? [],
          commentsCount: post.commentsCount ?? 0,
        });

        this.closeCreatePost();
      },
      error: error => {
        console.error('Error al crear la publicación:', error);
      },
    });
  }

  protected updatePost(
    post: Parameters<Feed['updatePost']>[0],
  ): void {
    this.feedService.updatePost(post);
  }
  protected toggleReaction(event: {
    postId: number;
    emoji: string;
  }): void {
    this.feedService
      .toggleReaction(event.postId, event.emoji)
      .subscribe({
        next: reactions => {
          this.feedService.updatePostReactions(
            event.postId,
            reactions,
          );
        },
        error: error => {
          console.error('Error al guardar la reacción:', error);
        },
      });
  }
  protected addComment(event: {
    postId: number;
    content: string;
  }): void {
    this.feedService.addComment(event.postId, event.content).subscribe({
      next: comment => {
        this.feedService.appendComment(event.postId, comment);
      },
      error: error => {
        console.error('Error al guardar el comentario:', error);
      },
    });
  }
  protected openCreatePost(): void {
    this.isCreatePostOpen.set(true);
  }

  protected closeCreatePost(): void {
    this.isCreatePostOpen.set(false);
  }

  protected abrirModalEncuestas(): void {
    this.isPollsOpen.set(true);
  }

  protected closePolls(): void {
    this.isPollsOpen.set(false);
  }

  protected opcionesConResultados(encuesta: EncuestaAdmin): PollOption[] {
    const opciones = encuesta.votosPorOpcion ?? encuesta.opciones.map(
      (texto, index) => ({ id: String(index), texto, votos: 0 }),
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
