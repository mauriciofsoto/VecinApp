import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';


import { EstadoIncidencia, Incidencia as IncidenciaModel } from '../../models/incidencia';

import {
  DestinatarioDerivacionDto,
  EstadoIncidenciaDto,
  Incidencias,
} from '../../services/incidencias';
import { AuthService } from '../../../../../core/services/auth';



import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/components/atoms/card/card.component';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import { SelectComponent, SelectOption } from '../../../../../shared/components/atoms/select/select';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';
import { EmptyState } from '../../../../../shared/components/molecules/empty-state/empty-state';

@Component({
  selector: 'app-incidencias-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    InputComponent,
    SelectComponent,
    Modal,
    EmptyState,
  ],
  templateUrl: './incidencias-admin.html',
  styleUrl: './incidencias-admin.scss',
})
export class IncidenciasAdmin implements OnInit {
  private readonly incidenciasService = inject(Incidencias)
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly incidencias = this.incidenciasService.incidencias;

  readonly totalIncidencias = this.incidenciasService.totalIncidencias;
  readonly pendientes = this.incidenciasService.totalPendientes;
  readonly enProceso = this.incidenciasService.totalEnProceso;
  readonly resueltas = this.incidenciasService.totalResueltas;
  readonly cerradas = this.incidenciasService.totalCerradas;

  readonly busqueda = signal('');
  readonly estadoSeleccionado = signal('todos');
  readonly categoriaSeleccionada = signal('todas');
  readonly prioridadSeleccionada = signal('todas');

  readonly estadosCatalogo = signal<EstadoIncidenciaDto[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal('');
  readonly mensaje = signal('');
  readonly modalDerivacionAbierto = signal(false);
  readonly incidenciaSeleccionada = signal<IncidenciaModel | null>(null);
  readonly tipoDestinatario = signal<'Propietario' | 'Personal'>('Personal');
  readonly destinatarioSeleccionado = signal('');
  readonly propietariosRelacionados = signal<DestinatarioDerivacionDto[]>([]);
  readonly personalDisponible = signal<DestinatarioDerivacionDto[]>([]);
  readonly cargandoDerivacion = signal(false);
  readonly guardandoDerivacion = signal(false);
  readonly errorDerivacion = signal('');

  readonly opcionesTipoDestinatario = computed<SelectOption[]>(() => {
    const opciones: SelectOption[] = [];
    const incidencia = this.incidenciaSeleccionada();

    if (incidencia?.idUnidad != null) {
      opciones.push({ label: 'Propietario', value: 'Propietario' });
    }

    opciones.push({ label: 'Personal', value: 'Personal' });
    return opciones;
  });
  readonly opcionesDestinatario = computed<SelectOption[]>(() => {
    const items = this.tipoDestinatario() === 'Propietario'
      ? this.propietariosRelacionados()
      : this.personalDisponible();
    return items.map(item => ({
      label: `${item.nombre} ${item.apellido}`.trim(),
      value: item.id,
    }));
  });
  readonly opcionesPrioridad: SelectOption[] = [
    { label: 'Todas las prioridades', value: 'todas' },
    { label: 'Alta', value: 'alta' },
    { label: 'Media', value: 'media' },
    { label: 'Baja', value: 'baja' },
  ];

  get opcionesEstado(): SelectOption[] {
    return [
      { label: 'Todos los estados', value: 'todos' },
      ...this.estadosCatalogo().map(estado => ({
        label: estado.nombre,
        value: this.normalizarEstado(estado.nombre),
      })),
    ];
  }

  ngOnInit(): void {
    if (this.auth.currentUser()?.rol !== 'Administrador') {
      this.errorCarga.set('La gestión de incidencias está habilitada para administradores del edificio.');
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set('');
    this.incidenciasService.cargarEstados()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: estados => {
          this.estadosCatalogo.set(estados);
          this.cargarIncidencias();
        },
        error: () => {
          this.errorCarga.set('No se pudieron cargar los estados de incidencias.');
          this.cargando.set(false);
        },
      });
  }

