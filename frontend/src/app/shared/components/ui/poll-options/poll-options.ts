import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component'; // Ajustá la ruta según donde tengas tu botón

export interface PollOptionMock {
  id: string;
  text: string;
  percentage: number;
  votes?: number;
}

@Component({
  selector: 'app-poll-options',
  standalone: true,
  imports: [CommonModule, ButtonComponent], // <-- IMPORTANTE: Agregar ButtonComponent acá
  templateUrl: './poll-options.html',
  styleUrl: './poll-options.scss',
})
export class PollOptions {
  readonly question = input<string>('');
  readonly options = input<PollOptionMock[]>([]);
  readonly viewingResults = input<boolean>(false);
  readonly myVote = input<string | null>(null);
  readonly totalVotes = input<number>(0);
  readonly disabled = input<boolean>(false);

  // Estado local para la opción seleccionada antes de votar
  readonly selectedOptionId = signal<string | null>(null);

  // Salida para emitir el voto
  readonly vote = output<string>();

  selectOption(optionId: string): void {
    if (this.disabled()) return;
    this.selectedOptionId.set(optionId);
  }

  confirmVote(): void {
    const selected = this.selectedOptionId();
    if (selected) {
      this.vote.emit(selected);
    }
  }
}