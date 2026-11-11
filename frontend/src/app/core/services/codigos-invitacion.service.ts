
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CodigoInvitacionResponse {
  message: string;
  codigo: string;
  fechaExpiracion: string;
  usosMaximos: number;
  idEdificio?: number;
}

@Injectable({ providedIn: 'root' })
export class CodigosInvitacionService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/codigos-invitacion`;

  crearInvitacionInquilino(diasValidez: number = 7): Observable<CodigoInvitacionResponse> {
    return this.http.post<CodigoInvitacionResponse>(
      `${this.apiUrl}/inquilino`,
      { diasValidez }
    );
  }
}
