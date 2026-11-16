import { CommonModule, DatePipe } from '@angular/common';
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
  imports: [CommonModule, DatePipe, FormsModule, ButtonComponent, Badge, InputComponent, Modal, ChatPaquete],
  templateUrl: './recepcion-paquetes.html',
  styleUrl: './recepcion-paquetes.scss',
})
export class RecepcionPaquetes implements OnInit {
  readonly paqueteria = inject(Paqueteria);
  private readonly destroyRef = inject(DestroyRef);

  readonly destinatarios = signal<DestinatarioPaquete[]>([]);
  readonly cargando = signal(true);
  readonly cargandoPaquetes = signal(true);
  readonly errorCarga = signal('');
  readonly errorPaquetes = signal('');
  readonly errorAccion = signal('');
  readonly accionEnCurso = signal(false);
  readonly busqueda = signal('');
  readonly destinatarioSeleccionadoId = signal<string | null>(null);
  readonly formularioAbierto = signal(false);
  readonly mensajeRegistro = signal('');
  readonly paqueteSeleccionado = signal<Paquete | null>(null);

  remitente = '';
  identificacion = '';
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
    this.cargarPaquetes();
  }

  cargarPaquetes(): void {
    this.cargandoPaquetes.set(true);
    this.errorPaquetes.set('');
    this.paqueteria.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: paquetes => {
        const idSeleccionado = this.paqueteSeleccionado()?.id;
        if (idSeleccionado !== undefined) {
          this.paqueteSeleccionado.set(paquetes.find(paquete => paquete.id === idSeleccionado) ?? null);
        }
        this.cargandoPaquetes.set(false);
      },
      error: error => {
        this.errorPaquetes.set(this.mensajeError(error, 'No se pudieron cargar los paquetes.'));
        this.cargandoPaquetes.set(false);
      },
    });
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
          this.errorCarga.set(this.mensajeError(error, 'No se pudieron cargar los destinatarios. Revisá la conexión e intentá nuevamente.'));
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
      !this.accionEnCurso() && this.destinatarioSeleccionadoId() && this.remitente.trim() && this.identificacion.trim(),
    );
  }

  intentarRegistrar(): void {
    if (!this.puedeIntentarRegistro()) return;

    this.accionEnCurso.set(true);
    this.mensajeRegistro.set('');
    this.paqueteria.registrar({
      idUsuarioDestinatario: this.destinatarioSeleccionadoId()!,
      remitente: this.remitente.trim(),
      identificacion: this.identificacion.trim(),
      observaciones: this.observaciones.trim() || null,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: paquete => {
        this.seleccionarPaquete(paquete);
        this.mensajeRegistro.set('Paquete registrado correctamente.');
        this.remitente = '';
        this.identificacion = '';
        this.observaciones = '';
        this.accionEnCurso.set(false);
      },
      error: error => {
        this.mensajeRegistro.set(this.mensajeError(error, 'No se pudo registrar el paquete.'));
        this.accionEnCurso.set(false);
      },
    });
  }

  registrarEntrega(paquete: Paquete): void {
    if (paquete.estado !== 'Pendiente' || this.accionEnCurso()) return;
    this.accionEnCurso.set(true);
    this.errorAccion.set('');
    this.paqueteria.registrarEntrega(paquete.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.errorAccion.set('Entrega física registrada.');
        this.accionEnCurso.set(false);
        this.cargarPaquetes();
      },
      error: error => {
        this.errorAccion.set(this.mensajeError(error, 'No se pudo registrar la entrega física.'));
        this.accionEnCurso.set(false);
      },
    });
  }

  seleccionarPaquete(paquete: Paquete): void {
    this.paqueteSeleccionado.set(paquete);
  }

  private normalizar(valor: string): string {
    return valor.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private mensajeError(error: unknown, fallback = 'No se pudo completar la operación.'): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'La sesión venció. Iniciá sesión nuevamente.';
      if (error.status === 403) return 'Tu usuario no tiene permiso para realizar esta operación.';
      const body = error.error as { mensaje?: string; title?: string; errors?: Record<string, string[]> } | null;
      if (body?.mensaje) return body.mensaje;
      if (body?.title) return body.title;
      const validation = body?.errors ? Object.values(body.errors).flat().join(' ') : '';
      if (validation) return validation;
    }
    return fallback;
  }
}
