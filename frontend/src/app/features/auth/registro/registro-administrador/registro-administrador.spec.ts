import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { RegistroAdministrador } from './registro-administrador';

describe('RegistroAdministrador', () => {
  let fixture: ComponentFixture<RegistroAdministrador>;
  let component: RegistroAdministrador;
  let solicitudesRegistro: Array<Record<string, string>>;

  beforeEach(async () => {
    solicitudesRegistro = [];
    await TestBed.configureTestingModule({
      imports: [RegistroAdministrador],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { registrarAdministrador: (request: Record<string, string>) => {
          solicitudesRegistro.push(request);
          return of({ message: 'Cuenta y edificio creados correctamente.' });
        } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroAdministrador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('aplica la política de contraseña y confirma coincidencia antes de avanzar', () => {
    component.nombre = 'Ana';
    component.apellido = 'Pérez';
    component.email = 'ana@example.com';
    component.telefono = '1122334455';
    component.password = 'Clave123';
    component.confirmPassword = 'Clave123';

    expect(component.administradorValido).toBe(true);
    component.confirmPassword = 'Otra123';
    expect(component.administradorValido).toBe(false);
    component.continuar();
    expect(component.etapa).toBe(1);
  });

  it('solo avanza con los datos del administrador válidos', () => {
    component.nombre = 'Ana';
    component.apellido = 'Pérez';
    component.email = 'ana@example.com';
    component.telefono = '1122334455';
    component.password = 'Clave123';
    component.confirmPassword = 'Clave123';

    component.continuar();
    expect(component.etapa).toBe(2);
  });

  it('envía el contrato completo al servicio existente y confirma la respuesta real', () => {
    component.nombre = 'Ana';
    component.apellido = 'Pérez';
    component.email = 'ana+test@example.com';
    component.telefono = '1122334455';
    component.password = 'Clave123';
    component.confirmPassword = 'Clave123';
    component.nombreEdificio = 'Edificio de prueba';
    component.direccion = 'Calle 123';
    component.localidad = 'CABA';
    component.provincia = 'Buenos Aires';
    component.etapa = 2;

    component.registrar();

    expect(solicitudesRegistro).toEqual([{
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana+test@example.com',
      telefono: '1122334455',
      password: 'Clave123',
      nombreEdificio: 'Edificio de prueba',
      direccion: 'Calle 123',
      localidad: 'CABA',
      provincia: 'Buenos Aires',
    }]);
    expect(component.success()).toBe('Cuenta y edificio creados correctamente.');
    expect(component.etapa).toBe(2);
  });
});
