import { Component, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { PollOption } from '../../ui/poll-option.model';

@Component({
  selector: 'app-poll-voting',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './poll-voting.html',
  styleUrl: './poll-voting.scss',
})
export class PollVoting {
  readonly question = input('');
  readonly options = input<PollOption[]>([]);
  readonly disabled = input(false);

  readonly selectedOptionId = signal<string | null>(null);
  readonly vote = output<string>();

  selectOption(optionId: string): void {
    if (this.disabled()) return;
    this.selectedOptionId.set(optionId);
  }

  confirmVote(): void {
    const selected = this.selectedOptionId();

    if (!selected || this.disabled()) return;

    this.vote.emit(selected);
  }
}
