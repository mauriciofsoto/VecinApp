import { Component, input } from '@angular/core';
import { PollOption } from '../../../models/poll-option.model';

@Component({
  selector: 'app-poll-statistics',
  standalone: true,
  templateUrl: './poll-statistics.html',
  styleUrl: './poll-statistics.scss',
})
export class PollStatistics {
  readonly question = input('');
  readonly options = input<PollOption[]>([]);
  readonly myVote = input<string | null>(null);
  readonly totalVotes = input(0);
}
