import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthorRole, PostType } from '../../models/post';
import { FormLayout } from '../../../../../shared/components/molecules/form-layout/form-layout';
import { MediaAttachments } from '../../../../../shared/components/molecules/media-attachments/media-attachments';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';
export interface CreatePostData {
  type: PostType;
  title: string;
  content: string;
  attachments: File[];
  prioritaria: boolean;
}

@Component({
  selector: 'app-create-post-form',
  standalone: true,
  imports: [
    FormsModule,
    FormLayout,
    MediaAttachments,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './create-post-form.html',
  styleUrl: './create-post-form.scss',
})
export class CreatePostForm {
  readonly role = input.required<AuthorRole>();
  readonly postCreated = output<CreatePostData>();
  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly attachments = signal<File[]>([]);
  protected readonly prioritaria = signal(false);

  protected onAttachmentsChange(files: File[]): void {
    this.attachments.set(files);
  }

  protected submitPost(): void {
    const title = this.title().trim();
    const content = this.content().trim();

    if (!title || !content) return;

    const type: PostType =
      this.role() === 'admin' ? 'aviso' : 'publicacion';

    this.postCreated.emit({
      type,
      title,
      content,
      attachments: this.attachments(),
      prioritaria: this.role() === 'admin' && this.prioritaria(),
    });

    this.title.set('');
    this.content.set('');
    this.attachments.set([]);
    this.prioritaria.set(false);
  }
}
