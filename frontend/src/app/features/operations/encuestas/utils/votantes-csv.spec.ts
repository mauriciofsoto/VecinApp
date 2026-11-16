import { generarCsvVotantes } from './votantes-csv';

describe('generarCsvVotantes', () => {
  it('genera CSV UTF-8 con encabezados, acentos y solo los votos recibidos', () => {
    const csv = generarCsvVotantes({
      encuestaId: 3,
      titulo: '¿Qué opción elegís?',
      estado: 'cerrada',
      fechaLimite: '2026-11-16T00:00:00Z',
      totalVotos: 1,
      votantes: [{
        nombre: 'Ana "Ani" Pérez',
        opcion: 'Mañana; por la tarde',
        fechaVoto: '2026-11-16T12:30:00.000Z',
      }],
    });

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('"Encuesta";"Persona";"Opción elegida";"Fecha y hora"');
    expect(csv).toContain('"¿Qué opción elegís?";"Ana ""Ani"" Pérez";"Mañana; por la tarde";"2026-11-16T12:30:00.000Z"');
    expect(csv.split('\r\n')).toHaveLength(2);
  });

  it('neutraliza contenido que Excel podría interpretar como fórmula', () => {
    const csv = generarCsvVotantes({
      encuestaId: 4,
      titulo: 'Encuesta',
      estado: 'en-proceso',
      fechaLimite: '',
      totalVotos: 1,
      votantes: [{ nombre: '=1+1', opcion: 'Sí', fechaVoto: '' }],
    });

    expect(csv).toContain('"\'=1+1"');
  });
});
