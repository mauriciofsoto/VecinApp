
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { EncuestaAdmin } from '../models/encuesta.model';

interface EncuestaApiResponse {
  id: number;
  idPublicacion: number;
  titulo: string;
  descripcion: string;
  opciones: string[];
  votacionActiva: boolean;
  comentariosActivos: boolean;
  prioritaria: boolean;
  fechaLimite: string;
  fechaPublicacion: string;
  estado: 'en-proceso' | 'cerrada';
  totalVotos: number;
  votosPorOpcion: {
    id: number;
    texto: string;
    votos: number;
  }[];
  miVoto: number | null;
}

interface CrearEncuestaRequest {
  titulo: string;
  descripcion: string;
  opciones: string[];
  fechaFin: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class EncuestasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly encuestasState = signal<EncuestaAdmin[]>([]);

  readonly encuestas = this.encuestasState.asReadonly();

  // GET /encuestas
  cargar(): void {
    this.http
      .get<EncuestaApiResponse[]>(`${this.apiUrl}/encuestas`)
      .subscribe({
        next: respuestas => {
          this.encuestasState.set(
            respuestas.map(respuesta => this.mapearEncuesta(respuesta)),
          );
        },
        error: error => {
          console.error('Error al cargar las encuestas:', error);
        },
      });
  }

  // POST /encuestas
  publicar(
    encuesta: CrearEncuestaRequest,
  ): Observable<EncuestaAdmin> {
    return this.http
      .post<EncuestaApiResponse>(
        `${this.apiUrl}/encuestas`,
        encuesta,
      )
      .pipe(
        map(respuesta => this.mapearEncuesta(respuesta)),
        tap(nuevaEncuesta => {
          this.encuestasState.update(actuales => [
            nuevaEncuesta,
            ...actuales.filter(e => e.id !== nuevaEncuesta.id),
          ]);
        }),
      );
  }

  // POST /encuestas/{id}/votar
  registrarVoto(
    encuestaId: number,
    opcionId: string,
  ): Observable<void> {
    return this.http
      .post<void>(
        `${this.apiUrl}/encuestas/${encuestaId}/votar`,
        { idOpcion: Number(opcionId) },
      )
      .pipe(
        tap(() => this.cargar()),
        map(() => undefined),
      );
  }

  // PATCH /encuestas/{id}/cerrar
  cerrar(id: number): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/encuestas/${id}/cerrar`, {})
      .pipe(
        tap(() => this.cargar()),
        map(() => undefined),
      );
  }

  obtenerVotoUsuario(encuestaId: number): string | null {
    const encuesta = this.encuestasState().find(
      item => item.id === encuestaId,
    );

    return encuesta?.miVoto ?? null;
  }

  private mapearEncuesta(
    respuesta: EncuestaApiResponse,
  ): EncuestaAdmin {
    return {
      id: respuesta.id,
      idPublicacion: respuesta.idPublicacion,
      titulo: respuesta.titulo,
      descripcion: respuesta.descripcion,
      opciones: respuesta.opciones,
      votacionActiva: respuesta.votacionActiva,
      comentariosActivos: respuesta.comentariosActivos,
      prioritaria: respuesta.prioritaria,
      fechaLimite: respuesta.fechaLimite,
      fechaPublicacion: respuesta.fechaPublicacion,
      estado: respuesta.estado,
      totalVotos: respuesta.totalVotos,
      votosPorOpcion: respuesta.votosPorOpcion.map(opcion => ({
        id: String(opcion.id),
        texto: opcion.texto,
        votos: opcion.votos,
      })),
      miVoto: respuesta.miVoto !== null
        ? String(respuesta.miVoto)
        : null,
    };
  }
}
