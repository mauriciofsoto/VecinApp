import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';
import { User } from '../models/user';
import { incidenciasDerivadasGuard } from './auth.guard';

describe('incidenciasDerivadasGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
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

  function execute(rol: string): boolean | ReturnType<Router['parseUrl']> {
    localStorage.setItem('accessToken', 'authenticated');
    localStorage.setItem('currentUser', JSON.stringify(userFor(rol)));
    TestBed.inject(AuthService).currentUser.set(userFor(rol));
    return TestBed.runInInjectionContext(() =>
      incidenciasDerivadasGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    ) as boolean | ReturnType<Router['parseUrl']>;
  }

  it('permite Propietario aunque no declare unidades alquiladas y Portero sin unidad', () => {
    expect(execute('Propietario')).toBe(true);
    expect(execute('Portero')).toBe(true);
  });

  it('redirige Inquilino, Administrador y SuperAdministrador', () => {
    const router = TestBed.inject(Router);
    for (const [rol, destino] of [
      ['Inquilino', '/user-dashboard'],
      ['Administrador', '/admin-dashboard'],
      ['SuperAdministrador', '/admin-dashboard'],
    ]) {
      const result = execute(rol);
      expect(result).not.toBe(true);
      expect(router.serializeUrl(result as ReturnType<Router['parseUrl']>)).toBe(destino);
    }
  });
});
