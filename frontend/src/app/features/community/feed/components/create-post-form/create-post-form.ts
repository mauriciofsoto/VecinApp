import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthorRole, PostType } from '../../models/post';

export interface CreatePostData {
  type: PostType;
  content: string;
}

@Component({
  selector: 'app-create-post-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-post-form.html',
  styleUrl: './create-post-form.scss',
})
export class CreatePostForm {
  readonly role = input.required<AuthorRole>();
  readonly postCreated = output<CreatePostData>();

  protected readonly content = signal('');

  protected submitPost(): void {
    const content = this.content().trim();

    if (!content) return;

    const type: PostType =
      this.role() === 'admin' ? 'aviso' : 'publicacion';

    this.postCreated.emit({ type, content });
    this.content.set('');
  }
}
