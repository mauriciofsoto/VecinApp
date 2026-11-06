export type RolEmisorPaquete =
  | 'administracion'
  | 'porteria'
  | 'residente';

export interface MensajePaquete {
  id: number;
  paqueteId: number;
  emisorId: number;
  emisorNombre: string;
  rolEmisor: RolEmisorPaquete;
  contenido: string;
  fechaEnvio: string;
}

export type CrearMensajePaquete = Omit<
  MensajePaquete,
  'id' | 'fechaEnvio'
>;