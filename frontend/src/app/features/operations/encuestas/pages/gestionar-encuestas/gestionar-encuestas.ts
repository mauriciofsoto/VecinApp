
import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CardComponent } from '../../../../../shared/components/ui/card/card.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { Badge } from '../../../../../shared/components/ui/badge/badge';

type EstadoEncuesta = 'en-proceso' | 'cerrada';

interface EncuestaAdmin {
  id: number;
  titulo: string;
  descripcion: string;
  opciones: string[];
  votacionActiva: boolean;
  comentariosActivos: boolean;
  prioritaria: boolean;
  fechaLimite: string;
  fechaPublicacion: string;
  estado: EstadoEncuesta;
  totalVotos: number;
}

@Component({
  selector: 'app-gestionar-encuestas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    ButtonComponent,
    Badge,
  ],
  templateUrl: './gestionar-encuestas.html',
  styleUrl: './gestionar-encuestas.scss',
})
export class GestionarEncuestas {
  // Formulario de creación
  titulo = '';
  descripcion = '';
  opciones: string[] = ['', ''];

  votacionActiva = true;
  comentariosActivos = true;
  prioritaria = false;
  establecerVencimiento = false;
  fechaLimite = '';

  errorFormulario = '';

  // Filtros
  readonly estadoFiltro = signal<'todas' | EstadoEncuesta>('todas');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');

  // Datos locales de demostración
  private readonly encuestasState = signal<EncuestaAdmin[]>([
    {
      id: 1,
      titulo: 'Reunión de consorcio',
      descripcion:
        'Elegí el día que te resulte más conveniente para participar.',
      opciones: ['Lunes 18:00', 'Miércoles 19:00', 'Sábado 10:00'],
      votacionActiva: true,
      comentariosActivos: true,
      prioritaria: true,
      fechaLimite: '',
      fechaPublicacion: '2026-10-20',
      estado: 'en-proceso',
      totalVotos: 18,
    },
    {
      id: 2,
      titulo: 'Mantenimiento de espacios comunes',
      descripcion: 'Consulta sobre las mejoras propuestas para el edificio.',
      opciones: ['Sí, estoy de acuerdo', 'Prefiero otra propuesta'],
      votacionActiva: true,
      comentariosActivos: false,
      prioritaria: false,
      fechaLimite: '',
      fechaPublicacion: '2026-10-12',
      estado: 'cerrada',
      totalVotos: 24,
    },
  ]);

  readonly encuestasFiltradas = computed(() => {
    const estado = this.estadoFiltro();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();

    return this.encuestasState().filter((encuesta) => {
      const coincideEstado =
        estado === 'todas' || encuesta.estado === estado;

      const coincideDesde =
        !desde || encuesta.fechaPublicacion >= desde;

      const coincideHasta =
        !hasta || encuesta.fechaPublicacion <= hasta;

      return coincideEstado && coincideDesde && coincideHasta;
    });
  });

  readonly totalEnProceso = computed(
    () =>
      this.encuestasState().filter(
        (encuesta) => encuesta.estado === 'en-proceso',
      ).length,
  );

  readonly totalCerradas = computed(
    () =>
      this.encuestasState().filter(
        (encuesta) => encuesta.estado === 'cerrada',
      ).length,
  );

  readonly fechaActual = new Date().toISOString().slice(0, 10);

  agregarOpcion(): void {
    this.opciones = [...this.opciones, ''];
  }

  eliminarOpcion(indice: number): void {
    if (this.opciones.length <= 2) {
      return;
    }

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

    if (
      this.votacionActiva &&
      opcionesValidas.length < 2
    ) {
      this.errorFormulario =
        'Agregá al menos dos opciones para habilitar la votación.';
      return;
    }

    if (
      this.establecerVencimiento &&
      !this.fechaLimite
    ) {
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

    this.encuestasState.update((encuestas) => [
      nuevaEncuesta,
      ...encuestas,
    ]);

    this.limpiarFormulario();
  }

  cerrarEncuesta(id: number): void {
    this.encuestasState.update((encuestas) =>
      encuestas.map((encuesta) =>
        encuesta.id === id
          ? { ...encuesta, estado: 'cerrada' }
          : encuesta,
      ),
    );
  }

  limpiarFiltros(): void {
    this.estadoFiltro.set('todas');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
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
}
