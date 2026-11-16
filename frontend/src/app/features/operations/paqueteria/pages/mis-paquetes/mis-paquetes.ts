import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
export class MisPaquetes implements OnInit {
  private readonly paqueteria = inject(Paqueteria);
  private readonly destroyRef = inject(DestroyRef);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly errorAccion = signal('');
  readonly accionEnCurso = signal(false);

  readonly paqueteSeleccionadoId = signal<number | null>(null);

  readonly misPaquetes = this.paqueteria.paquetes;

  readonly paqueteSeleccionado = computed(() =>
    this.misPaquetes().find(
      paquete => paquete.id === this.paqueteSeleccionadoId(),
    ) ?? null,
  );

  seleccionarPaquete(paquete: Paquete): void {
    this.paqueteSeleccionadoId.set(paquete.id);
  }

  readonly confirmacionAbierta = signal(false);

  ngOnInit(): void {
    this.cargarPaquetes();
  }

  cargarPaquetes(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.paqueteria.misPaquetes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.cargando.set(false),
      error: error => {
        this.errorCarga.set(this.mensajeError(error));
        this.cargando.set(false);
      },
    });
  }

  abrirConfirmacion(): void {
    if (this.paqueteSeleccionado()?.estado !== 'Entregado' || this.accionEnCurso()) {
      return;
    }

    this.confirmacionAbierta.set(true);
  }

  confirmarRecepcion(): void {
    const paquete = this.paqueteSeleccionado();

    if (!paquete || paquete.estado !== 'Entregado' || this.accionEnCurso()) return;
    this.accionEnCurso.set(true);
    this.errorAccion.set('');
    this.paqueteria.confirmarRecepcion(paquete.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.confirmacionAbierta.set(false);
        this.accionEnCurso.set(false);
        this.errorAccion.set('Recepción confirmada.');
        this.cargarPaquetes();
      },
      error: error => {
        this.errorAccion.set(this.mensajeError(error));
        this.accionEnCurso.set(false);
      },
    });
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'La sesión venció. Iniciá sesión nuevamente.';
      if (error.status === 403) return 'Tu usuario no tiene permiso para consultar o confirmar estos paquetes.';
      const body = error.error as { mensaje?: string; title?: string } | null;
      if (body?.mensaje) return body.mensaje;
      if (body?.title) return body.title;
    }
    return 'No se pudo completar la operación. Revisá la conexión e intentá nuevamente.';
  }

}
