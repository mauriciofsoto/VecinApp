import { Component, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

/**
 * Campo de mensaje de una línea con respuestas rápidas opcionales (paquetería, incidencias).
 *
 *   <app-message-input
 *     [quickReplies]="['Ya lo retiro', 'Lo retiro mañana']"
 *     (send)="enviar($event)" />
 *
 * Emite (send) con el texto, tanto si lo escribe el usuario como si toca una respuesta rápida.
 */
@Component({
  selector: 'app-message-input',
  imports: [ButtonComponent],
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss',
})
export class MessageInput {
  readonly placeholder = input('Escribí un mensaje...');
  readonly disabled = input(false);
  readonly quickReplies = input<string[]>([]);

  readonly send = output<string>();

  protected readonly text = signal('');

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }

  protected submit(): void {
    const value = this.text().trim();
    if (!value || this.disabled()) return;
    this.send.emit(value);
    this.text.set('');
  }

  protected sendQuick(reply: string): void {
    if (this.disabled()) return;
    this.send.emit(reply);
  }
}
