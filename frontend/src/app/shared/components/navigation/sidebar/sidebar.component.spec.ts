import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth';
import { User } from '../../../../core/models/user';

import { SidebarComponent } from './sidebar.component';

@Component({ standalone: true, template: '' })
class RouteTarget {}

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([
          { path: 'incidencias-derivadas', component: RouteTarget },
          { path: 'perfil', component: RouteTarget },
        ]),
        provideHttpClient(),
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

  function hasDerivedIncidentsOption(rol: User['rol']): boolean {
    TestBed.inject(AuthService).currentUser.set(createUser(rol));
    fixture.detectChanges();
    return component.menuSections()
      .flatMap(section => section.items)
      .some(item => item.label === 'Incidencias derivadas');
  }

  it('muestra Incidencias derivadas a Propietario y Portero (Personal)', () => {
    expect(hasDerivedIncidentsOption('Propietario')).toBe(true);
    expect(hasDerivedIncidentsOption('Portero')).toBe(true);

    TestBed.inject(AuthService).currentUser.set(createUser('Portero'));
    fixture.detectChanges();
    expect(component.userRoleLabel()).toBe('Personal');
  });

  it('oculta Incidencias derivadas a Inquilino, Administrador y SuperAdministrador', () => {
    expect(hasDerivedIncidentsOption('Inquilino')).toBe(false);
    expect(hasDerivedIncidentsOption('Administrador')).toBe(false);
    expect(hasDerivedIncidentsOption('SuperAdministrador')).toBe(false);
  });

  it('navega a la ruta existente desde el RouterLink del Sidebar compartido', async () => {
    TestBed.inject(AuthService).currentUser.set(createUser('Propietario'));
    fixture.detectChanges();

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
    TestBed.inject(AuthService).currentUser.set(createUser('Inquilino'));
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.user-name') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Persona Prueba');
    expect(link.getAttribute('href')).toBe('/perfil');
    link.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/perfil');
  });
});
