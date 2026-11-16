import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActualizarPerfilRequest, DeclaracionVinculacionRequest, PerfilUsuario } from '../models/perfil-usuario';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/usuarios`;

  obtenerMiPerfil(): Observable<PerfilUsuario> {
    return this.http.get<PerfilUsuario>(`${this.apiUrl}/me/perfil`);
  }

  actualizarMiPerfil(request: ActualizarPerfilRequest): Observable<PerfilUsuario> {
    return this.http.put<PerfilUsuario>(`${this.apiUrl}/me/perfil`, request);
  }

  actualizarDeclaracion(request: DeclaracionVinculacionRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${environment.apiUrl}/api/vinculaciones/declaraciones`, request);
  }
}
