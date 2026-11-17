import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService as SessionAuthService } from './auth';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
  devToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthPasswordService {
  private readonly sessionAuth = inject(SessionAuthService);

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.sessionAuth.forgotPassword(email);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<MessageResponse> {
    return this.sessionAuth.resetPassword(payload);
  }
}

// Compatibilidad para consumidores antiguos: la identidad y los tokens ahora
// pertenecen exclusivamente a core/services/auth.ts.
export { AuthPasswordService as AuthService };
