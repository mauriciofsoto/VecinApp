import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EstadoIncidencia } from '../../models/incidencia';

import { EstadoIncidenciaDto, Incidencias } from '../../services/incidencias';
import { AuthService } from '../../../../../core/services/auth';

import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { CardComponent } from '../../../../../shared/components/atoms/card/card.component';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import { SelectComponent, SelectOption } from '../../../../../shared/components/atoms/select/select';

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
  ],
  templateUrl: './incidencias-admin.html',
  styleUrl: './incidencias-admin.scss',
})
export class IncidenciasAdmin implements OnInit {
  private readonly incidenciasService = inject(Incidencias);
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

  private normalizarEstado(value: string): string {
    return value.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }

}
