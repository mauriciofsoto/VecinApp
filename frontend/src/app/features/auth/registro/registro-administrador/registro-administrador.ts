import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-registro-administrador',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro-administrador.html',
  styleUrl: './registro-administrador.scss',
})
export class RegistroAdministrador {
  private readonly auth = inject(AuthService);

  nombre = '';
  apellido = '';
  email = '';
  telefono = '';
  password = '';
  confirmPassword = '';
  nombreEdificio = '';
  direccion = '';
  localidad = '';
  provincia = '';
  etapa = 1;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  get administradorValido(): boolean {
    return !!this.nombre.trim() && !!this.apellido.trim() &&
      this.emailValido && !!this.telefono.trim() &&
      this.passwordPattern.test(this.password) && this.confirmPassword === this.password;
  }

  get emailValido(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get contrasenasCoinciden(): boolean {
    return this.password === this.confirmPassword;
  }

  get edificioValido(): boolean {
    return !!this.nombreEdificio.trim() && !!this.direccion.trim() &&
      !!this.localidad.trim() && !!this.provincia.trim();
  }

  continuar(): void {
    this.error.set('');
    if (!this.administradorValido) {
      this.error.set('Completá los datos correctamente y verificá las reglas de contraseña.');
      return;
    }
    this.etapa = 2;
  }

  volver(): void {
    this.error.set('');
    this.etapa = 1;
  }

  registrar(): void {
    this.error.set('');
    this.success.set('');
    if (this.loading()) return;
    if (!this.administradorValido || !this.edificioValido) {
      this.error.set('Completá todos los datos requeridos correctamente.');
      return;
    }

    this.loading.set(true);
    this.auth.registrarAdministrador({
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      email: this.email.trim(),
      telefono: this.telefono.trim(),
      password: this.password,
      nombreEdificio: this.nombreEdificio.trim(),
      direccion: this.direccion.trim(),
      localidad: this.localidad.trim(),
      provincia: this.provincia.trim(),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => this.success.set(response.message || 'Cuenta y edificio creados correctamente.'),
      error: err => this.error.set(this.mensajeError(err)),
    });
  }

  private mensajeError(err: { status?: number; error?: { message?: string } }): string {
    const message = err?.error?.message;
    if (message) return message;
    if (err?.status === 0) return 'No pudimos conectar con el servidor. Revisá que el backend esté disponible e intentá nuevamente.';
    if (err?.status && err.status >= 500) return 'El servidor no pudo completar el registro. Intentá nuevamente más tarde.';
    return 'No se pudo crear la cuenta y el edificio. Revisá los datos e intentá nuevamente.';
  }
}
