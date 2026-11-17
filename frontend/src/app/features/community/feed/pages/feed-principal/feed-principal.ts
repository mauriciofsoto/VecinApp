import {
  Component,
  computed,
  effect,
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
import { ExpandablePublicationList } from '../../../../../shared/components/organisms/expandable-publication-list/expandable-publication-list';
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
    FormularioPublicacion,
    ExpandablePublicationList
  ],
  templateUrl: './feed-principal.html',
  styleUrl: './feed-principal.scss',
})
export class FeedPrincipal {
  protected readonly feedService = inject(Feed);
  private readonly encuestasService = inject(EncuestasService);
  private readonly authService = inject(AuthService);
  protected readonly isCreatePostOpen = signal(false);
  protected readonly isPollsOpen = signal(false);
  protected readonly interactionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const userId = this.authService.currentUser()?.id;
      this.authService.sessionVersion();
      this.interactionError.set(null);
      this.isCreatePostOpen.set(false);
      this.isPollsOpen.set(false);
      if (userId) this.encuestasService.cargar();
    });
  }

  readonly posts = this.feedService.posts;
  readonly encuestas = this.encuestasService.encuestas;


  readonly avisosOficiales = computed(() =>
    this.posts()
      .filter(post => post.type === 'aviso')
      .slice(0, 3),
  );

  readonly encuestasActivas = computed(() =>
    this.encuestas().filter(
      encuesta => encuesta.estado === 'en-proceso' && encuesta.votacionActiva,
    ).length,
  );


  readonly postsVisibles = computed(() => {
    const esAdmin = this.userRole() === 'admin';
    const encuestas = this.encuestasService.encuestas();

    return this.feedService.posts().filter(post => {
      if (post.type !== 'encuesta') return true;
      const encuesta = encuestas.find(item => item.id === post.encuestaId);
      return !!encuesta && (esAdmin || (!encuesta.yaVote && encuesta.votacionActiva));
    });
  });


  readonly encuestasParaLista = computed(() => {
    const esAdmin = this.userRole() === 'admin';
    const encuestas = this.encuestas();

    return this.posts().filter(post => {
      if (post.type !== 'encuesta') return false;
      const encuesta = encuestas.find(item => item.id === post.encuestaId);
      return !!encuesta && (esAdmin || encuesta.yaVote || !encuesta.votacionActiva);
    });
  });




  protected readonly userRole = computed<AuthorRole>(() => {
    const rol = this.authService.currentUser()?.rol;
    return rol === 'Administrador' || rol === 'SuperAdministrador'
      ? 'admin'
      : 'vecino';
  });
  protected readonly formularioPublicacion = viewChild(FormularioPublicacion);

  protected createPost(data: CreatePostData): void {
    const session = this.authService.captureSession();
    const { attachments, ...postData } = data;

  

    // La subida de archivos se integrará posteriormente.
    if (attachments.length > 0) {
      console.info(
        `${attachments.length} archivo(s) seleccionado(s), pendiente(s) de subir.`,
      );
    }

    this.feedService.createPost(postData).subscribe({
      next: post => {
        if (!this.authService.isCurrentSession(session)) return;
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

  protected toggleReaction(event: { postId: number; emoji: string }): void {
    this.interactionError.set(null);
    this.feedService.toggleReaction(event.postId, event.emoji).subscribe({
      error: () => {
        this.interactionError.set('No se pudo actualizar la reacción. Se volvió a consultar el estado guardado.');
      },
    });
  }

  protected addComment(event: {
    postId: number;
    content: string;
  }): void {
    const session = this.authService.captureSession();
    this.interactionError.set(null);
    this.feedService.addComment(event.postId, event.content).subscribe({
      error: () => {
        if (this.authService.isCurrentSession(session)) {
          this.interactionError.set('No se pudo guardar el comentario. Intentá nuevamente.');
        }
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
