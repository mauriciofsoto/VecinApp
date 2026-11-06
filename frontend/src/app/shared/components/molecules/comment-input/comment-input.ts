import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { InputComponent } from '../../atoms/input/input';

@Component({
  selector: 'app-comment-input',
  standalone: true,
  imports: [InputComponent, ButtonComponent],
  templateUrl: './comment-input.html',
  styleUrl: './comment-input.scss',
})
export class CommentInput {
  @Input() placeholder = 'Escribe un comentario...';
  @Input() userAvatar = '';
  @Input() userInitials = 'VU';
  @Input() disabled = false;
  @Input() loading = false;

  @Output() submitComment = new EventEmitter<string>();

  commentText = '';

  onSend(): void {
    const trimmed = this.commentText.trim();

    if (!trimmed || this.disabled || this.loading) return;

    this.submitComment.emit(trimmed);
    this.commentText = '';
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }
}
