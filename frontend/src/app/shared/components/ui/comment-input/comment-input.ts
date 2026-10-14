import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
@Component({
  selector: 'app-comment-input',
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './comment-input.html',
  styleUrl: './comment-input.scss',
})
export class CommentInput {
  /** Placeholder personalizable */
  @Input() placeholder: string = 'Escribe un comentario...';

  /** Avatar del usuario actual (opcional) */
  @Input() userAvatar: string = '';

  /** Iniciales si no hay avatar */
  @Input() userInitials: string = 'VU';

  /** Deshabilitar la entrada */
  @Input() disabled: boolean = false;

  /** Estado de envío en curso */
  @Input() loading: boolean = false;

  /** Evento que emite el texto ingresado al enviar */
  @Output() submitComment = new EventEmitter<string>();

  commentText: string = '';

  onSend(): void {
    const trimmed = this.commentText.trim();
    if (trimmed && !this.disabled && !this.loading) {
      this.submitComment.emit(trimmed);
      this.commentText = '';
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    // Envía con Enter (Ctrl+Enter o Shift+Enter permiten salto de línea si se usa textarea)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

}
