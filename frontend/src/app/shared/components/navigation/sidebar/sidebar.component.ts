
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';

type UserRole =
  | 'Administrador'
  | 'SuperAdministrador'
  | 'Porteria'
  | 'Inquilino'
  | 'Propietario';

interface SidebarItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  roles: UserRole[];
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);
  readonly loggingOut = signal(false);

  readonly user = this.authService.currentUser;

  readonly role = computed(
    () => (this.user()?.rol ?? '') as UserRole
  );

  readonly userDisplayName = computed(() => {
    const user = this.user();

    return user
      ? `${user.nombre} ${user.apellido}`.trim() || user.email
      : 'Usuario';
  });

  readonly userRoleLabel = computed(() => this.role());

  readonly dashboardRoute = computed(() => {
    switch (this.role()) {
      case 'Administrador':
      case 'SuperAdministrador':
        return '/admin-dashboard';

      case 'Porteria':
        return '/porteria-dashboard';

      case 'Inquilino':
      case 'Propietario':
        return '/user-dashboard';

      default:
        return '/login';
    }
  });

  private readonly sections: SidebarSection[] = [
    {
      title: 'MENÚ PRINCIPAL',
      items: [
        {
          label: 'Dashboard',
          icon: '▦',
          route: '/admin-dashboard',
          exact: true,
          roles: ['Administrador', 'SuperAdministrador'],
        },
        {
          label: 'Dashboard',
          icon: '▦',
          route: '/porteria-dashboard',
          exact: true,
          roles: ['Porteria'],
        },
        {
          label: 'Mi inicio',
          icon: '⌂',
          route: '/user-dashboard',
          exact: true,
          roles: ['Inquilino', 'Propietario'],
        },
      ],
    },
    {
      title: 'COMUNIDAD',
      items: [
        {
          label: 'Publicaciones',
          icon: '◉',
          route: '/comunidad',
          roles: [
            'Administrador',
            'SuperAdministrador',
            'Inquilino',
            'Propietario',
          ],
        },
        {
          label: 'Encuestas',
          icon: '▤',
          route: '/encuestas',
          roles: [
            'Administrador',
            'SuperAdministrador',
            'Inquilino',
            'Propietario',
          ],
        },
      ],
    },
    {
      title: 'OPERACIONES',
      items: [
        {
          label: 'Incidencias',
          icon: '◈',
          route: '/incidencias',
          roles: ['Administrador', 'SuperAdministrador'],
        },
        {
          label: 'Mis incidencias',
          icon: '◈',
          route: '/mis-incidencias',
          roles: ['Inquilino', 'Propietario'],
        },
        {
          label: 'Recepción de paquetes',
          icon: '▣',
          route: '/recepcion-paquetes',
          roles: [
            'Administrador',
            'SuperAdministrador',
            'Porteria',
          ],
        },
        {
          label: 'Mis paquetes',
          icon: '▣',
          route: '/mis-paquetes',
          roles: ['Inquilino', 'Propietario'],
        },
        {
          label: 'Gestionar reservas',
          icon: '▦',
          route: '/reservas',
          roles: ['Administrador', 'SuperAdministrador'],
        },
        {
          label: 'Mis reservas',
          icon: '▦',
          route: '/mis-reservas',
          roles: ['Inquilino', 'Propietario'],
        },
      ],
    },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        {
          label: 'Inquilinos',
          icon: '♙',
          route: '/inquilinos',
          roles: ['Administrador', 'SuperAdministrador'],
        },
      ],
    },
  ];

  readonly menuSections = computed(() => {
    const currentRole = this.role();

    return this.sections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.roles.includes(currentRole)
        ),
      }))
      .filter(section => section.items.length > 0);
  });

  toggleSidebar(): void {
    this.isOpen.update(value => !value);
  }

  closeSidebar(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);

    try {
      await new Promise<void>((resolve, reject) => {
        this.authService.logout().subscribe({
          next: () => resolve(),
          error: reject,
        });
      });
    } catch {
      this.authService.clearSession();
    } finally {
      this.loggingOut.set(false);
      this.closeSidebar();

      await this.router.navigate(['/login'], {
        replaceUrl: true,
      });
    }
  }
}