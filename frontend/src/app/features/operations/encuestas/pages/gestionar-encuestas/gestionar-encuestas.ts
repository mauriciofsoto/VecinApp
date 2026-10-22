import { Component, signal,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import {EncuestaAdmin} from '../../models/encuesta.model' ;
import { EncuestasService } from '../../services/encuestas';


import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { InputComponent } from '../../../../../shared/components/ui/input/input';
import { Modal } from '../../../../../shared/components/ui/modal/modal';
import { HistorialEncuestas } from '../historial-encuestas/historial-encuestas';


@Component({
  selector: 'app-gestionar-encuestas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    InputComponent,
    Modal,
    HistorialEncuestas,
  ],
  templateUrl: './gestionar-encuestas.html',
  styleUrl: './gestionar-encuestas.scss',
})
export class GestionarEncuestas {
  private readonly encuestasService = inject(EncuestasService);

  readonly modalCrearAbierto = signal(false);

  titulo = '';
  descripcion = '';
  opciones: string[] = ['', ''];

  votacionActiva = true;
  comentariosActivos = true;
  prioritaria = false;
  establecerVencimiento = false;
  fechaLimite = '';
  errorFormulario = '';

  private readonly encuestasState = this.encuestasService.encuestas;

  readonly fechaActual = this.obtenerFechaLocal();

  abrirModalCrear(): void {
  console.log('PADRE: recibí solicitarCrear');
  this.errorFormulario = '';
  this.modalCrearAbierto.set(true);
  }

  cambiarEstadoModal(abierto: boolean): void {
    this.modalCrearAbierto.set(abierto);
  }

  agregarOpcion(): void {
    this.opciones = [...this.opciones, ''];
  }

  eliminarOpcion(indice: number): void {
    if (this.opciones.length <= 2) return;

    this.opciones = this.opciones.filter(
      (_, index) => index !== indice,
    );
  }

  publicarEncuesta(): void {
    this.errorFormulario = '';

    const titulo = this.titulo.trim();
    const descripcion = this.descripcion.trim();

    const opcionesValidas = this.opciones
      .map((opcion) => opcion.trim())
      .filter(Boolean);

    if (!titulo) {
      this.errorFormulario = 'Ingresá un título para la encuesta.';
      return;
    }

    if (!descripcion) {
      this.errorFormulario = 'Agregá una descripción.';
      return;
    }

    if (this.votacionActiva && opcionesValidas.length < 2) {
      this.errorFormulario =
        'Agregá al menos dos opciones para habilitar la votación.';
      return;
    }

    if (this.establecerVencimiento && !this.fechaLimite) {
      this.errorFormulario =
        'Seleccioná la fecha límite de la encuesta.';
      return;
    }

    if (
      this.establecerVencimiento &&
      this.fechaLimite < this.fechaActual
    ) {
      this.errorFormulario =
        'La fecha límite no puede estar en el pasado.';
      return;
    }

    const nuevaEncuesta: EncuestaAdmin = {
      id: Date.now(),
      titulo,
      descripcion,
      opciones: this.votacionActiva ? opcionesValidas : [],
      votacionActiva: this.votacionActiva,
      comentariosActivos: this.comentariosActivos,
      prioritaria: this.prioritaria,
      fechaLimite: this.establecerVencimiento
        ? this.fechaLimite
        : '',
      fechaPublicacion: this.fechaActual,
      estado: 'en-proceso',
      totalVotos: 0,
    };

    this.encuestasService.publicar(nuevaEncuesta);

    this.limpiarFormulario();
    this.modalCrearAbierto.set(false);
  }

  private limpiarFormulario(): void {
    this.titulo = '';
    this.descripcion = '';
    this.opciones = ['', ''];

    this.votacionActiva = true;
    this.comentariosActivos = true;
    this.prioritaria = false;
    this.establecerVencimiento = false;
    this.fechaLimite = '';
    this.errorFormulario = '';
  }

  private obtenerFechaLocal(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }
}