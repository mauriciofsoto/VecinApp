import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthorRole, PostType } from '../../models/post';
import { FormLayout } from '../../../../../shared/components/molecules/form-layout/form-layout';
import { MediaAttachments } from '../../../../../shared/components/molecules/media-attachments/media-attachments';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';

export interface CreatePostData {
  type: PostType;
  content: string;
  attachments: File[];
}

@Component({
  selector: 'app-create-post-form',
  standalone: true,
  imports: [FormsModule, FormLayout, MediaAttachments, ButtonComponent],
  templateUrl: './create-post-form.html',
  styleUrl: './create-post-form.scss',
})
export class CreatePostForm {
  readonly role = input.required<AuthorRole>();
  readonly postCreated = output<CreatePostData>();

  protected readonly content = signal('');
  protected readonly attachments = signal<File[]>([]);

  protected onAttachmentsChange(files: File[]): void {
    this.attachments.set(files);
  }

  protected submitPost(): void {
    const content = this.content().trim();

    if (!content) return;

    const type: PostType =
      this.role() === 'admin' ? 'aviso' : 'publicacion';

    this.postCreated.emit({
      type,
      content,
      attachments: this.attachments(),
    });

    this.content.set('');
    this.attachments.set([]);
  }
}