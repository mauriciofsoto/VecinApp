import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../../../../core/services/auth';

import { Reservas, CrearReserva } from '../../services/reservas';
import { Reserva } from '../../models/reserva';

import { ReservaChat } from '../../components/reserva-chat/reserva-chat';
import { ReservaCalendarModal } from '../../components/reserva-calendar-modal/reserva-calendar-modal';
import { FormReservas } from '../../components/form-reservas/form-reservas';

@Component({
  selector: 'app-gestionar-reservas',
  standalone: true,
  imports: [
    CommonModule,
    FormReservas,
    ReservaChat,
    ReservaCalendarModal,
  ],
  templateUrl: './gestionar-reservas.html',
  styleUrl: './gestionar-reservas.scss',
})
export class GestionarReservas {
  private readonly authService = inject(AuthService);
  readonly reservasService = inject(Reservas);

  readonly usuario = this.authService.currentUser;

  readonly fechaSeleccionada = signal(this.formatearFecha(new Date()));

  readonly reservaSeleccionada = signal<Reserva | null>(null);

  readonly mensajeFormulario = signal<string | null>(null);
  readonly exitoFormulario = signal<string | null>(null);

  // Todas las reservas registradas
  readonly reservas = this.reservasService.reservas;

  // Reservas correspondientes a la fecha seleccionada
  readonly reservasDelDia = computed(() =>
    this.reservas().filter(
      reserva =>
        reserva.fecha.slice(0, 10) === this.fechaSeleccionada(),
    ),
  );

  seleccionarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
    this.reservaSeleccionada.set(null);
  }

  seleccionarReserva(reserva: Reserva): void {
    this.reservaSeleccionada.set(reserva);
  }

  crearReserva(datos: CrearReserva): void {
    this.mensajeFormulario.set(null);
    this.exitoFormulario.set(null);

    try {
      this.reservasService.crear(datos);

      this.fechaSeleccionada.set(datos.fecha);

      const nuevaReserva = this.reservas().find(
        reserva =>
          reserva.usuarioId === datos.usuarioId &&
          reserva.fecha === datos.fecha &&
          reserva.titulo === datos.titulo &&
          reserva.espacioId === datos.espacioId,
      );

      if (nuevaReserva) {
        this.reservaSeleccionada.set(nuevaReserva);
      }

      this.exitoFormulario.set('La reserva fue creada correctamente.');
    } catch (error) {
      this.mensajeFormulario.set(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la reserva.',
      );
    }
  }

  cambiarEstado(
    reservaId: number,
    estado: 'confirmada' | 'rechazada',
  ): void {
    this.reservasService.cambiarEstado(reservaId, estado);

    const reservaActualizada = this.reservas().find(
      reserva => reserva.id === reservaId,
    );

    if (reservaActualizada) {
      this.reservaSeleccionada.set(reservaActualizada);
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