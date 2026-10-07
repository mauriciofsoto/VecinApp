import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [AuthLayout, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  successMessage = '';
  errorMessage = '';
  isLoading = false;

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage = 'Por favor, ingresá tu correo electrónico.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message;

        // Si el backend devuelve devToken (entorno de pruebas sin servidor SMTP configurado)
        // redirige automáticamente a reset-password precargando los queryParams
        if (res.devToken) {
          setTimeout(() => {
            this.router.navigate(['/reset-password'], {
              queryParams: { email: this.email, token: res.devToken }
            });
          }, 2000);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Ocurrió un error al procesar la solicitud.';
      }
    });
  }
}