
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CrearUnidadRequest, Unidad, Unidades } from '../../services/unidades';

@Component({
  selector: 'app-administrar-unidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administrar-unidades.html',
  styleUrl: './administrar-unidades.scss',
})
export class AdministrarUnidades implements OnInit {
  private readonly unidadesService = inject(Unidades);

  readonly unidades = signal<Unidad[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly esError = signal(false);
  readonly busqueda = signal('');

  mostrarFormulario = false;
  piso = '';
  identificacion = '';

  readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es-AR');

    return this.unidades().filter(unidad =>
      [unidad.piso, unidad.identificacion].some(valor =>
        (valor ?? '').toLocaleLowerCase('es-AR').includes(texto),
      ),
    );
  });

  ngOnInit(): void {
    this.cargarUnidades();
  }

  cargarUnidades(): void {
    this.cargando.set(true);
    this.limpiarMensaje();

    this.unidadesService.obtenerUnidades().subscribe({
      next: unidades => {
        this.unidades.set(unidades);
        this.cargando.set(false);
      },
      error: error => {
        this.mostrarError(error, 'No se pudieron cargar las unidades.');
        this.cargando.set(false);
      },
    });
  }

  abrirFormulario(): void {
    this.limpiarFormulario();
    this.limpiarMensaje();
    this.mostrarFormulario = true;
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.limpiarFormulario();
  }

  guardarUnidad(): void {
    this.limpiarMensaje();

    const request: CrearUnidadRequest = {
      piso: this.piso.trim(),
      identificacion: this.identificacion.trim(),
    };

    if (!request.piso || !request.identificacion) {
      this.mensaje.set('Completá todos los campos.');
      this.esError.set(true);
      return;
    }

    this.guardando.set(true);

    this.unidadesService.crearUnidad(request).subscribe({
      next: unidad => {
        this.unidades.update(lista =>
          [...lista, unidad].sort((a, b) =>
            a.piso.localeCompare(b.piso, 'es-AR', { numeric: true }) ||
            a.identificacion.localeCompare(b.identificacion, 'es-AR', { numeric: true }),
          ),
        );

        this.guardando.set(false);
        this.mostrarFormulario = false;
        this.limpiarFormulario();
        this.mensaje.set('Unidad registrada correctamente.');
      },
      error: error => {
        this.mostrarError(error, 'No se pudo registrar la unidad.');
        this.guardando.set(false);
      },
    });
  }

  limpiarFormulario(): void {
    this.piso = '';
    this.identificacion = '';
  }

  private limpiarMensaje(): void {
    this.mensaje.set('');
    this.esError.set(false);
  }

  private mostrarError(error: unknown, fallback: string): void {
    const mensaje = error instanceof HttpErrorResponse
      ? error.error?.message ?? error.error?.title ?? fallback
      : fallback;

    this.mensaje.set(mensaje);
    this.esError.set(true);
  }
}
