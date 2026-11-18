import { CommonModule, registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
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
import { Reservas } from '../../operations/reservas/services/reservas';
import { Reserva } from '../../operations/reservas/models/reserva';
import { Paqueteria } from '../../operations/paqueteria/services/paqueteria';
import { Paquete } from '../../operations/paqueteria/models/paquete';
import { Feed } from '../../community/feed/services/feed';
import { SolicitudVinculacion } from '../../profile/models/perfil-usuario';
import { VinculacionesPerfilService } from '../../profile/services/vinculaciones.service';

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
  private readonly reservationsService = inject(Reservas);
  private readonly packagesService = inject(Paqueteria);
  private readonly feedService = inject(Feed);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly vinculacionesService = inject(VinculacionesPerfilService);
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
  readonly solicitudesVinculacion = signal<SolicitudVinculacion[]>([]);
  readonly solicitudesVinculacionLoading = signal(true);
  readonly solicitudesVinculacionError = signal(false);
  readonly reservations = signal<Reserva[] | null>(null);
  readonly reservationsLoading = signal(true);
  readonly reservationsError = signal(false);
  readonly packages = signal<Paquete[] | null>(null);
  readonly packagesLoading = signal(true);
  readonly packagesError = signal(false);
  readonly pendingPackageCount = computed(() => (this.packages() ?? []).filter(item => item.estado === 'Pendiente').length);
  readonly solicitudesPendientes = computed(() =>
    this.solicitudesVinculacion().filter(solicitud => solicitud.estado === 'Pendiente')
  );
  readonly publications = this.feedService.posts;
  readonly publicationsLoading = this.feedService.loading;
  readonly publicationsError = this.feedService.error;
  readonly myPublications = computed(() => {
    const id = this.currentUser()?.id;
    return id ? this.publications().filter(post => String(post.userId) === id) : [];
  });
  readonly myRecentComments = computed(() => this.publications()
    .flatMap(post => post.comments
      .filter(comment => comment.isMine)
      .map(comment => ({ ...comment, publicationTitle: post.title || post.content })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3));
  readonly myCommentCount = computed(() => this.publications()
    .reduce((total, post) => total + post.comments.filter(comment => comment.isMine).length, 0));
  readonly myReactionCount = computed(() => this.publications()
    .flatMap(post => post.reactions)
    .filter(reaction => reaction.reacted).length);

  constructor() {
    interval(30_000)
      .pipe(startWith(0), map(() => new Date()), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.now.set(value));

    effect(() => {
      const session = this.auth.captureSession();
      this.resetPersonalState();
      if (!session.userId) return;
      this.loadUnits(session);
      this.loadIncidents(session);
      this.loadNotifications(session);
      this.loadSolicitudesVinculacion(session);
      this.loadReservations(session);
      this.loadPackages(session);
    });
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
    const session = this.auth.captureSession();
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
        next: () => { if (this.auth.isCurrentSession(session)) navigate(); },
        error: () => { if (this.auth.isCurrentSession(session)) this.notificationActionError.set(true); },
      });
  }

  private resetPersonalState(): void {
    this.solicitudesVinculacion.set([]);
    this.solicitudesVinculacionLoading.set(true);
    this.solicitudesVinculacionError.set(false);
    this.units.set(null);
    this.incidents.set(null);
    this.incidentsLoading.set(true);
    this.incidentsError.set(false);
    this.notifications.set(null);
    this.notificationsLoading.set(true);
    this.notificationsError.set(false);
    this.notificationActionError.set(false);
    this.reservations.set(null);
    this.reservationsLoading.set(true);
    this.reservationsError.set(false);
    this.packages.set(null);
    this.packagesLoading.set(true);
    this.packagesError.set(false);
  }

  private loadUnits(session: { userId: string | null; version: number }): void {
    this.unitsService.getMyUnits()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => { if (this.auth.isCurrentSession(session)) this.units.set(items); },
        error: () => { if (this.auth.isCurrentSession(session)) this.units.set([]); },
      });
  }

  private loadIncidents(session: { userId: string | null; version: number }): void {
    this.incidentsService.cargarMisIncidencias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (!this.auth.isCurrentSession(session)) return;
          this.incidents.set(items);
          this.incidentsLoading.set(false);
        },
        error: () => {
          if (!this.auth.isCurrentSession(session)) return;
          this.incidentsError.set(true);
          this.incidentsLoading.set(false);
        },
      });
  }

  private loadNotifications(session: { userId: string | null; version: number }): void {
    this.notificationsService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (!this.auth.isCurrentSession(session)) return;
          this.notifications.set([...items].sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
          ));
          this.notificationsLoading.set(false);
        },
        error: () => {
          if (!this.auth.isCurrentSession(session)) return;
          this.notificationsError.set(true);
          this.notificationsLoading.set(false);
        },
      });
  }
  private loadSolicitudesVinculacion(session: { userId: string | null; version: number }): void {
    this.vinculacionesService.solicitudes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (!this.auth.isCurrentSession(session)) return;

          this.solicitudesVinculacion.set(items);
          this.solicitudesVinculacionLoading.set(false);
        },
        error: () => {
          if (!this.auth.isCurrentSession(session)) return;

          this.solicitudesVinculacionError.set(true);
          this.solicitudesVinculacionLoading.set(false);
        },
      });
  }
  private loadReservations(session: { userId: string | null; version: number }): void {
    this.reservationsService.cargarMisReservas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (!this.auth.isCurrentSession(session)) return;
          this.reservations.set(items);
          this.reservationsLoading.set(false);
        },
        error: () => {
          if (!this.auth.isCurrentSession(session)) return;
          this.reservationsError.set(true);
          this.reservationsLoading.set(false);
        },
      });
  }

  private loadPackages(session: { userId: string | null; version: number }): void {
    this.packagesService.misPaquetes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          if (!this.auth.isCurrentSession(session)) return;
          this.packages.set(items);
          this.packagesLoading.set(false);
        },
        error: () => {
          if (!this.auth.isCurrentSession(session)) return;
          this.packagesError.set(true);
          this.packagesLoading.set(false);
        },
      });
  }

  private normalizeState(state: string): string {
    return state.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
