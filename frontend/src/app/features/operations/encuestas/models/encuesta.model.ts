export type EstadoEncuesta = 'en-proceso' | 'cerrada';

export interface OpcionEncuesta {
  id: string;
  texto: string;
  votos: number;
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
  votosPorOpcion: OpcionEncuesta[];
  yaVote: boolean;
  miOpcionId: string | null;
}

export interface CrearEncuestaData {
  titulo: string;
  descripcion: string;
  opciones: string[];
  comentariosActivos: boolean;
  prioritaria: boolean;
  fechaLimite?: string;
}

export interface EncuestaApiResponse {
  id: number;
  idPublicacion: number;
  titulo: string;
  descripcion: string;
  opciones: Array<{ id: number; texto: string; votos: number }>;
  votacionActiva: boolean;
  comentariosActivos: boolean;
  prioritaria: boolean;
  fechaLimite: string;
  fechaPublicacion: string;
  estado: EstadoEncuesta;
  totalVotos: number;
  yaVote: boolean;
  miOpcionId: number | null;
}

export interface VotanteEncuesta {
  nombre: string;
  opcion: string;
  fechaVoto: string;
}

export interface EncuestaVotantesResponse {
  encuestaId: number;
  titulo: string;
  estado: EstadoEncuesta;
  fechaLimite: string;
  totalVotos: number;
  votantes: VotanteEncuesta[];
}
