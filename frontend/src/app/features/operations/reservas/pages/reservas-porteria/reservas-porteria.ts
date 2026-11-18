import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Reservas as ReservasService } from '../../services/reservas';
import { EstadoReserva } from '../../models/reserva';
import { Badge, BadgeVariant } from '../../../../../shared/components/atoms/badge/badge';
import { EmptyState } from '../../../../../shared/components/molecules/empty-state/empty-state';

@Component({
  selector: 'app-reservas-porteria',
  standalone: true,
  imports: [Badge, EmptyState],
  templateUrl: './reservas-porteria.html',
  styleUrl: './reservas-porteria.scss',
})
export class ReservasPorteria implements OnInit {
  private readonly reservasService = inject(ReservasService);
  private readonly destroyRef = inject(DestroyRef);

  readonly reservas = this.reservasService.reservas;
  readonly cargando = this.reservasService.cargando;
  readonly error = signal<string | null>(null);
  readonly errorEspacios = signal(false);

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

  varianteEstado(estado: EstadoReserva): BadgeVariant {
    switch (estado) {
      case 'pendiente':
        return 'warning';
      case 'en-mediacion':
        return 'info';
      case 'confirmada':
        return 'success';
      case 'rechazada':
        return 'danger';
      case 'cancelada':
      case 'finalizada':
        return 'neutral';
    }
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}
