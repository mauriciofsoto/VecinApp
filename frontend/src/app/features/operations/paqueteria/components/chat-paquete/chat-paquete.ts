import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnChanges, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Paquete } from '../../models/paquete';
import { Paqueteria } from '../../services/paqueteria';
import { MensajePaquete } from '../../models/mensaje-paquete';

import { MessageInput } from '../../../../../shared/components/molecules/message-input/message-input';

@Component({
  selector: 'app-chat-paquete',
  standalone: true,
  imports: [DatePipe, MessageInput],
  templateUrl: './chat-paquete.html',
  styleUrl: './chat-paquete.scss',
})
export class ChatPaquete implements OnChanges {
  private readonly paqueteria = inject(Paqueteria);
  private readonly destroyRef = inject(DestroyRef);

  readonly paquete = input.required<Paquete>();
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly error = signal('');

  readonly mensajes = computed(() => this.paqueteria.mensajesDe(this.paquete().id));

  ngOnChanges(): void {
    this.cargarMensajes();
  }

  cargarMensajes(): void {
    this.cargando.set(true);
    this.error.set('');
    this.paqueteria.obtenerMensajes(this.paquete().id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.cargando.set(false),
      error: error => {
        this.error.set(this.mensajeError(error));
        this.cargando.set(false);
      },
    });
  }

  enviarMensaje(contenido: string): void {
    const texto = contenido.trim();

    if (!texto || this.enviando()) return;
    this.enviando.set(true);
    this.error.set('');
    this.paqueteria.enviarMensaje(this.paquete().id, { contenido: texto })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.enviando.set(false),
        error: error => {
          this.error.set(this.mensajeError(error));
          this.enviando.set(false);
        },
      });
  }

  esMensajePropio(mensaje: MensajePaquete): boolean {
    return mensaje.propio === true;
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'La sesión venció. Iniciá sesión nuevamente.';
      if (error.status === 403 || error.status === 404) return 'No tenés acceso a esta conversación.';
      const body = error.error as { mensaje?: string; title?: string } | null;
      if (body?.mensaje) return body.mensaje;
      if (body?.title) return body.title;
    }
    return 'No se pudo cargar o enviar el mensaje. Revisá la conexión e intentá nuevamente.';
  }
}
