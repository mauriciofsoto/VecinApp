import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SolicitudVinculacion } from '../models/perfil-usuario';

@Injectable({ providedIn: 'root' })
export class VinculacionesPerfilService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/vinculaciones`;

  solicitudes(id?: number): Observable<SolicitudVinculacion[]> {
    const params = id === undefined ? undefined : new HttpParams().set('id', id);
    return this.http.get<SolicitudVinculacion[]>(`${this.apiUrl}/solicitudes`, { params });
  }

  responder(id: number, acepta: boolean, motivo: string | null): Observable<{ estado: string; mensaje: string }> {
    return this.http.post<{ estado: string; mensaje: string }>(`${this.apiUrl}/solicitudes/${id}/respuesta`, { acepta, motivo });
  }
}
