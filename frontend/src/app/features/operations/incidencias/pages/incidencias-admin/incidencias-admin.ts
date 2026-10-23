import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Incidencias } from '../../services/incidencias';
import { Incidencia } from '../../models/incidencia';
import { CodigosInvitacionService } from '../../../../../core/services/codigos-invitacion.service';

@Component({
  selector: 'app-incidencias-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './incidencias-admin.html',
  styleUrl: './incidencias-admin.scss'
})
export class IncidenciasAdminComponent implements OnInit {
  private incidenciasService = inject(Incidencias);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  modalInvitacion = false;


  abrirInvitacion(): void {
    this.modalInvitacion = true;
    this.errorInvitacion = '';
    this.mensajeInvitacion = '';
    this.codigoInvitacion = '';
    this.fechaExpiracionInvitacion = '';
  }

  cerrarInvitacion(): void {
    this.modalInvitacion = false;
  }

  incidencias: Incidencia[] = [];
  cargando = false;
  error = '';

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  cargarIncidencias(): void {
    this.cargando = true;
    this.error = '';

    this.incidenciasService.listar().subscribe({
      next: (respuesta) => {
        this.incidencias = respuesta;
        this.cargando = false;
        this.cdr.detectChanges();
        console.log('Incidencias cargadas:', this.incidencias.length);
      },
      error: (err) => {
        console.error('Error al cargar incidencias:', err);
        this.error = 'No se pudieron cargar las incidencias. Verificá tu sesión y la conexión con el servidor.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  verDetalle(incidencia: Incidencia): void {
    this.router.navigate([
      '/administrador/incidencias',
      incidencia.idIncidencia
    ]);
  }

  contarPorEstado(estado: string): number {
    return this.incidencias.filter(
      i => i.estado?.trim().toLowerCase() === estado.toLowerCase()
    ).length;
  }

  private invitacionesService = inject(CodigosInvitacionService);

  generandoInvitacion = false;
  errorInvitacion = '';
  mensajeInvitacion = '';
  codigoInvitacion = '';
  fechaExpiracionInvitacion = '';

  generarInvitacion(): void {
    this.generandoInvitacion = true;
    this.errorInvitacion = '';
    this.mensajeInvitacion = '';
    this.codigoInvitacion = '';

    this.invitacionesService.crearInvitacionInquilino(7).subscribe({
      next: (respuesta) => {
        this.codigoInvitacion = respuesta.codigo;
        this.fechaExpiracionInvitacion = respuesta.fechaExpiracion;
        this.mensajeInvitacion = respuesta.message;
        this.generandoInvitacion = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al generar invitación:', err);
        this.errorInvitacion =
          err.error?.message || 'No se pudo generar la invitación.';
        this.generandoInvitacion = false;
        this.cdr.detectChanges();
      }
    });
  }

  copiarCodigoInvitacion(): void {
    navigator.clipboard.writeText(this.codigoInvitacion).then(
      () => {
        this.mensajeInvitacion = 'Código copiado correctamente.';
      },
      () => {
        this.errorInvitacion = 'No se pudo copiar. Seleccioná el código y copialo manualmente.';
      }
    );
  }

}
