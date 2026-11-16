import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Badge } from '../../../../shared/components/atoms/badge/badge';
import { CardComponent } from '../../../../shared/components/atoms/card/card.component';
import { InputComponent } from '../../../../shared/components/atoms/input/input';
import { EmptyState } from '../../../../shared/components/molecules/empty-state/empty-state';
import { Modal } from '../../../../shared/components/organisms/modal/modal';
import { ActualizarPerfilRequest, DeclaracionVinculacionRequest, PerfilUsuario, SolicitudVinculacion, UnidadDeclaradaPerfil } from '../../models/perfil-usuario';
import { PerfilService } from '../../services/perfil.service';
import { VinculacionesPerfilService } from '../../services/vinculaciones.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Badge, CardComponent, InputComponent, EmptyState, Modal],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  private readonly perfilService = inject(PerfilService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vinculaciones = inject(VinculacionesPerfilService);

  readonly perfil = signal<PerfilUsuario | null>(null);
  readonly cargando = signal(true);
  readonly editando = signal(false);
  readonly guardando = signal(false);
  readonly envioIntentado = signal(false);
  readonly error = signal('');
  readonly errorGuardado = signal('');
  readonly confirmacion = signal('');
  readonly editandoDeclaraciones = signal(false);
  readonly guardandoDeclaracionId = signal<number | null>(null);
  readonly errorDeclaraciones = signal('');
  readonly solicitudes = signal<SolicitudVinculacion[]>([]);
  readonly solicitudActiva = signal<SolicitudVinculacion | null>(null);
  readonly modalSolicitudAbierto = signal(false);
  readonly respondiendoSolicitud = signal(false);
  readonly respuestaSolicitud = signal('');
  readonly motivoRechazo = signal('');
  readonly formulario = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    apellido: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    telefono: ['', [Validators.maxLength(30), Validators.pattern(/^\+?[0-9()\s.-]*$/)]],
  });
  readonly rolVisible = computed(() => this.perfil()?.rol === 'Portero' ? 'Personal' : this.perfil()?.rol ?? '');
  readonly esResidente = computed(() => ['Inquilino', 'Propietario'].includes(this.perfil()?.rol ?? ''));
  readonly esPropietario = computed(() => this.perfil()?.rol === 'Propietario');
  readonly esInquilino = computed(() => this.perfil()?.rol === 'Inquilino');
  readonly esPersonal = computed(() => this.perfil()?.rol === 'Portero');
  readonly funcionPersonal = computed(() => {
    const perfil = this.perfil();
    return perfil?.funcionPersonal === 'Otro'
      ? perfil.funcionPersonalOtra
      : perfil?.funcionPersonal;
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = Number(params.get('solicitudVinculacionId'));
      if (Number.isInteger(id) && id > 0) this.abrirSolicitud(id);
    });
    this.cargarSolicitudes();
    this.perfilService.obtenerMiPerfil().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: perfil => {
        this.perfil.set(perfil);
        this.resetFormulario(perfil);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(this.mensajeError(error));
        this.cargando.set(false);
      },
    });
  }

  cargarSolicitudes(): void {
    this.vinculaciones.solicitudes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => this.solicitudes.set(items),
    });
  }

  abrirSolicitud(id: number): void {
    this.respuestaSolicitud.set('');
    this.vinculaciones.solicitudes(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => {
        const solicitud = items[0];
        if (solicitud) { this.solicitudActiva.set(solicitud); this.modalSolicitudAbierto.set(true); }
        else this.errorDeclaraciones.set('No se encontró la solicitud de vinculación.');
      },
      error: () => this.errorDeclaraciones.set('No se pudo abrir la solicitud. Actualizá el perfil e intentá nuevamente.'),
    });
  }

  cerrarSolicitud(): void {
    this.solicitudActiva.set(null);
    this.modalSolicitudAbierto.set(false);
    this.motivoRechazo.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { solicitudVinculacionId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  abrirDetalleSolicitud(solicitud: SolicitudVinculacion): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { solicitudVinculacionId: solicitud.id },
      queryParamsHandling: 'merge',
    });
    this.abrirSolicitud(solicitud.id);
  }

  responderSolicitud(acepta: boolean): void {
    const solicitud = this.solicitudActiva();
    if (!solicitud || this.respondiendoSolicitud() || solicitud.estado !== 'Pendiente') return;
    this.respondiendoSolicitud.set(true);
    this.vinculaciones.responder(solicitud.id, acepta, this.motivoRechazo().trim() || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.respuestaSolicitud.set(result.mensaje);
          this.cargarSolicitudes();
          this.respondiendoSolicitud.set(false);
        },
        error: error => {
          this.respuestaSolicitud.set(error?.error?.message ?? 'No se pudo registrar la respuesta. Actualizá el perfil e intentá nuevamente.');
          this.respondiendoSolicitud.set(false);
        },
      });
  }

  guardarDeclaracion(unidad: UnidadDeclaradaPerfil): void {
    if (this.guardandoDeclaracionId() !== null) return;
    const request: DeclaracionVinculacionRequest = {
      idDeclaracion: unidad.id,
      tipo: unidad.tipo,
      piso: unidad.pisoDeclarado?.trim() ?? '',
      identificacion: unidad.identificacionDeclarada?.trim() ?? '',
      esPrincipal: unidad.esPrincipalDeclarada,
      estaAlquilada: unidad.estaAlquiladaDeclarada,
      personaRelacionNombre: unidad.personaRelacionNombre?.trim() || null,
      personaRelacionApellido: unidad.personaRelacionApellido?.trim() || null,
      pisoRelacion: unidad.pisoRelacion?.trim() || null,
      identificacionRelacion: unidad.identificacionRelacion?.trim() || null,
    };
    this.guardarDatosDeclaracion(request, unidad.id);
  }

  readonly nuevaDeclaracion = {
    piso: '', identificacion: '', personaRelacionNombre: '', personaRelacionApellido: '',
    pisoRelacion: '', identificacionRelacion: '',
  };

  agregarDeclaracion(): void {
    if (this.guardandoDeclaracionId() !== null) return;
    const request: DeclaracionVinculacionRequest = {
      idDeclaracion: null,
      tipo: this.esPropietario() ? 'Titularidad' : 'Ocupacion',
      piso: this.nuevaDeclaracion.piso.trim(),
      identificacion: this.nuevaDeclaracion.identificacion.trim(),
      esPrincipal: false,
      estaAlquilada: this.esPropietario() ? true : null,
      personaRelacionNombre: this.nuevaDeclaracion.personaRelacionNombre.trim() || null,
      personaRelacionApellido: this.nuevaDeclaracion.personaRelacionApellido.trim() || null,
      pisoRelacion: this.nuevaDeclaracion.pisoRelacion.trim() || null,
      identificacionRelacion: this.nuevaDeclaracion.identificacionRelacion.trim() || null,
    };
    this.guardarDatosDeclaracion(request, -1);
  }

  private guardarDatosDeclaracion(request: DeclaracionVinculacionRequest, id: number): void {
    this.guardandoDeclaracionId.set(id);
    this.errorDeclaraciones.set('');
    this.perfilService.actualizarDeclaracion(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.confirmacion.set(response.message);
        if (id === -1) Object.assign(this.nuevaDeclaracion, {
          piso: '', identificacion: '', personaRelacionNombre: '', personaRelacionApellido: '', pisoRelacion: '', identificacionRelacion: '',
        });
        this.perfilService.obtenerMiPerfil().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: perfil => this.perfil.set(perfil),
        });
        this.cargarSolicitudes();
        this.guardandoDeclaracionId.set(null);
      },
      error: error => {
        this.errorDeclaraciones.set(error?.error?.message ?? 'No se pudo guardar la declaración. Revisá los datos e intentá nuevamente.');
        this.guardandoDeclaracionId.set(null);
      },
    });
  }

  ubicacionDeclarada(unidad: UnidadDeclaradaPerfil): string {
    const piso = unidad.pisoDeclarado || 'No hay información registrada';
    const identificacion = unidad.identificacionDeclarada || 'No hay información registrada';
    return `Piso ${piso} · Unidad ${identificacion}`;
  }

  iniciarEdicion(): void {
    const perfil = this.perfil();
    if (!perfil) return;
    this.resetFormulario(perfil);
    this.errorGuardado.set('');
    this.confirmacion.set('');
    this.envioIntentado.set(false);
    this.editando.set(true);
  }

  toggleEdicionDeclaraciones(): void {
    this.editandoDeclaraciones.update(value => !value);
    this.errorDeclaraciones.set('');
  }

  cancelarEdicion(): void {
    const perfil = this.perfil();
    if (perfil) this.resetFormulario(perfil);
    this.editando.set(false);
    this.errorGuardado.set('');
    this.envioIntentado.set(false);
  }

  guardar(): void {
    if (this.guardando()) return;
    this.envioIntentado.set(true);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    const valores = this.formulario.getRawValue();
    const request: ActualizarPerfilRequest = {
      nombre: valores.nombre.trim(),
      apellido: valores.apellido.trim(),
      telefono: valores.telefono.trim() || null,
    };
    this.guardando.set(true);
    this.formulario.disable({ emitEvent: false });
    this.errorGuardado.set('');
    this.confirmacion.set('');

    this.perfilService.actualizarMiPerfil(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: perfil => {
        this.perfil.set(perfil);
        this.formulario.enable({ emitEvent: false });
        this.resetFormulario(perfil);
        this.editando.set(false);
        this.guardando.set(false);
        this.envioIntentado.set(false);
        this.confirmacion.set('Los cambios del perfil se guardaron correctamente.');
      },
      error: error => {
        this.errorGuardado.set(this.mensajeErrorGuardado(error));
        this.formulario.enable({ emitEvent: false });
        this.guardando.set(false);
      },
    });
  }

  errorCampo(campo: 'nombre' | 'apellido' | 'telefono'): string {
    const control = this.formulario.controls[campo];
    if (!control.invalid || !(control.touched || this.envioIntentado())) return '';
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('maxlength')) return 'Se superó la longitud permitida.';
    if (control.hasError('pattern')) {
      return campo === 'telefono' ? 'Ingresá un teléfono válido.' : 'Este campo no puede contener solo espacios.';
    }
    return 'Revisá este dato.';
  }

  private resetFormulario(perfil: PerfilUsuario): void {
    this.formulario.reset({
      nombre: perfil.nombre ?? '',
      apellido: perfil.apellido ?? '',
      telefono: perfil.telefono ?? '',
    });
  }

  private mensajeErrorGuardado(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const errores = error.error?.errors as Record<string, string[]> | undefined;
      if (errores) return Object.values(errores).flat().join(' ');
      if (error.status === 401) return 'La sesión venció. Iniciá sesión nuevamente.';
      if (error.status === 403) return 'Tu cuenta no tiene permiso para modificar el perfil.';
      if (error.status === 409) return error.error?.message ?? 'El perfil cambió. Volvé a cargarlo e intentá nuevamente.';
      if (typeof error.error?.message === 'string') return error.error.message;
    }
    return 'No se pudieron guardar los cambios. Revisá la conexión e intentá nuevamente.';
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'La sesión venció. Iniciá sesión nuevamente.';
      if (error.status === 403) return 'Tu cuenta no tiene permiso para consultar el perfil.';
    }
    return 'No se pudo cargar tu perfil. Revisá la conexión e intentá nuevamente.';
  }
}
