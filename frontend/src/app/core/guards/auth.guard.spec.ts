import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, GuardResult, MaybeAsync, provideRouter, Router, RouterStateSnapshot, Route, Routes } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { User } from '../models/user';
import { PerfilUsuario } from '../../features/profile/models/perfil-usuario';
import { PerfilService } from '../../features/profile/services/perfil.service';
import { routes } from '../../app.routes';
import { dashboardRedirectGuard, incidenciasDerivadasGuard, roleGuard } from './auth.guard';

const profileFor = (
  viveEnEdificio: boolean | null,
  declaraAlquiler: boolean,
  estadoConfirmacion = 'Confirmada',
): PerfilUsuario => ({
  nombre: 'Persona', apellido: 'Prueba', email: 'persona@example.test', telefono: null,
  rol: 'Propietario', edificioNombre: 'Edificio', viveEnEdificio,
  tieneOtrasUnidades: declaraAlquiler, declaraUnidadesAlquiladas: declaraAlquiler,
  modalidadAlquiler: null, funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
  unidadesVinculadas: [],
  unidadesDeclaradas: declaraAlquiler ? [{
    id: 1, tipo: 'Titularidad', pisoDeclarado: '1', identificacionDeclarada: 'A',
    esPrincipalDeclarada: false, estaAlquiladaDeclarada: true,
    estadoConfirmacion, fechaDeclaracion: '2026-01-01',
    personaRelacionNombre: null, personaRelacionApellido: null,
    pisoRelacion: null, identificacionRelacion: null,
  }] : [],
});

let currentProfile = profileFor(null, false);
let perfilFailure = false;

const perfilProvider = {
  provide: PerfilService,
  useValue: {
    obtenerMiPerfil: () => perfilFailure
      ? throwError(() => new Error('perfil no disponible'))
      : of(currentProfile),
  },
};

function resolveGuard(result: MaybeAsync<GuardResult>): Promise<GuardResult> {
  return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
}

function routeEntries(routeList: Routes, parentPath = ''): { path: string; route: Route }[] {
  return routeList.flatMap(route => {
    const path = [parentPath, route.path ?? ''].filter(Boolean).join('/');
    return [
      { path, route },
      ...(route.children ? routeEntries(route.children, path) : []),
    ];
  });
}

const routesByPath = routeEntries(routes);
const routeAt = (path: string): Route => {
  const match = routesByPath.find(entry => entry.path === path);
  if (!match) throw new Error(`No se encontró la ruta ${path}`);
  return match.route;
};

@Component({ standalone: true, template: '' })
class RouteTarget {}

const directAccessRoutes = [
  'comunidad', 'encuestas', 'incidencias-derivadas',
  'user-dashboard', 'mis-incidencias', 'mis-paquetes', 'mis-reservas',
].map(path => {
  const route = routeAt(path);
  return {
    path,
    component: RouteTarget,
    canActivate: route.canActivate,
    data: route.data,
  };
});

describe('incidenciasDerivadasGuard', () => {
  beforeEach(() => {
    currentProfile = profileFor(null, false);
    perfilFailure = false;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([]), perfilProvider],
    });
  });

  afterEach(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authSessionRevision');
  });

  const userFor = (rol: string): User => ({
    id: 'user-1',
    nombre: 'Persona',
    apellido: 'Prueba',
    email: 'persona@example.test',
    rol,
    declaraUnidadesAlquiladas: false,
  });

  async function execute(rol: string, profile = currentProfile) {
    currentProfile = profile;
    localStorage.setItem('accessToken', 'authenticated');
    localStorage.setItem('currentUser', JSON.stringify(userFor(rol)));
    TestBed.inject(AuthService).currentUser.set(userFor(rol));
    return resolveGuard(TestBed.runInInjectionContext(() =>
      incidenciasDerivadasGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    ));
  }

  it('permite Portero y Propietarios con alquiler confirmado residentes o no', async () => {
    expect(await execute('Portero')).toBe(true);
    expect(await execute('Propietario', profileFor(true, true))).toBe(true);
    expect(await execute('Propietario', profileFor(false, true))).toBe(true);
  });

  it('no trata como permiso extra una declaración de alquiler todavía pendiente', async () => {
    const result = await execute('Propietario', profileFor(false, true, 'Declarada'));
    expect(result).not.toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>))
      .toBe('/comunidad');
  });

  it('deniega Propietarios sin alquiler confirmado y los roles no habilitados', async () => {
    const router = TestBed.inject(Router);
    for (const [rol, destino] of [
      ['Propietario', '/user-dashboard'],
      ['Propietario', '/comunidad'],
      ['Inquilino', '/user-dashboard'],
      ['Administrador', '/admin-dashboard'],
      ['SuperAdministrador', '/admin/edificios'],
    ]) {
      const profile = rol === 'Propietario' && destino === '/user-dashboard'
        ? profileFor(true, false)
        : profileFor(false, false);
      const result = await execute(rol, profile);
      expect(result).not.toBe(true);
      expect(router.serializeUrl(result as ReturnType<Router['parseUrl']>)).toBe(destino);
    }
  });
});

