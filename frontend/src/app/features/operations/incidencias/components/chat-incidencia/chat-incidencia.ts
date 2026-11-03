import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';

import { Incidencia } from '../../models/incidencia';
import { MensajeIncidencia } from '../../models/mensaje-incidencia';
import { Incidencias } from '../../services/incidencias';

import { MessageInput } from '../../../../../shared/components/molecules/message-input/message-input';
import { MediaAttachments } from '../../../../../shared/components/molecules/media-attachments/media-attachments';

@Component({
  selector: 'app-chat-incidencia',
  standalone: true,
  imports: [DatePipe, MessageInput, MediaAttachments],
  templateUrl: './chat-incidencia.html',
  styleUrl: './chat-incidencia.scss',
})
export class ChatIncidencia implements OnInit, OnDestroy {
  private readonly incidenciasService = inject(Incidencias);

  readonly incidencia = input.required<Incidencia>();
  readonly rolVista = input<'usuario' | 'administrador'>('usuario');

  readonly mensajes = signal<MensajeIncidencia[]>([]);
  readonly adjuntos = signal<File[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  private readonly mediaAttachments = viewChild(MediaAttachments);
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
    this.error.set('');

    this.cargaSubscription?.unsubscribe();

    this.cargaSubscription = this.incidenciasService
      .cargarMensajes(this.incidencia().id)
      .subscribe({
        next: (mensajes) => {
          this.mensajes.set(mensajes);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los mensajes.');
          this.cargando.set(false);
        },
      });
  }

  actualizarAdjuntos(archivos: File[]): void {
    this.adjuntos.set(archivos);
  }

  enviarMensaje(contenido: string): void {
    const texto = contenido.trim();
    const archivos = this.adjuntos();

    if (!texto && archivos.length === 0) return;

    const datos: Omit<MensajeIncidencia, 'id' | 'fechaCreacion'> = {
      incidenciaId: this.incidencia().id,
      emisorId:
        this.rolVista() === 'usuario'
          ? String(this.incidencia().usuarioId)
          : 'admin',
      emisorNombre:
        this.rolVista() === 'usuario'
          ? this.incidencia().usuarioNombre
          : 'Administración',
      rolEmisor: this.rolVista(),
      contenido: texto,
      adjuntos: [...archivos],
    };

    this.envioSubscription?.unsubscribe();

    this.envioSubscription = this.incidenciasService
      .enviarMensaje(datos)
      .subscribe({
        next: (mensaje) => {
          this.mensajes.update((lista) => [...lista, mensaje]);
          this.adjuntos.set([]);
          this.mediaAttachments()?.clear();
          this.error.set('');
        },
        error: () => {
          this.error.set('No se pudo enviar el mensaje. Intentá nuevamente.');
        },
      });
  }

  esMensajePropio(mensaje: MensajeIncidencia): boolean {
    return mensaje.rolEmisor === this.rolVista();
  }

  obtenerUrlAdjunto(archivo: File): string {
    return URL.createObjectURL(archivo);
  }
}
