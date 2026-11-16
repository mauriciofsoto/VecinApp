import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { ChatIncidencia } from '../../components/chat-incidencia/chat-incidencia';
import {
  Incidencias,
  DetalleIncidencia,
  EstadoIncidenciaDto,
  DestinatarioDerivacionDto,
  UnidadDerivacionDto,
} from '../../services/incidencias';

@Component({
  selector: 'app-detalle-incidencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChatIncidencia],
  templateUrl: './detalle-incidencia.html',
  styleUrl: './detalle-incidencia.scss'
})
export class DetalleIncidenciaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private incidenciasService = inject(Incidencias);
  private cdr = inject(ChangeDetectorRef);
  incidencia: DetalleIncidencia | null = null;
  estados: EstadoIncidenciaDto[] = [];
  estadoSeleccionado: number | null = null;

  cargando = true;
  guardando = false;
  error = '';
  mensaje = '';
  @ViewChild('modalDerivacion') modalDerivacion?: ElementRef<HTMLDialogElement>;
  tipoDestinatario: 'Propietario' | 'Personal' = 'Propietario';
  destinatarioId = '';
  unidadId: number | null = null;
  destinatarios: DestinatarioDerivacionDto[] = [];
  unidades: UnidadDerivacionDto[] = [];
  guardandoDerivacion = false;
  get destinatarioSeleccionado(): DestinatarioDerivacionDto | undefined {
    return this.destinatarios.find(item => item.id === this.destinatarioId);
  }


  ngOnInit(): void {
    this.incidenciasService.cargarUnidadesDerivacion().subscribe({ next: rows => this.unidades = rows });
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.error = 'El identificador de la incidencia no es válido.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    console.log('Cargando detalle de incidencia:', id);

    forkJoin({
      incidencia: this.incidenciasService.obtenerDetalle(id),
      estados: this.incidenciasService.listarEstados()
    })
      .pipe(finalize(() => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.log('Terminó la carga del detalle');
      }))
      .subscribe({
        next: ({ incidencia, estados }) => {
          console.log('Detalle recibido:', incidencia);
          console.log('Estados recibidos:', estados);

          this.incidencia = incidencia;
          this.estados = estados;
          this.estadoSeleccionado = incidencia.idEstadoIncidencia;

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar el detalle:', err);
          this.error = 'No se pudo cargar la incidencia. Verificá tu sesión y la conexión con el servidor.';
          this.cdr.detectChanges();
        }
      });
  }

  abrirDerivacion(): void {
    this.error = '';
    this.destinatarioId = '';
    this.unidadId = null;
    this.modalDerivacion?.nativeElement.showModal();
    this.cargarDestinatarios();
  }

  cerrarDerivacion(): void {
    this.modalDerivacion?.nativeElement.close();
  }

  cambiarTipoDestinatario(tipo: 'Propietario' | 'Personal'): void {
    this.tipoDestinatario = tipo;
    this.destinatarioId = '';
    this.unidadId = null;
    this.cargarDestinatarios();
  }

  private cargarDestinatarios(): void {
    this.incidenciasService.cargarDestinatarios(this.tipoDestinatario).subscribe({
      next: rows => this.destinatarios = rows,
      error: () => this.error = 'No se pudieron cargar los destinatarios autorizados del edificio.',
    });
  }

  confirmarDerivacion(): void {
    if (!this.incidencia || !this.destinatarioId || (this.tipoDestinatario === 'Propietario' && !this.unidadId) || this.guardandoDerivacion) return;
    this.guardandoDerivacion = true;
    this.error = '';
    this.incidenciasService.derivar(this.incidencia.idIncidencia, {
      idUsuarioDestinatario: this.destinatarioId,
      tipoDestinatario: this.tipoDestinatario,
      ...(this.tipoDestinatario === 'Propietario' ? { idUnidad: this.unidadId! } : {}),
    }).subscribe({
      next: () => {
        this.mensaje = 'La incidencia se derivó correctamente.';
        this.guardandoDerivacion = false;
        this.modalDerivacion?.nativeElement.close();
      },
      error: err => {
        this.error = err.status === 409 ? 'Esta incidencia ya fue derivada a ese destinatario.' : 'No se pudo registrar la derivación. Verificá el destinatario y la unidad.';
        this.guardandoDerivacion = false;
      },
    });
  }


  guardarEstado(): void {
    if (
      !this.incidencia ||
      this.estadoSeleccionado === null ||
      this.guardando
    ) {
      return;
    }

    if (this.estadoSeleccionado === this.incidencia.idEstadoIncidencia) {
      this.mensaje = 'La incidencia ya tiene ese estado.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.cdr.detectChanges();

    this.incidenciasService.cambiarEstado(
      this.incidencia.idIncidencia,
      { idEstadoIncidencia: this.estadoSeleccionado }
    ).subscribe({
      next: () => {
        const estado = this.estados.find(
          e => e.idEstadoIncidencia === this.estadoSeleccionado
        );

        if (estado && this.incidencia) {
          this.incidencia.idEstadoIncidencia = estado.idEstadoIncidencia;
          this.incidencia.estado = estado.nombre;
        }

        this.mensaje = 'El estado se actualizó correctamente.';
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al actualizar el estado:', err);
        this.error = 'No se pudo actualizar el estado. Revisá los permisos y volvé a intentar.';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

}
