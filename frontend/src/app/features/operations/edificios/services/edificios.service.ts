import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { Edificio, EdificioRequest, EstadoEdificio } from '../models/edificio';

@Injectable({ providedIn: 'root' })
export class EdificiosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/edificios`;

  obtenerEdificios(): Observable<Edificio[]> {
    return this.http.get<Edificio[]>(this.apiUrl);
  }

  obtenerEdificio(id: number): Observable<Edificio> {
    return this.http.get<Edificio>(`${this.apiUrl}/${id}`);
  }

  crearEdificio(request: EdificioRequest): Observable<Edificio> {
    return this.http.post<Edificio>(this.apiUrl, request);
  }

  actualizarEdificio(id: number, request: EdificioRequest): Observable<Edificio> {
    return this.http.put<Edificio>(`${this.apiUrl}/${id}`, request);
  }

  cambiarEstado(id: number, estado: EstadoEdificio): Observable<Edificio> {
    return this.http.patch<Edificio>(`${this.apiUrl}/${id}/estado`, { estado });
  }
}
