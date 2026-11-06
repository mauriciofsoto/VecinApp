import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CategoriaEvento,
  TipoEvento,
  EspacioComun,
} from '../../models/reserva';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';

import { CrearReserva } from '../../services/reservas';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';

@Component({
  selector: 'app-reserva-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputComponent,
    Modal,
  ],
  templateUrl: './form-reservas.html',
  styleUrl: './form-reservas.scss',
})
export class FormReservas {
  readonly espacios = input.required<EspacioComun[]>();

  readonly creadaPorAdministracion = input(false);

  readonly guardar = output<CrearReserva>();

  readonly mensaje = signal('');

  readonly modalAbierto = signal(false);

  // Datos del residente y su unidad
  usuarioId = '';
  usuarioNombre = '';
  unidadId: number | null = null;
  unidadNombre = '';
  edificioId: number | null = null;

  // Datos de la reserva
  titulo = '';
  descripcion = '';
  fecha = '';
  horaInicio = '';
  horaFin = '';
  cantidadParticipantes = 1;
  espacioId: number | null = null;

  tipoEvento: TipoEvento = 'privado';
  categoriaEvento: CategoriaEvento | null = null;

  crear(): void {
    this.mensaje.set('');

    if (
      !this.usuarioId.trim() ||
      !this.usuarioNombre.trim() ||
      !this.unidadId ||
      !this.unidadNombre.trim() ||
      !this.edificioId ||
      !this.titulo.trim() ||
      !this.descripcion.trim() ||
      !this.fecha ||
      !this.horaInicio ||
      !this.horaFin ||
      !this.espacioId ||
      this.cantidadParticipantes < 1
    ) {
      this.mensaje.set('Completá todos los campos obligatorios.');
      return;
    }

    if (this.horaFin <= this.horaInicio) {
      this.mensaje.set('La hora de finalización debe ser posterior a la de inicio.');
      return;
    }

    if (
      this.tipoEvento === 'publico' &&
      !this.categoriaEvento
    ) {
      this.mensaje.set('Seleccioná una categoría para el evento.');
      return;
    }

    const fechaReserva = new Date(`${this.fecha}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaReserva < hoy) {
      this.mensaje.set('La fecha de reserva no puede ser pasada.');
      return;
    }

    this.guardar.emit({
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
        this.tipoEvento === 'publico'
          ? this.categoriaEvento
          : null,
      creadaPorAdministracion: this.creadaPorAdministracion(),
    });
  }

  limpiarFormulario(): void {
    this.usuarioId = '';
    this.usuarioNombre = '';
    this.unidadId = null;
    this.unidadNombre = '';
    this.edificioId = null;

    this.titulo = '';
    this.descripcion = '';
    this.fecha = '';
    this.horaInicio = '';
    this.horaFin = '';
    this.cantidadParticipantes = 1;
    this.espacioId = null;

    this.tipoEvento = 'privado';
    this.categoriaEvento = null;

    this.mensaje.set('');
  }

    abrir(): void {
    this.modalAbierto.set(true);
  }

  cerrar(): void {
    this.modalAbierto.set(false);
  }

}
