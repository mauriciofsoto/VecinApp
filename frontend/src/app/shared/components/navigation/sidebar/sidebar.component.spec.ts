import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { User } from '../../../../core/models/user';
import { PerfilUsuario } from '../../../../features/profile/models/perfil-usuario';
import { PerfilService } from '../../../../features/profile/services/perfil.service';

import { SidebarComponent } from './sidebar.component';

@Component({ standalone: true, template: '' })
class RouteTarget {}

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let perfilActual: PerfilUsuario;
  let fallaPerfil: boolean;

  beforeEach(async () => {
    perfilActual = profileFor(false, false);
    fallaPerfil = false;
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([
          { path: 'incidencias-derivadas', component: RouteTarget },
          { path: 'perfil', component: RouteTarget },
        ]),
        provideHttpClient(),
        { provide: PerfilService, useValue: {
          obtenerMiPerfil: () => fallaPerfil ? throwError(() => new Error('perfil no disponible')) : of(perfilActual),
        } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const createUser = (rol: User['rol']): User => ({
    id: 'user-1',
    nombre: 'Persona',
    apellido: 'Prueba',
    email: 'persona@example.test',
    rol,
    declaraUnidadesAlquiladas: false,
  });

  const profileFor = (
    viveEnEdificio: boolean | null,
    declaraAlquiler: boolean,
    estadoConfirmacion = 'Confirmada',
    asociacionPropietario = false,
  ): PerfilUsuario => ({
    nombre: 'Persona', apellido: 'Prueba', email: 'persona@example.test', telefono: null,
    rol: 'Propietario', edificioNombre: 'Edificio', viveEnEdificio,
    tieneOtrasUnidades: declaraAlquiler, declaraUnidadesAlquiladas: declaraAlquiler,
    modalidadAlquiler: null, funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    unidadesVinculadas: asociacionPropietario ? [{
      id: 1, piso: '1', identificacion: 'A', edificioNombre: 'Edificio', tipoRelacion: 'Propietario',
    }] : [],
    unidadesDeclaradas: declaraAlquiler ? [{
      id: 1, tipo: 'Titularidad', pisoDeclarado: '1', identificacionDeclarada: 'A',
      esPrincipalDeclarada: false, estaAlquiladaDeclarada: true,
      estadoConfirmacion, fechaDeclaracion: '2026-01-01',
      personaRelacionNombre: null, personaRelacionApellido: null,
      pisoRelacion: null, identificacionRelacion: null,
    }] : [],
  });

  async function loginAs(
    rol: User['rol'],
    profile = profileFor(false, false),
    failProfile = false,
  ): Promise<void> {
    perfilActual = profile;
    fallaPerfil = failProfile;
    TestBed.inject(AuthService).currentUser.set(createUser(rol));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function hasMenuOption(label: string): boolean {
    return component.menuSections().flatMap(section => section.items)
      .some(item => item.label === label);
  }

  it('siempre muestra Comunidad y Encuestas al Propietario no residente y exige alquiler confirmado para derivadas', async () => {
    const expectNoResidentModules = () => {
      for (const label of ['Mi inicio', 'Mis incidencias', 'Mis paquetes', 'Mis reservas']) {
        expect(hasMenuOption(label)).toBe(false);
      }
    };

    await loginAs('Propietario', profileFor(true, false));
    expect(hasMenuOption('Incidencias derivadas')).toBe(false);
    expect(hasMenuOption('Mis incidencias')).toBe(true);

    await loginAs('Propietario', profileFor(true, true));
    expect(hasMenuOption('Incidencias derivadas')).toBe(false);
    expect(hasMenuOption('Mis incidencias')).toBe(true);

    await loginAs('Propietario', profileFor(true, true, 'Confirmada', true));
    expect(hasMenuOption('Incidencias derivadas')).toBe(true);
    expect(hasMenuOption('Mis incidencias')).toBe(true);

    await loginAs('Propietario', profileFor(false, true, 'Confirmada', true));
    expect(hasMenuOption('Incidencias derivadas')).toBe(true);
    expect(component.dashboardRoute()).toBe('/comunidad');
    expectNoResidentModules();

    await loginAs('Propietario', profileFor(false, false));
    expect(hasMenuOption('Comunidad')).toBe(true);
    expect(hasMenuOption('Encuestas')).toBe(true);
    expect(hasMenuOption('Incidencias derivadas')).toBe(false);
    expectNoResidentModules();

    await loginAs('Propietario', profileFor(false, true, 'Declarada'));
    expect(hasMenuOption('Comunidad')).toBe(true);
    expect(hasMenuOption('Encuestas')).toBe(true);
    expect(hasMenuOption('Incidencias derivadas')).toBe(false);
    expectNoResidentModules();
  });

  it('muestra los módulos del Portero y conserva la etiqueta Personal', async () => {
    await loginAs('Portero');
    expect(hasMenuOption('Incidencias derivadas')).toBe(true);
    expect(hasMenuOption('Recepción de paquetes')).toBe(true);
    expect(hasMenuOption('Dashboard')).toBe(true);
    expect(hasMenuOption('Incidencias')).toBe(false);
    expect(hasMenuOption('Gestionar reservas')).toBe(false);
    expect(hasMenuOption('Inquilinos')).toBe(false);
    expect(component.userRoleLabel()).toBe('Personal');
  });

  it('limita SuperAdministrador a Edificios y mantiene los módulos de Administrador', async () => {
    await loginAs('SuperAdministrador');
    expect(component.menuSections().flatMap(section => section.items).map(item => item.label))
      .toEqual(['Edificios']);
    expect(component.dashboardRoute()).toBe('/admin/edificios');

    await loginAs('Administrador');
    expect(hasMenuOption('Edificios')).toBe(false);
    for (const label of ['Dashboard', 'Comunidad', 'Encuestas', 'Publicaciones', 'Incidencias',
      'Recepción de paquetes', 'Gestionar reservas', 'Invitaciones QR', 'Inquilinos']) {
      expect(hasMenuOption(label), `opción ausente: ${label}`).toBe(true);
    }
  });

  it('mantiene las opciones existentes del Inquilino', async () => {
    await loginAs('Inquilino');
    for (const label of ['Mi inicio', 'Comunidad', 'Encuestas', 'Mis incidencias', 'Mis paquetes', 'Mis reservas']) {
      expect(hasMenuOption(label)).toBe(true);
    }
    expect(hasMenuOption('Incidencias derivadas')).toBe(false);
  });

  it('no concede opciones adicionales si no se puede cargar el perfil del Propietario', async () => {
    await loginAs('Propietario', profileFor(false, true), true);
    expect(component.menuSections().flatMap(section => section.items)).toHaveLength(0);
    expect(component.dashboardRoute()).toBe('/user-dashboard');
  });

  it('navega a la ruta existente desde el RouterLink del Sidebar compartido', async () => {
    await loginAs('Propietario', profileFor(false, true, 'Confirmada', true));

    const link = Array.from(
      fixture.nativeElement.querySelectorAll('a.nav-item'),
    ).find((item) => (item as HTMLAnchorElement).textContent?.includes('Incidencias derivadas')) as HTMLAnchorElement | undefined;
    expect(link).toBeDefined();
    expect(link?.getAttribute('href')).toBe('/incidencias-derivadas');
    link?.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/incidencias-derivadas');
  });

  it('permite abrir el perfil desde el nombre del usuario', async () => {
    await loginAs('Inquilino');

    const link = fixture.nativeElement.querySelector('.user-name') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Persona Prueba');
    expect(link.getAttribute('href')).toBe('/perfil');
    link.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/perfil');
  });
});
