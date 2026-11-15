
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CodigoInvitacionResponse {
  message: string;
  codigo: string;
  rol?: string;
  idEdificio?: number;
  fechaExpiracion: string;
  usosMaximos: number;
}

export interface CrearInvitacionRequest {
  rol: string;
  idEdificio?: number;
  diasValidez?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CodigosInvitacionService {
  private readonly http = inject(HttpClient);

  private readonly API_URL =
    `${environment.apiUrl}/api/codigos-invitacion`;

  crearInvitacion(
    payload: CrearInvitacionRequest
  ): Observable<CodigoInvitacionResponse> {
    return this.http.post<CodigoInvitacionResponse>(
      this.API_URL,
      {
        rol: payload.rol,
        idEdificio: payload.idEdificio,
        diasValidez: payload.diasValidez ?? 7,
      }
    );
  }
}
