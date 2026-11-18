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
import { DestinatarioPaquete, UnidadDestinatarioPaquete } from '../../models/destinatario-paquete';
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
  readonly unidades = signal<UnidadDestinatarioPaquete[]>([]);
  readonly cargando = signal(true);
  readonly cargandoUnidades = signal(true);
  readonly errorUnidades = signal('');
  readonly cargandoPaquetes = signal(true);
  readonly errorCarga = signal('');
  readonly errorPaquetes = signal('');
  readonly errorAccion = signal('');
  readonly accionEnCurso = signal(false);
  readonly busqueda = signal('');
  readonly pisoSeleccionado = signal('');
  readonly unidadSeleccionadaId = signal<number | null>(null);
  readonly destinatarioSeleccionadoId = signal<string | null>(null);
  readonly formularioAbierto = signal(false);
  readonly mensajeRegistro = signal('');
  readonly paqueteSeleccionado = signal<Paquete | null>(null);

  remitente = '';
  identificacion = '';
  observaciones = '';

  readonly pisosDisponibles = computed(() => {
    const pisos = this.unidades().map(unidad => unidad.piso.trim()).filter(Boolean);
    return [...new Set(pisos)].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  });

  readonly unidadesDePiso = computed(() => {
    const piso = this.normalizar(this.pisoSeleccionado());
    if (!piso) return [];
    return this.unidades()
      .filter(unidad => this.normalizar(unidad.piso) === piso)
      .sort((a, b) => a.identificacion.localeCompare(b.identificacion, 'es', { numeric: true }));
  });

  readonly unidadSeleccionada = computed(() =>
    this.unidades().find(unidad => unidad.id === this.unidadSeleccionadaId()) ?? null,
  );

  readonly destinatariosDeUnidad = computed(() => {
    const unidad = this.unidadSeleccionada();
    if (!unidad) return [];

    return this.destinatarios().filter(persona =>
      unidad.residentes.some(residente => residente.id === persona.id) ||
      persona.unidadesDeclaradas.some(declarada =>
        this.normalizar(declarada.pisoDeclarado ?? '') === this.normalizar(unidad.piso) &&
        this.normalizar(declarada.identificacionDeclarada ?? '') === this.normalizar(unidad.identificacion),
      ),
    );
  });

  readonly destinatariosFiltrados = computed(() => {
    const termino = this.normalizar(this.busqueda());
    if (termino) {
      if (termino.length < 3) return [];
      return this.destinatarios().filter(persona =>
        this.normalizar(`${persona.nombre} ${persona.apellido}`).includes(termino),
      );
    }
    return this.destinatariosDeUnidad();
  });

  readonly destinatarioSeleccionado = computed(() =>
    this.destinatarios().find(persona => persona.id === this.destinatarioSeleccionadoId()) ?? null,
  );

  ngOnInit(): void {
    this.cargarDestinatarios();
    this.cargarUnidades();
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
          this.destinatarioSeleccionadoId.set(null);
          this.cargando.set(false);
        },
        error: error => {
          this.destinatarios.set([]);
          this.destinatarioSeleccionadoId.set(null);
          this.pisoSeleccionado.set('');
          this.unidadSeleccionadaId.set(null);
          this.errorCarga.set(this.mensajeError(error, 'No se pudieron cargar los destinatarios. Revisá la conexión e intentá nuevamente.'));
          this.cargando.set(false);
        },
      });
  }

  cargarUnidades(): void {
    this.cargandoUnidades.set(true);
    this.errorUnidades.set('');
    this.paqueteria.obtenerUnidadesDestinatarios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: unidades => {
          this.unidades.set(unidades);
          if (!unidades.some(unidad => unidad.id === this.unidadSeleccionadaId())) {
            this.unidadSeleccionadaId.set(null);
          }
          this.cargandoUnidades.set(false);
        },
        error: error => {
          this.unidades.set([]);
          this.unidadSeleccionadaId.set(null);
          this.errorUnidades.set(this.mensajeError(error, 'No se pudieron cargar los departamentos de este edificio.'));
          this.cargandoUnidades.set(false);
        },
      });
  }

  abrirFormulario(): void {
    this.mensajeRegistro.set('');
    this.busqueda.set('');
    this.pisoSeleccionado.set('');
    this.unidadSeleccionadaId.set(null);
    this.destinatarioSeleccionadoId.set(null);
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  seleccionarDestinatario(persona: DestinatarioPaquete): void {
    this.destinatarioSeleccionadoId.set(persona.id);
    this.mensajeRegistro.set('');
  }

  cambiarBusqueda(valor: string): void {
    this.busqueda.set(valor);
    if (valor.trim()) {
      this.pisoSeleccionado.set('');
      this.unidadSeleccionadaId.set(null);
    }
    this.destinatarioSeleccionadoId.set(null);
  }

  seleccionarPiso(piso: string): void {
    this.busqueda.set('');
    this.pisoSeleccionado.set(piso);
    this.unidadSeleccionadaId.set(null);
    this.destinatarioSeleccionadoId.set(null);
  }

  seleccionarDepartamento(id: number | null): void {
    this.busqueda.set('');
    this.unidadSeleccionadaId.set(id);
    this.destinatarioSeleccionadoId.set(null);
    const candidatos = this.destinatariosDeUnidad();
    if (candidatos.length === 1) this.destinatarioSeleccionadoId.set(candidatos[0].id);
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
      idUnidad: this.unidadSeleccionadaId(),
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
        this.busqueda.set('');
        this.pisoSeleccionado.set('');
        this.unidadSeleccionadaId.set(null);
        this.destinatarioSeleccionadoId.set(null);
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
