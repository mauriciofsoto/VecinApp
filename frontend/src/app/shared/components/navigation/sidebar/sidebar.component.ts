
import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { getDashboardUrl, ownerHasAccess } from '../../../../core/guards/auth.guard';
import { AuthService } from '../../../../core/services/auth';
import { ThemeService } from '../../../../core/services/theme.service';
import { PerfilUsuario } from '../../../../features/profile/models/perfil-usuario';
import { PerfilService } from '../../../../features/profile/services/perfil.service';

type UserRole =
  | 'Administrador'
  | 'SuperAdministrador'
  | 'Portero'
  | 'Inquilino'
  | 'Propietario';

interface SidebarItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  roles: UserRole[];
  ownerAccess?: 'resident' | 'community' | 'rental';
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
  private readonly perfilService = inject(PerfilService);
  readonly themeService = inject(ThemeService);

  readonly isOpen = signal(false);
  readonly loggingOut = signal(false);

  readonly user = this.authService.currentUser;
  readonly ownerProfile = signal<PerfilUsuario | null>(null);

  constructor() {
    effect(onCleanup => {
      const currentUser = this.user();
      this.ownerProfile.set(null);
      if (currentUser?.rol !== 'Propietario') return;

      const userId = currentUser.id;
      const request = this.perfilService.obtenerMiPerfil().subscribe({
        next: profile => {
          if (this.user()?.id === userId) this.ownerProfile.set(profile);
        },
        error: () => {
          if (this.user()?.id === userId) this.ownerProfile.set(null);
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  readonly role = computed(
    () => (this.user()?.rol ?? '') as UserRole
  );

  readonly userDisplayName = computed(() => {
    const user = this.user();

    return user
      ? `${user.nombre} ${user.apellido}`.trim() || user.email
      : 'Usuario';
  });

  readonly userRoleLabel = computed(() => this.role() === 'Portero' ? 'Personal' : this.role());

  readonly dashboardRoute = computed(() =>
    getDashboardUrl(this.authService, this.ownerProfile() ?? undefined),
  );

  private readonly sections: SidebarSection[] = [
    {
      title: 'MENÚ PRINCIPAL',
      items: [
        {
          label: 'Dashboard',
          icon: '▦',
          route: '/admin/dashboard',
          exact: true,
          roles: ['Administrador'],
        },
        {
          label: 'Dashboard',
          icon: '▦',
          route: '/porteria-dashboard',
          exact: true,
          roles: ['Portero'],
        },
        {
          label: 'Mi inicio',
          icon: '⌂',
          route: '/user-dashboard',
          exact: true,
          roles: ['Inquilino', 'Propietario'],
          ownerAccess: 'resident',
        },
      ],
    },
    {
      title: 'COMUNIDAD',
      items: [
        {
          label: 'Comunidad',
          icon: '◉',
          route: '/comunidad',
          roles: [
            'Administrador',
            'Inquilino',
            'Propietario',
            'Portero',
          ],
          ownerAccess: 'community',
        },
        {
          label: 'Encuestas',
          icon: '▤',
          route: '/encuestas',
          roles: [
            'Administrador',
            'Inquilino',
            'Propietario',
            'Portero',
          ],
          ownerAccess: 'community',
        },
      ],
    },
    {
      title: 'OPERACIONES',
      items: [
        {
          label: 'Publicaciones',
          icon: '▤',
          route: '/admin/publicaciones',
          roles: ['Administrador'],
        },
        {
          label: 'Edificios',
          icon: '▦',
          route: '/admin/edificios',
          roles: ['SuperAdministrador'],
        },
        {
          label: 'Incidencias',
          icon: '◈',
          route: '/admin/incidencias',
          roles: ['Administrador'],
        },
        {
          label: 'Mis incidencias',
          icon: '◈',
          route: '/mis-incidencias',
          roles: ['Inquilino', 'Propietario'],
          ownerAccess: 'resident',
        },
        {
          label: 'Incidencias',
          icon: '↗',
          route: '/incidencias-derivadas',
          roles: ['Propietario', 'Portero'],
          ownerAccess: 'rental',
        },
        {
          label: 'Recepción de paquetes',
          icon: '▣',
          route: '/recepcion-paquetes',
          roles: [
            'Administrador',
            'Portero',
          ],
        },
        {
          label: 'Mis paquetes',
          icon: '▣',
          route: '/mis-paquetes',
          roles: ['Inquilino', 'Propietario'],
          ownerAccess: 'resident',
        },
        {
          label: 'Gestionar reservas',
          icon: '▦',
          route: '/admin/reservas',
          roles: ['Administrador'],
        },
        {
          label: 'Mis reservas',
          icon: '▦',
          route: '/mis-reservas',
          roles: ['Inquilino', 'Propietario'],
          ownerAccess: 'resident',
        },
        {
          label: 'Reservas del edificio',
          icon: '▦',
          route: '/reservas-porteria',
          roles: ['Portero'],
        },
      ],
    },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        {
          label: 'Invitaciones QR',
          icon: '▦',
          route: '/admin/invitaciones',
          roles: ['Administrador'],
        },
        {
          label: 'Inquilinos',
          icon: '♙',
          route: '/inquilinos',
          roles: ['Administrador'],
        },
      ],
    },
  ];

  readonly menuSections = computed(() => {
    const currentRole = this.role();

    return this.sections
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (!item.roles.includes(currentRole)) return false;
          if (currentRole !== 'Propietario') return true;

          const profile = this.ownerProfile();
          if (!profile || !item.ownerAccess) return false;
          return ownerHasAccess(profile, item.ownerAccess);
        }),
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
