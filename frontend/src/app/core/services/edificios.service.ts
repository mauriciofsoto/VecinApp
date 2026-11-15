
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Edificio } from '../models/edificio';

export interface EdificioRequest {
  nombre: string;
  direccion: string;
}

export interface CambiarEstadoEdificioResponse {
  idEdificio: number;
  estado: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class EdificiosService {
  private readonly http = inject(HttpClient);

  private readonly API_URL = `${environment.apiUrl}/api/edificios`;

  obtenerEdificios(): Observable<Edificio[]> {
    return this.http.get<Edificio[]>(this.API_URL);
  }

  obtenerEdificio(id: number): Observable<Edificio> {
    return this.http.get<Edificio>(`${this.API_URL}/${id}`);
  }

  crearEdificio(request: EdificioRequest): Observable<Edificio> {
    return this.http.post<Edificio>(this.API_URL, request);
  }

  actualizarEdificio(
    id: number,
    request: EdificioRequest,
  ): Observable<Edificio> {
    return this.http.put<Edificio>(`${this.API_URL}/${id}`, request);
  }

  cambiarEstado(
    id: number,
    estado: 'Activo' | 'Inactivo',
  ): Observable<CambiarEstadoEdificioResponse> {
    return this.http.patch<CambiarEstadoEdificioResponse>(
      `${this.API_URL}/${id}/estado`,
      { estado },
    );
  }
}
