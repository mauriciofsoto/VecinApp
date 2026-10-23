import {
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DatePipe } from '@angular/common';

import { PollVoting } from '../../../../../shared/components/ui/poll-voting/poll-voting';
import { PollStatistics } from '../../../../../shared/components/ui/poll-statistics/poll-statistics';
import { PollOption } from '../../../../../shared/components/ui/poll-option.model';

import { EncuestaAdmin } from '../../../../operations/encuestas/models/encuesta.model';
import { EncuestasService } from '../../../../operations/encuestas/services/encuestas';

@Component({
  selector: 'app-poll-card',
  standalone: true,
  imports: [DatePipe, PollVoting, PollStatistics],
  templateUrl: './poll-card.html',
  styleUrl: './poll-card.scss',
})
export class PollCard {
  readonly encuesta = input.required<EncuestaAdmin>();

  // ID temporal para la demostración.
  // Después lo obtenemos desde la sesión del usuario.
  readonly userId = input(1);

  private readonly encuestasService = inject(EncuestasService);

  readonly miVoto = computed(() =>
    this.encuestasService.obtenerVotoUsuario(
      this.encuesta().id,
      this.userId(),
    )?.opcionId ?? null,
  );

  readonly yaVoto = computed(() => this.miVoto() !== null);

  readonly opciones = computed<PollOption[]>(() => {
    const encuesta = this.encuesta();

    const votosPorOpcion =
      encuesta.votosPorOpcion ??
      encuesta.opciones.map((text, index) => ({
        id: String(index),
        texto: text,
        votos: 0,
      }));

    return votosPorOpcion.map(opcion => ({
      id: opcion.id,
      text: opcion.texto,
      votes: opcion.votos,
      percentage:
        encuesta.totalVotos > 0
          ? Math.round(
              (opcion.votos / encuesta.totalVotos) * 100,
            )
          : 0,
    }));
  });

  registrarVoto(opcionId: string): void {
    if (this.yaVoto()) return;

    this.encuestasService.registrarVoto(
      this.encuesta().id,
      this.userId(),
      opcionId,
    );
  }
}
