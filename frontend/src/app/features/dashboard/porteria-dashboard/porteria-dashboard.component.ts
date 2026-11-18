import { CommonModule, registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval, map, startWith } from 'rxjs';

import { AuthService } from '../../../core/services/auth';
import {
  BentoGridComponent,
  BentoWidget,
} from '../../../shared/components/layout/bento-grid/bento-grid';
import { BentoItemDirective } from '../../../shared/components/layout/bento-grid/bento-item.directive';
import { Paquete } from '../../operations/paqueteria/models/paquete';
import { Paqueteria } from '../../operations/paqueteria/services/paqueteria';
import { DerivacionIncidenciaDto, Incidencias } from '../../operations/incidencias/services/incidencias';
import { Reserva } from '../../operations/reservas/models/reserva';
import { Reservas } from '../../operations/reservas/services/reservas';
import { PerfilService } from '../../profile/services/perfil.service';

const PORTER_WIDGETS: BentoWidget[] = [
  { id: 'summary', title: 'Resumen del día', variant: 'glass', cols: 4, rows: 1, visible: true },
  { id: 'quick-actions', title: 'Accesos rápidos', variant: 'solid', cols: 1, rows: 2, visible: true },
  { id: 'packages', title: 'Paquetes pendientes', variant: 'glass', cols: 3, rows: 2, visible: true },
  { id: 'incidents', title: 'Incidencias derivadas', variant: 'glass', cols: 2, rows: 2, visible: true },
  { id: 'reservations', title: 'Reservas de hoy y próximas', variant: 'glass', cols: 2, rows: 2, visible: true },
];

registerLocaleData(localeEsAr);

