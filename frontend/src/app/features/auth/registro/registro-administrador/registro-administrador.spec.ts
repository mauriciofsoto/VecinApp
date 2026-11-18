import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth';
import { RegistroAdministrador } from './registro-administrador';

describe('RegistroAdministrador', () => {
  let fixture: ComponentFixture<RegistroAdministrador>;
  let component: RegistroAdministrador;
  let solicitudesRegistro: Array<Record<string, string>>;
  let solicitudesInvitacion: Array<Record<string, string>>;
  let validacionesInvitacion: string[];
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let authMock: {
    registrarAdministrador: ReturnType<typeof vi.fn>;
    validarInvitacionAdministrador: ReturnType<typeof vi.fn>;
    registrarAdministradorInvitado: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    solicitudesRegistro = [];
    solicitudesInvitacion = [];
    validacionesInvitacion = [];
    queryParams = new BehaviorSubject(convertToParamMap({}));
    authMock = {
      registrarAdministrador: vi.fn((request: Record<string, string>) => {
        solicitudesRegistro.push(request);
        return of({ message: 'Cuenta y edificio creados correctamente.' });
      }),
      validarInvitacionAdministrador: vi.fn((codigo: string) => {
        validacionesInvitacion.push(codigo);
        return of({ message: 'La invitacion es valida.' });
      }),
      registrarAdministradorInvitado: vi.fn((request: Record<string, string>) => {
        solicitudesInvitacion.push(request);
        return of({ message: 'Cuenta creada correctamente. Ya podes iniciar sesion.' });
      }),
    };
    await TestBed.configureTestingModule({
      imports: [RegistroAdministrador],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams.asObservable() } },
        { provide: AuthService, useValue: authMock },
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

  it('detects and validates the URL code before showing the personal form only', () => {
    queryParams.next(convertToParamMap({ codigo: 'INV-ADMIN-7' }));
    fixture.detectChanges();

    expect(component.modoInvitacion()).toBe(true);
    expect(component.invitacionValidada()).toBe(true);
    expect(validacionesInvitacion).toEqual(['INV-ADMIN-7']);
    expect(fixture.nativeElement.textContent).toContain('Datos del Administrador');
    expect(fixture.nativeElement.textContent).not.toContain('Datos del edificio');
    expect(fixture.nativeElement.textContent).toContain('Crear cuenta');
  });

  it('registers the invited administrator without calling the new-building flow', () => {
    queryParams.next(convertToParamMap({ codigo: 'INV-ADMIN-7' }));
    component.nombre = 'Ana';
    component.apellido = 'Perez';
    component.email = 'ana@example.com';
    component.telefono = '1122334455';
    component.password = 'Clave123';
    component.confirmPassword = 'Clave123';

    component.continuar();

    expect(authMock.registrarAdministradorInvitado).toHaveBeenCalledWith({
      nombre: 'Ana', apellido: 'Perez', email: 'ana@example.com', telefono: '1122334455',
      password: 'Clave123', codigoInvitacion: 'INV-ADMIN-7', rolEsperado: 'Administrador',
    });
    expect(authMock.registrarAdministrador).not.toHaveBeenCalled();
    expect(component.success()).toContain('iniciar sesion');
  });

  it('blocks registration when backend validation rejects the invitation code', () => {
    authMock.validarInvitacionAdministrador.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'La invitacion vencio.' },
    })));
    queryParams.next(convertToParamMap({ codigo: 'INV-EXPIRADA' }));
    component.continuar();

    expect(component.invitacionValidada()).toBe(false);
    expect(component.error()).toBe('La invitacion vencio.');
    expect(authMock.registrarAdministradorInvitado).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Datos del Administrador');
  });

  it('keeps invitation mode when the URL contains an empty code', () => {
    queryParams.next(convertToParamMap({ codigo: '' }));
    component.continuar();

    expect(component.modoInvitacion()).toBe(true);
    expect(component.error()).toContain('no contiene un código');
    expect(authMock.registrarAdministrador).not.toHaveBeenCalled();
    expect(authMock.registrarAdministradorInvitado).not.toHaveBeenCalled();
  });

  it('keeps personal data on failure and ignores duplicate submissions', () => {
    authMock.registrarAdministradorInvitado.mockImplementation((request: Record<string, string>) => {
      solicitudesInvitacion.push(request);
      return new Observable(() => {});
    });
    queryParams.next(convertToParamMap({ codigo: 'INV-ADMIN-7' }));
    component.nombre = 'Ana';
    component.apellido = 'Perez';
    component.email = 'ana@example.com';
    component.telefono = '1122334455';
    component.password = 'Clave123';
    component.confirmPassword = 'Clave123';

    component.continuar();
    component.continuar();

    expect(authMock.registrarAdministradorInvitado).toHaveBeenCalledTimes(1);
    expect(component.nombre).toBe('Ana');
    expect(component.email).toBe('ana@example.com');
    expect(component.loading()).toBe(true);
  });

  it('preserves form values and shows recoverable registration errors', () => {
    authMock.registrarAdministradorInvitado.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'Email ya registrado.' },
    })));
    queryParams.next(convertToParamMap({ codigo: 'INV-ADMIN-7' }));
    component.nombre = 'Ana';
    component.apellido = 'Perez';
    component.email = 'ana@example.com';
    component.telefono = '1122334455';
    component.password = 'Clave123';
    component.confirmPassword = 'Clave123';

    component.continuar();

    expect(component.error()).toBe('Email ya registrado.');
    expect(component.nombre).toBe('Ana');
    expect(component.email).toBe('ana@example.com');
    expect(component.codigoInvitacion()).toBe('INV-ADMIN-7');
  });
});
