import { Component, inject, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);
  email = '';
  successMessage = '';
  errorMessage = '';
  isLoading = false;
  isSent = false;

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage = 'Por favor, ingresá tu correo electrónico.';
      return;
    }

    this.isLoading = true;
    this.isSent = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.isSent = true;
        this.successMessage = res.message || 'Si el correo está registrado, recibirás un correo con las instrucciones.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.isSent = false;
        this.errorMessage = err.error?.message || 'Ocurrió un error al procesar la solicitud.';
        this.cdr.detectChanges();
      }
    });
  }
}