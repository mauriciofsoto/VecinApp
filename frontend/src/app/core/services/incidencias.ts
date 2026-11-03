import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EstadoIncidencia {
  idEstadoIncidencia: number;
  nombre: string;
}

export interface DetalleIncidencia {
  idIncidencia: number;
  titulo: string;
  descripcion: string;
  prioridad: string;
  fechaCreacion: string;
  idEstadoIncidencia: number;
  estado: string;
  idCategoriaIncidencia: number;
  categoria: string;
  reportante: string;
  responsable: string | null;
}

export interface CambiarEstadoRequest {
  idEstadoIncidencia: number;
}

@Injectable({
  providedIn: 'root'
})
export class Incidencias {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:5062/api/incidencias';

  obtenerDetalle(id: number): Observable<DetalleIncidencia> {
    return this.http.get<DetalleIncidencia>(
      `${this.apiUrl}/${id}`
    );
  }

  listarEstados(): Observable<EstadoIncidencia[]> {
    return this.http.get<EstadoIncidencia[]>(
      `${this.apiUrl}/estados`
    );
  }

  cambiarEstado(
    id: number,
    idEstadoIncidencia: number
  ): Observable<any> {
    const request: CambiarEstadoRequest = {
      idEstadoIncidencia
    };

    return this.http.put(
      `${this.apiUrl}/${id}/estado`,
      request
    );
  }
}
