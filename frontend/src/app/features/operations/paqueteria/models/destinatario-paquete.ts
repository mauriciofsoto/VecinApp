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