@Component({
  selector: 'app-porteria-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BentoGridComponent, BentoItemDirective],
  templateUrl: './porteria-dashboard.component.html',
  styleUrl: './porteria-dashboard.component.scss',
})
export class PorteriaDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly paqueteria = inject(Paqueteria);
  private readonly incidenciasService = inject(Incidencias);
  private readonly reservasService = inject(Reservas);
  private readonly perfilService = inject(PerfilService);
  private readonly destroyRef = inject(DestroyRef);

  readonly widgets = PORTER_WIDGETS;
  readonly now = signal(new Date());
  readonly currentUser = this.auth.currentUser;
  readonly edificioNombre = signal<string | null>(null);

  readonly paquetes = signal<Paquete[] | null>(null);
  readonly paquetesLoading = signal(true);
  readonly paquetesError = signal(false);
  readonly incidencias = signal<DerivacionIncidenciaDto[] | null>(null);
  readonly incidenciasLoading = signal(true);
  readonly incidenciasError = signal(false);
  readonly reservas = signal<Reserva[] | null>(null);
  readonly reservasLoading = signal(true);
  readonly reservasError = signal(false);
  readonly espaciosError = signal(false);

  readonly userName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.nombre} ${user.apellido}`.trim() || user.email : 'Portero';
  });

  readonly paquetesPendientes = computed(() =>
    (this.paquetes() ?? []).filter(paquete => paquete.estado === 'Pendiente'),
  );

  readonly entregasSinConfirmar = computed(() =>
    (this.paquetes() ?? []).filter(paquete => paquete.estado === 'Entregado'),
  );

  readonly paquetesPendientesRecientes = computed(() =>
    this.paquetesPendientes().slice(0, 5),
  );

  readonly incidenciasActivas = computed(() =>
    (this.incidencias() ?? [])
      .filter(item => !['resuelta', 'rechazada'].includes(this.normalizar(item.estado)))
      .sort((a, b) =>
        this.prioridadRank(a.prioridad) - this.prioridadRank(b.prioridad)
        || new Date(b.fechaDerivacion).getTime() - new Date(a.fechaDerivacion).getTime(),
      ),
  );

  readonly incidenciasRecientes = computed(() =>
    this.incidenciasActivas().slice(0, 5),
  );

  readonly reservasActivas = computed(() =>
    (this.reservas() ?? []).filter(reserva =>
      ['pendiente', 'confirmada', 'en-mediacion'].includes(reserva.estado),
    ),
  );

  readonly reservasHoy = computed(() =>
    this.reservasActivas().filter(reserva => reserva.fecha === this.fechaHoy()),
  );

  readonly proximasReservas = computed(() =>
    this.reservasActivas()
      .filter(reserva => reserva.fecha >= this.fechaHoy())
      .slice(0, 5),
  );

  readonly resumenLoading = computed(() =>
    this.paquetesLoading() || this.incidenciasLoading() || this.reservasLoading(),
  );

  readonly resumenError = computed(() =>
    this.paquetesError() || this.incidenciasError() || this.reservasError(),
  );

  constructor() {
    interval(30_000)
      .pipe(startWith(0), map(() => new Date()), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.now.set(value));

    effect(() => {
      const session = this.auth.captureSession();
      this.resetState();
      if (!session.userId || this.currentUser()?.rol !== 'Portero') return;

      this.cargarPerfil(session);
      this.cargarPaquetes(session);
      this.cargarIncidencias(session);
      this.cargarReservas(session);
      this.cargarEspacios(session);
    });
  }

  nombreEspacio(espacioId: number): string {
    return this.reservasService.nombreEspacio(espacioId);
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private resetState(): void {
    this.edificioNombre.set(null);
    this.paquetes.set(null);
    this.paquetesLoading.set(true);
    this.paquetesError.set(false);
    this.incidencias.set(null);
    this.incidenciasLoading.set(true);
    this.incidenciasError.set(false);
    this.reservas.set(null);
    this.reservasLoading.set(true);
    this.reservasError.set(false);
    this.espaciosError.set(false);
  }

  private cargarPerfil(session: { userId: string | null; version: number }): void {
    this.perfilService.obtenerMiPerfil()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: perfil => {
          if (this.auth.isCurrentSession(session)) this.edificioNombre.set(perfil.edificioNombre);
        },
        error: () => {
          if (this.auth.isCurrentSession(session)) this.edificioNombre.set(null);
        },
      });
  }

  private cargarPaquetes(session: { userId: string | null; version: number }): void {
    this.paqueteria.listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (!this.auth.isCurrentSession(session)) return;
          this.paquetes.set(items);
          this.paquetesLoading.set(false);
        },
        error: () => {
          if (!this.auth.isCurrentSession(session)) return;
          this.paquetesError.set(true);
          this.paquetesLoading.set(false);
        },
      });
  }

  private cargarIncidencias(session: { userId: string | null; version: number }): void {
    this.incidenciasService.cargarDerivaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (!this.auth.isCurrentSession(session)) return;
          this.incidencias.set(items);
          this.incidenciasLoading.set(false);
        },
        error: () => {
          if (!this.auth.isCurrentSession(session)) return;
          this.incidenciasError.set(true);
          this.incidenciasLoading.set(false);
        },
      });
  }

  private cargarReservas(session: { userId: string | null; version: number }): void {
    this.reservasService.cargarTodasLasReservas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (!this.auth.isCurrentSession(session)) return;
          this.reservas.set(items);
          this.reservasLoading.set(false);
        },
        error: () => {
          if (!this.auth.isCurrentSession(session)) return;
          this.reservasError.set(true);
          this.reservasLoading.set(false);
        },
      });
  }

  private cargarEspacios(session: { userId: string | null; version: number }): void {
    this.reservasService.cargarEspacios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          if (this.auth.isCurrentSession(session)) this.espaciosError.set(true);
        },
      });
  }

  private fechaHoy(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private prioridadRank(prioridad: string): number {
    switch (this.normalizar(prioridad)) {
      case 'alta':
        return 0;
      case 'media':
        return 1;
      case 'baja':
        return 2;
      default:
        return 3;
    }
  }

  private normalizar(value: string): string {
    return value.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }
}
