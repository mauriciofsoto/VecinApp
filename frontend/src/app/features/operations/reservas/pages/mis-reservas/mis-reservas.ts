import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../../../core/services/auth';
import { UnitsService } from '../../../../../core/services/units';
import { Unit } from '../../../../../core/models/unit';

import { Reservas, CrearReserva } from '../../services/reservas';
import {
  Reserva,
  TipoEvento,
  CategoriaEvento,
} from '../../models/reserva';

import { ReservaChat } from '../../components/reserva-chat/reserva-chat';
import { ReservaCalendarModal } from '../../components/reserva-calendar-modal/reserva-calendar-modal';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReservaChat,
    ReservaCalendarModal,
    InputComponent,
  ],
  templateUrl: './mis-reservas.html',
  styleUrl: './mis-reservas.scss',
})
export class MisReservas {
  private readonly authService = inject(AuthService);
  private readonly unitsService = inject(UnitsService);
  readonly reservasService = inject(Reservas);

  readonly usuario = this.authService.currentUser;

  readonly unidades = signal<Unit[]>([]);
  readonly cargandoUnidades = signal(false);
  readonly errorUnidades = signal<string | null>(null);

  readonly unidadSeleccionadaId = signal<number | null>(null);
  readonly espacioSeleccionadoId = signal<number | null>(null);

  readonly reservaSeleccionada = signal<Reserva | null>(null);

  readonly fechaSeleccionada = signal(this.formatearFecha(new Date()));

  readonly errorFormulario = signal<string | null>(null);
  readonly exitoFormulario = signal<string | null>(null);
  readonly formularioVisible = signal(false);

  readonly formulario = {
    titulo: '',
    descripcion: '',
    fecha: this.fechaSeleccionada(),
    horaInicio: '',
    horaFin: '',
    cantidadParticipantes: 1,
    tipoEvento: 'privado' as TipoEvento,
    categoriaEvento: null as CategoriaEvento | null,
  };

  readonly unidadSeleccionada = computed(() =>
    this.unidades().find(
      unidad => unidad.id === this.unidadSeleccionadaId(),
    ) ?? null,
  );

  readonly espaciosDisponibles = computed(() => {
    // El backend ya filtra por edificio del usuario — devolvemos todos los activos
    return this.reservasService.espaciosActivos();
  });

  readonly espacioSeleccionado = computed(() =>
    this.espaciosDisponibles().find(
      espacio => espacio.id === this.espacioSeleccionadoId(),
    ) ?? null,
  );

  readonly reservas = computed(() => {
    const usuarioId = this.usuario()?.id;
    if (!usuarioId) return [];
    return this.reservasService.reservasDeUsuario(usuarioId);
  });

  readonly reservasDelDia = computed(() =>
    this.reservas().filter(
      reserva => reserva.fecha.slice(0, 10) === this.fechaSeleccionada(),
    ),
  );

  readonly fechaMinima = this.formatearFecha(new Date());

  constructor() {
    effect(() => {
      const session = this.authService.captureSession();
      this.unidades.set([]);
      this.unidadSeleccionadaId.set(null);
      this.espacioSeleccionadoId.set(null);
      this.reservaSeleccionada.set(null);
      this.reservasService.limpiarMensajes();
      this.cargandoUnidades.set(!!session.userId);
      this.errorUnidades.set(null);
      if (!session.userId) return;

      this.cargarUnidades(session);
      this.reservasService.cargarMisReservas().subscribe();
      this.reservasService.cargarEspacios().subscribe();
    });
  }

  private cargarUnidades(session: { userId: string | null; version: number }): void {
    this.cargandoUnidades.set(true);
    this.errorUnidades.set(null);

    this.unitsService.getMyUnits().subscribe({
      next: unidades => {
        if (!this.authService.isCurrentSession(session)) return;
        this.unidades.set(unidades);

        if (unidades.length === 1) {
          this.seleccionarUnidad(unidades[0].id);
        }

        this.cargandoUnidades.set(false);
      },
      error: () => {
        if (!this.authService.isCurrentSession(session)) return;
        this.errorUnidades.set('No se pudieron cargar tus unidades.');
        this.cargandoUnidades.set(false);
      },
    });
  }

  seleccionarUnidad(id: number | null): void {
  this.unidadSeleccionadaId.set(id);
  this.espacioSeleccionadoId.set(null);
}

  seleccionarEspacio(id: number): void {
    this.espacioSeleccionadoId.set(id);
  }

  seleccionarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
    this.formulario.fecha = fecha;
    this.reservaSeleccionada.set(null);
    this.reservasService.limpiarMensajes();
  }

  seleccionarReserva(reserva: Reserva): void {
    this.reservaSeleccionada.set(reserva);
    this.reservasService.cargarMensajes(reserva.id).subscribe();
  }

  crearReserva(): void {
    this.errorFormulario.set(null);
    this.exitoFormulario.set(null);

    const espacio = this.espacioSeleccionado();

    if (!espacio) {
      this.errorFormulario.set('Seleccioná un espacio disponible.');
      return;
    }

    const {
      titulo,
      descripcion,
      fecha,
      horaInicio,
      horaFin,
      cantidadParticipantes,
      tipoEvento,
      categoriaEvento,
    } = this.formulario;

    if (
      !titulo.trim() ||
      !descripcion.trim() ||
      !fecha ||
      !horaInicio ||
      !horaFin
    ) {
      this.errorFormulario.set('Completá todos los campos obligatorios.');
      return;
    }

    if (fecha < this.fechaMinima) {
      this.errorFormulario.set('La fecha debe ser igual o posterior a hoy.');
      return;
    }

    if (tipoEvento === 'publico' && !categoriaEvento) {
      this.errorFormulario.set('Seleccioná una categoría para el evento.');
      return;
    }

    const unidad = this.unidadSeleccionada();

    const datos: CrearReserva = {
      espacioId: espacio.id,
      unidadId: unidad?.id ?? null,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      fecha,
      horaInicio,
      horaFin,
      cantidadParticipantes,
      tipoEvento,
      categoriaEvento: tipoEvento === 'publico' ? categoriaEvento : null,
    };

    this.reservasService.crear(datos).subscribe({
      next: nuevaReserva => {
        this.reservaSeleccionada.set(nuevaReserva);
        this.fechaSeleccionada.set(fecha);
        this.exitoFormulario.set('Tu solicitud de reserva fue creada.');

        this.formulario.titulo = '';
        this.formulario.descripcion = '';
        this.formulario.horaInicio = '';
        this.formulario.horaFin = '';
        this.formulario.cantidadParticipantes = 1;
        this.formulario.tipoEvento = 'privado';
        this.formulario.categoriaEvento = null;

        this.espacioSeleccionadoId.set(null);
        this.formularioVisible.set(false);
      },
      error: err => {
        const mensaje = err?.error?.mensaje ?? 'No se pudo crear la solicitud de reserva.';
        this.errorFormulario.set(mensaje);
      },
    });
  }

  cancelarReserva(reserva: Reserva): void {
    this.reservasService.cancelar(reserva.id).subscribe({
      next: actualizada => {
        this.reservaSeleccionada.set(actualizada);
      },
      error: err => {
        const mensaje = err?.error?.mensaje ?? 'No se pudo cancelar la reserva.';
        this.errorFormulario.set(mensaje);
      },
    });
  }

  nombreEspacio(espacioId: number): string {
    return this.reservasService.espacios().find(
      espacio => espacio.id === espacioId,
    )?.nombre ?? 'Espacio no encontrado';
  }

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }
}
