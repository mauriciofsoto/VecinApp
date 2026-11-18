
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface Unidad {
  idUnidad: number;
  piso: string;
  identificacion: string;
}

export interface CrearUnidadRequest {
  piso: string;
  identificacion: string;
}

@Injectable({ providedIn: 'root' })
export class Unidades {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/unidades`;

  obtenerUnidades(): Observable<Unidad[]> {
    return this.http.get<Unidad[]>(this.apiUrl);
  }

  crearUnidad(datos: CrearUnidadRequest): Observable<Unidad> {
    return this.http.post<Unidad>(this.apiUrl, datos);
  }
}
