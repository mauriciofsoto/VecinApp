import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RegistroComunitarioRequest } from '../../../../core/models/auth';
import { AuthService } from '../../../../core/services/auth';
import { CodigosInvitacionService } from '../../../../core/services/codigos-invitacion.service';
import { RegistroUsers } from './registro-users';

describe('RegistroUsers', () => {
  let questionnaire: RegistroUsers;
  let identificadorPublico: string | null;
  let solicitudesAcceso: string[];
  let registros: unknown[];
  let roleAutenticado: string;
  let logins: unknown[];
  let navegaciones: string[];
  let errorLogin: boolean;
  let errorNavegacion: boolean;

  const enviarRegistro = (): RegistroComunitarioRequest => {
    questionnaire.accesoComunitario.set({ token: 'temporal', fechaExpiracion: '2026-11-15T00:00:00Z' });
    questionnaire.submitRegistration();
    return registros[registros.length - 1] as RegistroComunitarioRequest;
  };

  beforeEach(async () => {
    identificadorPublico = null;
    solicitudesAcceso = [];
    registros = [];
    roleAutenticado = 'Inquilino';
    logins = [];
    navegaciones = [];
    errorLogin = false;
    errorNavegacion = false;
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => identificadorPublico } } },
        },
        {
          provide: CodigosInvitacionService,
          useValue: {
            resolverAccesoComunidad: (id: string) => {
              solicitudesAcceso.push(id);
              return of({ token: 'temporal', fechaExpiracion: '2026-11-15T00:00:00Z' });
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            registrarComunidad: (payload: unknown) => { registros.push(payload); return of({ message: 'Cuenta creada.' }); },
            login: (credentials: unknown) => {
              logins.push(credentials);
              return errorLogin
                ? throwError(() => new Error('login fallido'))
                : of({ accessToken: 'access', refreshToken: 'refresh', expiresAt: '', user: { id: '1', nombre: 'Sol', apellido: 'Pérez', email: 'sol@example.com', rol: roleAutenticado } });
            },
            hasRole: (...roles: string[]) => roles.includes(roleAutenticado),
          },
        },
        { provide: Router, useValue: { navigateByUrl: (url: string) => {
          navegaciones.push(url);
          return errorNavegacion ? Promise.reject(new Error('navegación fallida')) : Promise.resolve(true);
        } } },
      ],
    }).compileComponents();
    questionnaire = TestBed.runInInjectionContext(() => new RegistroUsers());
  });

  it('resolves and retains the community context from the QR route', () => {
    identificadorPublico = '80a94d4e-6417-4d14-89d2-11f823d94377';
    questionnaire.ngOnInit();

    expect(solicitudesAcceso).toEqual([identificadorPublico]);
    expect(questionnaire.identificadorPublico()).toBe(identificadorPublico);
    expect(questionnaire.accesoComunitario()).toEqual({
      token: 'temporal',
      fechaExpiracion: '2026-11-15T00:00:00Z',
    });
  });

  it('requires every declared rental unit to be complete and rejects duplicate addresses', () => {
    questionnaire.chooseRole('owner');
    questionnaire.chooseOwnerHasRentalUnits(true);
    questionnaire.chooseOwnerResidence(false);
    expect(questionnaire.ownerUnitsValid).toBe(false);

    questionnaire.rentalUnits[0] = { ...questionnaire.rentalUnits[0], floor: ' ５ ', number: ' A ' };
    questionnaire.addUnit(questionnaire.rentalUnits);
    questionnaire.rentalUnits[1] = { ...questionnaire.rentalUnits[1], floor: '6', number: 'C' };
    expect(questionnaire.ownerUnitsValid).toBe(true);

    questionnaire.rentalUnits[1].floor = '5';
    questionnaire.rentalUnits[1].number = 'a';
    expect(questionnaire.duplicateUnits).toBe(true);
    expect(questionnaire.ownerUnitsValid).toBe(false);
  });

  it('rejects a residence duplicated among rented units and clears units when rental answer changes to no', () => {
    questionnaire.chooseRole('owner');
    questionnaire.chooseOwnerHasRentalUnits(true);
    questionnaire.chooseOwnerResidence(true);
    questionnaire.floor = '4';
    questionnaire.unitNumber = 'B';
    questionnaire.rentalUnits[0] = { ...questionnaire.rentalUnits[0], floor: '４', number: ' b ' };

    expect(questionnaire.duplicateUnits).toBe(true);
    expect(questionnaire.ownerUnitsValid).toBe(false);

    questionnaire.chooseOwnerHasRentalUnits(false);
    expect(questionnaire.rentalUnits).toEqual([]);
    expect(questionnaire.ownerResidenceLivesHere).toBeNull();
    expect(questionnaire.floor).toBe('');
    expect(questionnaire.unitNumber).toBe('');
    expect(questionnaire.currentSteps).toEqual(['account', 'role', 'owner-info', 'owner-rentals', 'owner-resident', 'summary']);
  });

  it('ends the agency branch without owner questions and clears owner data on method change', () => {
    questionnaire.chooseRole('tenant');
    questionnaire.current = 'tenant-home';
    questionnaire.floor = '3';
    questionnaire.unitNumber = 'C';
    questionnaire.changeRentalMethod('direct');
    questionnaire.next();
    expect(questionnaire.current).toBe('tenant-owner');

    questionnaire.ownerName = 'Ana Pérez';
    questionnaire.ownerLivesHere = true;
    questionnaire.back();
    questionnaire.changeRentalMethod('agency');
    expect(questionnaire.ownerName).toBe('');
    expect(questionnaire.ownerLivesHere).toBeNull();
    questionnaire.next();
    expect(questionnaire.current).toBe('summary');
    expect(questionnaire.currentSteps).not.toContain('tenant-owner');
  });

  it('allows the tenant to leave the optional owner reference empty', () => {
    questionnaire.current = 'tenant-owner';
    questionnaire.ownerLivesHere = true;

    expect(questionnaire.canContinue()).toBe(true);
    expect(questionnaire.ownerName).toBe('');
    expect(questionnaire.ownerSurname).toBe('');
    expect(questionnaire.ownerFloor).toBe('');
    expect(questionnaire.ownerUnitNumber).toBe('');
  });

  it('clears optional owner details when the tenant says the owner does not live in the building', () => {
    questionnaire.ownerName = 'Ana';
    questionnaire.ownerSurname = 'Pérez';
    questionnaire.ownerFloor = '3';
    questionnaire.ownerUnitNumber = 'A';
    questionnaire.setOwnerLivesHere(false);

    expect(questionnaire.ownerName).toBe('');
    expect(questionnaire.ownerSurname).toBe('');
    expect(questionnaire.ownerFloor).toBe('');
    expect(questionnaire.ownerUnitNumber).toBe('');
  });

  it('reports progress across the four phases independently of conditional profile steps', () => {
    questionnaire.current = 'account';
    expect(questionnaire.progress).toBe(25);
    questionnaire.current = 'tenant-owner';
    expect(questionnaire.progress).toBe(75);
    questionnaire.current = 'summary';
    expect(questionnaire.progress).toBe(100);
  });

  it('preserves valid answers when navigating back and recalculates progress by role', () => {
    questionnaire.current = 'role';
    questionnaire.chooseRole('staff');
    questionnaire.next();
    expect(questionnaire.current).toBe('staff-details');
    expect(questionnaire.currentSteps.length).toBe(4);
    questionnaire.staffFunction = 'Limpieza';
    questionnaire.staffSchedule = '';
    expect(questionnaire.canContinue()).toBe(true);
    questionnaire.next();
    expect(questionnaire.current).toBe('summary');
    questionnaire.back();
    expect(questionnaire.staffFunction).toBe('Limpieza');
    expect(questionnaire.staffSchedule).toBe('');
  });

  it('routes an owner who rents and lives here through residence first, then rental declarations', () => {
    questionnaire.chooseRole('owner');
    questionnaire.current = 'owner-info';
    questionnaire.next();
    expect(questionnaire.current).toBe('owner-rentals');
    questionnaire.chooseOwnerHasRentalUnits(true);
    questionnaire.next();
    expect(questionnaire.current).toBe('owner-home');
    questionnaire.chooseOwnerResidence(true);
    questionnaire.floor = '5';
    questionnaire.unitNumber = 'C';
    questionnaire.next();
    expect(questionnaire.current).toBe('owner-units');
    questionnaire.rentalUnits[0] = { ...questionnaire.rentalUnits[0], floor: '3', number: 'B' };
    questionnaire.addUnit(questionnaire.rentalUnits);
    questionnaire.rentalUnits[1] = { ...questionnaire.rentalUnits[1], floor: '6', number: 'D' };
    expect(questionnaire.ownerUnitsValid).toBe(true);
    questionnaire.next();
    expect(questionnaire.current).toBe('summary');

    const payload = enviarRegistro();
    expect(payload.perfil).toBe('Propietario');
    expect(payload.viveEnEdificio).toBe(true);
    expect(payload.tieneOtrasUnidades).toBe(true);
    expect(payload.declaraUnidadesAlquiladas).toBe(true);
    expect(payload.unidades).toEqual([
      { tipo: 'Residencia', piso: '5', identificacion: 'C', estaAlquilada: null, esPrincipal: true },
      { tipo: 'Titularidad', piso: '3', identificacion: 'B', estaAlquilada: true, esPrincipal: false },
      { tipo: 'Titularidad', piso: '6', identificacion: 'D', estaAlquilada: true, esPrincipal: false },
    ]);
    expect(payload.modalidadAlquiler).toBeUndefined();
  });

  it('sends only rented title declarations for an owner who does not live here', () => {
    questionnaire.chooseRole('owner');
    questionnaire.current = 'owner-info';
    questionnaire.next();
    questionnaire.chooseOwnerHasRentalUnits(true);
    questionnaire.next();
    questionnaire.chooseOwnerResidence(false);
    questionnaire.next();
    expect(questionnaire.current).toBe('owner-units');
    questionnaire.rentalUnits[0] = { ...questionnaire.rentalUnits[0], floor: '2', number: 'A' };
    questionnaire.next();

    const payload = enviarRegistro();
    expect(payload.perfil).toBe('Propietario');
    expect(payload.viveEnEdificio).toBe(false);
    expect(payload.unidades).toEqual([
      { tipo: 'Titularidad', piso: '2', identificacion: 'A', estaAlquilada: true, esPrincipal: false },
    ]);
    expect(payload.unidades.some(unit => unit.tipo === 'Residencia')).toBe(false);
    expect(payload.unidades.some(unit => unit.esPrincipal)).toBe(false);
  });

  it('turns an owner selection without rentals into an Inquilino with only a principal residence', () => {
    questionnaire.chooseRole('owner');
    questionnaire.current = 'owner-info';
    questionnaire.next();
    questionnaire.chooseOwnerHasRentalUnits(false);
    questionnaire.next();
    expect(questionnaire.current).toBe('owner-resident');
    expect(questionnaire.currentSteps).not.toContain('owner-home');
    expect(questionnaire.currentSteps).not.toContain('owner-units');
    questionnaire.floor = '1';
    questionnaire.unitNumber = 'D';
    questionnaire.next();
    expect(questionnaire.finalProfile).toBe('Inquilino');

    const payload = enviarRegistro();
    expect(payload.perfil).toBe('Inquilino');
    expect(payload.viveEnEdificio).toBe(true);
    expect(payload.tieneOtrasUnidades).toBe(false);
    expect(payload.declaraUnidadesAlquiladas).toBe(false);
    expect(payload.unidades).toEqual([
      { tipo: 'Residencia', piso: '1', identificacion: 'D', estaAlquilada: null, esPrincipal: true },
    ]);
    expect(payload.modalidadAlquiler).toBeUndefined();
    expect(payload.propietarioDeclaradoNombre).toBeUndefined();
  });

  it('clears hidden owner answers when changing rental or residence responses', () => {
    questionnaire.chooseRole('owner');
    questionnaire.chooseOwnerHasRentalUnits(true);
    questionnaire.chooseOwnerResidence(true);
    questionnaire.floor = '4';
    questionnaire.unitNumber = 'A';
    questionnaire.rentalUnits[0] = { ...questionnaire.rentalUnits[0], floor: '8', number: 'B' };
    questionnaire.chooseOwnerResidence(false);
    expect(questionnaire.floor).toBe('');
    expect(questionnaire.unitNumber).toBe('');
    expect(questionnaire.rentalUnits[0]).toMatchObject({ floor: '8', number: 'B' });

    questionnaire.chooseOwnerHasRentalUnits(false);
    expect(questionnaire.rentalUnits).toEqual([]);
    expect(questionnaire.ownerResidenceLivesHere).toBeNull();
    expect(questionnaire.floor).toBe('');
    expect(questionnaire.unitNumber).toBe('');

    questionnaire.chooseOwnerHasRentalUnits(true);
    expect(questionnaire.ownerResidenceLivesHere).toBeNull();
    expect(questionnaire.floor).toBe('');
    expect(questionnaire.unitNumber).toBe('');
    expect(questionnaire.rentalUnits).toHaveLength(1);
  });

  it('requires residence details again when changing from not living here to living here', () => {
    questionnaire.chooseRole('owner');
    questionnaire.chooseOwnerHasRentalUnits(true);
    questionnaire.chooseOwnerResidence(false);
    expect(questionnaire.ownerResidenceValid).toBe(true);
    questionnaire.chooseOwnerResidence(true);
    expect(questionnaire.ownerResidenceValid).toBe(false);
    questionnaire.floor = '5';
    questionnaire.unitNumber = 'C';
    expect(questionnaire.ownerResidenceValid).toBe(true);
  });

  it('preserves valid owner answers when navigating backward and forward', () => {
    questionnaire.chooseRole('owner');
    questionnaire.current = 'owner-info';
    questionnaire.next();
    questionnaire.chooseOwnerHasRentalUnits(true);
    questionnaire.next();
    questionnaire.chooseOwnerResidence(true);
    questionnaire.floor = '5';
    questionnaire.unitNumber = 'C';
    questionnaire.next();
    questionnaire.rentalUnits[0] = { ...questionnaire.rentalUnits[0], floor: '2', number: 'A' };
    questionnaire.next();

    questionnaire.back();
    expect(questionnaire.current).toBe('owner-units');
    expect(questionnaire.rentalUnits[0]).toMatchObject({ floor: '2', number: 'A' });
    questionnaire.back();
    expect(questionnaire.current).toBe('owner-home');
    expect(questionnaire.ownerResidenceLivesHere).toBe(true);
    expect(questionnaire.floor).toBe('5');
    expect(questionnaire.unitNumber).toBe('C');
    questionnaire.next();
    expect(questionnaire.current).toBe('owner-units');
    expect(questionnaire.rentalUnits[0]).toMatchObject({ floor: '2', number: 'A' });
    questionnaire.next();
    expect(questionnaire.current).toBe('summary');
  });

  it.each([
    ['Propietario', 'owner', '/user-dashboard'],
    ['Inquilino', 'tenant', '/user-dashboard'],
    ['Portero', 'staff', '/porteria-dashboard'],
  ])('inicia sesión y navega al dashboard correspondiente para %s', async (rol, perfil, destino) => {
    roleAutenticado = rol;
    questionnaire.accesoComunitario.set({ token: 'temporal', fechaExpiracion: '2026-11-15T00:00:00Z' });
    questionnaire.role = perfil as 'owner' | 'tenant' | 'staff';
    questionnaire.email = 'persona@example.com';
    questionnaire.password = 'ClaveSegura1';

    questionnaire.submitRegistration();
    expect(questionnaire.registrationCreated).toBe(true);
    expect(questionnaire.sessionReady).toBe(true);
    expect(logins).toEqual([{ email: 'persona@example.com', password: 'ClaveSegura1' }]);

    await questionnaire.navigateToDashboard();

    expect(navegaciones).toEqual([destino]);
    expect(registros).toHaveLength(1);
  });

  it('mantiene el éxito y ofrece login manual si falla el login, sin volver a registrar', () => {
    errorLogin = true;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    questionnaire.role = 'owner';
    questionnaire.accesoComunitario.set({ token: 'temporal', fechaExpiracion: '2026-11-15T00:00:00Z' });

    questionnaire.submitRegistration();
    questionnaire.submitRegistration();

    expect(questionnaire.registrationCreated).toBe(true);
    expect(questionnaire.sessionReady).toBe(false);
    expect(questionnaire.submitError).toContain('La cuenta fue creada');
    expect(registros).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('ofrece navegación manual si el router falla, sin volver a registrar', async () => {
    errorNavegacion = true;
    roleAutenticado = 'Propietario';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    questionnaire.role = 'owner';
    questionnaire.accesoComunitario.set({ token: 'temporal', fechaExpiracion: '2026-11-15T00:00:00Z' });
    questionnaire.submitRegistration();

    await questionnaire.navigateToDashboard();
    questionnaire.submitRegistration();

    expect(questionnaire.registrationCreated).toBe(true);
    expect(questionnaire.sessionReady).toBe(true);
    expect(questionnaire.navigationFailed).toBe(true);
    expect(registros).toHaveLength(1);
    expect(navegaciones).toEqual(['/user-dashboard']);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('sends an optional tenant owner reference as a declaration and uses the Personal profile value', () => {
    identificadorPublico = '80a94d4e-6417-4d14-89d2-11f823d94377';
    questionnaire.ngOnInit();
    questionnaire.name = 'Ana';
    questionnaire.surname = 'López';
    questionnaire.email = 'ana@example.com';
    questionnaire.password = 'ClaveSegura1';
    questionnaire.role = 'tenant';
    questionnaire.floor = '1';
    questionnaire.unitNumber = 'D';
    questionnaire.rentalMethod = 'direct';
    questionnaire.ownerLivesHere = true;
    questionnaire.ownerName = 'Juan';
    questionnaire.submitRegistration();

    const payload = registros[0] as any;
    expect(payload.perfil).toBe('Inquilino');
    expect(payload.propietarioDeclaradoNombre).toBe('Juan');
    expect(payload.propietarioDeclaradoViveEnEdificio).toBe(true);
    expect(payload.unidades).toMatchObject([{ tipo: 'Ocupacion', piso: '1', identificacion: 'D' }]);
  });

  it('maps the staff questionnaire to Personal and preserves the optional schedule', () => {
    identificadorPublico = '80a94d4e-6417-4d14-89d2-11f823d94377';
    questionnaire.ngOnInit();
    questionnaire.name = 'Luis';
    questionnaire.surname = 'Díaz';
    questionnaire.email = 'luis@example.com';
    questionnaire.password = 'ClaveSegura1';
    questionnaire.role = 'staff';
    questionnaire.staffFunction = 'Otro';
    questionnaire.staffFunctionOther = 'Jardinería';
    questionnaire.staffSchedule = 'Lunes a viernes';
    questionnaire.submitRegistration();

    const payload = registros[0] as any;
    expect(payload.perfil).toBe('Personal');
    expect(payload.funcionPersonalOtra).toBe('Jardinería');
    expect(payload.horarioPersonal).toBe('Lunes a viernes');
    expect(payload.unidades).toEqual([]);
    expect(payload.modalidadAlquiler).toBeUndefined();
  });

  it('does not allow duplicate submission while the request is active', () => {
    questionnaire.submitting = true;
    questionnaire.role = 'staff';
    questionnaire.submitRegistration();
    expect(registros).toEqual([]);
  });

  it('requires a custom staff function only when Otro is selected and clears it when leaving Otro', () => {
    questionnaire.current = 'staff-details';
    questionnaire.chooseStaffFunction('Otro');
    expect(questionnaire.canContinue()).toBe(false);
    questionnaire.staffFunctionOther = 'Jardinería';
    expect(questionnaire.canContinue()).toBe(true);
    questionnaire.chooseStaffFunction('Mantenimiento');
    expect(questionnaire.staffFunctionOther).toBe('');
    expect(questionnaire.canContinue()).toBe(true);
  });

  it('clears profile answers after changing to another role', () => {
    questionnaire.chooseRole('owner');
    questionnaire.floor = '8';
    questionnaire.unitNumber = 'D';
    questionnaire.chooseOwnerHasRentalUnits(true);
    questionnaire.rentalUnits[0] = { ...questionnaire.rentalUnits[0], floor: '9', number: 'A' };
    questionnaire.chooseRole('tenant');

    expect(questionnaire.floor).toBe('');
    expect(questionnaire.unitNumber).toBe('');
    expect(questionnaire.rentalUnits).toEqual([]);
    expect(questionnaire.ownerHasRentalUnits).toBeNull();
    expect(questionnaire.currentSteps).toEqual(['account', 'role', 'tenant-info', 'tenant-home', 'summary']);
  });
});
