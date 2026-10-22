import { Component, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Badge } from '../../../../../shared/components/ui/badge/badge';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../../../shared/components/ui/card/card.component';
// Si tu archivo se llama "input.component.ts", usá '.../input/input.component'
import { InputComponent } from '../../../../../shared/components/ui/input/input';

type EstadoEncuesta = 'en-proceso' | 'cerrada';

interface Encuesta {
  id: string;
  titulo: string;
  descripcion: string;
  estado: EstadoEncuesta;
  fechaPublicacion: string;
  fechaLimite: string | null;
  votacionActiva: boolean;
  comentariosActivos: boolean;
  prioritaria: boolean;
  totalVotos: number;
  opciones: string[];
}

@Component({
  selector: 'app-historial-encuestas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Badge,
    ButtonComponent,
    CardComponent,
    InputComponent,
  ],
  templateUrl: './historial-encuestas.html',
  styleUrl: './historial-encuestas.scss',
})
export class HistorialEncuestas {
  // Referencia al modal nativo en el HTML
  @ViewChild('modalCrear') modalCrear!: ElementRef<HTMLDialogElement>;

  // LISTADO DE ENCUESTAS
  readonly encuestas = signal<Encuesta[]>([]);

  // FILTROS
  readonly estadoFiltro = signal<'todas' | EstadoEncuesta>('todas');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');

  // FORMULARIO DE CREACIÓN
  titulo = '';
  descripcion = '';
  votacionActiva = true;
  comentariosActivos = true;
  establecerVencimiento = false;
  fechaLimite = '';
  prioritaria = false;
  opciones: string[] = ['', ''];
  errorFormulario = '';

  get fechaActual(): string {
    return new Date().toISOString().split('T')[0];
  }

  // COMPUTED PROPERTIES
  readonly totalEnProceso = computed(
    () => this.encuestas().filter((e) => e.estado === 'en-proceso').length,
  );

  readonly totalCerradas = computed(
    () => this.encuestas().filter((e) => e.estado === 'cerrada').length,
  );

  readonly encuestasFiltradas = computed(() => {
    const estado = this.estadoFiltro();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();

    return this.encuestas().filter((e) => {
      const coincideEstado = estado === 'todas' || e.estado === estado;
      const coincideDesde = !desde || e.fechaPublicacion >= desde;
      const coincideHasta = !hasta || e.fechaPublicacion <= hasta;
      return coincideEstado && coincideDesde && coincideHasta;
    });
  });

  // MÉTODOS DEL MODAL
  abrirModalCrear(): void {
    if (this.modalCrear?.nativeElement) {
      this.modalCrear.nativeElement.showModal();
    }
  }

  cerrarModalCrear(): void {
    this.resetFormulario();
    if (this.modalCrear?.nativeElement) {
      this.modalCrear.nativeElement.close();
    }
  }

  // LÓGICA DE FORMULARIO
  agregarOpcion(): void {
    this.opciones.push('');
  }

  eliminarOpcion(index: number): void {
    if (this.opciones.length > 2) {
      this.opciones.splice(index, 1);
    }
  }

  publicarEncuesta(): void {
    if (!this.titulo.trim() || !this.descripcion.trim()) {
      this.errorFormulario = 'Por favor completá el título y la descripción.';
      return;
    }

    if (this.votacionActiva) {
      const opcionesValidas = this.opciones.map((o) => o.trim()).filter((o) => o !== '');
      if (opcionesValidas.length < 2) {
        this.errorFormulario = 'Ingresá al menos 2 opciones de respuesta.';
        return;
      }
    }

    const nuevaEncuesta: Encuesta = {
      id: Date.now().toString(),
      titulo: this.titulo,
      descripcion: this.descripcion,
      estado: 'en-proceso',
      fechaPublicacion: this.fechaActual,
      fechaLimite: this.establecerVencimiento ? this.fechaLimite : null,
      votacionActiva: this.votacionActiva,
      comentariosActivos: this.comentariosActivos,
      prioritaria: this.prioritaria,
      totalVotos: 0,
      opciones: this.votacionActiva ? this.opciones.filter((o) => o.trim()) : [],
    };

    this.encuestas.update((list) => [nuevaEncuesta, ...list]);
    this.cerrarModalCrear();
  }

  resetFormulario(): void {
    this.titulo = '';
    this.descripcion = '';
    this.votacionActiva = true;
    this.comentariosActivos = true;
    this.establecerVencimiento = false;
    this.fechaLimite = '';
    this.prioritaria = false;
    this.opciones = ['', ''];
    this.errorFormulario = '';
  }

  cerrarEncuesta(id: string): void {
    this.encuestas.update((list) =>
      list.map((e) => (e.id === id ? { ...e, estado: 'cerrada' } : e)),
    );
  }

  limpiarFiltros(): void {
    this.estadoFiltro.set('todas');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
  }
}