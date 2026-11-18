
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccesoQrEdificioResponse {
  idEdificio: number;
  nombreEdificio: string;
  direccionEdificio: string;
  identificadorPublico: string;
}

export interface TokenAccesoComunidadResponse {
  token: string;
  fechaExpiracion: string;
}

@Injectable({ providedIn: 'root' })
export class CodigosInvitacionService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/codigos-invitacion`;

  obtenerQrComunidad(): Observable<AccesoQrEdificioResponse> {
    return this.http.get<AccesoQrEdificioResponse>(`${this.apiUrl}/mi-qr-comunidad`);
  }

  resolverAccesoComunidad(identificadorPublico: string): Observable<TokenAccesoComunidadResponse> {
    return this.http.post<TokenAccesoComunidadResponse>(
      `${this.apiUrl}/comunidad/${encodeURIComponent(identificadorPublico)}/token`,
      {},
    );
  }

}
