import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { Badge } from '../../../../../shared/components/atoms/badge/badge';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';
import { ChatPaquete } from '../../components/chat-paquete/chat-paquete';
import { DestinatarioPaquete } from '../../models/destinatario-paquete';
import { Paquete } from '../../models/paquete';
import { Paqueteria } from '../../services/paqueteria';

@Component({
  selector: 'app-recepcion-paquetes',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, Badge, InputComponent, Modal, ChatPaquete],
  templateUrl: './recepcion-paquetes.html',
  styleUrl: './recepcion-paquetes.scss',
})
export class RecepcionPaquetes implements OnInit {
  readonly paqueteria = inject(Paqueteria);
  private readonly destroyRef = inject(DestroyRef);

  readonly destinatarios = signal<DestinatarioPaquete[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly busqueda = signal('');
  readonly destinatarioSeleccionadoId = signal<string | null>(null);
  readonly formularioAbierto = signal(false);
  readonly mensajeRegistro = signal('');
  readonly paqueteSeleccionado = signal<Paquete | null>(null);

  remitente = '';
  descripcion = '';
  observaciones = '';

  readonly destinatariosFiltrados = computed(() => {
    const termino = this.normalizar(this.busqueda());
    return this.destinatarios().filter(persona =>
      !termino || this.normalizar(`${persona.nombre} ${persona.apellido}`).includes(termino),
    );
  });

  readonly destinatarioSeleccionado = computed(() =>
    this.destinatarios().find(persona => persona.id === this.destinatarioSeleccionadoId()) ?? null,
  );

  ngOnInit(): void {
    this.cargarDestinatarios();
  }

  cargarDestinatarios(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.paqueteria.obtenerDestinatarios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: destinatarios => {
          this.destinatarios.set(destinatarios);
          if (!destinatarios.some(persona => persona.id === this.destinatarioSeleccionadoId())) {
            this.destinatarioSeleccionadoId.set(null);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.destinatarios.set([]);
          this.destinatarioSeleccionadoId.set(null);
          this.errorCarga.set(this.mensajeError(error));
          this.cargando.set(false);
        },
      });
  }

  abrirFormulario(): void {
    this.mensajeRegistro.set('');
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  seleccionarDestinatario(persona: DestinatarioPaquete): void {
    this.destinatarioSeleccionadoId.set(persona.id);
    this.mensajeRegistro.set('');
  }

  referenciasUnidad(persona: DestinatarioPaquete): string[] {
    const referencias = persona.unidadesDeclaradas.map(unidad => {
      const partes = [
        unidad.pisoDeclarado ? `Piso ${unidad.pisoDeclarado}` : '',
        unidad.identificacionDeclarada ? `Unidad ${unidad.identificacionDeclarada}` : '',
      ].filter(Boolean);
      return partes.join(' · ');
    }).filter(Boolean);

    return [...new Set(referencias)];
  }

  puedeIntentarRegistro(): boolean {
    return Boolean(
      this.destinatarioSeleccionadoId() && this.remitente.trim() && this.descripcion.trim(),
    );
  }

  intentarRegistrar(): void {
    if (!this.puedeIntentarRegistro()) return;

    // No existe una operación de alta en el backend y Paquete exige una Unidad.
    // No llamamos al registrar() local: el formulario nunca debe simular persistencia.
    this.mensajeRegistro.set(
      'No se registró el paquete: el backend todavía no ofrece un endpoint de alta compatible con destinatarios sin unidad verificada.',
    );
  }

  seleccionarPaquete(paquete: Paquete): void {
    this.paqueteSeleccionado.set(paquete);
  }

  private normalizar(valor: string): string {
    return valor.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'La sesión venció. Iniciá sesión nuevamente.';
      if (error.status === 403) return 'Tu usuario no tiene permiso para consultar destinatarios.';
    }
    return 'No se pudieron cargar los destinatarios. Revisá la conexión e intentá nuevamente.';
  }
}
