import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';

import { Incidencia } from '../../models/incidencia';
import { MensajeIncidencia } from '../../models/mensaje-incidencia';
import { Incidencias } from '../../services/incidencias';

import { MessageInput } from '../../../../../shared/components/molecules/message-input/message-input';

@Component({
  selector: 'app-chat-incidencia',
  standalone: true,
  imports: [DatePipe, MessageInput],
  templateUrl: './chat-incidencia.html',
  styleUrl: './chat-incidencia.scss',
})
export class ChatIncidencia implements OnInit, OnDestroy {
  private readonly incidenciasService = inject(Incidencias);

  readonly incidencia = input.required<Incidencia>();
  readonly rolVista = input<'usuario' | 'administrador'>('usuario');

  readonly mensajes = signal<MensajeIncidencia[]>([]);
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly errorCarga = signal('');
  readonly error = signal('');

  private cargaSubscription?: Subscription;
  private envioSubscription?: Subscription;

  ngOnInit(): void {
    this.cargarMensajes();
  }

  ngOnDestroy(): void {
    this.cargaSubscription?.unsubscribe();
    this.envioSubscription?.unsubscribe();
  }

  cargarMensajes(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.cargaSubscription?.unsubscribe();

    this.cargaSubscription = this.incidenciasService
      .cargarMensajes(this.incidencia().id)
      .subscribe({
        next: (mensajes) => {
          this.mensajes.set(mensajes);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudieron cargar los mensajes.');
          this.cargando.set(false);
        },
      });
  }

  enviarMensaje(contenido: string): void {
    const texto = contenido.trim();
    if (!texto || this.enviando()) return;

    this.enviando.set(true);
    this.envioSubscription = this.incidenciasService
      .enviarMensaje(this.incidencia().id, texto)
      .subscribe({
        next: (mensaje) => {
          this.mensajes.update((lista) => [...lista, mensaje]);
          this.error.set('');
          this.enviando.set(false);
        },
        error: () => {
          this.error.set('No se pudo enviar el mensaje. Intentá nuevamente.');
          this.enviando.set(false);
        },
      });
  }

  esMensajePropio(mensaje: MensajeIncidencia): boolean {
    return mensaje.rolEmisor === this.rolVista();
  }

}
