
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EdificiosService } from '../../../../../core/services/edificios.service';
import { Edificio } from '../../../../../core/models/edificio';

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
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly cambiandoEstadoId = signal<number | null>(null);
  readonly mensaje = signal('');

  busqueda = '';
  mostrarFormulario = false;
  edificioId: number | null = null;
  nombre = '';
  direccion = '';

  get esEdicion(): boolean {
    return this.edificioId !== null;
  }

  get filtrados(): Edificio[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.edificios().filter(edificio =>
      [edificio.nombre, edificio.direccion, edificio.estado]
        .some(valor => valor.toLowerCase().includes(texto)),
    );
  }

  ngOnInit(): void {
    this.cargarEdificios();
  }

  cargarEdificios(): void {
    this.cargando.set(true);
    this.mensaje.set('');

    this.edificiosService.obtenerEdificios().subscribe({
      next: edificios => {
        this.edificios.set(edificios);
        this.cargando.set(false);
      },
      error: error => {
        this.cargando.set(false);
        this.mensaje.set(
          error.error?.message ?? 'No se pudieron cargar los edificios.',
        );
      },
    });
  }

  abrirFormulario(): void {
    this.limpiarFormulario();
    this.mostrarFormulario = true;
  }

  editarEdificio(edificio: Edificio): void {
    this.edificioId = edificio.idEdificio;
    this.nombre = edificio.nombre;
    this.direccion = edificio.direccion;
    this.mensaje.set('');
    this.mostrarFormulario = true;
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.limpiarFormulario();
  }

  limpiarFormulario(): void {
    this.edificioId = null;
    this.nombre = '';
    this.direccion = '';
  }

  guardarEdificio(): void {
    this.mensaje.set('');

    const nombre = this.nombre.trim();
    const direccion = this.direccion.trim();

    if (!nombre || !direccion) {
      this.mensaje.set('Completá el nombre y la dirección del edificio.');
      return;
    }

    this.guardando.set(true);

    const request = { nombre, direccion };

    const operacion = this.edificioId === null
      ? this.edificiosService.crearEdificio(request)
      : this.edificiosService.actualizarEdificio(this.edificioId, request);

    operacion.subscribe({
      next: edificio => {
        if (this.edificioId === null) {
          this.edificios.update(lista =>
            [...lista, edificio].sort((a, b) =>
              a.nombre.localeCompare(b.nombre),
            ),
          );
          this.mensaje.set('Edificio creado correctamente.');
        } else {
          this.edificios.update(lista =>
            lista.map(item =>
              item.idEdificio === edificio.idEdificio ? edificio : item,
            ),
          );
          this.mensaje.set('Edificio actualizado correctamente.');
        }

        this.guardando.set(false);
        this.mostrarFormulario = false;
        this.limpiarFormulario();
      },
      error: error => {
        this.guardando.set(false);
        this.mensaje.set(
          error.error?.message ?? 'No se pudo guardar el edificio.',
        );
      },
    });
  }

  cambiarEstado(edificio: Edificio): void {
    const nuevoEstado = edificio.estado === 'Activo' ? 'Inactivo' : 'Activo';

    this.cambiandoEstadoId.set(edificio.idEdificio);
    this.mensaje.set('');

    this.edificiosService
      .cambiarEstado(edificio.idEdificio, nuevoEstado)
      .subscribe({
        next: respuesta => {
          this.edificios.update(lista =>
            lista.map(item =>
              item.idEdificio === edificio.idEdificio
                ? { ...item, estado: respuesta.estado }
                : item,
            ),
          );

          this.mensaje.set(respuesta.message);
          this.cambiandoEstadoId.set(null);
        },
        error: error => {
          this.mensaje.set(
            error.error?.message ?? 'No se pudo modificar el estado.',
          );
          this.cambiandoEstadoId.set(null);
        },
      });
  }
}
