
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Post } from '../../models/post';
import { ReactionBar } from '../../../../../shared/components/organisms/reaction-bar/reaction-bar';
import { PostComments } from '../post-comments/post-comments';
import { PollCard } from '../poll-card/poll-card';

import { EncuestasService } from '../../../../operations/encuestas/services/encuestas';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [DatePipe, ReactionBar, PostComments, PollCard],
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
})
export class PostCard {
  

  readonly post = input.required<Post>();

  readonly postChange = output<Post>();

  readonly commentAdded = output<{
    postId: number;
    content: string;
  }>();

  private readonly encuestasService = inject(EncuestasService);

  /**
   * Busca la encuesta asociada a esta publicación.
   * La publicación necesita tener encuestaId.
   */
  readonly encuesta = computed(() => {
    const encuestaId = this.post().encuestaId;

    if (encuestaId == null) return null;

    return this.encuestasService.encuestas().find(
      encuesta => encuesta.id === encuestaId,
    ) ?? null;
  });
  readonly puedeAdministrar = input(false);

  readonly statusChange = output<{
    postId: number;
    activa: boolean;
  }>();

  protected cambiarEstado(activa: boolean): void {
    this.statusChange.emit({
      postId: this.post().id,
      activa,
    });
  }
  protected readonly puedeComentar = computed(() => true);

  protected readonly commentsOpen = signal(false);

  protected toggleComments(): void {
    this.commentsOpen.update(open => !open);
  }

  protected onReactionToggled(emoji: string): void {
    this.reactionToggled.emit({
      postId: this.post().id,
      emoji,
    });
  }

  protected onCommentAdded(content: string): void {
    this.commentAdded.emit({
      postId: this.post().id,
      content,
    });
  }
  readonly reactionToggled = output<{
    postId: number;
    emoji: string;
  }>();
}
