import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Paqueteria } from '../../services/paqueteria';

@Component({
  selector: 'app-recepcion-paquetes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recepcion-paquetes.html',
  styleUrl: './recepcion-paquetes.scss',
})
export class RecepcionPaquetes {
  readonly paqueteria = inject(Paqueteria);

  destinatarioId = 1;
  destinatarioNombre = '';
  edificioId = 1;
  edificioNombre = 'Edificio A';
  descripcion = '';
  remitente = '';

  readonly mensaje = signal('');

  registrar(): void {
    if (
      !this.destinatarioNombre.trim() ||
      !this.descripcion.trim() ||
      !this.remitente.trim() ||
      this.destinatarioId <= 0
    ) {
      this.mensaje.set('Completá los datos del paquete y su destinatario.');
      return;
    }

    this.paqueteria.registrar({
      destinatarioId: Number(this.destinatarioId),
      destinatarioNombre: this.destinatarioNombre.trim(),
      edificioId: Number(this.edificioId),
      edificioNombre: this.edificioNombre.trim(),
      descripcion: this.descripcion.trim(),
      remitente: this.remitente.trim(),
    });

    this.destinatarioNombre = '';
    this.descripcion = '';
    this.remitente = '';
    this.mensaje.set('Paquete registrado correctamente.');
  }
}