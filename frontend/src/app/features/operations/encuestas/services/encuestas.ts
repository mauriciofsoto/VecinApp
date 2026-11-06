
import { Injectable, signal } from '@angular/core';
import {
  EncuestaAdmin,
  VotoEncuesta,
} from '../models/encuesta.model';

@Injectable({
  providedIn: 'root',
})
export class EncuestasService {
  private readonly encuestasState = signal<EncuestaAdmin[]>([]);

  readonly encuestas = this.encuestasState.asReadonly();

  publicar(encuesta: EncuestaAdmin): void {
    const encuestaPreparada: EncuestaAdmin = {
      ...encuesta,
      totalVotos: 0,
      votos: [],
      votosPorOpcion: encuesta.opciones.map((texto, index) => ({
        id: String(index),
        texto,
        votos: 0,
      })),
    };

    this.encuestasState.update(actuales => [
      encuestaPreparada,
      ...actuales,
    ]);
  }

  cerrar(id: number): void {
    this.encuestasState.update(actuales =>
      actuales.map(encuesta =>
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

  registrarVoto(
    encuestaId: number,
    usuarioId: number,
    opcionId: string,
  ): boolean {
    let votoRegistrado = false;

    this.encuestasState.update(actuales =>
      actuales.map(encuesta => {
        if (encuesta.id !== encuestaId) {
          return encuesta;
        }

        // No se puede votar en una encuesta cerrada.
        if (
          encuesta.estado !== 'en-proceso' ||
          !encuesta.votacionActiva
        ) {
          return encuesta;
        }

        const votos = encuesta.votos ?? [];

        // Evita que el mismo usuario vote más de una vez.
        const yaVoto = votos.some(
          voto => voto.usuarioId === usuarioId,
        );

        if (yaVoto) {
          return encuesta;
        }

        const opcionExiste = encuesta.opciones.some(
          (_, index) => String(index) === opcionId,
        );

        if (!opcionExiste) {
          return encuesta;
        }

        const nuevoVoto: VotoEncuesta = {
          encuestaId,
          usuarioId,
          opcionId,
          fechaVoto: new Date().toISOString(),
        };

        const votosPorOpcion = (
          encuesta.votosPorOpcion ??
          encuesta.opciones.map((texto, index) => ({
            id: String(index),
            texto,
            votos: 0,
          }))
        ).map(opcion =>
          opcion.id === opcionId
            ? {
                ...opcion,
                votos: opcion.votos + 1,
              }
            : opcion,
        );

        votoRegistrado = true;

        return {
          ...encuesta,
          votos: [...votos, nuevoVoto],
          votosPorOpcion,
          totalVotos: encuesta.totalVotos + 1,
        };
      }),
    );

    return votoRegistrado;
  }

  obtenerVotoUsuario(
    encuestaId: number,
    usuarioId: number,
  ): VotoEncuesta | undefined {
    const encuesta = this.encuestasState().find(
      item => item.id === encuestaId,
    );

    return encuesta?.votos?.find(
      voto => voto.usuarioId === usuarioId,
    );
  }
}
