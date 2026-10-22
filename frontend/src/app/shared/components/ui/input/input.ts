import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class InputComponent {
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<string>('text');
  readonly multiline = input<boolean>(false);
  readonly rows = input<number>(3);
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly name = input<string>('');
  readonly id = input<string>('');

  readonly valueChange = output<string>();
  readonly keydown = output<KeyboardEvent>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.valueChange.emit(target.value);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keydown.emit(event);
  }
}
