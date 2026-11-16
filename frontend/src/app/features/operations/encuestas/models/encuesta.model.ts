
export type EstadoEncuesta = 'en-proceso' | 'cerrada';

export interface OpcionEncuesta {
  id: string;
  texto: string;
  votos: number;
}

export interface VotoEncuesta {
  encuestaId: number;
  usuarioId: string;
  opcionId: string;
  fechaVoto: string;
}

export interface EncuestaAdmin {
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
  estado: EstadoEncuesta;
  totalVotos: number;
  votos?: VotoEncuesta[];
  votosPorOpcion?: OpcionEncuesta[];
  miVoto?: string | null;
}
