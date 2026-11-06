import { Component, computed, input, output, signal } from '@angular/core';
import { Reserva } from '../../models/reserva';

interface DiaCalendario {
  fecha: string;
  numero: number;
  esMesActual: boolean;
  esHoy: boolean;
  cantidadReservas: number;
  estados: Reserva['estado'][];
}

@Component({
  selector: 'app-reserva-calendar-modal',
  standalone: true,
  imports: [],
  templateUrl: './reserva-calendar-modal.html',
  styleUrl: './reserva-calendar-modal.scss',
})
export class ReservaCalendarModal {
  readonly reservas = input<Reserva[]>([]);
  readonly fechaSeleccionada = output<string>();

  private readonly mesActual = signal(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  readonly fechaActiva = signal(this.obtenerFechaActual());

  readonly nombreMes = computed(() =>
    new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
    }).format(this.mesActual()),
  );

  readonly dias = computed<DiaCalendario[]>(() => {
    const mes = this.mesActual();
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const desplazamiento = (primerDia.getDay() + 6) % 7;

    const inicio = new Date(
      mes.getFullYear(),
      mes.getMonth(),
      1 - desplazamiento,
    );

    const hoy = this.obtenerFechaActual();

    return Array.from({ length: 42 }, (_, index) => {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + index);

      const fechaKey = this.formatearFecha(fecha);

      const reservasDelDia = this.reservas().filter(
        reserva => reserva.fecha.slice(0, 10) === fechaKey,
      );

      return {
        fecha: fechaKey,
        numero: fecha.getDate(),
        esMesActual: fecha.getMonth() === mes.getMonth(),
        esHoy: fechaKey === hoy,
        cantidadReservas: reservasDelDia.length,
        estados: reservasDelDia.map(reserva => reserva.estado),
      };
    });
  });

  anteriorMes(): void {
    this.mesActual.update(
      fecha => new Date(fecha.getFullYear(), fecha.getMonth() - 1, 1),
    );
  }

  siguienteMes(): void {
    this.mesActual.update(
      fecha => new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1),
    );
  }

  volverAHoy(): void {
    const hoy = new Date();

    this.mesActual.set(
      new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    );

    this.seleccionarFecha(this.obtenerFechaActual());
  }

  seleccionarFecha(fecha: string): void {
    this.fechaActiva.set(fecha);
    this.fechaSeleccionada.emit(fecha);
  }

  private obtenerFechaActual(): string {
    return this.formatearFecha(new Date());
  }

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }
}