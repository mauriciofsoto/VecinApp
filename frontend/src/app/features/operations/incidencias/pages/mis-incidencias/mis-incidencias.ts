import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Incidencia } from '../../models/incidencia';
import { Incidencias } from '../../services/incidencias';
import { CategoriaIncidenciaDto } from '../../services/incidencias';

import { CrearIncidencia, CrearIncidenciaPayload } from '../crear-incidencia/crear-incidencia';
import { HistorialIncidencias } from '../../components/historial-incidencias/historial-incidencias';
import { ChatIncidencia } from '../../components/chat-incidencia/chat-incidencia';

import { Modal } from '../../../../../shared/components/organisms/modal/modal';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';

@Component({
  selector: 'app-mis-incidencias',
  standalone: true,
  imports: [
    CrearIncidencia,
    HistorialIncidencias,
    ChatIncidencia,
    Modal,
    ButtonComponent,
  ],
  templateUrl: './mis-incidencias.html',
  styleUrl: './mis-incidencias.scss',
})
export class MisIncidencias implements OnInit {
  private readonly incidenciasService = inject(Incidencias);
  private readonly destroyRef = inject(DestroyRef);

  readonly incidencias = this.incidenciasService.misIncidencias;
  readonly categorias = signal<CategoriaIncidenciaDto[]>([]);
  readonly cargandoCategorias = signal(true);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly categoriasError = signal('');
  readonly enviando = signal(false);

  protected readonly modalCrearAbierto = signal(false);
  protected readonly incidenciaSeleccionada = signal<Incidencia | null>(null);
  protected readonly modalConversacionAbierto = signal(false);
  protected readonly mensaje = signal('');

  ngOnInit(): void {
    this.cargarIncidencias();
    this.incidenciasService.cargarCategorias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: categorias => {
          this.categorias.set(categorias);
          this.cargandoCategorias.set(false);
        },
        error: error => {
          this.categoriasError.set(this.mensajeError(error, 'No se pudieron cargar las categorías.'));
          this.cargandoCategorias.set(false);
        },
      });
  }

  private cargarIncidencias(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.incidenciasService.cargarMisIncidencias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.cargando.set(false),
        error: error => {
          this.errorCarga.set(this.mensajeError(error, 'No se pudieron cargar tus incidencias.'));
          this.cargando.set(false);
        },
      });
  }

  reintentarCarga(): void {
    this.cargarIncidencias();
  }

  abrirFormulario(): void {
    this.modalCrearAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.modalCrearAbierto.set(false);
  }

  guardarIncidencia(datos: CrearIncidenciaPayload): void {
    this.mensaje.set('');
    this.enviando.set(true);

    this.incidenciasService.crear(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.modalCrearAbierto.set(false);
        this.mensaje.set('La incidencia se creó correctamente.');
        this.enviando.set(false);
      },
      error: error => {
        this.mensaje.set(this.mensajeError(error, 'No se pudo crear la incidencia.'));
        this.enviando.set(false);
      },
    });
  }

  abrirConversacion(incidencia: Incidencia): void {
    this.incidenciaSeleccionada.set(incidencia);
    this.modalConversacionAbierto.set(true);
  }

  cerrarConversacion(): void {
    this.modalConversacionAbierto.set(false);
    this.incidenciaSeleccionada.set(null);
  }

  private mensajeError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return 'No se pudo conectar con el servidor. Revisá que la API esté disponible.';
    if (error.status === 401) return 'Tu sesión venció o no es válida. Iniciá sesión nuevamente.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para realizar esta operación.';

    const body = error.error as { mensaje?: unknown; message?: unknown; title?: unknown } | null;
    const serverMessage = [body?.mensaje, body?.message, body?.title]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (serverMessage) return serverMessage;
    if (error.status >= 500) return 'El servidor no pudo completar la operación. Intentá nuevamente más tarde.';
    if (error.status === 400) return 'Los datos enviados no son válidos. Revisá el formulario e intentá nuevamente.';
    return `${fallback} (HTTP ${error.status}).`;
  }
}
