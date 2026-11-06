
import { Component, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Post } from '../../../../features/community/feed/models/post';
import { PostCard } from '../../../../features/community/feed/components/post-card/post-card';

@Component({
  selector: 'app-expandable-publication-list',
  standalone: true,
  imports: [DatePipe, PostCard, ],
  templateUrl: './expandable-publication-list.html',
  styleUrl: './expandable-publication-list.scss',
})
export class ExpandablePublicationList {
  readonly posts = input<Post[]>([]);
  readonly emptyMessage = input('No hay publicaciones para mostrar.');

  readonly postChange = output<Post>();

  readonly commentAdded = output<{
    postId: number;
    content: string;
  }>();

  protected readonly expandedIds = signal<Set<number>>(new Set());

  protected toggle(postId: number): void {
    this.expandedIds.update(current => {
      const next = new Set(current);

      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }

      return next;
    });
  }

  protected isExpanded(postId: number): boolean {
    return this.expandedIds().has(postId);
  }
}
