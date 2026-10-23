export type EstadoPaquete = 'pendiente' | 'entregado';

export interface Paquete {
  id: number;
  destinatarioId: number;
  destinatarioNombre: string;
  edificioId: number;
  edificioNombre: string;
  descripcion: string;
  remitente: string;
  fechaRecepcion: string;
  estado: EstadoPaquete;
  fechaEntrega?: string;
}