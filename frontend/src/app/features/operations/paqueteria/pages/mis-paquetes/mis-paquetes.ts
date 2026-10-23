import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Paqueteria } from '../../services/paqueteria';

@Component({
  selector: 'app-mis-paquetes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-paquetes.html',
  styleUrl: './mis-paquetes.scss',
})
export class MisPaquetes {
  private readonly paqueteria = inject(Paqueteria);

  // ID temporal de residente para la demostración.
  readonly residenteId = 1;

  readonly paquetes = this.paqueteria.paquetes;

  get misPaquetes() {
    return this.paqueteria.paquetesDeResidente(this.residenteId);
  }
}