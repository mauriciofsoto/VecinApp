import { Directive, input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bentoItem]',
  standalone: true
})
export class BentoItemDirective {
  readonly bentoItem = input.required<string>();

  constructor(public templateRef: TemplateRef<any>) {}
}