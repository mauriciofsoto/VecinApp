import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth';
import { Incidencias, DerivacionIncidenciaDto } from '../../services/incidencias';

@Component({
  selector: 'app-incidencias-derivadas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './incidencias-derivadas.html',
  styleUrl: './incidencias-derivadas.scss',
})
export class IncidenciasDerivadas implements OnInit {
  private readonly service = inject(Incidencias);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly perfil = this.auth.currentUser()?.rol === 'Portero' ? 'Personal' : 'Propietario';
  readonly puedeGestionar = this.auth.currentUser()?.rol === 'Portero';
  readonly items = signal<DerivacionIncidenciaDto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.service.cargarDerivaciones().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => { this.items.set(items); this.cargando.set(false); },
      error: () => { this.error.set('No se pudieron cargar las incidencias derivadas.'); this.cargando.set(false); },
    });
  }

  normalizarEstado(estado: string): string {
    return estado.trim().toLocaleLowerCase('es-AR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }

  etiquetaAccion(estado: string): string {
    const normalizado = this.normalizarEstado(estado);
    return normalizado === 'pendiente' || normalizado === 'en-proceso'
      ? 'Gestionar'
      : 'Ver';
  }
}
