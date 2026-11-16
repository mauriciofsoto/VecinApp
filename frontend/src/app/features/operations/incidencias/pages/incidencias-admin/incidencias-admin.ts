import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { EstadoIncidencia, Incidencia as IncidenciaModel } from '../../models/incidencia';

import {
  DestinatarioDerivacionDto,
  EstadoIncidenciaDto,
  Incidencias,
  UnidadDerivacionDto,
} from '../../services/incidencias';
import { AuthService } from '../../../../../core/services/auth';
import { Inquilinos } from '../../../inquilinos/services/inquilinos';
import { UsuarioComunidad } from '../../../inquilinos/models/usuario-comunidad';

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
  private readonly incidenciasService = inject(Incidencias);
  private readonly inquilinosService = inject(Inquilinos);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly incidencias = this.incidenciasService.incidencias;

  readonly totalIncidencias = this.incidenciasService.totalIncidencias;
  readonly pendientes = this.incidenciasService.totalPendientes;
  readonly enProceso = this.incidenciasService.totalEnProceso;
  readonly resueltas = this.incidenciasService.totalResueltas;

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
  readonly unidadRelacionada = signal<UnidadDerivacionDto | null>(null);
  readonly propietariosRelacionados = signal<DestinatarioDerivacionDto[]>([]);
  readonly personalDisponible = signal<DestinatarioDerivacionDto[]>([]);
  readonly cargandoDerivacion = signal(false);
  readonly guardandoDerivacion = signal(false);
  readonly errorDerivacion = signal('');

  readonly opcionesTipoDestinatario = computed<SelectOption[]>(() => [
    ...(this.propietariosRelacionados().length
      ? [{ label: 'Propietario relacionado', value: 'Propietario' }]
      : []),
    { label: 'Personal del edificio', value: 'Personal' },
  ]);

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
    if (this.cargandoDerivacion() || this.guardandoDerivacion()) return;

    this.incidenciaSeleccionada.set(incidencia);
    this.modalDerivacionAbierto.set(true);
    this.tipoDestinatario.set('Personal');
    this.destinatarioSeleccionado.set('');
    this.unidadRelacionada.set(null);
    this.propietariosRelacionados.set([]);
    this.personalDisponible.set([]);
    this.errorDerivacion.set('');
    this.cargandoDerivacion.set(true);

    forkJoin({
      propietarios: this.incidenciasService.cargarDestinatarios('Propietario'),
      personal: this.incidenciasService.cargarDestinatarios('Personal'),
      unidades: this.incidenciasService.cargarUnidadesDerivacion(),
      comunidad: this.inquilinosService.obtenerComunidad(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ propietarios, personal, unidades, comunidad }) => {
          const unidadReportante = this.buscarUnidadReportante(incidencia, comunidad, unidades);
          this.unidadRelacionada.set(unidadReportante);
          this.personalDisponible.set(personal);

          const propietariosRelacionados = unidadReportante
            ? propietarios.filter(destinatario => destinatario.unidadesDeclaradas.some(declaracion =>
                declaracion.tipo === 'Titularidad' &&
                declaracion.alquilada === true &&
                this.mismaUnidad(declaracion.piso, declaracion.unidad, unidadReportante.piso, unidadReportante.identificacion),
              ))
            : [];

          this.propietariosRelacionados.set(propietariosRelacionados);
          this.tipoDestinatario.set(propietariosRelacionados.length ? 'Propietario' : 'Personal');
        },
        error: err => {
          this.errorDerivacion.set(this.mensajeErrorBackend(err, 'No se pudieron cargar las unidades y destinatarios del edificio.'));
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
    this.tipoDestinatario.set(value);
    this.destinatarioSeleccionado.set('');
  }

  seleccionarDestinatario(value: unknown): void {
    this.destinatarioSeleccionado.set(typeof value === 'string' ? value : '');
  }

  confirmarDerivacion(): void {
    const incidencia = this.incidenciaSeleccionada();
    const tipoDestinatario = this.tipoDestinatario();
    const idUsuarioDestinatario = this.destinatarioSeleccionado();
    const unidad = this.unidadRelacionada();
    if (!incidencia || !idUsuarioDestinatario || this.guardandoDerivacion() ||
        (tipoDestinatario === 'Propietario' && !unidad)) return;

    this.guardandoDerivacion.set(true);
    this.errorDerivacion.set('');
    this.incidenciasService.derivar(incidencia.idIncidencia, {
      idUsuarioDestinatario,
      tipoDestinatario,
      ...(tipoDestinatario === 'Propietario' ? { idUnidad: unidad!.idUnidad } : {}),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.mensaje.set(`La incidencia #${incidencia.id} se derivó correctamente.`);
          this.guardandoDerivacion.set(false);
          this.modalDerivacionAbierto.set(false);
        },
        error: err => {
          this.errorDerivacion.set(this.mensajeErrorBackend(err, 'No se pudo registrar la derivación.'));
          this.guardandoDerivacion.set(false);
        },
      });
  }

  private buscarUnidadReportante(
    incidencia: IncidenciaModel,
    comunidad: UsuarioComunidad[],
    unidades: UnidadDerivacionDto[],
  ): UnidadDerivacionDto | null {
    const reportante = comunidad.find(usuario => usuario.id === incidencia.usuarioId);
    if (!reportante) return null;

    const unidadesDeclaradas = new Set<number>();
    for (const declaracion of reportante.unidadesDeclaradas) {
      const coincidencias = unidades.filter(unidad => this.mismaUnidad(
        declaracion.pisoDeclarado,
        declaracion.identificacionDeclarada,
        unidad.piso,
        unidad.identificacion,
      ));
      if (coincidencias.length === 1) unidadesDeclaradas.add(coincidencias[0].idUnidad);
    }

    if (unidadesDeclaradas.size !== 1) return null;
    const idUnidad = [...unidadesDeclaradas][0];
    return unidades.find(unidad => unidad.idUnidad === idUnidad) ?? null;
  }

  private mismaUnidad(pisoA: string | null, unidadA: string | null, pisoB: string | null, unidadB: string | null): boolean {
    const normalizar = (value: string | null) => value?.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-AR') ?? '';
    return !!normalizar(pisoA) && !!normalizar(unidadA) &&
      normalizar(pisoA) === normalizar(pisoB) && normalizar(unidadA) === normalizar(unidadB);
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
