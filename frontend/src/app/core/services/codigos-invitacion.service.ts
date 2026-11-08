
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CodigoInvitacionResponse {
  message: string;
  codigo: string;
  fechaExpiracion: string;
  usosMaximos: number;
}

@Injectable({ providedIn: 'root' })
export class CodigosInvitacionService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/codigos-invitacion`;

  crearInvitacionInquilino(diasValidez: number = 7): Observable<CodigoInvitacionResponse> {
    return this.http.post<CodigoInvitacionResponse>(
      `${this.API_URL}/inquilino`,
      { diasValidez }
    );
  }

  crearInvitacion(payload: {
    rol: string;
    idEdificio?: number;
    diasValidez?: number;
  }): Observable<CodigoInvitacionResponse> {
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
