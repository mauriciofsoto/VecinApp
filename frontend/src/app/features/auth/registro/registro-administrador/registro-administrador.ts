import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-registro-administrador',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro-administrador.html',
  styleUrl: './registro-administrador.scss',
})
export class RegistroAdministrador implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

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
  readonly modoInvitacion = signal(false);
  readonly codigoInvitacion = signal<string | null>(null);
  readonly invitacionValidada = signal(false);
  readonly validandoInvitacion = signal(false);
  readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (!params.has('codigo')) return;
      this.modoInvitacion.set(true);
      const codigo = params.get('codigo')?.trim() ?? '';
      this.codigoInvitacion.set(codigo || null);
      if (!codigo) {
        this.error.set('El enlace no contiene un código de invitación válido.');
        return;
      }
      this.validarInvitacion();
    });
  }

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
    if (this.modoInvitacion()) {
      this.registrarInvitado();
      return;
    }

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

  validarInvitacion(): void {
    const codigo = this.codigoInvitacion();
    if (!codigo || this.validandoInvitacion()) return;

    this.error.set('');
    this.invitacionValidada.set(false);
    this.validandoInvitacion.set(true);
    this.auth.validarInvitacionAdministrador(codigo)
      .pipe(finalize(() => this.validandoInvitacion.set(false)))
      .subscribe({
        next: () => this.invitacionValidada.set(true),
        error: err => this.error.set(this.mensajeError(err)),
      });
  }

  private registrarInvitado(): void {
    if (this.loading()) return;
    if (!this.codigoInvitacion() || !this.invitacionValidada()) {
      if (!this.error()) this.error.set('Validá una invitación de Administrador vigente para continuar.');
      return;
    }
    this.error.set('');
    this.success.set('');
    if (!this.administradorValido) {
      this.error.set('Completá los datos personales correctamente y verificá las reglas de contraseña.');
      return;
    }

    this.loading.set(true);
    this.auth.registrarAdministradorInvitado({
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      email: this.email.trim(),
      telefono: this.telefono.trim(),
      password: this.password,
      codigoInvitacion: this.codigoInvitacion()!,
      rolEsperado: 'Administrador',
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => this.success.set(response.message || 'Cuenta creada correctamente. Ya podés iniciar sesión.'),
      error: err => this.error.set(this.mensajeError(err)),
    });
  }

  private mensajeError(err: { status?: number; error?: { message?: string } }): string {
    const message = err?.error?.message;
    if (message) return message;
    if (err?.status === 0) return 'No pudimos conectar con el servidor. Revisá que el backend esté disponible e intentá nuevamente.';
    if (err?.status && err.status >= 500) return 'El servidor no pudo completar el registro. Intentá nuevamente más tarde.';
    return this.modoInvitacion()
      ? 'No se pudo completar el registro. Revisá los datos e intentá nuevamente.'
      : 'No se pudo crear la cuenta y el edificio. Revisá los datos e intentá nuevamente.';
  }
}
