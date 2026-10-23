
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<User | null>(this.getStoredUser());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(tap((response) => this.saveSession(response)));
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No hay un refresh token disponible.');
    }

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(tap((response) => this.saveSession(response)));
  }

  logout(): Observable<unknown> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      this.clearSession();
      return new Observable((subscriber) => {
        subscriber.next(null);
        subscriber.complete();
      });
    }

    return this.http
      .post(`${this.apiUrl}/logout`, { refreshToken })
      .pipe(tap(() => this.clearSession()));
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
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
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    this.currentUser.set(response.user);
  }

  private getStoredUser(): User | null {
    const storedUser = localStorage.getItem('currentUser');

    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      localStorage.removeItem('currentUser');
      return null;
    }
  }

  constructor(private readonly http: HttpClient) {}
}
