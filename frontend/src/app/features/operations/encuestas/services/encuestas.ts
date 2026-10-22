
import { Injectable, signal } from '@angular/core';
import { EncuestaAdmin } from '../models/encuesta.model';

@Injectable({
  providedIn: 'root',
})
export class EncuestasService {
  private readonly encuestasState = signal<EncuestaAdmin[]>([]);

  readonly encuestas = this.encuestasState.asReadonly();

  publicar(encuesta: EncuestaAdmin): void {
    this.encuestasState.update((actuales) => [
      encuesta,
      ...actuales,
    ]);
  }

  cerrar(id: number): void {
    this.encuestasState.update((actuales) =>
      actuales.map((encuesta) =>
        encuesta.id === id
          ? {
              ...encuesta,
              estado: 'cerrada',
              votacionActiva: false,
            }
          : encuesta,
      ),
    );
  }

  registrarVoto(id: number): void {
    this.encuestasState.update((actuales) =>
      actuales.map((encuesta) =>
        encuesta.id === id
          ? {
              ...encuesta,
              totalVotos: encuesta.totalVotos + 1,
            }
          : encuesta,
      ),
    );
  }
}
