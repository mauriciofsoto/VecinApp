import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Paquete } from '../../models/paquete';
import { Paqueteria } from '../../services/paqueteria';
import { MensajePaquete } from '../../models/mensaje-paquete';

import { MessageInput } from '../../../../../shared/components/molecules/message-input/message-input';

export type RolVistaPaquete =
  | 'administracion'
  | 'porteria'
  | 'residente';

@Component({
  selector: 'app-chat-paquete',
  standalone: true,
  imports: [DatePipe, MessageInput],
  templateUrl: './chat-paquete.html',
  styleUrl: './chat-paquete.scss',
})
export class ChatPaquete {
  private readonly paqueteria = inject(Paqueteria);

  readonly paquete = input.required<Paquete>();
  readonly rolVista = input<RolVistaPaquete>('porteria');

  readonly mensajes = computed(() =>
    this.paqueteria.mensajesDe(this.paquete().id),
  );

  readonly nombreEmisor = computed(() => {
    switch (this.rolVista()) {
      case 'residente':
        return this.paquete().destinatarioNombre;
      case 'administracion':
        return 'Administración';
      case 'porteria':
        return 'Portería';
    }
  });

  enviarMensaje(contenido: string): void {
    const texto = contenido.trim();

    if (!texto) return;

    this.paqueteria.enviarMensaje({
      paqueteId: this.paquete().id,
      emisorId:
        this.rolVista() === 'residente'
          ? this.paquete().destinatarioId
          : 0,
      emisorNombre: this.nombreEmisor(),
      rolEmisor: this.rolVista(),
      contenido: texto,
    });
  }

  esMensajePropio(mensaje: MensajePaquete): boolean {
  return mensaje.rolEmisor === this.rolVista();}
}