import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { AuthService } from '../../../../../core/services/auth';

import { Reservas, CrearEventoAdmin } from '../../services/reservas';
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
export class GestionarReservas implements OnInit {
  private readonly authService = inject(AuthService);
  readonly reservasService = inject(Reservas);

  readonly usuario = this.authService.currentUser;

  readonly fechaSeleccionada = signal(this.formatearFecha(new Date()));
  readonly reservaSeleccionada = signal<Reserva | null>(null);

  readonly mensajeFormulario = signal<string | null>(null);
  readonly exitoFormulario = signal<string | null>(null);

  // Todas las reservas del edificio
  readonly reservas = this.reservasService.reservas;

  readonly reservasDelDia = computed(() =>
    this.reservas().filter(
      reserva =>
        reserva.fecha.slice(0, 10) === this.fechaSeleccionada(),
    ),
  );

  ngOnInit(): void {
    this.reservasService.cargarTodasLasReservas().subscribe();
    this.reservasService.cargarEspacios().subscribe();
  }

  seleccionarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
    this.reservaSeleccionada.set(null);
    this.reservasService.limpiarMensajes();
  }

  seleccionarReserva(reserva: Reserva): void {
    this.reservaSeleccionada.set(reserva);
    this.reservasService.cargarMensajes(reserva.id).subscribe();
  }

  crearReserva(datos: CrearEventoAdmin): void {
    this.mensajeFormulario.set(null);
    this.exitoFormulario.set(null);

    this.reservasService.crearEventoAdmin(datos).subscribe({
      next: nuevaReserva => {
        this.fechaSeleccionada.set(datos.fecha);
        this.reservaSeleccionada.set(nuevaReserva);
        this.exitoFormulario.set('El evento comunitario fue creado correctamente.');
      },
      error: err => {
        const mensaje = err?.error?.mensaje ?? 'No se pudo crear el evento.';
        this.mensajeFormulario.set(mensaje);
      },
    });
  }

  cambiarEstado(
    reservaId: number,
    estado: 'confirmada' | 'rechazada',
  ): void {
    const accion = estado === 'confirmada'
      ? this.reservasService.confirmar(reservaId)
      : this.reservasService.rechazar(reservaId);

    accion.subscribe({
      next: reservaActualizada => {
        this.reservaSeleccionada.set(reservaActualizada);
      },
      error: err => {
        const mensaje = err?.error?.mensaje ?? 'No se pudo cambiar el estado.';
        this.mensajeFormulario.set(mensaje);
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
