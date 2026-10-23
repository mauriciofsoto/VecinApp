import { Injectable, computed, signal } from '@angular/core';
import { EstadoReserva, Reserva } from '../models/reserva';

export type CrearReserva = Omit<
  Reserva,
  'id' | 'estado' | 'fechaCreacion'
>;

@Injectable({ providedIn: 'root' })
export class Reservas {
  private readonly estado = signal<Reserva[]>([]);

  readonly reservas = this.estado.asReadonly();

  readonly pendientes = computed(() =>
    this.estado().filter(r => r.estado === 'pendiente'),
  );

  crear(datos: CrearReserva): void {
    const reserva: Reserva = {
      ...datos,
      id: Date.now(),
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
    };

    this.estado.update(lista => [reserva, ...lista]);
  }

  cambiarEstado(id: number, estado: EstadoReserva): void {
    this.estado.update(lista =>
      lista.map(reserva =>
        reserva.id === id ? { ...reserva, estado } : reserva,
      ),
    );
  }

  reservasDeUsuario(usuarioId: number): Reserva[] {
    return this.estado()
      .filter(reserva => reserva.usuarioId === usuarioId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
}