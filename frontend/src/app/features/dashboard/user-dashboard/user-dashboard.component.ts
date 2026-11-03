import { CommonModule, registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { interval, map, startWith } from 'rxjs';

import { Unit } from '../../../core/models/unit';
import { Notification } from '../../../core/models/notification';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification';
import { UnitsService } from '../../../core/services/units';
import {
  BentoGridComponent,
  BentoWidget,
} from '../../../shared/components/layout/bento-grid/bento-grid';
import { BentoItemDirective } from '../../../shared/components/layout/bento-grid/bento-item.directive';
import { Incidencia } from '../../operations/incidencias/models/incidencia';
import { Incidencias } from '../../operations/incidencias/services/incidencias';

const RESIDENT_WIDGETS: BentoWidget[] = [
  { id: 'quick-actions', title: 'Accesos rápidos', variant: 'solid', cols: 2, rows: 1, visible: true },
  { id: 'clock', title: 'Hora local', variant: 'solid', cols: 1, rows: 1, visible: true },
  { id: 'weather', title: 'Clima', variant: 'solid', cols: 1, rows: 1, visible: true },
  { id: 'reservations', title: 'Mis reservas', variant: 'glass', cols: 2, rows: 2, visible: true },
  { id: 'packages', title: 'Paquetería', variant: 'glass', cols: 1, rows: 2, visible: true },
  { id: 'incidents', title: 'Mis incidencias', variant: 'glass', cols: 2, rows: 2, visible: true },
  { id: 'publications', title: 'Publicaciones', variant: 'glass', cols: 2, rows: 2, visible: true },
  { id: 'notifications', title: 'Notificaciones', variant: 'glass', cols: 2, rows: 2, visible: true },
];

registerLocaleData(localeEsAr);

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BentoGridComponent, BentoItemDirective],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss',
})
export class UserDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly unitsService = inject(UnitsService);
  private readonly incidentsService = inject(Incidencias);
  private readonly notificationsService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly widgets = RESIDENT_WIDGETS;
  readonly currentUser = this.auth.currentUser;
  readonly now = signal(new Date());
  readonly units = signal<Unit[] | null>(null);
  readonly incidents = signal<Incidencia[] | null>(null);
  readonly incidentsLoading = signal(true);
  readonly incidentsError = signal(false);
  readonly notifications = signal<Notification[] | null>(null);
  readonly notificationsLoading = signal(true);
  readonly notificationsError = signal(false);
  readonly notificationActionError = signal(false);

  constructor() {
    interval(30_000)
      .pipe(startWith(0), map(() => new Date()), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.now.set(value));

    this.loadUnits();
    this.loadIncidents();
    this.loadNotifications();
  }

  get userName(): string {
    const user = this.currentUser();
    return user ? `${user.nombre} ${user.apellido}`.trim() : 'residente';
  }

  get communityName(): string {
    const units = this.units();
    if (!units) return 'Cargando comunidad';
    if (!units.length) return 'Edificio no disponible';
    const buildings = [...new Set(units.map(unit => unit.edificioNombre).filter(Boolean))];
    return buildings.length === 1 ? buildings[0] : 'Mis edificios';
  }

  get activeIncidents(): Incidencia[] {
    return (this.incidents() ?? [])
      .filter(item => !['resuelta', 'rechazada'].includes(this.normalizeState(item.estado)))
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }

  get recentNotifications(): Notification[] {
    return (this.notifications() ?? []).slice(0, 5);
  }

  get unreadCount(): number {
    return (this.notifications() ?? []).filter(item => !item.leida).length;
  }

  openNotification(item: Notification): void {
    this.notificationActionError.set(false);
    const navigate = (): void => {
      this.notifications.update(items => items?.map(current =>
        current.idNotificacion === item.idNotificacion ? { ...current, leida: true } : current,
      ) ?? null);
      if (item.ruta) void this.router.navigateByUrl(item.ruta);
    };

    if (item.leida) {
      navigate();
      return;
    }

    this.notificationsService.markRead(item.idNotificacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: navigate,
        error: () => this.notificationActionError.set(true),
      });
  }

  private loadUnits(): void {
    this.unitsService.getMyUnits()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => this.units.set(items),
        error: () => this.units.set([]),
      });
  }

  private loadIncidents(): void {
    this.incidentsService.cargarMisIncidencias()
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

  private loadNotifications(): void {
    this.notificationsService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          this.notifications.set([...items].sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
          ));
          this.notificationsLoading.set(false);
        },
        error: () => {
          this.notificationsError.set(true);
          this.notificationsLoading.set(false);
        },
      });
  }

  private normalizeState(state: string): string {
    return state.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
