
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, filter, finalize, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, MessageResponse, RegistroAdministradorRequest, RegistroComunitarioRequest } from '../models/auth';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<User | null>(this.getStoredUser());
  private readonly accessTokenState = signal<string | null>(
    this.currentUser() ? localStorage.getItem('accessToken') : null,
  );
  readonly sessionVersion = signal(0);
  private loginRequestVersion = 0;
  private readonly refreshRequests = new Map<string, Observable<AuthResponse>>();

  constructor(private readonly http: HttpClient) {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorageChange);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    const requestVersion = ++this.loginRequestVersion;
    const sessionVersion = this.sessionVersion();
    const storageRevision = localStorage.getItem('authSessionRevision');
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        filter(() => requestVersion === this.loginRequestVersion
          && sessionVersion === this.sessionVersion()
          && storageRevision === localStorage.getItem('authSessionRevision')),
        tap(response => this.saveSession(response)),
      );
  }

  registrarAdministrador(request: RegistroAdministradorRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/registro-administrador`, request);
  }

  registrarComunidad(request: RegistroComunitarioRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/registro-comunidad`, request);
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(payload: { email: string; token: string; newPassword: string }): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/reset-password`, payload);
  }

  refresh(): Observable<AuthResponse> {
    const session = this.captureSession();
    const refreshToken = localStorage.getItem('refreshToken');
    const requestKey = JSON.stringify([session.userId, session.version, refreshToken]);
    const ongoing = this.refreshRequests.get(requestKey);
    if (ongoing) return ongoing;

    if (!refreshToken) {
      if (this.currentUser()) this.clearSession();
      return throwError(() => new Error('No hay un refresh token disponible.'));
    }

    let sharedRequest$: Observable<AuthResponse>;
    sharedRequest$ = this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap(response => {
          if (!this.isCurrentSession(session)
            || refreshToken !== localStorage.getItem('refreshToken')) return;
          if (response.user.id !== session.userId) {
            this.clearSession();
            throw new Error('La identidad renovada no coincide con la sesión actual.');
          }
          // Renovar credenciales no es un cambio de cuenta: conservamos sessionVersion
          // para que las solicitudes paralelas de esta sesión puedan reintentarse.
          this.saveSession(response, false);
        }),
        catchError(error => {
          const invalidRefresh = error?.status === 400
            || error?.status === 401
            || error?.status === 403;
          if (invalidRefresh
            && this.isCurrentSession(session)
            && refreshToken === localStorage.getItem('refreshToken')) {
            this.clearSession();
          }
          return throwError(() => error);
        }),
        finalize(() => {
          if (this.refreshRequests.get(requestKey) === sharedRequest$) {
            this.refreshRequests.delete(requestKey);
          }
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.refreshRequests.set(requestKey, sharedRequest$);
    return sharedRequest$;
  }

  logout(): Observable<unknown> {
    const refreshToken = localStorage.getItem('refreshToken');
    this.clearSession();

    if (!refreshToken) return new Observable(subscriber => {
      subscriber.next(null);
      subscriber.complete();
    });

    return this.http.post(`${this.apiUrl}/logout`, { refreshToken });
  }

  getAccessToken(): string | null {
    return this.accessTokenState();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.currentUser();
  }

  hasRole(...roles: string[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.rol);
  }

  clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.currentUser.set(null);
    this.accessTokenState.set(null);
    this.publishSessionChange();
  }

  private saveSession(response: AuthResponse, newSession = true): void {
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    this.currentUser.set(response.user);
    this.accessTokenState.set(response.accessToken);
    this.publishSessionChange(newSession);
  }

  private getStoredUser(): User | null {
    if (!localStorage.getItem('accessToken')) return null;
    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      localStorage.removeItem('currentUser');
      return null;
    }
  }

  captureSession(): { userId: string | null; version: number } {
    return { userId: this.currentUser()?.id ?? null, version: this.sessionVersion() };
  }

  isCurrentSession(session: { userId: string | null; version: number }): boolean {
    return session.userId !== null
      && session.version === this.sessionVersion()
      && session.userId === (this.currentUser()?.id ?? null);
  }

  private readonly onStorageChange = (event: StorageEvent): void => {
    if (event.storageArea !== localStorage) return;
    if (event.key !== 'authSessionRevision' && event.key !== null) return;
    this.syncStoredSession();
  };

  private syncStoredSession(): void {
    const user = this.getStoredUser();
    if (!user) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
    }
    this.currentUser.set(user);
    this.accessTokenState.set(user ? localStorage.getItem('accessToken') : null);
    this.sessionVersion.update(version => version + 1);
  }

  private publishSessionChange(incrementVersion = true): void {
    const storedRevision = Number((localStorage.getItem('authSessionRevision') ?? '0').split(':')[0]);
    const revision = (Number.isFinite(storedRevision) ? storedRevision : 0) + 1;
    localStorage.setItem('authSessionRevision', `${revision}:${Date.now()}:${Math.random().toString(36).slice(2)}`);
    if (incrementVersion) this.sessionVersion.update(version => version + 1);
  }
}
