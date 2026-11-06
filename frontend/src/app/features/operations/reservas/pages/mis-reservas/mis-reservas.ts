import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../../../core/services/auth';
import { UnitsService } from '../../../../../core/services/units';
import { Unit } from '../../../../../core/models/unit';

import { Reservas } from '../../services/reservas';
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
export class MisReservas implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly unitsService = inject(UnitsService);
  private readonly reservasService = inject(Reservas);

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
    const unidad = this.unidadSeleccionada();

    if (!unidad) return [];

    return this.reservasService.espaciosActivos().filter(
      espacio => espacio.edificioId === unidad.edificioId,
    );
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

  ngOnInit(): void {
    this.cargarUnidades();
  }

  private cargarUnidades(): void {
    this.cargandoUnidades.set(true);
    this.errorUnidades.set(null);

    this.unitsService.getMyUnits().subscribe({
      next: unidades => {
        this.unidades.set(unidades);

        if (unidades.length === 1) {
          this.seleccionarUnidad(unidades[0].id);
        }

        this.cargandoUnidades.set(false);
      },
      error: () => {
        this.errorUnidades.set('No se pudieron cargar tus unidades.');
        this.cargandoUnidades.set(false);
      },
    });
  }

  seleccionarUnidad(id: number): void {
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
  }

  seleccionarReserva(reserva: Reserva): void {
    this.reservaSeleccionada.set(reserva);
  }

  crearReserva(): void {
    this.errorFormulario.set(null);
    this.exitoFormulario.set(null);

    const usuario = this.usuario();
    const unidad = this.unidadSeleccionada();
    const espacio = this.espacioSeleccionado();

    if (!usuario || !unidad || !espacio) {
      this.errorFormulario.set(
        'Seleccioná una unidad y un espacio disponible.',
      );
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

    try {
      this.reservasService.crear({
        usuarioId: usuario.id,
        usuarioNombre: `${usuario.nombre} ${usuario.apellido}`,
        unidadId: unidad.id,
        unidadNombre: `${unidad.piso} ${unidad.identificacion}`,
        edificioId: unidad.edificioId,
        espacioId: espacio.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha,
        horaInicio,
        horaFin,
        cantidadParticipantes,
        tipoEvento,
        categoriaEvento: tipoEvento === 'publico' ? categoriaEvento : null,
        creadaPorAdministracion: false,
      });

      const nuevaReserva = this.reservasService
        .reservasDeUsuario(usuario.id)[0];

      if (nuevaReserva) {
        this.reservaSeleccionada.set(nuevaReserva);
      }

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
    } catch (error) {
      this.errorFormulario.set(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la solicitud de reserva.',
      );
    }
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
