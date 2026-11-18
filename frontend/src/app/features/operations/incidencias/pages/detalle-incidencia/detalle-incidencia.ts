import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../../../core/services/auth';
import { ChatIncidencia } from '../../components/chat-incidencia/chat-incidencia';
import {
  Incidencias,
  DetalleIncidencia,
  EstadoIncidenciaDto,
  DestinatarioDerivacionDto,
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
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  readonly esAdministrador = this.auth.currentUser()?.rol === 'Administrador';
  readonly esPortero = this.auth.currentUser()?.rol === 'Portero';
  readonly volverUrl = this.esAdministrador ? '/administrador/incidencias' : '/incidencias-derivadas';
  incidencia: DetalleIncidencia | null = null;
  estados: EstadoIncidenciaDto[] = [];
  estadoSeleccionado: number | null = null;

  cargando = true;
  guardando = false;
  error = '';
  mensaje = '';
  comentarioResolucion = '';
  @ViewChild('modalDerivacion') modalDerivacion?: ElementRef<HTMLDialogElement>;
  tipoDestinatario: 'Propietario' | 'Personal' = 'Propietario';
  destinatarioId = '';
  destinatarios: DestinatarioDerivacionDto[] = [];
  guardandoDerivacion = false;
  

  get estadoActual(): string {
    return this.normalizarEstado(this.incidencia?.estado ?? '');
  }

  get puedeIniciarGestion(): boolean {
    return this.esPortero && this.estadoActual === 'pendiente';
  }

  get puedeMarcarResuelta(): boolean {
    return this.esPortero && this.estadoActual === 'en-proceso';
  }

  get puedeAprobarCierre(): boolean {
    return this.esAdministrador && this.estadoActual === 'resuelta';
  }

  ngOnInit(): void {

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.error = 'El identificador de la incidencia no es válido.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    forkJoin({
      incidencia: this.incidenciasService.obtenerDetalle(id),
      estados: this.incidenciasService.listarEstados()
    })
      .pipe(finalize(() => {
        this.cargando = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: ({ incidencia, estados }) => {
          this.incidencia = incidencia;
          this.estados = estados;
          this.estadoSeleccionado = incidencia.idEstadoIncidencia;
          this.comentarioResolucion = incidencia.comentarioResolucion ?? '';
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'No se pudo cargar la incidencia. Verificá tu sesión y la conexión con el servidor.';
          this.cdr.detectChanges();
        }
      });
  }

  abrirDerivacion(): void {
    this.error = '';
    this.destinatarioId = '';
    this.tipoDestinatario = 'Personal';
    this.modalDerivacion?.nativeElement.showModal();
    this.cargarDestinatarios();
  }

  cerrarDerivacion(): void {
    this.modalDerivacion?.nativeElement.close();
  }

  cambiarTipoDestinatario(tipo: 'Propietario' | 'Personal'): void {
    if (
      tipo === 'Propietario' &&
      this.incidencia?.idUnidad == null
    ) {
      this.error = 'Las incidencias de espacios comunes no se pueden derivar a propietarios.';
      return;
    }

    this.tipoDestinatario = tipo;
    this.destinatarioId = '';
    this.cargarDestinatarios();
  }
  private cargarDestinatarios(): void {
    if (!this.incidencia) return;

    this.incidenciasService.cargarDestinatarios(
      this.incidencia.idIncidencia,
      this.tipoDestinatario,
    ).subscribe({
      next: rows => {
        this.destinatarios = rows;

        if (rows.length === 0) {
          this.error = this.tipoDestinatario === 'Propietario'
            ? 'No hay propietarios autorizados para esta unidad.'
            : 'No hay personal disponible para este edificio.';
        }
      },
      error: err => {
        this.error = err.error?.mensaje
          ?? 'No se pudieron cargar los destinatarios autorizados.';
      },
    });
  }

  confirmarDerivacion(): void {
    if (
      !this.incidencia ||
      !this.destinatarioId ||
      this.guardandoDerivacion
    ) return;

    this.guardandoDerivacion = true;
    this.error = '';

    this.incidenciasService.derivar(this.incidencia.idIncidencia, {
      idUsuarioDestinatario: this.destinatarioId,
      tipoDestinatario: this.tipoDestinatario,
    }).subscribe({
      next: () => {
        this.mensaje = 'La incidencia se derivó correctamente.';
        this.guardandoDerivacion = false;
        this.modalDerivacion?.nativeElement.close();
      },
      error: err => {
        this.error = err.error?.mensaje
          ?? (err.status === 409
            ? 'Esta incidencia ya fue derivada a ese destinatario.'
            : 'No se pudo registrar la derivación.');

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

    this.aplicarEstado(this.estadoSeleccionado);
  }

  iniciarGestion(): void {
    this.cambiarEstadoPorNombre('En proceso');
  }

  marcarResuelta(): void {
    const comentario = this.comentarioResolucion.trim();
    if (!comentario) {
      this.error = 'Escribí un comentario de resolución antes de marcar la incidencia como resuelta.';
      return;
    }
    this.cambiarEstadoPorNombre('Resuelta', comentario);
  }

  aprobarCierre(): void {
    this.cambiarEstadoPorNombre('Cerrada');
  }

  private cambiarEstadoPorNombre(nombre: string, comentarioResolucion?: string): void {
    const estado = this.estados.find(item =>
      this.normalizarEstado(item.nombre) === this.normalizarEstado(nombre),
    );
    if (!estado) {
      this.error = `No se encontró el estado ${nombre}.`;
      return;
    }
    this.aplicarEstado(estado.idEstadoIncidencia, comentarioResolucion);
  }

  private aplicarEstado(idEstadoIncidencia: number, comentarioResolucion?: string): void {
    if (!this.incidencia || this.guardando) return;

    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.cdr.detectChanges();

    this.incidenciasService.cambiarEstado(
      this.incidencia.idIncidencia,
      { idEstadoIncidencia, comentarioResolucion }
    ).subscribe({
      next: () => {
        const estado = this.estados.find(
          e => e.idEstadoIncidencia === idEstadoIncidencia
        );

        if (estado && this.incidencia) {
          this.incidencia.idEstadoIncidencia = estado.idEstadoIncidencia;
          this.incidencia.estado = estado.nombre;
          this.estadoSeleccionado = estado.idEstadoIncidencia;
          if (comentarioResolucion) {
            this.incidencia.comentarioResolucion = comentarioResolucion;
            this.comentarioResolucion = comentarioResolucion;
          }
          this.mensaje = this.mensajeEstado(estado.nombre);
        }

        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo actualizar el estado. Revisá los permisos y volvé a intentar.';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mensajeEstado(nombre: string): string {
    switch (this.normalizarEstado(nombre)) {
      case 'en proceso':
        return 'Gestión iniciada.';
      case 'resuelta':
        return this.esPortero
          ? 'Incidencia marcada como resuelta. Queda pendiente de aprobación de Administración.'
          : 'El estado se actualizó correctamente.';
      case 'cerrada':
        return 'Cierre aprobado. La incidencia quedó cerrada.';
      default:
        return 'El estado se actualizó correctamente.';
    }
  }

  private normalizarEstado(value: string): string {
    return value.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }
}
