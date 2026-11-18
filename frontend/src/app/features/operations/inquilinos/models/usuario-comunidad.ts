export interface UnidadDeclarada {
  idDeclaracionUnidad: number;
  tipo: string;
  pisoDeclarado: string | null;
  identificacionDeclarada: string | null;
  esPrincipalDeclarada: boolean;
  estaAlquiladaDeclarada: boolean | null;
  estadoConfirmacion: string;
  fechaDeclaracion: string;
}

export interface UsuarioComunidad {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  estado: string;
  fechaRegistro: string;
  perfilComunitario: string | null;
  unidadesDeclaradas: UnidadDeclarada[];
}
