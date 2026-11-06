
import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PostComment } from '../../models/post';
import { CommentInput } from '../../../../../shared/components/molecules/comment-input/comment-input';

@Component({
  selector: 'app-post-comments',
  imports: [CommentInput, DatePipe ],
  templateUrl: './post-comments.html',
  styleUrl: './post-comments.scss',
})
export class PostComments {
  readonly comments = input<PostComment[]>([]);
  readonly currentUserName = input('Vecino');
  readonly currentUserAvatar = input('');

  readonly commentAdded = output<string>();

  protected submitComment(content: string): void {
    this.commentAdded.emit(content);
  }
}
