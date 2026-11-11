import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth';
import { getDashboardUrl } from '../../../core/guards/auth.guard';
import { ButtonComponent } from '../../../shared/components/atoms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonComponent],
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
        next: () => {
          const requestedUrl =
            this.route.snapshot.queryParamMap.get('returnUrl');

          const dashboard = getDashboardUrl(this.authService);

          const returnUrl =
            requestedUrl?.startsWith('/') &&
            !requestedUrl.startsWith('//')
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
