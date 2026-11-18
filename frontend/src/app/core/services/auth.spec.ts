import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth';
import { environment } from '../../../environments/environment';

describe('AuthService session identity', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('usa el IdUsuario devuelto por el login y limpia inmediatamente al cerrar sesión', () => {
    auth.login({ email: 'cuenta-a@example.test', password: 'test-only' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'token-a',
      refreshToken: 'refresh-a',
      expiresAt: '2026-11-16T12:00:00Z',
      user: { id: 'usuario-a', nombre: 'A', apellido: 'Prueba', email: 'cuenta-a@example.test', rol: 'Inquilino', declaraUnidadesAlquiladas: false },
    });

    expect(auth.currentUser()?.id).toBe('usuario-a');
    expect(auth.getAccessToken()).toBe('token-a');

    auth.logout().subscribe();
    expect(auth.currentUser()).toBeNull();
    expect(auth.getAccessToken()).toBeNull();
    http.expectOne(`${environment.apiUrl}/auth/logout`).flush({ message: 'ok' });
  });

  it('sincroniza el usuario y el token de otra pestaña y vence capturas de sesión anteriores', () => {
    localStorage.setItem('currentUser', JSON.stringify({ id: 'usuario-b', nombre: 'B', apellido: 'Prueba', email: 'b@example.test', rol: 'Inquilino', declaraUnidadesAlquiladas: false }));
    localStorage.setItem('accessToken', 'token-b');
    localStorage.setItem('refreshToken', 'refresh-b');
    const anterior = auth.captureSession();
    localStorage.setItem('authSessionRevision', '2:remote');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'authSessionRevision',
      newValue: '2:remote',
      storageArea: localStorage,
    }));

    expect(auth.currentUser()?.id).toBe('usuario-b');
    expect(auth.getAccessToken()).toBe('token-b');
    expect(auth.isCurrentSession(anterior)).toBe(false);
  });

  it('no conserva un usuario si la pestaña que actualizó la sesión dejó un token ausente', () => {
    localStorage.setItem('currentUser', JSON.stringify({ id: 'usuario-a' }));
    localStorage.removeItem('accessToken');
    localStorage.setItem('authSessionRevision', '3:remote');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'authSessionRevision', newValue: '3:remote', storageArea: localStorage,
    }));

    expect(auth.currentUser()).toBeNull();
  });

  it('restaura la sesión persistida al reconstruir el servicio después de recargar', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('accessToken', 'restored-access');
    localStorage.setItem('refreshToken', 'restored-refresh');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 'usuario-restaurado', nombre: 'Restaurado', apellido: 'Prueba',
      email: 'restaurado@example.test', rol: 'Inquilino', declaraUnidadesAlquiladas: false,
    }));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);

    expect(auth.currentUser()?.id).toBe('usuario-restaurado');
    expect(auth.getAccessToken()).toBe('restored-access');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('actualiza access token y refresh token tras renovar sin crear otra sesión', () => {
    auth.login({ email: 'cuenta-a@example.test', password: 'test-only' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: '2026-11-16T12:00:00Z',
      user: { id: 'usuario-a', nombre: 'A', apellido: 'Prueba', email: 'cuenta-a@example.test', rol: 'Inquilino', declaraUnidadesAlquiladas: false },
    });
    const sessionVersion = auth.sessionVersion();
    auth.refresh().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({
      accessToken: 'token-a-renovado', refreshToken: 'refresh-a-renovado',
      expiresAt: '2026-11-16T12:15:00Z',
      user: { id: 'usuario-a', nombre: 'A', apellido: 'Prueba', email: 'cuenta-a@example.test', rol: 'Inquilino', declaraUnidadesAlquiladas: false },
    });

    expect(auth.currentUser()?.id).toBe('usuario-a');
    expect(auth.getAccessToken()).toBe('token-a-renovado');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-a-renovado');
    expect(auth.sessionVersion()).toBe(sessionVersion);
  });

  it('no elimina la sesión ante un error de servidor que no sea de autenticación', () => {
    auth.login({ email: 'cuenta-a@example.test', password: 'test-only' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'token-a', refreshToken: 'refresh-a', expiresAt: '2026-11-16T12:00:00Z',
      user: { id: 'usuario-a', nombre: 'A', apellido: 'Prueba', email: 'cuenta-a@example.test', rol: 'Inquilino', declaraUnidadesAlquiladas: false },
    });
    auth.refresh().subscribe({ error: () => undefined });
    http.expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({ message: 'server error' }, { status: 500, statusText: 'Server Error' });

    expect(auth.currentUser()?.id).toBe('usuario-a');
    expect(auth.getAccessToken()).toBe('token-a');
  });

  it('no permite que una respuesta de login anterior reemplace una sesión iniciada después', () => {
    let loginAnteriorEmitio = false;
    let loginActualEmitio = false;
    auth.login({ email: 'a@example.test', password: 'test-only' }).subscribe({ next: () => loginAnteriorEmitio = true });
    auth.login({ email: 'b@example.test', password: 'test-only' }).subscribe({ next: () => loginActualEmitio = true });
    const requests = http.match(`${environment.apiUrl}/auth/login`);
    expect(requests).toHaveLength(2);

    const response = (id: string, email: string) => ({
      accessToken: `token-${id}`, refreshToken: `refresh-${id}`, expiresAt: '2026-11-16T12:00:00Z',
      user: { id, nombre: id, apellido: 'Prueba', email, rol: 'Inquilino', declaraUnidadesAlquiladas: false },
    });
    requests[0].flush(response('usuario-a', 'a@example.test'));
    expect(loginAnteriorEmitio).toBe(false);
    expect(auth.currentUser()).toBeNull();

    requests[1].flush(response('usuario-b', 'b@example.test'));
    expect(loginActualEmitio).toBe(true);
    expect(auth.currentUser()?.id).toBe('usuario-b');
  });

  it('validates administrator codes using the existing endpoint without building data', () => {
    auth.validarInvitacionAdministrador('INV-ADMIN-7').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/auth/registro`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      codigoInvitacion: 'INV-ADMIN-7', rolEsperado: 'Administrador', soloValidar: true,
    });
    request.flush({ message: 'La invitación es válida.' });
  });

  it('registers an invited administrator without IdEdificio or building fields', () => {
    auth.registrarAdministradorInvitado({
      nombre: 'Ana', apellido: 'Perez', email: 'ana@example.test', telefono: '1122334455',
      password: 'Clave123', codigoInvitacion: 'INV-ADMIN-7', rolEsperado: 'Administrador',
    }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/auth/registro`);

    expect(request.request.body).toEqual({
      nombre: 'Ana', apellido: 'Perez', email: 'ana@example.test', telefono: '1122334455',
      password: 'Clave123', codigoInvitacion: 'INV-ADMIN-7', rolEsperado: 'Administrador',
    });
    expect(request.request.body.idEdificio).toBeUndefined();
    expect(request.request.body.nombreEdificio).toBeUndefined();
    request.flush({ message: 'Cuenta creada correctamente.' });
  });
});
