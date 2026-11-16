export type EstadoPaquete = 'Pendiente' | 'Entregado' | 'Confirmado';

/** Contrato de PaqueteDto. Los IDs de Identity son strings. */
export interface Paquete {
  id: number;
  identificacion: string;
  remitente: string;
  idUsuarioDestinatario: string;
  nombreDestinatario: string;
  apellidoDestinatario: string;
  estado: EstadoPaquete;
  fechaRecepcion: string;
  fechaEntrega: string | null;
  fechaConfirmacion: string | null;
  observaciones: string | null;
}

/** Contrato de RegistrarPaqueteRequest. */
export interface CrearPaquete {
  idUsuarioDestinatario: string;
  remitente: string;
  identificacion: string;
  observaciones?: string | null;
}
