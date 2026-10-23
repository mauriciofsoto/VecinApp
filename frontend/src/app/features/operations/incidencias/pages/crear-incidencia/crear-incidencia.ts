import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Incidencias } from '../../services/incidencias';
import { finalize } from 'rxjs';
import { CategoriaIncidencia, CrearIncidenciaRequest } from '../../models/incidencia';

@Component({
  selector: 'app-crear-incidencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-incidencia.html',
  styleUrl: './crear-incidencia.scss',
})
export class CrearIncidencia implements OnInit {
  private incidenciasService = inject(Incidencias);
  private cdr = inject(ChangeDetectorRef);
  categorias: CategoriaIncidencia[] = [];
  private router = inject(Router);

  volver(): void {
    this.router.navigate(['/inquilino/incidencias']);
  }
  incidencia: CrearIncidenciaRequest = {
    idCategoriaIncidencia: 0,
    titulo: '',
    descripcion: '',
    prioridad: 'Media',
  };

  mensaje = '';
  error = '';
  guardando = false;

  ngOnInit(): void {
    this.incidenciasService.listarCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.error = 'No se pudieron cargar las categorías.';
      },
    });
  }

  crear(): void {
    this.mensaje = '';
    this.error = '';

    if (
      !this.incidencia.titulo.trim() ||
      !this.incidencia.descripcion.trim() ||
      this.incidencia.idCategoriaIncidencia <= 0
    ) {
      this.error = 'Completá todos los campos obligatorios.';
      return;
    }

    this.guardando = true;

    this.incidenciasService.crear(this.incidencia)
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.detectChanges();
        })
      )

      .subscribe({
        next: (respuesta) => {
          console.log('1. RESPUESTA RECIBIDA:', respuesta);
          this.mensaje = 'La incidencia se creó correctamente.';
          this.incidencia = {
            idCategoriaIncidencia: 0,
            titulo: '',
            descripcion: '',
            prioridad: 'Media',
          }; this.cdr.detectChanges();
          console.log('2. MENSAJE:', this.mensaje);
        },
        error: (err) => {
          console.error('ERROR AL CREAR:', err);
          this.error = err.error?.mensaje ?? 'No se pudo crear la incidencia.';
        },
        complete: () => {
          console.log('3. PETICIÓN COMPLETADA');
        }

      });

  }
}
