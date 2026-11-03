import { Component, inject, signal } from '@angular/core';

import { Incidencia } from '../../models/incidencia';
import { Incidencias } from '../../services/incidencias';

import { CrearIncidencia, CrearIncidenciaPayload } from '../crear-incidencia/crear-incidencia';
import { HistorialIncidencias } from '../../components/historial-incidencias/historial-incidencias';
import { ChatIncidencia } from '../../components/chat-incidencia/chat-incidencia';

import { Modal } from '../../../../../shared/components/organisms/modal/modal';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';

@Component({
  selector: 'app-mis-incidencias',
  standalone: true,
  imports: [
    CrearIncidencia,
    HistorialIncidencias,
    ChatIncidencia,
    Modal,
    ButtonComponent,
  ],
  templateUrl: './mis-incidencias.html',
  styleUrl: './mis-incidencias.scss',
})
export class MisIncidencias {
  private readonly incidenciasService = inject(Incidencias);

  readonly incidencias = this.incidenciasService.misIncidencias;

  protected readonly modalCrearAbierto = signal(false);
  protected readonly incidenciaSeleccionada = signal<Incidencia | null>(null);
  protected readonly modalConversacionAbierto = signal(false);
  protected readonly mensaje = signal('');

  abrirFormulario(): void {
    this.modalCrearAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.modalCrearAbierto.set(false);
  }

  guardarIncidencia(datos: CrearIncidenciaPayload): void {
    this.mensaje.set('');

    this.incidenciasService.crear(datos).subscribe({
      next: () => {
        this.modalCrearAbierto.set(false);
        this.mensaje.set('La incidencia se creó correctamente.');
      },
      error: () => {
        this.mensaje.set('No se pudo crear la incidencia.');
      },
    });
  }

  abrirConversacion(incidencia: Incidencia): void {
    this.incidenciaSeleccionada.set(incidencia);
    this.modalConversacionAbierto.set(true);
  }

  cerrarConversacion(): void {
    this.modalConversacionAbierto.set(false);
    this.incidenciaSeleccionada.set(null);
  }
}
