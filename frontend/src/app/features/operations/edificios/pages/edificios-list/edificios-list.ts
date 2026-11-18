import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Edificio, EdificioRequest, EstadoEdificio } from '../../models/edificio';
import { EdificiosService } from '../../services/edificios.service';

@Component({
  selector: 'app-edificios-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edificios-list.html',
  styleUrl: './edificios-list.scss',
})
export class EdificiosList implements OnInit {
  private readonly edificiosService = inject(EdificiosService);

  readonly edificios = signal<Edificio[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly cambiandoEstadoId = signal<number | null>(null);
  readonly mensaje = signal('');
  readonly esError = signal(false);
  readonly busqueda = signal('');

  mostrarFormulario = false;
  edificioId: number | null = null;
  nombre = '';
  direccion = '';
  localidad = '';
  provincia = '';

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es-AR');
    return this.edificios().filter(edificio =>
      [edificio.nombre, edificio.direccion, edificio.localidad, edificio.provincia, edificio.estado]
        .some(valor => (valor ?? '').toLocaleLowerCase('es-AR').includes(texto)),
    );
  });

  get esEdicion(): boolean {
    return this.edificioId !== null;
  }

  ngOnInit(): void {
    this.cargarEdificios();
  }

  cargarEdificios(): void {
    this.cargando.set(true);
    this.limpiarMensaje();
    this.edificiosService.obtenerEdificios().subscribe({
      next: edificios => {
        this.edificios.set(edificios);
        this.cargando.set(false);
      },
      error: error => {
        this.mostrarError(error, 'No se pudieron cargar los edificios.');
        this.cargando.set(false);
      },
    });
  }

  abrirFormulario(): void {
    this.limpiarFormulario();
    this.limpiarMensaje();
    this.mostrarFormulario = true;
  }

  editarEdificio(edificio: Edificio): void {
    this.edificioId = edificio.idEdificio;
    this.nombre = edificio.nombre;
    this.direccion = edificio.direccion;
    this.localidad = edificio.localidad;
    this.provincia = edificio.provincia;
    this.limpiarMensaje();
    this.mostrarFormulario = true;
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.limpiarFormulario();
  }

  guardarEdificio(): void {
    this.limpiarMensaje();
    const request: EdificioRequest = {
      nombre: this.nombre.trim(),
      direccion: this.direccion.trim(),
      localidad: this.localidad.trim(),
      provincia: this.provincia.trim(),
    };

    if (Object.values(request).some(valor => !valor)) {
      this.mensaje.set('Completá todos los campos.');
      this.esError.set(true);
      return;
    }

    const idEdicion = this.edificioId;
    this.guardando.set(true);
    const operacion = idEdicion === null
      ? this.edificiosService.crearEdificio(request)
      : this.edificiosService.actualizarEdificio(idEdicion, request);

    operacion.subscribe({
      next: edificio => {
        this.edificios.update(lista => idEdicion === null
          ? [...lista, edificio].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-AR'))
          : lista.map(item => item.idEdificio === edificio.idEdificio ? edificio : item));
        this.guardando.set(false);
        this.mostrarFormulario = false;
        this.limpiarFormulario();
        this.mensaje.set(idEdicion === null ? 'Edificio creado correctamente.' : 'Edificio actualizado correctamente.');
      },
      error: error => {
        this.mostrarError(error, idEdicion === null
          ? 'No se pudo crear el edificio.'
          : 'No se pudo actualizar el edificio.');
        this.guardando.set(false);
      },
    });
  }

  cambiarEstado(edificio: Edificio): void {
    const estado: EstadoEdificio = edificio.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.cambiandoEstadoId.set(edificio.idEdificio);
    this.limpiarMensaje();

    this.edificiosService.cambiarEstado(edificio.idEdificio, estado).subscribe({
      next: actualizado => {
        this.edificios.update(lista => lista.map(item =>
          item.idEdificio === actualizado.idEdificio ? actualizado : item));
        this.mensaje.set(`El edificio ahora está ${actualizado.estado.toLocaleLowerCase('es-AR')}.`);
        this.cambiandoEstadoId.set(null);
      },
      error: error => {
        this.mostrarError(error, 'No se pudo modificar el estado del edificio.');
        this.cambiandoEstadoId.set(null);
      },
    });
  }

  limpiarFormulario(): void {
    this.edificioId = null;
    this.nombre = '';
    this.direccion = '';
    this.localidad = '';
    this.provincia = '';
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
