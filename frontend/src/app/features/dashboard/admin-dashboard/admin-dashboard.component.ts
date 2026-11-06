import { CommonModule, registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { interval, map, startWith } from 'rxjs';

import { AuthService } from '../../../core/services/auth';
import {
  BentoGridComponent,
  BentoWidget,
} from '../../../shared/components/layout/bento-grid/bento-grid';
import { BentoItemDirective } from '../../../shared/components/layout/bento-grid/bento-item.directive';
import { ReservaCalendarModal } from '../../operations/reservas/components/reserva-calendar-modal/reserva-calendar-modal';
import { Incidencias, IncidenciaDashboardDto } from '../../operations/incidencias/services/incidencias';

const DASHBOARD_WIDGETS: BentoWidget[] = [
  { id: 'calendar', title: 'Calendario', variant: 'glass', cols: 2, rows: 3, visible: true },
  { id: 'users', title: 'Usuarios', variant: 'glass', cols: 1, rows: 1, visible: true },
  { id: 'clock', title: 'Hora local', variant: 'solid', cols: 1, rows: 1, visible: true },
  { id: 'incidents', title: 'Incidencias', variant: 'glass', cols: 2, rows: 2, visible: true },
  { id: 'reservations', title: 'Reservas', variant: 'glass', cols: 1, rows: 1, visible: true },
  { id: 'weather', title: 'Clima', variant: 'solid', cols: 1, rows: 1, visible: true },
  { id: 'publications', title: 'Publicaciones', variant: 'glass', cols: 2, rows: 1, visible: true },
  { id: 'activity', title: 'Actividad reciente', variant: 'glass', cols: 2, rows: 1, visible: true },
];

registerLocaleData(localeEsAr);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BentoGridComponent, BentoItemDirective, ReservaCalendarModal],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly incidentsService = inject(Incidencias);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly widgets = DASHBOARD_WIDGETS;
  readonly now = signal(new Date());
  readonly today = new Date();
  readonly currentUser = this.auth.currentUser;
  readonly incidents = signal<IncidenciaDashboardDto[] | null>(null);
  readonly incidentsLoading = signal(false);
  readonly incidentsError = signal(false);

  // El calendario comparte la presentación existente; el backend todavía no expone reservas.
  readonly calendarReservations = [];

  constructor() {
    interval(30_000)
      .pipe(startWith(0), map(() => new Date()), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.now.set(value));

    if (this.currentUser()?.rol === 'Administrador') {
      this.loadIncidents();
    }
  }

  get incidentCounts(): { total: number; pending: number; inProgress: number; resolved: number } {
    const items = this.incidents() ?? [];
    return {
      pending: items.filter(item => this.normalizeStatus(item.estado) === 'pendiente').length,
      inProgress: items.filter(item => this.normalizeStatus(item.estado) === 'en proceso').length,
      resolved: items.filter(item => this.normalizeStatus(item.estado) === 'resuelta').length,
      total: items.length,
    };
  }

  get recentIncidents(): IncidenciaDashboardDto[] {
    return (this.incidents() ?? []).slice(0, 3);
  }

  readonly userName = () => {
    const user = this.currentUser();
    return user ? `${user.nombre} ${user.apellido}`.trim() : 'Administrador';
  };

  navigateToReservations(_date: string): void {
    void this.router.navigate(['/admin/reservas']);
  }

  private loadIncidents(): void {
    this.incidentsLoading.set(true);
    this.incidentsService.cargarParaDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          this.incidents.set(items);
          this.incidentsLoading.set(false);
        },
        error: () => {
          this.incidentsError.set(true);
          this.incidentsLoading.set(false);
        },
      });
  }

  private normalizeStatus(status: string): string {
    return status.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-\s]+/g, ' ');
  }
}