describe('roleGuard', () => {
  beforeEach(() => {
    currentProfile = profileFor(null, false);
    perfilFailure = false;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter(directAccessRoutes), perfilProvider] });
  });

  afterEach(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authSessionRevision');
  });

  const userFor = (rol: string): User => ({
    id: 'user-1', nombre: 'Persona', apellido: 'Prueba',
    email: 'persona@example.test', rol, declaraUnidadesAlquiladas: false,
  });

  async function execute(rol: string | null, allowedRoles: string[], ownerAccess?: string) {
    if (rol) {
      localStorage.setItem('accessToken', 'authenticated');
      localStorage.setItem('currentUser', JSON.stringify(userFor(rol)));
      TestBed.inject(AuthService).currentUser.set(userFor(rol));
    } else {
      TestBed.inject(AuthService).clearSession();
    }
    return resolveGuard(TestBed.runInInjectionContext(() => roleGuard(
      { data: { roles: allowedRoles, ownerAccess } } as unknown as ActivatedRouteSnapshot,
      { url: '/admin/edificios' } as RouterStateSnapshot,
    )));
  }

  it('permite roles autorizados y restringe Propietarios a su situación', async () => {
    expect(await execute('SuperAdministrador', ['SuperAdministrador'])).toBe(true);
    currentProfile = profileFor(true, false);
    expect(await execute('Propietario', ['Propietario'], 'resident')).toBe(true);
    currentProfile = profileFor(false, false);
    expect(await execute('Propietario', ['Propietario'], 'resident')).not.toBe(true);
  });

  it('redirige el acceso denegado a un destino seguro del rol', async () => {
    const router = TestBed.inject(Router);
    for (const [rol, destino] of [
      ['Inquilino', '/user-dashboard'],
      ['Propietario', '/user-dashboard'],
      ['Administrador', '/admin-dashboard'],
      ['SuperAdministrador', '/admin/edificios'],
    ]) {
      if (rol === 'Propietario') currentProfile = profileFor(true, false);
      const result = await execute(rol, ['Portero']);
      expect(result).not.toBe(true);
      expect(router.serializeUrl(result as ReturnType<Router['parseUrl']>)).toBe(destino);
    }
  });

  it('redirige usuarios no autenticados al login conservando returnUrl', async () => {
    const router = TestBed.inject(Router);
    const result = await execute(null, ['SuperAdministrador']);
    expect(result).not.toBe(true);
    expect(router.serializeUrl(result as ReturnType<Router['parseUrl']>))
      .toBe('/login?returnUrl=%2Fadmin%2Fedificios');
  });

  it('deniega el acceso especial a Propietarios si no puede comprobar su perfil', async () => {
    perfilFailure = true;
    const result = await execute('Propietario', ['Propietario'], 'community');
    expect(result).not.toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>))
      .toBe('/perfil');
  });

  it('permite Comunidad y Encuestas al Propietario no residente, y bloquea rutas de residente', async () => {
    const router = TestBed.inject(Router);
    for (const profile of [
      profileFor(false, false),
      profileFor(false, true, 'Declarada'),
      profileFor(false, true, 'Confirmada'),
    ]) {
      currentProfile = profile;
      localStorage.setItem('accessToken', 'authenticated');
      localStorage.setItem('currentUser', JSON.stringify({
        id: 'user-1', nombre: 'Persona', apellido: 'Prueba',
        email: 'persona@example.test', rol: 'Propietario', declaraUnidadesAlquiladas: true,
      }));
      TestBed.inject(AuthService).currentUser.set(userFor('Propietario'));

      for (const path of ['comunidad', 'encuestas']) {
        const route = routeAt(path);
        const result = await resolveGuard(TestBed.runInInjectionContext(() => roleGuard(
          { data: route.data } as ActivatedRouteSnapshot,
          { url: `/${path}` } as RouterStateSnapshot,
        )));
        expect(result).toBe(true);
      }

      for (const path of ['user-dashboard', 'mis-incidencias', 'mis-paquetes', 'mis-reservas']) {
        const route = routeAt(path);
        const result = await resolveGuard(TestBed.runInInjectionContext(() => roleGuard(
          { data: route.data } as ActivatedRouteSnapshot,
          { url: `/${path}` } as RouterStateSnapshot,
        )));
        expect(result).not.toBe(true);
        expect(router.serializeUrl(result as ReturnType<Router['parseUrl']>)).toBe('/comunidad');
      }
    }
  });

  it('aplica los permisos al navegar directamente a las URL en los tres escenarios', async () => {
    const router = TestBed.inject(Router);
    const scenarios = [
      { profile: profileFor(false, false), derived: false },
      { profile: profileFor(false, true, 'Declarada'), derived: false },
      { profile: profileFor(false, true, 'Confirmada'), derived: true },
    ];

    localStorage.setItem('accessToken', 'authenticated');
    localStorage.setItem('currentUser', JSON.stringify(userFor('Propietario')));
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set(userFor('Propietario'));

    for (const { profile, derived } of scenarios) {
      currentProfile = profile;
      for (const path of ['comunidad', 'encuestas']) {
        await router.navigateByUrl(`/${path}`);
        expect(router.url).toBe(`/${path}`);
      }

      for (const path of ['user-dashboard', 'mis-incidencias', 'mis-paquetes', 'mis-reservas']) {
        await router.navigateByUrl(`/${path}`);
        expect(router.url).toBe('/comunidad');
      }

      await router.navigateByUrl('/incidencias-derivadas');
      expect(router.url).toBe(derived ? '/incidencias-derivadas' : '/comunidad');
    }
  });
});

