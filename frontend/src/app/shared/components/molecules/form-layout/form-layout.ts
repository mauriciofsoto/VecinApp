
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-layout',
  standalone: true,
  templateUrl: './form-layout.html',
  styleUrl: './form-layout.scss',
})
export class FormLayout {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
