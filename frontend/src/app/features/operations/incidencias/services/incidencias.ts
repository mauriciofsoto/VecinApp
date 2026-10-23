
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Incidencia,
  CrearIncidenciaRequest,
  CambiarEstadoIncidenciaRequest,
  CategoriaIncidencia,
  EstadoIncidencia
} from '../models/incidencia';

export type { EstadoIncidencia } from '../models/incidencia';

export interface DetalleIncidencia extends Incidencia {
  idEstadoIncidencia: number;
  idCategoriaIncidencia: number;
}

@Injectable({
  providedIn: 'root',
})
export class Incidencias {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5062/api/incidencias';

  listar(): Observable<Incidencia[]> {
    return this.http.get<Incidencia[]>(this.apiUrl);
  }

  listarMisIncidencias(): Observable<Incidencia[]> {
    return this.http.get<Incidencia[]>(
      `${this.apiUrl}/mis-incidencias`
    );
  }

  obtenerDetalle(id: number): Observable<DetalleIncidencia> {
    return this.http.get<DetalleIncidencia>(`${this.apiUrl}/${id}`);
  }

  crear(request: CrearIncidenciaRequest): Observable<any> {
    return this.http.post(this.apiUrl, request);
  }

  cambiarEstado(
    id: number,
    request: CambiarEstadoIncidenciaRequest
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/estado`, request);
  }

  listarCategorias(): Observable<CategoriaIncidencia[]> {
    return this.http.get<CategoriaIncidencia[]>(`${this.apiUrl}/categorias`);
  }

  listarEstados(): Observable<EstadoIncidencia[]> {
    return this.http.get<EstadoIncidencia[]>(`${this.apiUrl}/estados`);
  }
}
