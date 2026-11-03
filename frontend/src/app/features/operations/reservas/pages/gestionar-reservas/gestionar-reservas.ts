import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Reservas } from '../../services/reservas';
import {
  CategoriaEvento,
  EstadoReserva,
  TipoEvento,
} from '../../models/reserva';

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
  descripcion = '';
  fecha = '';
  horaInicio = '';
  horaFin = '';
  cantidadParticipantes = 1;

  usuarioId = 'USR-001';
  usuarioNombre = '';
  unidadId = 101;
  unidadNombre = '';
  edificioId = 1;

  espacioId: number | null = null;

  tipoEvento: TipoEvento = 'privado';
  categoriaEvento: CategoriaEvento | null = null;

  readonly mensaje = signal('');

  crear(): void {
    if (
      !this.titulo.trim() ||
      !this.descripcion.trim() ||
      !this.fecha ||
      !this.horaInicio ||
      !this.horaFin ||
      !this.usuarioId.trim() ||
      !this.usuarioNombre.trim() ||
      !this.unidadNombre.trim() ||
      !this.espacioId
    ) {
      this.mensaje.set('Completá todos los campos obligatorios.');
      return;
    }

    const fechaReserva = new Date(`${this.fecha}T00:00:00`);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaReserva < hoy) {
      this.mensaje.set('La fecha de reserva no puede ser pasada.');
      return;
    }

    try {
      this.servicio.crear({
        usuarioId: this.usuarioId.trim(),
        usuarioNombre: this.usuarioNombre.trim(),
        unidadId: this.unidadId,
        unidadNombre: this.unidadNombre.trim(),
        edificioId: this.edificioId,
        espacioId: this.espacioId,
        titulo: this.titulo.trim(),
        descripcion: this.descripcion.trim(),
        fecha: this.fecha,
        horaInicio: this.horaInicio,
        horaFin: this.horaFin,
        cantidadParticipantes: this.cantidadParticipantes,
        tipoEvento: this.tipoEvento,
        categoriaEvento:
          this.tipoEvento === 'publico' ? this.categoriaEvento : null,
        creadaPorAdministracion: true,
      });

      this.limpiarFormulario();
      this.mensaje.set('Reserva creada correctamente.');
    } catch (error) {
      this.mensaje.set(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la reserva.',
      );
    }
  }

  limpiarFormulario(): void {
    this.titulo = '';
    this.descripcion = '';
    this.fecha = '';
    this.horaInicio = '';
    this.horaFin = '';
    this.cantidadParticipantes = 1;

    this.usuarioId = 'USR-001';
    this.usuarioNombre = '';
    this.unidadId = 101;
    this.unidadNombre = '';
    this.espacioId = null;

    this.tipoEvento = 'privado';
    this.categoriaEvento = null;
  }

  cambiarEstado(id: number, estado: EstadoReserva): void {
    this.servicio.cambiarEstado(id, estado);
  }

  nombreEspacio(espacioId: number): string {
    return (
      this.servicio.espacios().find(
        espacio => espacio.id === espacioId,
      )?.nombre ?? 'Espacio no encontrado'
    );
  }
}
