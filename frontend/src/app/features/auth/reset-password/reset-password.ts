import { Component, OnInit, inject, signal } from '@angular/core';
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

  isLoading = false;

 
  successMessage = signal('');
  errorMessage = signal('');

 
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  toggleShowNewPassword(): void {
    this.showNewPassword.update((prev) => !prev);
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update((prev) => !prev);
  }

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    const tokenParam = this.route.snapshot.queryParamMap.get('token');

    if (emailParam) this.email = emailParam;
    if (tokenParam) this.token = tokenParam;
  }

  onSubmit(): void {
    if (!this.email || !this.token || !this.newPassword || !this.confirmPassword) {
      this.errorMessage.set('Por favor, completá todos los campos.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    // Regla: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordPolicy.test(this.newPassword)) {
      this.errorMessage.set(
        'La contraseña debe tener al menos 8 caracteres, incluir al menos una letra mayúscula, una minúscula y un número.'
      );
      return;
    }

    this.isLoading = true;
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService
      .resetPassword({
        email: this.email,
        token: this.token,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.successMessage.set(res.message);
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage.set(
            err.error?.message ||
              'Error al restablecer la contraseña. Verificá los datos ingresados.'
          );
        },
      });
  }
}