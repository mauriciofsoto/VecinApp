
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Incidencias } from '../../services/incidencias';
import { Incidencia } from '../../models/incidencia';

@Component({
  selector: 'app-incidencias-inquilino',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './incidencias-inquilino.html',
  styleUrl: './incidencias-inquilino.scss',
})

export class IncidenciasInquilinoComponent implements OnInit {
  private incidenciasService = inject(Incidencias);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  incidencias: Incidencia[] = [];
  cargando = true;
  error = '';

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  cargarIncidencias(): void {
    console.log('1. Iniciando carga de incidencias');

    this.cargando = true;
    this.error = '';
    this.cdr.detectChanges();

    this.incidenciasService.listarMisIncidencias()
      .pipe(
        finalize(() => {
          console.log('3. Finalizó la petición');
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (incidencias) => {
          console.log('2. Incidencias recibidas:', incidencias);
          this.incidencias = incidencias;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar incidencias:', err);
          this.error = 'No se pudieron cargar tus incidencias.';
          this.cdr.detectChanges();
        },
      });
  }

  crearIncidencia(): void {
    this.router.navigate(['/incidencias/crear']);
  }
}
