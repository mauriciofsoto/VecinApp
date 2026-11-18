
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccesoQrEdificioResponse {
  identificadorPublico: string;
}

export interface TokenAccesoComunidadResponse {
  token: string;
  fechaExpiracion: string;
}

export interface CodigoInvitacionAdministradorResponse {
  codigo: string;
  idEdificio: number;
  fechaExpiracion: string;
  usosMaximos: number;
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

  crearCodigoAdministrador(idEdificio: number, diasValidez = 7): Observable<CodigoInvitacionAdministradorResponse> {
    return this.http.post<CodigoInvitacionAdministradorResponse>(
      `${this.apiUrl}/administrador`,
      { idEdificio, diasValidez },
    );
  }

}
