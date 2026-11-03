
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

  protected readonly puedeComentar = computed(() => {
  const post = this.post();

  // Las publicaciones normales mantienen sus comentarios.
  if (post.type !== 'encuesta') {
    return true;
  }

  // Las encuestas respetan la configuración de comentarios.
  return this.encuesta()?.comentariosActivos ?? false;
});

  protected readonly commentsOpen = signal(false);

  protected toggleComments(): void {
    this.commentsOpen.update(open => !open);
  }

  protected onReactionToggled(emoji: string): void {
    const post = this.post();

    const existing = post.reactions.find(
      reaction => reaction.emoji === emoji,
    );

    const reactions = [...post.reactions];

    if (existing) {
      const index = reactions.findIndex(
        reaction => reaction.emoji === emoji,
      );

      const updated = { ...existing };

      if (updated.reacted) {
        updated.count = Math.max(0, updated.count - 1);
        updated.reacted = false;
      } else {
        updated.count += 1;
        updated.reacted = true;
      }

      reactions[index] = updated;
    } else {
      reactions.push({
        emoji,
        count: 1,
        reacted: true,
      });
    }

    this.postChange.emit({ ...post, reactions });
  }

  protected onCommentAdded(content: string): void {
    this.commentAdded.emit({
      postId: this.post().id,
      content,
    });
  }
}
