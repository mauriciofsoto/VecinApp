import { EncuestaVotantesResponse } from '../models/encuesta.model';

function celda(valor: string): string {
  const seguro = /^[=+@\-\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export function generarCsvVotantes(encuesta: EncuestaVotantesResponse): string {
  const filas = [
    ['Encuesta', 'Persona', 'Opción elegida', 'Fecha y hora'],
    ...encuesta.votantes.map(votante => [
      encuesta.titulo,
      votante.nombre,
      votante.opcion,
      votante.fechaVoto ? new Date(votante.fechaVoto).toISOString() : '',
    ]),
  ];

  return `\uFEFF${filas.map(fila => fila.map(celda).join(';')).join('\r\n')}`;
}
