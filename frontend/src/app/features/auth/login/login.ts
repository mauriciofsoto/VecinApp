
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  onSubmit(): void {
    if (this.loading()) return;

    this.errorMessage.set('');

    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Ingresá tu correo y contraseña.');
      return;
    }

    this.loading.set(true);

    this.authService
      .login({
        email: this.email.trim(),
        password: this.password,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const role = response.user.rol;

          const dashboardByRole: Record<string, string> = {
            Administrador: '/admin-dashboard',
            SuperAdministrador: '/admin-dashboard',
            Porteria: '/porteria-dashboard',
            Inquilino: '/user-dashboard',
            Propietario: '/user-dashboard',
          };

          const requestedUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const dashboard = dashboardByRole[role] ?? '/';

          // Evita redirigir a una URL externa.
          const returnUrl =
            requestedUrl?.startsWith('/') && !requestedUrl.startsWith('//')
              ? requestedUrl
              : dashboard;

          void this.router.navigateByUrl(returnUrl);
        },
        error: (error) => {
          const message = error?.error?.message;

          this.errorMessage.set(
            typeof message === 'string'
              ? message
              : 'No se pudo iniciar sesión. Revisá tus credenciales e intentá nuevamente.',
          );
        },
      });
  }
}
