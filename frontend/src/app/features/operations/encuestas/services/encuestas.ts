import { HttpClient } from '@angular/common/http';
import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth';
import {
  CrearEncuestaData,
  EncuestaAdmin,
  EncuestaApiResponse,
  EncuestaVotantesResponse,
} from '../models/encuesta.model';

@Injectable({ providedIn: 'root' })
export class EncuestasService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/encuestas`;
  private readonly encuestasState = signal<EncuestaAdmin[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private userIdActivo: string | null = this.authService.currentUser()?.id ?? null;
  private versionSesion = 0;

  constructor() {
    effect(() => {
      this.sincronizarSesion(this.authService.currentUser()?.id ?? null);
    });
  }

  readonly encuestas = computed(() =>
    this.authService.currentUser()?.id === this.userIdActivo ? this.encuestasState() : [],
  );
  readonly loading = computed(() =>
    this.authService.currentUser()?.id === this.userIdActivo ? this.loadingState() : false,
  );
  readonly error = computed(() =>
    this.authService.currentUser()?.id === this.userIdActivo ? this.errorState() : null,
  );

  cargar(): void {
    const sesion = this.capturarSesion();
    if (sesion.userId === null) {
      this.encuestasState.set([]);
      this.loadingState.set(false);
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);
    this.http.get<EncuestaApiResponse[]>(this.apiUrl).subscribe({
      next: respuestas => {
        if (!this.esMismaSesion(sesion)) return;
        this.encuestasState.set(respuestas.map(respuesta => this.mapear(respuesta)));
        this.loadingState.set(false);
      },
      error: () => {
        if (!this.esMismaSesion(sesion)) return;
        this.errorState.set('No se pudieron cargar las encuestas.');
        this.loadingState.set(false);
      },
    });
  }

  publicar(data: CrearEncuestaData): Observable<EncuestaAdmin> {
    const sesion = this.capturarSesion();
    this.errorState.set(null);
    return this.http.post<EncuestaApiResponse>(this.apiUrl, data).pipe(
      map(respuesta => {
        const encuesta = this.mapear(respuesta);
        if (this.esMismaSesion(sesion)) {
          this.encuestasState.update(actuales => [
            encuesta,
            ...actuales.filter(item => item.id !== encuesta.id),
          ]);
        }
        return encuesta;
      }),
      catchError(error => this.manejarError(error, 'No se pudo publicar la encuesta.', sesion)),
    );
  }

  cerrar(id: number): Observable<void> {
    const sesion = this.capturarSesion();
    this.errorState.set(null);
    return this.http.patch<void>(`${this.apiUrl}/${id}/cerrar`, {}).pipe(
      tap(() => {
        if (this.esMismaSesion(sesion)) {
          this.encuestasState.update(actuales => actuales.map(encuesta =>
            encuesta.id === id
              ? { ...encuesta, estado: 'cerrada', votacionActiva: false }
              : encuesta,
          ));
        }
      }),
      catchError(error => this.manejarError(error, 'No se pudo cerrar la encuesta.', sesion)),
    );
  }

  registrarVoto(encuestaId: number, opcionId: string): Observable<EncuestaAdmin> {
    const sesion = this.capturarSesion();
    this.errorState.set(null);
    return this.http.post<EncuestaApiResponse>(
      `${this.apiUrl}/${encuestaId}/votos`,
      { idOpcion: Number(opcionId) },
    ).pipe(
      map(respuesta => {
        const encuesta = this.mapear(respuesta);
        if (this.esMismaSesion(sesion)) {
          this.encuestasState.update(actuales => actuales.map(item =>
            item.id === encuesta.id ? encuesta : item,
          ));
        }
        return encuesta;
      }),
      catchError(error => this.manejarError(error, 'No se pudo registrar el voto.', sesion)),
    );
  }

  obtenerVotantes(encuestaId: number): Observable<EncuestaVotantesResponse> {
    return this.http.get<EncuestaVotantesResponse>(`${this.apiUrl}/${encuestaId}/votantes`);
  }

  private mapear(respuesta: EncuestaApiResponse): EncuestaAdmin {
    const votosPorOpcion = respuesta.opciones.map(opcion => ({
      id: String(opcion.id),
      texto: opcion.texto,
      votos: opcion.votos,
    }));
    return {
      ...respuesta,
      opciones: votosPorOpcion.map(opcion => opcion.texto),
      votosPorOpcion,
      miOpcionId: respuesta.miOpcionId === null ? null : String(respuesta.miOpcionId),
    };
  }

  private capturarSesion(): { userId: string | null; version: number } {
    const userId = this.authService.currentUser()?.id ?? null;
    this.sincronizarSesion(userId);
    return { userId, version: this.versionSesion };
  }

  private esMismaSesion(sesion: { userId: string | null; version: number }): boolean {
    return sesion.userId !== null
      && this.versionSesion === sesion.version
      && (this.authService.currentUser()?.id ?? null) === sesion.userId;
  }

  private sincronizarSesion(userId: string | null): void {
    if (userId === this.userIdActivo) return;

    this.userIdActivo = userId;
    this.versionSesion++;
    this.encuestasState.set([]);
    this.loadingState.set(false);
    this.errorState.set(null);
  }

  private manejarError(
    error: unknown,
    mensaje: string,
    sesion: { userId: string | null; version: number },
  ): Observable<never> {
    if (this.esMismaSesion(sesion)) this.errorState.set(mensaje);
    return throwError(() => error);
  }
}
