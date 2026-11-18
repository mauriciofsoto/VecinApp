export interface UnidadDeclaradaPaquete {
  pisoDeclarado: string | null;
  identificacionDeclarada: string | null;
  estadoConfirmacion: string;
}

export interface DestinatarioPaquete {
  id: string;
  nombre: string;
  apellido: string;
  unidadesDeclaradas: UnidadDeclaradaPaquete[];
}

export interface UnidadDestinatarioPaquete {
  id: number;
  piso: string;
  identificacion: string;
  residentes: ResidenteUnidadPaquete[];
}

export interface ResidenteUnidadPaquete {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}
