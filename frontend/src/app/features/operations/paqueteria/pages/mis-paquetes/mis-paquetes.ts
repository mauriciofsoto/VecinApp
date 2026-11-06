import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { Paquete } from '../../models/paquete';
import { Paqueteria } from '../../services/paqueteria';
import { ChatPaquete } from '../../components/chat-paquete/chat-paquete';

import { ConfirmarRecepcionModal } from '../../components/confirmar-recepcion-modal/confirmar-recepcion-modal';

@Component({
  selector: 'app-mis-paquetes',
  standalone: true,
  imports: [CommonModule, ChatPaquete, ConfirmarRecepcionModal],
  templateUrl: './mis-paquetes.html',
  styleUrl: './mis-paquetes.scss',
})
export class MisPaquetes {
  private readonly paqueteria = inject(Paqueteria);

  // ID temporal para las pruebas locales.
  // Más adelante se obtiene del usuario autenticado.
  readonly residenteId = 1;

  readonly paqueteSeleccionadoId = signal<number | null>(null);

  readonly misPaquetes = computed(() =>
    this.paqueteria.paquetesDeResidente(this.residenteId),
  );

  readonly paqueteSeleccionado = computed(() =>
    this.misPaquetes().find(
      paquete => paquete.id === this.paqueteSeleccionadoId(),
    ) ?? null,
  );

  seleccionarPaquete(paquete: Paquete): void {
    this.paqueteSeleccionadoId.set(paquete.id);
  }

  readonly confirmacionAbierta = signal(false);

  abrirConfirmacion(): void {
    if (this.paqueteSeleccionado()?.estado !== 'pendiente') {
      return;
    }

    this.confirmacionAbierta.set(true);
  }

  confirmarRecepcion(): void {
    const paquete = this.paqueteSeleccionado();

    if (!paquete) return;

    this.paqueteria.confirmarRecepcion(
      paquete.id,
      this.residenteId,
    );

    this.confirmacionAbierta.set(false);
  }

}