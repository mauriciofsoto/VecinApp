import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Reservas } from '../../services/reservas';

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-reservas.html',
  styleUrl: './mis-reservas.scss',
})
export class MisReservas {
  private readonly servicio = inject(Reservas);

  // ID temporal hasta conectarlo con el usuario autenticado.
  readonly usuarioId = 1;

  get reservas() {
    return this.servicio.reservasDeUsuario(this.usuarioId);
  }
}