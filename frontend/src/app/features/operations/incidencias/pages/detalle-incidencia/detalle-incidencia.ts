import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { AuthService } from '../../../../../core/services/auth';
import { ChatIncidencia } from '../../components/chat-incidencia/chat-incidencia';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { SelectComponent, SelectOption } from '../../../../../shared/components/atoms/select/select';
import { EmptyState } from '../../../../../shared/components/molecules/empty-state/empty-state';



import {
  Incidencias,
  DetalleIncidencia,
  EstadoIncidenciaDto,
  DestinatarioDerivacionDto,
} from '../../services/incidencias';
@Component({
  selector: 'app-detalle-incidencia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ChatIncidencia,
    Modal,
    ButtonComponent,
    SelectComponent,
    EmptyState
  ],
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
  readonly esPropietario = this.auth.currentUser()?.rol === 'Propietario';
  readonly esPersonal = this.esPortero || this.esPropietario;

  readonly volverUrl = this.esAdministrador
    ? '/administrador/incidencias'
    : '/incidencias-derivadas';
  incidencia: DetalleIncidencia | null = null;
  estados: EstadoIncidenciaDto[] = [];
  estadoSeleccionado: number | null = null;

  cargando = true;
  guardando = false;
  error = '';
  mensaje = '';
  comentarioResolucion = '';
  readonly modalDerivacionAbierto = signal(false);
  readonly tipoDestinatario = signal<'Propietario' | 'Personal'>('Personal');
  readonly destinatarioSeleccionado = signal('');
  readonly propietariosRelacionados = signal<DestinatarioDerivacionDto[]>([]);
  readonly personalDisponible = signal<DestinatarioDerivacionDto[]>([]);
  readonly cargandoDerivacion = signal(false);
  readonly guardandoDerivacion = signal(false);
  readonly errorDerivacion = signal('');
  readonly opcionesDestinatario = computed<SelectOption[]>(() => {
    const items = this.tipoDestinatario() === 'Propietario'
      ? this.propietariosRelacionados()
      : this.personalDisponible();

    return items.map(item => ({
      label: `${item.nombre} ${item.apellido}`.trim(),
      value: item.id,
    }));
  });
  readonly opcionesTipoDestinatario = computed<SelectOption[]>(() => {
    const opciones: SelectOption[] = [];

    if (this.incidencia?.idUnidad != null) {
      opciones.push({ label: 'Propietario', value: 'Propietario' });
    }

    opciones.push({ label: 'Personal', value: 'Personal' });
    return opciones;
  });
  get estadoActual(): string {
    return this.normalizarEstado(this.incidencia?.estado ?? '');
  }

  get puedeIniciarGestion(): boolean {
    return this.esPersonal && this.estadoActual === 'pendiente';
  }

  get puedeMarcarResuelta(): boolean {
    return this.esPersonal && this.estadoActual === 'en-proceso';
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
    if (
      !this.incidencia ||
      this.estadoActual === 'cerrada' ||
      this.cargandoDerivacion() ||
      this.guardandoDerivacion()
    ) {
      return;
    }

    this.errorDerivacion.set('');
    this.destinatarioSeleccionado.set('');
    this.tipoDestinatario.set(
      this.incidencia.idUnidad != null ? 'Propietario' : 'Personal'
    );

    this.modalDerivacionAbierto.set(true);
    this.cargarDestinatarios();
  }

  cerrarDerivacion(): void {
    if (this.guardandoDerivacion()) return;

    this.modalDerivacionAbierto.set(false);
    this.errorDerivacion.set('');
  }

  cambiarTipoDestinatario(value: unknown): void {
    if (value !== 'Propietario' && value !== 'Personal') return;

    const tipo = value as 'Propietario' | 'Personal';

    if (
      tipo === 'Propietario' &&
      this.incidencia?.idUnidad == null
    ) {
      this.errorDerivacion.set(
        'Las incidencias de espacios comunes no se pueden derivar a propietarios.'
      );
      return;
    }

    this.tipoDestinatario.set(tipo);
    this.destinatarioSeleccionado.set('');
    this.errorDerivacion.set('');
    this.cargarDestinatarios();
  }
  seleccionarDestinatario(value: unknown): void {
    this.destinatarioSeleccionado.set(
      typeof value === 'string' ? value : ''
    );
  }

  private cargarDestinatarios(): void {
    if (!this.incidencia) return;

    this.cargandoDerivacion.set(true);
    this.errorDerivacion.set('');

    this.incidenciasService.cargarDestinatarios(
      this.incidencia.idIncidencia,
      this.tipoDestinatario()
    )
      .pipe(finalize(() => this.cargandoDerivacion.set(false)))
      .subscribe({
        next: rows => {
          if (this.tipoDestinatario() === 'Propietario') {
            this.propietariosRelacionados.set(rows);
          } else {
            this.personalDisponible.set(rows);
          }

          if (rows.length === 0) {
            this.errorDerivacion.set(
              this.tipoDestinatario() === 'Propietario'
                ? 'No hay propietarios autorizados para esta unidad.'
                : 'No hay personal disponible para este edificio.'
            );
          }
        },
        error: err => {
          this.errorDerivacion.set(
            err.error?.mensaje ??
            'No se pudieron cargar los destinatarios autorizados.'
          );
        }
      });
  }

  confirmarDerivacion(): void {
    if (
      !this.incidencia ||
      !this.destinatarioSeleccionado() ||
      this.estadoActual === 'cerrada' ||
      this.guardandoDerivacion()
    ) {
      return;
    }

    this.guardandoDerivacion.set(true);
    this.errorDerivacion.set('');

    this.incidenciasService.derivar(this.incidencia.idIncidencia, {
      idUsuarioDestinatario: this.destinatarioSeleccionado(),
      tipoDestinatario: this.tipoDestinatario()
    })
      .pipe(finalize(() => this.guardandoDerivacion.set(false)))
      .subscribe({
        next: () => {
          this.mensaje = 'La incidencia se derivó correctamente.';
          this.modalDerivacionAbierto.set(false);
        },
        error: err => {
          this.errorDerivacion.set(
            err.error?.mensaje ??
            (err.status === 409
              ? 'Esta incidencia ya fue derivada a ese destinatario.'
              : 'No se pudo registrar la derivación.')
          );
        }
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
        return this.esPersonal
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
