export type RolEmisorMensaje = 'usuario' | 'administrador';

export interface MensajeIncidencia {
  id: number;
  incidenciaId: number;
  emisorId: string;
  emisorNombre: string;
  rolEmisor: RolEmisorMensaje;
  contenido: string;
  fechaCreacion: string;
  adjuntos: File[];
}
