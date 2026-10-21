import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
    readonly title = input('No hay información disponible');
  readonly description = input(
    'Cuando haya información, aparecerá acá.'
  );

}
