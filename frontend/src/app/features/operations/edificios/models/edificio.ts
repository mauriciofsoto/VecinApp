export interface Edificio {
  idEdificio: number;
  accesoPublicoId: string;
  nombre: string;
  direccion: string;
  localidad: string;
  provincia: string;
  estado: 'Activo' | 'Inactivo';
}

export interface EdificioRequest {
  nombre: string;
  direccion: string;
  localidad: string;
  provincia: string;
}

export type EstadoEdificio = Edificio['estado'];
