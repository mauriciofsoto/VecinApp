/** Contrato de MensajePaqueteDto, asociado al paquete por la pantalla. */
export interface MensajePaquete {
  id: number;
  paqueteId: number;
  nombreEmisor: string;
  apellidoEmisor: string;
  contenido: string;
  fechaEnvio: string;
  propio?: boolean;
}

/** El backend deriva emisor, identidad y rol desde la sesión. */
export interface CrearMensajePaquete {
  contenido: string;
}
