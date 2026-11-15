
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../../../core/services/auth';
import { EdificiosService } from '../../../../../core/services/edificios.service';
import { UsuariosEdificioService } from '../../../../../core/services/usuarios-edificio.service';
import { CodigosInvitacionService } from '../../../../../core/services/codigos-invitacion.service';

import { Edificio } from '../../../../../core/models/edificio';
import { UsuarioEdificio } from '../../../../../core/models/usuario-edificio';

import { InputComponent } from '../../../../../shared/components/atoms/input/input';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../shared/components/atoms/select/select';

@Component({
  selector: 'app-inquilinos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, SelectComponent],
  templateUrl: './inquilinos-list.html',
  styleUrl: './inquilinos-list.scss',
})
export class InquilinosList implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly edificiosService = inject(EdificiosService);
  private readonly usuariosService = inject(UsuariosEdificioService);
  private readonly invitacionesService = inject(CodigosInvitacionService);

  readonly esSuperAdmin = this.auth.hasRole('SuperAdministrador');

  busqueda = '';
  edificioId: number | null = null;

  mostrarFormulario = false;
  rolInvitacion = 'Inquilino';
  diasValidez = 7;

  readonly usuarios = signal<UsuarioEdificio[]>([]);
  readonly edificios = signal<Edificio[]>([]);
  readonly mensaje = signal('');
  readonly codigoGenerado = signal('');
  readonly cargando = signal(false);
  readonly generando = signal(false);

  readonly rolesInvitacion: SelectOption<string>[] = this.esSuperAdmin
    ? [
      { label: 'Administrador', value: 'Administrador' },
      { label: 'Inquilino', value: 'Inquilino' },
      { label: 'Propietario', value: 'Propietario' },
      { label: 'Encargado', value: 'Encargado' },
    ]
    : [
      { label: 'Inquilino', value: 'Inquilino' },
      { label: 'Propietario', value: 'Propietario' },
      { label: 'Encargado', value: 'Encargado' },
    ];

  get opcionesEdificio(): SelectOption<number>[] {
    return this.edificios().map(edificio => ({
      label: edificio.nombre,
      value: edificio.idEdificio,
    }));
  }

  get filtrados(): UsuarioEdificio[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.usuarios().filter(usuario => {
      const coincideRol = [
        'Inquilino',
        'Propietario',
        'Encargado',
      ].includes(usuario.rol);

      const unidad = this.unidadTexto(usuario).toLowerCase();

      const coincideTexto = [
        usuario.nombre,
        usuario.apellido,
        usuario.email,
        usuario.rol,
        unidad,
      ].some(valor => valor.toLowerCase().includes(texto));

      return coincideRol && coincideTexto;
    });
  }

  ngOnInit(): void {
    if (this.esSuperAdmin) {
      this.cargarEdificios();
    } else {
      this.cargarUsuarios();
    }
  }

  cargarEdificios(): void {
    this.edificiosService.obtenerEdificios().subscribe({
      next: edificios => {
        this.edificios.set(edificios);

        if (edificios.length > 0) {
          this.edificioId = edificios[0].idEdificio;
          this.cargarUsuarios();
        }
      },
      error: error => {
        this.mensaje.set(
          error.error?.message ?? 'No se pudieron cargar los edificios.',
        );
      },
    });
  }

  cambiarEdificio(idEdificio: number): void {
    this.edificioId = Number(idEdificio);
    this.usuarios.set([]);
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    if (this.esSuperAdmin && !this.edificioId) {
      return;
    }

    this.cargando.set(true);
    this.mensaje.set('');

    const request = this.esSuperAdmin
      ? this.usuariosService.obtenerPorEdificio(this.edificioId!)
      : this.usuariosService.obtenerPorEdificio();

    request.subscribe({
      next: usuarios => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: error => {
        this.cargando.set(false);
        this.mensaje.set(
          error.error?.message ?? 'No se pudieron cargar los residentes.',
        );
      },
    });
  }

  unidadTexto(usuario: UsuarioEdificio): string {
    if (!usuario.unidades?.length) {
      return 'Sin unidad asignada';
    }

    return usuario.unidades
      .map(unidad => `${unidad.piso} ${unidad.identificacion}`.trim())
      .join(', ');
  }

  cambiarEstado(usuario: UsuarioEdificio): void {
    const nuevoEstado =
      usuario.estado === 'Activo' ? 'Desactivado' : 'Activo';

    this.usuariosService
      .cambiarEstado(usuario.id, nuevoEstado)
      .subscribe({
        next: respuesta => {
          this.usuarios.update(lista =>
            lista.map(item =>
              item.id === usuario.id
                ? { ...item, estado: respuesta.estado }
                : item,
            ),
          );

          this.mensaje.set(respuesta.message);
        },
        error: error => {
          this.mensaje.set(
            error.error?.message ?? 'No se pudo modificar el estado.',
          );
        },
      });
  }


  generarInvitacion(): void {
    this.mensaje.set('');
    this.codigoGenerado.set('');

    if (
      !Number.isInteger(this.diasValidez) ||
      this.diasValidez < 1 ||
      this.diasValidez > 30
    ) {
      this.mensaje.set('La validez debe ser de entre 1 y 30 días.');
      return;
    }

    if (this.esSuperAdmin && !this.edificioId) {
      this.mensaje.set('Seleccioná un edificio.');
      return;
    }

    this.generando.set(true);

    const request = {
      rol: this.rolInvitacion,
      diasValidez: this.diasValidez,
      ...(this.esSuperAdmin ? { idEdificio: this.edificioId! } : {}),
    };

    this.invitacionesService.crearInvitacion(request).subscribe({
      next: respuesta => {
        this.codigoGenerado.set(respuesta.codigo);
        this.mensaje.set(respuesta.message);
        this.generando.set(false);
      },
      error: error => {
        this.mensaje.set(
          error.error?.message ?? 'No se pudo generar la invitación.',
        );
        this.generando.set(false);
      },
    });
  }

}
