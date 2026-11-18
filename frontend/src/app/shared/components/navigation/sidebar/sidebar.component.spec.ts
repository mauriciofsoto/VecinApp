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

  function hasPersonalIncidentsOption(rol: User['rol']): boolean {
    TestBed.inject(AuthService).currentUser.set(createUser(rol));
    fixture.detectChanges();
    return component.menuSections()
      .flatMap(section => section.items)
      .some(item => item.label === 'Incidencias' && item.route === '/incidencias-derivadas');
  }

  it('muestra Incidencias a Propietario y Portero (Personal)', () => {
    expect(hasPersonalIncidentsOption('Propietario')).toBe(true);
    expect(hasPersonalIncidentsOption('Portero')).toBe(true);

    TestBed.inject(AuthService).currentUser.set(createUser('Portero'));
    fixture.detectChanges();
    expect(component.userRoleLabel()).toBe('Personal');
  });

  it('oculta las Incidencias personales a Inquilino, Administrador y SuperAdministrador', () => {
    expect(hasPersonalIncidentsOption('Inquilino')).toBe(false);
    expect(hasPersonalIncidentsOption('Administrador')).toBe(false);
    expect(hasPersonalIncidentsOption('SuperAdministrador')).toBe(false);
  });

  it('navega a la ruta existente desde el RouterLink del Sidebar compartido', async () => {
    TestBed.inject(AuthService).currentUser.set(createUser('Propietario'));
    fixture.detectChanges();

    const link = Array.from(
      fixture.nativeElement.querySelectorAll('a.nav-item'),
    ).find((item) => (item as HTMLAnchorElement).textContent?.trim() === 'Incidencias') as HTMLAnchorElement | undefined;
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
