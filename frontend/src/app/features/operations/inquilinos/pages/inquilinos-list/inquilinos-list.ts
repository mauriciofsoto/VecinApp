import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Inquilinos } from '../../services/inquilinos';
import { UsuarioComunidad } from '../../models/usuario-comunidad';
import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import { SelectComponent, SelectOption } from '../../../../../shared/components/atoms/select/select';

type FiltroPerfil = 'todos' | 'Inquilino' | 'Propietario' | 'Portero';

@Component({
  selector: 'app-inquilinos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, SelectComponent],
  templateUrl: './inquilinos-list.html',
  styleUrl: './inquilinos-list.scss',
})
export class InquilinosList implements OnInit {
  readonly servicio = inject(Inquilinos);
  private readonly destroyRef = inject(DestroyRef);

  readonly personas = signal<UsuarioComunidad[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly filtroPerfil = signal<FiltroPerfil>('todos');
  readonly busqueda = signal('');
  readonly declaracionesProcesando = signal<Set<number>>(new Set());
  readonly errorDeclaracion = signal('');

  cambiarConfirmacion(
    personaId: string,
    declaracionId: number,
    estado: 'Verificada' | 'Rechazada'
  ): void {
    if (this.declaracionesProcesando().has(declaracionId)) return;

    this.errorDeclaracion.set('');

    this.declaracionesProcesando.update(actuales => {
      const nuevos = new Set(actuales);
      nuevos.add(declaracionId);
      return nuevos;
    });

    this.servicio.cambiarConfirmacion(declaracionId, estado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => {
          this.personas.update(personas =>
            personas.map(persona =>
              persona.id !== personaId
                ? persona
                : {
                  ...persona,
                  unidadesDeclaradas: persona.unidadesDeclaradas.map(unidad =>
                    unidad.idDeclaracionUnidad === declaracionId
                      ? { ...unidad, estadoConfirmacion: respuesta.estadoConfirmacion }
                      : unidad
                  )
                }
            )
          );
        },
        error: error => {
          this.errorDeclaracion.set(
            error?.error?.message || 'No se pudo actualizar la declaración.'
          );
        },
        complete: () => {
          this.declaracionesProcesando.update(actuales => {
            const nuevos = new Set(actuales);
            nuevos.delete(declaracionId);
            return nuevos;
          });
        }
      });
  }

  readonly opcionesPerfil: SelectOption<FiltroPerfil>[] = [
    { label: 'Todos los perfiles', value: 'todos' },
    { label: 'Inquilinos', value: 'Inquilino' },
    { label: 'Propietarios', value: 'Propietario' },
    { label: 'Personal', value: 'Portero' },
  ];

  readonly filtrados = computed(() => {
    const query = this.normalizar(this.busqueda());
    const perfil = this.filtroPerfil();

    return this.personas()
      .filter(persona => ['Inquilino', 'Propietario', 'Portero'].includes(persona.rol))
      .filter(persona => perfil === 'todos' || persona.rol === perfil)
      .filter(persona => {
        const nombreCompleto = `${persona.nombre} ${persona.apellido}`;
        return !query || [persona.nombre, persona.apellido, nombreCompleto, persona.email]
          .some(valor => this.normalizar(valor).includes(query));
      });
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.servicio.obtenerComunidad()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: personas => {
          this.personas.set(personas);
          this.cargando.set(false);
        },
        error: error => {
          this.errorCarga.set(this.mensajeError(error));
          this.cargando.set(false);
        },
      });
  }

  etiquetaRol(rol: string): string {
    return rol === 'Portero' ? 'Personal' : rol;
  }


  private normalizar(valor: string): string {
    return valor.trim().toLocaleLowerCase();
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'La sesión venció o no está autorizada. Iniciá sesión nuevamente.';
      if (error.status === 403) return 'Tu usuario no tiene permiso para consultar la comunidad.';
    }
    return 'No se pudo cargar la comunidad. Revisá la conexión e intentá nuevamente.';
  }
  // Define el Set para llevar registro de qué IDs tienen las unidades expandidas
unidadesExpandidas = new Set<number | string>();

toggleUnidades(id: number | string) {
  if (this.unidadesExpandidas.has(id)) {
    this.unidadesExpandidas.delete(id);
  } else {
    this.unidadesExpandidas.add(id);
  }
}

}
