
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth';
import {
  CategoriaIncidenciaDto,
  CrearIncidenciaRequest,
  DerivacionIncidenciaDto,
  Incidencias,
} from '../../services/incidencias';
import {
  CrearIncidencia,
  CrearIncidenciaPayload
} from '../crear-incidencia/crear-incidencia';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';

@Component({
  selector: 'app-incidencias-derivadas',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CrearIncidencia,
    Modal,
    ButtonComponent
  ],
  templateUrl: './incidencias-derivadas.html',
  styleUrl: './incidencias-derivadas.scss',
})
export class IncidenciasDerivadas implements OnInit {
  private readonly service = inject(Incidencias);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly perfil =
    this.auth.currentUser()?.rol === 'Portero'
      ? 'Personal'
      : 'Propietario';

  readonly puedeGestionar = ['Portero', 'Propietario'].includes(
    this.auth.currentUser()?.rol ?? ''
  );

  readonly puedeCrear = this.puedeGestionar;

  readonly items = signal<DerivacionIncidenciaDto[]>([]);
  readonly categorias = signal<CategoriaIncidenciaDto[]>([]);
  readonly cargandoCategorias = signal(false);
  readonly errorCategorias = signal('');
  readonly modalCrearAbierto = signal(false);
  readonly enviando = signal(false);
  readonly mensajeCreacion = signal('');
  readonly errorCreacion = signal('');
  readonly cargando = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.cargarDerivaciones();

    if (this.puedeCrear) {
      this.cargandoCategorias.set(true);

      this.service.cargarCategorias()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: categorias => {
            this.categorias.set(categorias);
            this.cargandoCategorias.set(false);
          },
          error: () => {
            this.errorCategorias.set(
              'No se pudieron cargar las categorías de incidencias.'
            );
            this.cargandoCategorias.set(false);
          },
        });
    }
  }

  private cargarDerivaciones(): void {
    this.cargando.set(true);
    this.error.set('');

    this.service.cargarDerivaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          this.items.set(items);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set(
            'No se pudieron cargar las incidencias derivadas.'
          );
          this.cargando.set(false);
        },
      });
  }

  abrirFormulario(): void {
    this.errorCreacion.set('');
    this.mensajeCreacion.set('');
    this.modalCrearAbierto.set(true);
  }

  guardarIncidencia(datos: CrearIncidenciaPayload): void {
    if (this.enviando()) return;

    this.enviando.set(true);
    this.errorCreacion.set('');

    this.service.crear(datos as CrearIncidenciaRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.modalCrearAbierto.set(false);
          this.mensajeCreacion.set(
            'La incidencia comunitaria se registró correctamente.'
          );
          this.enviando.set(false);
          this.cargarDerivaciones();
        },
        error: error => {
          const mensaje =
            error?.error?.mensaje ?? error?.error?.message;

          this.errorCreacion.set(
            typeof mensaje === 'string'
              ? mensaje
              : 'No se pudo crear la incidencia.'
          );

          this.enviando.set(false);
        },
      });
  }

  normalizarEstado(estado: string): string {
    return estado.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  etiquetaAccion(estado: string): string {
    const normalizado = this.normalizarEstado(estado);

    return normalizado === 'pendiente' ||
      normalizado === 'en-proceso'
      ? 'Gestionar'
      : 'Ver';
  }
}
