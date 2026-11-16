
import {
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DatePipe } from '@angular/common';

import { PollVoting } from '../../../../../shared/components/organisms/poll-voting/poll-voting';
import { PollStatistics } from '../../../../../shared/components/organisms/poll-statistics/poll-statistics';
import { PollOption } from '../../../../../shared/models/poll-option.model';

import { EncuestaAdmin } from '../../../../operations/encuestas/models/encuesta.model';
import { EncuestasService } from '../../../../operations/encuestas/services/encuestas';
import { AuthService } from '../../../../../core/services/auth';

@Component({
  selector: 'app-poll-card',
  standalone: true,
  imports: [DatePipe, PollVoting, PollStatistics],
  templateUrl: './poll-card.html',
  styleUrl: './poll-card.scss',
})
export class PollCard {
  readonly encuesta = input.required<EncuestaAdmin>();

  private readonly encuestasService = inject(EncuestasService);
  private readonly authService = inject(AuthService);
  readonly error = this.encuestasService.error;
  readonly puedeVotar = computed(() =>
    this.authService.hasRole('Propietario', 'Inquilino'),
  );

  readonly miVoto = computed(() => this.encuesta().miOpcionId);

  readonly yaVoto = computed(() => this.encuesta().yaVote);

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
    if (this.yaVoto() || !this.puedeVotar()) return;

    this.encuestasService.registrarVoto(
      this.encuesta().id,
      opcionId,
    ).subscribe({ error: () => undefined });
  }

  readonly resultados = computed<PollOption[]>(() => {
    const encuesta = this.encuesta();
    return encuesta.votosPorOpcion.map(opcion => ({
      id: opcion.id,
      text: opcion.texto,
      votes: opcion.votos,
      percentage: encuesta.totalVotos > 0
        ? Math.round(opcion.votos / encuesta.totalVotos * 100)
        : 0,
    }));
  });
}
