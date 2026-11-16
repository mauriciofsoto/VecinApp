import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../core/services/auth';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let login: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    login = vi.fn(() => EMPTY);
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra recuperación de contraseña y no ofrece registro', () => {
    fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(links.some(link => link.getAttribute('href') === '/forgot-password')).toBe(true);
    expect(links.some(link => link.getAttribute('href') === '/registro')).toBe(false);
  });

  it('alterna la visibilidad sin perder la contraseña antes o después de escribir', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    const submit = vi.spyOn(component, 'onSubmit');

    expect(input.type).toBe('password');
    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-label')).toBe('Mostrar contraseña');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(toggle.querySelector('svg path[d="M3 3l18 18"]')).not.toBeNull();

    input.value = 'clave-de-prueba';
    input.focus();
    input.dispatchEvent(new Event('input'));
    input.blur();
    fixture.detectChanges();
    expect(component.password).toBe('clave-de-prueba');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(input.value).toBe('clave-de-prueba');
    expect(component.password).toBe('clave-de-prueba');
    expect(toggle.getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(toggle.querySelector('svg circle')).not.toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it('mantiene el envío del formulario con el correo normalizado y la contraseña intacta', () => {
    component.email = '  vecino@correo.com  ';
    component.password = 'clave-secreta';

    component.onSubmit();

    expect(login).toHaveBeenCalledWith({
      email: 'vecino@correo.com',
      password: 'clave-secreta',
    });
    expect(component.password).toBe('clave-secreta');
  });
});
