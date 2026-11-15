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
  mostrarFormulario = false;

  nombre = '';
  apellido = '';
  email = '';
  documento = '';
  edificioId = 1;
  edificioNombre = 'Edificio A';
  unidad = '';
  readonly mensaje = signal('');

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

  registrar(): void {
    if (
      !this.nombre.trim() || !this.apellido.trim() || !this.email.trim() ||
      !this.documento.trim() || !this.edificioNombre.trim() || !this.unidad.trim() ||
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
      this.mensaje.set('Ya existe un residente local con ese email o documento.');
      return;
    }

    this.nombre = '';
    this.apellido = '';
    this.email = '';
    this.documento = '';
    this.unidad = '';
    this.mensaje.set('Registro local guardado solo en memoria; no fue enviado al backend ni aparecerá en este listado.');
    this.mostrarFormulario = false;
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
}
