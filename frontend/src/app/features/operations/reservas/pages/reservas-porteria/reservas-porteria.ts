import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Reservas as ReservasService } from '../../services/reservas';
import { Reserva } from '../../models/reserva';
import { AuthService } from '../../../../../core/services/auth';
import { ReservaCalendarModal } from '../../components/reserva-calendar-modal/reserva-calendar-modal';
import { ReservaChat } from '../../components/reserva-chat/reserva-chat';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reservas-porteria',
  standalone: true,
  imports: [CommonModule, ReservaCalendarModal, ReservaChat],
  templateUrl: './reservas-porteria.html',
  styleUrl: './reservas-porteria.scss',
})
export class ReservasPorteria implements OnInit {
  private readonly reservasService = inject(ReservasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  readonly usuario = this.authService.currentUser;
  readonly reservas = this.reservasService.reservas;
  readonly cargando = this.reservasService.cargando;
  readonly error = signal<string | null>(null);
  readonly errorEspacios = signal(false);
  readonly errorConversacion = signal<string | null>(null);
  readonly fechaSeleccionada = signal(this.fechaKey(new Date()));
  readonly reservaSeleccionada = signal<Reserva | null>(null);
  readonly reservasDelDia = computed(() =>
    this.reservas().filter(reserva =>
      reserva.fecha.slice(0, 10) === this.fechaSeleccionada(),
    ),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.error.set(null);
    this.errorEspacios.set(false);

    this.reservasService
      .cargarEspacios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.errorEspacios.set(true),
      });

    this.reservasService
      .cargarTodasLasReservas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: HttpErrorResponse) => {
          this.error.set(
            err?.error?.mensaje ??
              'No se pudieron cargar las reservas del edificio.',
          );
        },
      });
  }

  nombreEspacio(espacioId: number): string {
    return this.reservasService.nombreEspacio(espacioId);
  }

  seleccionarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
    this.reservaSeleccionada.set(null);
    this.errorConversacion.set(null);
    this.reservasService.limpiarMensajes();
  }

  seleccionarReserva(reserva: Reserva): void {
    this.reservaSeleccionada.set(reserva);
    this.errorConversacion.set(null);
    this.reservasService.cargarMensajes(reserva.id).subscribe({
      error: () => this.errorConversacion.set('No se pudo cargar la conversación de esta reserva.'),
    });
  }

  private fechaKey(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
