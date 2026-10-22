export type EstadoEncuesta = 'en-proceso' | 'cerrada';

export interface EncuestaAdmin {
  id: number;
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
}