
export type EstadoEncuesta = 'en-proceso' | 'cerrada';

export interface OpcionEncuesta {
  id: string;
  texto: string;
  votos: number;
}

export interface VotoEncuesta {
  encuestaId: number;
  usuarioId: number;
  opcionId: string;
  fechaVoto: string;
}

export interface EncuestaAdmin {
  id: number;
  titulo: string;
  descripcion: string;

  // Conservamos opciones como string[] para no romper
  // el formulario de creación que ya tenés.
  opciones: string[];

  votacionActiva: boolean;
  comentariosActivos: boolean;
  prioritaria: boolean;

  fechaLimite: string;
  fechaPublicacion: string;

  estado: EstadoEncuesta;
  totalVotos: number;

  // Nuevos datos para registrar y consultar los votos.
  votos?: VotoEncuesta[];
  votosPorOpcion?: OpcionEncuesta[];
}
