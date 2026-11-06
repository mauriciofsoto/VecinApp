import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';

import { Reserva } from '../../models/reserva';
import { Reservas } from '../../services/reservas';
import { MessageInput } from '../../../../../shared/components/molecules/message-input/message-input';

@Component({
  selector: 'app-reserva-chat',
  standalone: true,
  imports: [DatePipe, MessageInput],
  templateUrl: './reserva-chat.html',
  styleUrl: './reserva-chat.scss',
})
export class ReservaChat {
  private readonly reservasService = inject(Reservas);

  readonly reserva = input.required<Reserva>();
  readonly emisorId = input.required<string>();
  readonly emisorNombre = input.required<string>();

  readonly mensajes = computed(() =>
    this.reservasService.mensajesDe(this.reserva().id),
  );

  enviarMensaje(contenido: string): void {
    const texto = contenido.trim();

    if (!texto) return;

    this.reservasService.enviarMensaje({
      reservaId: this.reserva().id,
      emisorId: this.emisorId(),
      emisorNombre: this.emisorNombre(),
      rolEmisor: 'residente',
      contenido: texto,
    });
  }

  esMensajePropio(emisorId: string): boolean {
    return emisorId === this.emisorId();
  }
}