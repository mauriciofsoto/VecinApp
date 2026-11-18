import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, ActivatedRouteSnapshot } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationBellComponent } from '../../organisms/notifications/notification-bell/notification-bell';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NotificationBellComponent, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  protected readonly pageTitle = signal('Dashboard');
  protected readonly currentUser = this.auth.currentUser;

  protected readonly userInitials = () => {
    const user = this.currentUser();

    return `${user?.nombre?.[0] ?? ''}${user?.apellido?.[0] ?? ''}`
      .toUpperCase() || 'U';
  };

  protected readonly userDisplayName = () => {
    const user = this.currentUser();

    return user
      ? `${user.nombre} ${user.apellido}`.trim() || user.email
      : 'Usuario';
  };

  protected readonly userRoleLabel = () => {
    const role = this.currentUser()?.rol;

    return role === 'Portero' ? 'Personal' : role ?? '';
  };

  private readonly titles: Record<string, string> = {
    'admin-dashboard': 'Dashboard',
    'admin/dashboard': 'Dashboard',
    'porteria-dashboard': 'Dashboard',
    'user-dashboard': 'Mi inicio',
    perfil: 'Mi perfil',
    'admin/edificios': 'Edificios',
    comunidad: 'Comunidad',
    encuestas: 'Encuestas',
    'admin/publicaciones': 'Publicaciones',
    'admin/incidencias': 'Incidencias',
    incidencias: 'Incidencias',
    'mis-incidencias': 'Mis incidencias',
    'incidencias-derivadas': 'Incidencias derivadas',
    'recepcion-paquetes': 'Recepción de paquetes',
    'admin/paqueteria': 'Recepción de paquetes',
    'mis-paquetes': 'Mis paquetes',
    'admin/reservas': 'Gestionar reservas',
    reservas: 'Gestionar reservas',
    'mis-reservas': 'Mis reservas',
    'reservas-porteria': 'Reservas del edificio',
    'admin/usuarios': 'Inquilinos',
    inquilinos: 'Inquilinos',
    'admin/invitaciones': 'Invitaciones QR',
  };

  constructor() {
    this.updatePageTitle();

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.updatePageTitle());
  }

  private updatePageTitle(): void {
    let route: ActivatedRouteSnapshot | null =
      this.router.routerState.snapshot.root;

    let configuredTitle: string | undefined;

    while (route) {
      const title = route.data?.['title'];

      if (typeof title === 'string' && title.trim()) {
        configuredTitle = title;
      }

      route = route.firstChild;
    }

    const routePath = this.router.url
      .split(/[?#]/, 1)[0]
      .replace(/^\/+|\/+$/g, '');

    this.pageTitle.set(
      configuredTitle ?? this.titles[routePath] ?? 'Dashboard'
    );
  }
}
