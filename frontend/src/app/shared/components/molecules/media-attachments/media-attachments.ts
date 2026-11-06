
import {
  Component,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonComponent } from '../../atoms/button/button.component';



export interface MediaAttachment {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

@Component({
  selector: 'app-media-attachments',
  standalone: true,
  imports: [CommonModule, ButtonComponent ],
  templateUrl: './media-attachments.html',
  styleUrl: './media-attachments.scss',
})
export class MediaAttachments implements OnDestroy {
  readonly attachments = signal<MediaAttachment[]>([]);
  readonly attachmentsChange = output<File[]>();

  readonly errorMessage = signal('');
  readonly maxFiles = 6;
  readonly maxFileSize = 50 * 1024 * 1024;

  private nextId = 0;

  protected openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  protected handleFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    this.addFiles(files);
    input.value = '';
  }

  protected removeAttachment(id: string): void {
    const current = this.attachments();
    const attachment = current.find(item => item.id === id);

    if (!attachment) return;

    URL.revokeObjectURL(attachment.previewUrl);

    const updated = current.filter(item => item.id !== id);
    this.attachments.set(updated);
    this.emitAttachments(updated);
    this.errorMessage.set('');
  }

  private addFiles(files: File[]): void {
    this.errorMessage.set('');

    const current = this.attachments();
    const availableSlots = this.maxFiles - current.length;

    if (availableSlots <= 0) {
      this.errorMessage.set(`Podés adjuntar hasta ${this.maxFiles} archivos.`);
      return;
    }

    const accepted: MediaAttachment[] = [];

    for (const file of files) {
      if (current.length + accepted.length >= this.maxFiles) {
        this.errorMessage.set(`Podés adjuntar hasta ${this.maxFiles} archivos.`);
        break;
      }

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        this.errorMessage.set('Solo podés adjuntar imágenes o videos.');
        continue;
      }

      if (file.size > this.maxFileSize) {
        this.errorMessage.set('Cada archivo debe pesar menos de 50 MB.');
        continue;
      }

      accepted.push({
        id: `media-${++this.nextId}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type: isImage ? 'image' : 'video',
      });
    }

    const updated = [...current, ...accepted];

    this.attachments.set(updated);
    this.emitAttachments(updated);
  }

  private emitAttachments(items: MediaAttachment[]): void {
    this.attachmentsChange.emit(items.map(item => item.file));
  }

  
  clear(): void {
    for (const attachment of this.attachments()) {
      URL.revokeObjectURL(attachment.previewUrl);
    }

    this.attachments.set([]);
    this.errorMessage.set('');
    this.attachmentsChange.emit([]);
  }

  ngOnDestroy(): void {
    for (const attachment of this.attachments()) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  }
}
