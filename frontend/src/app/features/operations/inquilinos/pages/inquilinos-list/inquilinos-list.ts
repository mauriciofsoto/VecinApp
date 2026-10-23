import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Inquilinos } from '../../services/inquilinos';

@Component({
  selector: 'app-inquilinos-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inquilinos-list.html',
  styleUrl: './inquilinos-list.scss',
})
export class InquilinosList {
  readonly servicio = inject(Inquilinos);

  busqueda = '';
  filtroEdificio = 'todos';
  mostrarFormulario = false;

  nombre = '';
  apellido = '';
  email = '';
  documento = '';
  edificioId = 1;
  edificioNombre = 'Edificio A';
  unidad = '';

  readonly mensaje = signal('');

  get edificios() {
    const unicos = new Map<number, string>();

    for (const inquilino of this.servicio.inquilinos()) {
      unicos.set(inquilino.edificioId, inquilino.edificioNombre);
    }

    return Array.from(unicos, ([id, nombre]) => ({ id, nombre }));
  }

  get filtrados() {
    const busqueda = this.busqueda.trim().toLowerCase();

    return this.servicio.inquilinos().filter(inquilino => {
      const coincideTexto = [
        inquilino.nombre,
        inquilino.apellido,
        inquilino.email,
        inquilino.documento,
        inquilino.unidad,
      ].some(valor => valor.toLowerCase().includes(busqueda));

      const coincideEdificio =
        this.filtroEdificio === 'todos' ||
        inquilino.edificioId === Number(this.filtroEdificio);

      return coincideTexto && coincideEdificio;
    });
  }

  registrar(): void {
    if (
      !this.nombre.trim() ||
      !this.apellido.trim() ||
      !this.email.trim() ||
      !this.documento.trim() ||
      !this.edificioNombre.trim() ||
      !this.unidad.trim() ||
      this.edificioId <= 0
    ) {
      this.mensaje.set('Completá todos los campos.');
      return;
    }

    const creado = this.servicio.registrar({
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      email: this.email.trim(),
      documento: this.documento.trim(),
      edificioId: Number(this.edificioId),
      edificioNombre: this.edificioNombre.trim(),
      unidad: this.unidad.trim(),
    });

    if (!creado) {
      this.mensaje.set('Ya existe un residente con ese email o documento.');
      return;
    }

    this.nombre = '';
    this.apellido = '';
    this.email = '';
    this.documento = '';
    this.unidad = '';

    this.mensaje.set('Residente registrado correctamente.');
    this.mostrarFormulario = false;
  }
}