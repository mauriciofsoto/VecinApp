import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import {
  Incidencias,
  DetalleIncidencia,
  EstadoIncidencia
} from '../../services/incidencias';

@Component({
  selector: 'app-detalle-incidencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './detalle-incidencia.html',
  styleUrl: './detalle-incidencia.css'
})
export class DetalleIncidenciaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private incidenciasService = inject(Incidencias);
  private cdr = inject(ChangeDetectorRef);
  incidencia: DetalleIncidencia | null = null;
  estados: EstadoIncidencia[] = [];
  estadoSeleccionado: number | null = null;

  cargando = true;
  guardando = false;
  error = '';
  mensaje = '';


  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.error = 'El identificador de la incidencia no es válido.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    console.log('Cargando detalle de incidencia:', id);

    forkJoin({
      incidencia: this.incidenciasService.obtenerDetalle(id),
      estados: this.incidenciasService.listarEstados()
    })
      .pipe(finalize(() => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.log('Terminó la carga del detalle');
      }))
      .subscribe({
        next: ({ incidencia, estados }) => {
          console.log('Detalle recibido:', incidencia);
          console.log('Estados recibidos:', estados);

          this.incidencia = incidencia;
          this.estados = estados;
          this.estadoSeleccionado = incidencia.idEstadoIncidencia;

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar el detalle:', err);
          this.error = 'No se pudo cargar la incidencia. Verificá tu sesión y la conexión con el servidor.';
          this.cdr.detectChanges();
        }
      });
  }


  guardarEstado(): void {
    if (
      !this.incidencia ||
      this.estadoSeleccionado === null ||
      this.guardando
    ) {
      return;
    }

    if (this.estadoSeleccionado === this.incidencia.idEstadoIncidencia) {
      this.mensaje = 'La incidencia ya tiene ese estado.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.cdr.detectChanges();

    this.incidenciasService.cambiarEstado(
      this.incidencia.idIncidencia,
      { idEstadoIncidencia: this.estadoSeleccionado }
    ).subscribe({
      next: () => {
        const estado = this.estados.find(
          e => e.idEstadoIncidencia === this.estadoSeleccionado
        );

        if (estado && this.incidencia) {
          this.incidencia.idEstadoIncidencia = estado.idEstadoIncidencia;
          this.incidencia.estado = estado.nombre;
        }

        this.mensaje = 'El estado se actualizó correctamente.';
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al actualizar el estado:', err);
        this.error = 'No se pudo actualizar el estado. Revisá los permisos y volvé a intentar.';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

}
