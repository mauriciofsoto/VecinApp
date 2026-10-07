import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [AuthLayout, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  email = '';
  token = '';
  newPassword = '';
  confirmPassword = '';

  successMessage = '';
  errorMessage = '';
  isLoading = false;

  ngOnInit(): void {
    // Si viene redirigido con queryParams (?email=...&token=...), se completan solos
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    const tokenParam = this.route.snapshot.queryParamMap.get('token');

    if (emailParam) this.email = emailParam;
    if (tokenParam) this.token = tokenParam;
  }

  onSubmit(): void {
    if (!this.email || !this.token || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Por favor, completá todos los campos.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword({
      email: this.email,
      token: this.token,
      newPassword: this.newPassword
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message;
        // Redirige al login tras 2 segundos de confirmación
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al restablecer la contraseña. Verificá los datos ingresados.';
      }
    });
  }
}