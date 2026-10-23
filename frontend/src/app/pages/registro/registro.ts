
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private authService = inject(AuthService);
  private router = inject(Router);

  nombre = '';
  apellido = '';
  email = '';
  password = '';
  codigoInvitacion = '';

  isLoading = false;
  errorMessage = signal('');
  successMessage = signal('');

  onSubmit(): void {
    if (
      !this.nombre.trim() ||
      !this.apellido.trim() ||
      !this.email.trim() ||
      !this.password ||
      !this.codigoInvitacion.trim()
    ) {
      this.errorMessage.set('Completá todos los campos.');
      return;
    }

    this.isLoading = true;
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.registrar({
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      email: this.email.trim(),
      password: this.password,
      codigoInvitacion: this.codigoInvitacion.trim().toUpperCase(),
    }).subscribe({
      next: (respuesta) => {
        this.isLoading = false;
        this.successMessage.set(
          respuesta.message || 'Cuenta creada correctamente.'
        );

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage.set(
          err.error?.message || 'No se pudo crear la cuenta. Revisá los datos.'
        );
      },
    });
  }
}
