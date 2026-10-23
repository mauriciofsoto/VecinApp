import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, AuthLayout, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  isLoading = false;

  errorMessage = signal('');
  showSuccessToast = signal(false);
  showErrorToast = signal(false);

  showPassword = signal(false);

  toggleShowPassword(): void {
    this.showPassword.update((prev) => !prev);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor, completá todos los campos.');
      this.triggerErrorToast();
      return;
    }

    this.isLoading = true;
    this.errorMessage.set('');

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.showSuccessToast.set(true);

        setTimeout(() => {
          this.showSuccessToast.set(false);

          const rol = this.authService.getRole()?.toLowerCase();

          if (rol?.includes('inquilino')) {
            this.router.navigate(['/inquilino/incidencias']);
          } else if (rol?.includes('administrador')) {
            this.router.navigate(['/administrador/incidencias']);
          } else {
            this.authService.logout();
            this.errorMessage.set('El usuario no tiene un rol válido para ingresar.');
            this.triggerErrorToast();
          }
        }, 1500);
      },
      error: (err) => {
        this.isLoading = false;

        if (err.status === 0) {
          this.errorMessage.set('No se pudo conectar con el servicio. Intentá de nuevo en unos momentos.');
        } else {
          this.errorMessage.set(err.error?.message || 'Email o contraseña incorrectos.');
        }

        this.triggerErrorToast();
      }
    });
  }
   
 

  private triggerErrorToast(): void {
    this.showErrorToast.set(true);
    setTimeout(() => {
      this.showErrorToast.set(false);
    }, 3500);
  }
}
