import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../../../shared/components/ui/card/card.component';
import { EncuestasService } from '../../services/encuestas';
import { EncuestaAdmin } from '../../models/encuesta.model';

@Component({
  selector: 'app-responder-encuesta',
  standalone: true,
  imports: [CommonModule, ButtonComponent, CardComponent],
  templateUrl: './responder-encuesta.html',
  styleUrl: './responder-encuesta.scss',
})
export class ResponderEncuesta {
  private readonly encuestasService = inject(EncuestasService);

  readonly encuestas = computed(() =>
    this.encuestasService.encuestas().filter(
      (encuesta) =>
        encuesta.estado === 'en-proceso' &&
        encuesta.votacionActiva,
    ),
  );

  readonly encuestaSeleccionada = signal<number | null>(null);
  readonly votosEnviados = signal<number[]>([]);
  readonly opcionSeleccionada = signal<string | null>(null);

  seleccionarEncuesta(id: number): void {
    this.encuestaSeleccionada.set(id);
    this.opcionSeleccionada.set(null);
  }

  seleccionarOpcion(opcion: string): void {
    this.opcionSeleccionada.set(opcion);
  }

  

confirmarVoto(): void {
  const encuestaId = this.encuestaSeleccionada();
  const opcion = this.opcionSeleccionada();

  if (
    encuestaId === null ||
    opcion === null ||
    this.votosEnviados().includes(encuestaId)
  ) {
    return;
  }

  const encuesta = this.encuestas().find(
    item => item.id === encuestaId,
  );

  if (!encuesta || !encuesta.opciones.includes(opcion)) {
    return;
  }

  const opcionIndex = encuesta.opciones.indexOf(opcion);
  const opcionId = String(opcionIndex);

  const usuarioId = 1; // ID temporal del usuario actual

  const registrado = this.encuestasService.registrarVoto(
    encuestaId,
    usuarioId,
    opcionId,
  );

  if (!registrado) {
    return;
  }

  this.votosEnviados.update(ids => [...ids, encuestaId]);
  this.opcionSeleccionada.set(null);
}
}
