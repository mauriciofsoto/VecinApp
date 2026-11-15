
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuarioEdificio } from '../models/usuario-edificio';

export type EstadoUsuarioEdificio = 'Activo' | 'Desactivado';

export interface CambiarEstadoUsuarioResponse {
  message: string;
  id: string;
  estado: EstadoUsuarioEdificio;
}

@Injectable({
  providedIn: 'root',
})
export class UsuariosEdificioService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/usuarios`;

  obtenerPorEdificio(idEdificio?: number): Observable<UsuarioEdificio[]> {
    let params = new HttpParams();

    if (idEdificio !== undefined) {
      params = params.set('idEdificio', idEdificio);
    }

    return this.http.get<UsuarioEdificio[]>(
      `${this.API_URL}/edificio`,
      { params },
    );
  }

  cambiarEstado(
    id: string,
    estado: EstadoUsuarioEdificio,
  ): Observable<CambiarEstadoUsuarioResponse> {
    return this.http.patch<CambiarEstadoUsuarioResponse>(
      `${this.API_URL}/${id}/estado`,
      { estado },
    );
  }
}
