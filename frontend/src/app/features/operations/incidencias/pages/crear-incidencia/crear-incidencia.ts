
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../../../shared/components/ui/card/card.component';

import {
  Incidencia,
  PrioridadIncidencia,
} from '../../models/incidencia';
import { Incidencias } from '../../services/incidencias';

@Component({
  selector: 'app-crear-incidencia',
  standalone: true,
  imports: [FormsModule, ButtonComponent, CardComponent],
  templateUrl: './crear-incidencia.html',
  styleUrl: './crear-incidencia.scss',
})
export class CrearIncidencia {
  private readonly incidenciasService = inject(Incidencias);

  protected readonly titulo = signal('');
  protected readonly descripcion = signal('');
  protected readonly categoria = signal('');
  protected readonly ubicacion = signal('');
  protected readonly prioridad = signal<PrioridadIncidencia>('media');

  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected publicarIncidencia(): void {
    this.mensaje.set('');
    this.error.set('');

    const titulo = this.titulo().trim();
    const descripcion = this.descripcion().trim();
    const categoria = this.categoria();
    const ubicacion = this.ubicacion().trim();

    if (!titulo || !descripcion || !categoria || !ubicacion) {
      this.error.set('Completá todos los campos obligatorios.');
      return;
    }

    const nuevaIncidencia: Incidencia = {
      id: Date.now(),
      titulo,
      descripcion,
      categoria,
      ubicacion,
      estado: 'pendiente',
      prioridad: this.prioridad(),
      fechaCreacion: new Date().toISOString(),
      usuarioId: 1,
      usuarioNombre: 'Usuario de prueba',
    };

    this.incidenciasService.crear({
      titulo,
      descripcion: `${descripcion}\n\nUbicación: ${ubicacion}`,
      categoria,
      prioridad: this.prioridad(),
    }).subscribe({
      next: () => {
        this.titulo.set('');
        this.descripcion.set('');
        this.categoria.set('');
        this.ubicacion.set('');
        this.prioridad.set('media');

        this.mensaje.set('La incidencia se registró correctamente.');
      },
      error: (error) => {
        console.error('Error al crear la incidencia:', error);
        this.error.set(
          'No se pudo registrar la incidencia. Intentá nuevamente.',
        );
      },
    });
  }
}
