export interface PerfilUsuario {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  rol: string;
  edificioNombre: string | null;
  unidadesVinculadas: UnidadVinculadaPerfil[];
  unidadesDeclaradas: UnidadDeclaradaPerfil[];
  viveEnEdificio: boolean | null;
  tieneOtrasUnidades: boolean | null;
  declaraUnidadesAlquiladas: boolean | null;
  modalidadAlquiler: string | null;
  funcionPersonal: string | null;
  funcionPersonalOtra: string | null;
  horarioPersonal: string | null;
}

export interface ActualizarPerfilRequest {
  nombre: string;
  apellido: string;
  telefono: string | null;
}

export interface UnidadVinculadaPerfil {
  id: number;
  piso: string;
  identificacion: string;
  edificioNombre: string;
  tipoRelacion: string;
}

export interface UnidadDeclaradaPerfil {
  id: number;
  tipo: string;
  pisoDeclarado: string | null;
  identificacionDeclarada: string | null;
  esPrincipalDeclarada: boolean;
  estaAlquiladaDeclarada: boolean | null;
  estadoConfirmacion: string;
  fechaDeclaracion: string;
  personaRelacionNombre: string | null;
  personaRelacionApellido: string | null;
  pisoRelacion: string | null;
  identificacionRelacion: string | null;
}

export interface DeclaracionVinculacionRequest {
  idDeclaracion: number | null;
  tipo: string;
  piso: string;
  identificacion: string;
  esPrincipal: boolean;
  estaAlquilada: boolean | null;
  personaRelacionNombre: string | null;
  personaRelacionApellido: string | null;
  pisoRelacion: string | null;
  identificacionRelacion: string | null;
}

export interface SolicitudVinculacion {
  id: number;
  estado: 'Pendiente' | 'Confirmada' | 'Rechazada' | 'Cancelada' | string;
  miParteAcepto: boolean;
  otraParteAcepto: boolean;
  nombreOtraParte: string;
  rolOtraParte: string;
  pisoUnidad: string;
  identificacionUnidad: string;
  pisoResidenciaOtraParte: string | null;
  identificacionResidenciaOtraParte: string | null;
  fechaCreacion: string;
  fechaRespuestaPropietario: string | null;
  fechaRespuestaInquilino: string | null;
}
