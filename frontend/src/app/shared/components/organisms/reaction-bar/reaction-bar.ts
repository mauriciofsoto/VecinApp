import { CUSTOM_ELEMENTS_SCHEMA, Component, input, output, signal } from '@angular/core';
import { Modal } from '../modal/modal';

export interface Reaction {
  emoji: string;
  count: number;
  /** true si el usuario actual ya reaccionó con este emoji */
  reacted: boolean;
}

/**
 * Barra de reacciones: muestra las existentes y un "＋" que abre el selector de emojis.
 * No modifica nada: emite (toggled) con el emoji y quien la usa decide si suma o quita.
 *
 *   <app-reaction-bar [reactions]="reacciones" (toggled)="reaccionar($event)" />
 */
@Component({
  selector: 'app-reaction-bar',
  imports: [Modal],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // permite usar la etiqueta <emoji-picker>
  templateUrl: './reaction-bar.html',
  styleUrl: './reaction-bar.scss',
})
export class ReactionBar {
  readonly reactions = input<Reaction[]>([]);
  readonly disabled = input(false);

  readonly toggled = output<string>();

  protected readonly pickerOpen = signal(false);

  protected async openPicker(): Promise<void> {
    try {
      // La librería se descarga recién la primera vez que se abre (registra <emoji-picker>)
      await import('emoji-picker-element');
    } catch (error) {
      console.error('No se pudo cargar el selector de emojis', error);
      return;
    }
    this.pickerOpen.set(true);
  }

  protected onEmojiClick(event: Event): void {
    const emoji = (event as CustomEvent<{ unicode?: string }>).detail?.unicode;
    if (!emoji) return; // emoji personalizado sin carácter unicode
    this.pickerOpen.set(false);
    this.toggled.emit(emoji);
  }
}
