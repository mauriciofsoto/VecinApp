import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CategoriaEvento,
  TipoEvento,
  EspacioComun,
} from '../../models/reserva';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';

import { CrearEventoAdmin } from '../../services/reservas';
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

  // Mantiene compatibilidad con el template heredado
  readonly creadaPorAdministracion = input(false);

  readonly guardar = output<CrearEventoAdmin>();

  readonly mensaje = signal('');
  readonly modalAbierto = signal(false);

  // Campos del formulario de administración
  titulo = '';
  descripcion = '';
  fecha = '';
  horaInicio = '';
  horaFin = '';
  cantidadParticipantes = 1;
  espacioId: number | null = null;
  tipoEvento: TipoEvento = 'publico';
  categoriaEvento: CategoriaEvento | null = null;

  // Campos heredados del template — se mantienen para compatibilidad visual,
  // pero NO se envían al backend (el titular lo obtiene el backend del JWT)
  usuarioId = '';
  usuarioNombre = '';
  unidadId: number | null = null;
  unidadNombre = '';
  edificioId: number | null = null;

  crear(): void {
    this.mensaje.set('');

    if (
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

    const fechaReserva = new Date(`${this.fecha}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaReserva < hoy) {
      this.mensaje.set('La fecha de reserva no puede ser pasada.');
      return;
    }

    this.guardar.emit({
      espacioId: this.espacioId,
      titulo: this.titulo.trim(),
      descripcion: this.descripcion.trim(),
      fecha: this.fecha,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      cantidadParticipantes: this.cantidadParticipantes,
      categoriaEvento: this.categoriaEvento,
    });

    this.limpiarFormulario();
    this.cerrar();
  }

  limpiarFormulario(): void {
    this.titulo = '';
    this.descripcion = '';
    this.fecha = '';
    this.horaInicio = '';
    this.horaFin = '';
    this.cantidadParticipantes = 1;
    this.espacioId = null;
    this.tipoEvento = 'publico';
    this.categoriaEvento = null;
    this.usuarioId = '';
    this.usuarioNombre = '';
    this.unidadId = null;
    this.unidadNombre = '';
    this.edificioId = null;
    this.mensaje.set('');
  }

  abrir(): void {
    this.modalAbierto.set(true);
  }

  cerrar(): void {
    this.modalAbierto.set(false);
  }
}