describe('dashboardRedirectGuard', () => {
  beforeEach(() => {
    currentProfile = profileFor(null, false);
    perfilFailure = false;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([]), perfilProvider] });
  });

  afterEach(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authSessionRevision');
  });

  const userFor = (rol: string): User => ({
    id: 'user-1', nombre: 'Persona', apellido: 'Prueba',
    email: 'persona@example.test', rol, declaraUnidadesAlquiladas: false,
  });

  it('redirige a cada rol y situación real de Propietario a un destino permitido', async () => {
    const router = TestBed.inject(Router);
    const cases: { rol: string; destino: string; profile?: PerfilUsuario }[] = [
      { rol: 'Inquilino', destino: '/user-dashboard' },
      { rol: 'Portero', destino: '/porteria-dashboard' },
      { rol: 'Administrador', destino: '/admin-dashboard' },
      { rol: 'SuperAdministrador', destino: '/admin/edificios' },
      { rol: 'Propietario', destino: '/user-dashboard', profile: profileFor(true, false) },
      { rol: 'Propietario', destino: '/user-dashboard', profile: profileFor(true, true) },
      { rol: 'Propietario', destino: '/comunidad', profile: profileFor(false, true) },
      { rol: 'Propietario', destino: '/comunidad', profile: profileFor(false, false) },
      { rol: 'Propietario', destino: '/comunidad', profile: profileFor(false, true, 'Declarada') },
    ];
    for (const { rol, destino, profile } of cases) {
      currentProfile = profile ?? profileFor(null, false);
      localStorage.setItem('accessToken', 'authenticated');
      localStorage.setItem('currentUser', JSON.stringify(userFor(rol)));
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userFor(rol));
      const result = await resolveGuard(TestBed.runInInjectionContext(() => dashboardRedirectGuard(
        {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot,
      )));
      expect(router.serializeUrl(result as ReturnType<Router['parseUrl']>)).toBe(destino);
    }
  });

  it('redirige al login cuando no hay una sesión autenticada', async () => {
    const auth = TestBed.inject(AuthService);
    auth.clearSession();
    const result = await resolveGuard(TestBed.runInInjectionContext(() => dashboardRedirectGuard(
      {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot,
    )));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>))
      .toBe('/login');
  });
});
