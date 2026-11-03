import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Reservas } from '../../services/reservas';
import { EstadoReserva } from '../../models/reserva';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';

@Component({
  selector: 'app-gestionar-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent],
  templateUrl: './gestionar-reservas.html',
  styleUrl: './gestionar-reservas.scss',
})
export class GestionarReservas {
  readonly servicio = inject(Reservas);

  titulo = '';
  lugar = '';
  descripcion = '';
  fecha = '';
  usuarioId = 1;
  usuarioNombre = '';
  edificioId = 1;

  readonly mensaje = signal('');

  crear(): void {
    if (
      !this.titulo.trim() ||
      !this.lugar.trim() ||
      !this.descripcion.trim() ||
      !this.fecha ||
      !this.usuarioNombre.trim()
    ) {
      this.mensaje.set('Completá todos los campos.');
      return;
    }

    if (new Date(this.fecha).getTime() < Date.now()) {
      this.mensaje.set('La fecha de reserva debe ser futura.');
      return;
    }

    this.servicio.crear({
      titulo: this.titulo.trim(),
      lugar: this.lugar.trim(),
      descripcion: this.descripcion.trim(),
      fecha: new Date(this.fecha).toISOString(),
      usuarioId: Number(this.usuarioId),
      usuarioNombre: this.usuarioNombre.trim(),
      edificioId: Number(this.edificioId),
    });

    this.titulo = '';
    this.lugar = '';
    this.descripcion = '';
    this.fecha = '';
    this.usuarioNombre = '';

    this.mensaje.set('Reserva creada con estado pendiente.');
  }

  cambiarEstado(id: number, estado: EstadoReserva): void {
    this.servicio.cambiarEstado(id, estado);
  }
}