  private cargarIncidencias(): void {
    this.incidenciasService.cargarAdmin()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.cargando.set(false),
        error: () => {
          this.errorCarga.set('No se pudieron cargar las incidencias del edificio.');
          this.cargando.set(false);
        },
      });
  }

  readonly incidenciasFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const estado = this.estadoSeleccionado();
    const categoria = this.categoriaSeleccionada();
    const prioridad = this.prioridadSeleccionada();

    return this.incidencias()
      .filter((incidencia) => {
        const coincideBusqueda = [
          incidencia.titulo,
          incidencia.descripcion,
          incidencia.categoria,
          incidencia.ubicacion,
          incidencia.usuarioNombre,
        ].some((valor) => valor.toLowerCase().includes(termino));

        const coincideEstado =
          estado === 'todos' || incidencia.estado === estado;

        const coincideCategoria =
          categoria === 'todas' ||
          incidencia.categoria === categoria;
        const coincidePrioridad =
          prioridad === 'todas' || incidencia.prioridad === prioridad;

        return (
          coincideBusqueda &&
          coincideEstado &&
          coincideCategoria &&
          coincidePrioridad
        );
      })
      .sort(
        (a, b) =>
          new Date(b.fechaCreacion).getTime() -
          new Date(a.fechaCreacion).getTime(),
      );
  });

  readonly categorias = computed(() => [
    ...new Set(
      this.incidencias().map((incidencia) => incidencia.categoria),
    ),
  ]);

  get opcionesCategoria(): SelectOption[] {
    return [
      { label: 'Todas las categorías', value: 'todas' },
      ...this.categorias().map(categoria => ({ label: categoria, value: categoria })),
    ];
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarEstadoFiltro(valor: string): void {
    this.estadoSeleccionado.set(valor);
  }

  actualizarCategoriaFiltro(valor: string): void {
    this.categoriaSeleccionada.set(valor);
  }

  actualizarPrioridadFiltro(valor: string): void {
    this.prioridadSeleccionada.set(valor);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoSeleccionado.set('todos');
    this.categoriaSeleccionada.set('todas');
    this.prioridadSeleccionada.set('todas');
  }

  obtenerEstado(estado: EstadoIncidencia): string {
    return this.estadosCatalogo().find(
      item => this.normalizarEstado(item.nombre) === estado,
    )?.nombre ?? estado;
  }


  abrirDerivacion(incidencia: IncidenciaModel): void {
    if (
      incidencia.estado === 'cerrada' ||
      this.cargandoDerivacion() ||
      this.guardandoDerivacion()
    ) return;

    const tipoInicial: 'Propietario' | 'Personal' =
      incidencia.idUnidad != null ? 'Propietario' : 'Personal';

    this.incidenciaSeleccionada.set(incidencia);
    this.modalDerivacionAbierto.set(true);
    this.tipoDestinatario.set(tipoInicial);
    this.destinatarioSeleccionado.set('');
    this.propietariosRelacionados.set([]);
    this.personalDisponible.set([]);
    this.errorDerivacion.set('');
    this.cargandoDerivacion.set(true);

    this.incidenciasService.cargarDestinatarios(
      incidencia.idIncidencia,
      tipoInicial,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: destinatarios => {
          if (tipoInicial === 'Propietario') {
            this.propietariosRelacionados.set(destinatarios);
          } else {
            this.personalDisponible.set(destinatarios);
          }
        },
        error: err => {
          this.errorDerivacion.set(
            this.mensajeErrorBackend(
              err,
              'No se pudieron cargar los destinatarios.',
            ),
          );
          this.cargandoDerivacion.set(false);
        },
        complete: () => this.cargandoDerivacion.set(false),
      });
  }


  cerrarModalDerivacion(): void {
    if (this.guardandoDerivacion()) return;
    this.modalDerivacionAbierto.set(false);
  }

  cambiarTipoDestinatario(value: unknown): void {
    if (value !== 'Propietario' && value !== 'Personal') return;

    const incidencia = this.incidenciaSeleccionada();
    if (!incidencia) return;

    if (
      value === 'Propietario' &&
      incidencia.idUnidad == null
    ) {
      this.errorDerivacion.set(
        'Las incidencias de espacios comunes no se pueden derivar a propietarios.',
      );
      return;
    }

    this.tipoDestinatario.set(value);
    this.destinatarioSeleccionado.set('');
    this.errorDerivacion.set('');
    this.cargandoDerivacion.set(true);

    this.incidenciasService.cargarDestinatarios(
      incidencia.idIncidencia,
      value,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: destinatarios => {
          if (value === 'Propietario') {
            this.propietariosRelacionados.set(destinatarios);
          } else {
            this.personalDisponible.set(destinatarios);
          }
        },
        error: err => {
          this.errorDerivacion.set(
            this.mensajeErrorBackend(
              err,
              'No se pudieron cargar los destinatarios.',
            ),
          );
          this.cargandoDerivacion.set(false);
        },
        complete: () => this.cargandoDerivacion.set(false),
      });
  }
  seleccionarDestinatario(value: unknown): void {
    this.destinatarioSeleccionado.set(typeof value === 'string' ? value : '');
  }

  confirmarDerivacion(): void {
    const incidencia = this.incidenciaSeleccionada();
    const tipoDestinatario = this.tipoDestinatario();
    const idUsuarioDestinatario = this.destinatarioSeleccionado();

    if (
      !incidencia ||
      !idUsuarioDestinatario ||
      this.guardandoDerivacion()
    ) return;

    this.guardandoDerivacion.set(true);
    this.errorDerivacion.set('');

    this.incidenciasService.derivar(incidencia.idIncidencia, {
      idUsuarioDestinatario,
      tipoDestinatario,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.mensaje.set(
            `La incidencia #${incidencia.id} se derivó correctamente.`,
          );
          this.guardandoDerivacion.set(false);
          this.modalDerivacionAbierto.set(false);
        },
        error: err => {
          this.errorDerivacion.set(
            this.mensajeErrorBackend(
              err,
              'No se pudo registrar la derivación.',
            ),
          );
          this.guardandoDerivacion.set(false);
        },
      });
  }

  private mensajeErrorBackend(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.mensaje === 'string' && error.error.mensaje.trim()) {
      return error.error.mensaje;
    }
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'Esta incidencia ya fue derivada a ese destinatario.';
    }
    return fallback;
  }

  private normalizarEstado(value: string): string {
    return value.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }

}
