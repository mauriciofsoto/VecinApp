import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/auth';
import { User } from '../models/user';
import { AuthService } from '../services/auth';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor refresh flow', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: AuthService;
  const user: User = {
    id: 'user-a', nombre: 'Cuenta', apellido: 'A', email: 'a@example.test',
    rol: 'Inquilino', declaraUnidadesAlquiladas: false,
  };
  const response = (accessToken: string, refreshToken: string, authUser = user): AuthResponse => ({
    accessToken,
    refreshToken,
    expiresAt: '2026-11-16T12:00:00Z',
    user: authUser,
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'old-refresh');
    localStorage.setItem('currentUser', JSON.stringify(user));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('renueva al recibir 401 y reintenta una vez con las nuevas credenciales', () => {
    let result: unknown;
    client.get(`${environment.apiUrl}/api/protected`).subscribe(value => result = value);
    const original = http.expectOne(`${environment.apiUrl}/api/protected`);
    expect(original.request.headers.get('Authorization')).toBe('Bearer old-access');
    original.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    expect(refresh.request.body).toEqual({ refreshToken: 'old-refresh' });
    refresh.flush(response('new-access', 'new-refresh'));

    const retry = http.expectOne(`${environment.apiUrl}/api/protected`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(auth.currentUser()?.id).toBe('user-a');
    expect(auth.getAccessToken()).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
  });

  it('comparte una única renovación entre varias solicitudes concurrentes', () => {
    const failures: unknown[] = [];
    client.get(`${environment.apiUrl}/api/one`).subscribe({ error: error => failures.push(error) });
    client.get(`${environment.apiUrl}/api/two`).subscribe({ error: error => failures.push(error) });
    const originals = http.match(request => request.url.includes('/api/'));
    expect(originals).toHaveLength(2);
    originals[0].flush({}, { status: 401, statusText: 'Unauthorized' });
    originals[1].flush({}, { status: 401, statusText: 'Unauthorized' });

    const refreshes = http.match(`${environment.apiUrl}/auth/refresh`);
    expect(refreshes).toHaveLength(1);
    refreshes[0].flush(response('new-access', 'new-refresh'));
    const retries = http.match(request => request.url.includes('/api/'));
    expect(retries).toHaveLength(2);
    retries.forEach(retry => {
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
      retry.flush({ ok: true });
    });
    expect(failures).toEqual([]);
  });

  it('limpia la sesión cuando el servidor rechaza el refresh token', () => {
    let requestFailed = false;
    client.get(`${environment.apiUrl}/api/protected`).subscribe({ error: () => requestFailed = true });
    http.expectOne(`${environment.apiUrl}/api/protected`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({ message: 'refresh inválido' }, { status: 401, statusText: 'Unauthorized' });

    expect(requestFailed).toBe(true);
    expect(auth.currentUser()).toBeNull();
    expect(auth.getAccessToken()).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('no renueva ante 403 y no reintenta más de una vez si el token renovado también es rechazado', () => {
    let forbidden = false;
    client.get(`${environment.apiUrl}/api/forbidden`).subscribe({ error: () => forbidden = true });
    http.expectOne(`${environment.apiUrl}/api/forbidden`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    expect(forbidden).toBe(true);
    http.expectNone(`${environment.apiUrl}/auth/refresh`);

    let second401 = false;
    client.get(`${environment.apiUrl}/api/protected-again`).subscribe({ error: () => second401 = true });
    http.expectOne(`${environment.apiUrl}/api/protected-again`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush(response('new-access', 'new-refresh'));
    http.expectOne(`${environment.apiUrl}/api/protected-again`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(second401).toBe(true);
    http.expectNone(`${environment.apiUrl}/auth/refresh`);
    expect(auth.currentUser()).toBeNull();
  });

  it('no envía JWT a URLs externas', () => {
    let failed = false;
    client.get('https://external.example.test/data').subscribe({ error: () => failed = true });
    const external = http.expectOne('https://external.example.test/data');
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);
    http.expectNone(`${environment.apiUrl}/auth/refresh`);
  });

  it('no inicia ciclos de renovación para login, refresh o logout', () => {
    const authCalls = [
      `${environment.apiUrl}/auth/login`,
      `${environment.apiUrl}/auth/refresh`,
      `${environment.apiUrl}/auth/logout`,
    ];
    for (const url of authCalls) {
      client.post(url, {}).subscribe({ error: () => undefined });
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({}, { status: 401, statusText: 'Unauthorized' });
      http.expectNone(`${environment.apiUrl}/auth/refresh`);
    }
    expect(auth.currentUser()?.id).toBe('user-a');
  });

  it('no deja que una renovación pendiente restaure una sesión cerrada', () => {
    let originalFailed = false;
    client.get(`${environment.apiUrl}/api/protected`).subscribe({ error: () => originalFailed = true });
    http.expectOne(`${environment.apiUrl}/api/protected`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const pendingRefresh = http.expectOne(`${environment.apiUrl}/auth/refresh`);

    auth.logout().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/logout`).flush({ message: 'ok' });
    pendingRefresh.flush(response('late-access', 'late-refresh'));

    expect(originalFailed).toBe(true);
    expect(auth.currentUser()).toBeNull();
    expect(auth.getAccessToken()).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    http.expectNone(`${environment.apiUrl}/api/protected`);
  });

  it('no permite que una renovación pendiente reemplace una cuenta iniciada después', () => {
    let oldRequestFailed = false;
    client.get(`${environment.apiUrl}/api/protected`).subscribe({ error: () => oldRequestFailed = true });
    http.expectOne(`${environment.apiUrl}/api/protected`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const pendingRefresh = http.expectOne(`${environment.apiUrl}/auth/refresh`);

    let loginCompleted = false;
    auth.login({ email: 'b@example.test', password: 'test-only' }).subscribe(() => loginCompleted = true);
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(response('user-b-access', 'user-b-refresh', {
      ...user, id: 'user-b', email: 'b@example.test',
    }));

    let newRequestCompleted = false;
    client.get(`${environment.apiUrl}/api/new-account`).subscribe(() => newRequestCompleted = true);
    http.expectOne(`${environment.apiUrl}/api/new-account`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const newAccountRefresh = http.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(newAccountRefresh.request.body).toEqual({ refreshToken: 'user-b-refresh' });
    newAccountRefresh.flush(response('user-b-access-renewed', 'user-b-refresh-renewed', {
      ...user, id: 'user-b', email: 'b@example.test',
    }));
    const newAccountRetry = http.expectOne(`${environment.apiUrl}/api/new-account`);
    expect(newAccountRetry.request.headers.get('Authorization')).toBe('Bearer user-b-access-renewed');
    newAccountRetry.flush({ ok: true });

    pendingRefresh.flush(response('late-access', 'late-refresh'));

    expect(loginCompleted).toBe(true);
    expect(oldRequestFailed).toBe(true);
    expect(newRequestCompleted).toBe(true);
    expect(auth.currentUser()?.id).toBe('user-b');
    expect(auth.getAccessToken()).toBe('user-b-access-renewed');
    expect(localStorage.getItem('refreshToken')).toBe('user-b-refresh-renewed');
    http.expectNone(`${environment.apiUrl}/api/protected`);
  });
});
