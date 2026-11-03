
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CodigoInvitacionResponse {
  message: string;
  codigo: string;
  fechaExpiracion: string;
  usosMaximos: number;
}

@Injectable({ providedIn: 'root' })
export class CodigosInvitacionService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:5062/api/codigos-invitacion';

  crearInvitacionInquilino(diasValidez: number = 7): Observable<CodigoInvitacionResponse> {
    return this.http.post<CodigoInvitacionResponse>(
      `${this.API_URL}/inquilino`,
      { diasValidez }
    );
  }
}
