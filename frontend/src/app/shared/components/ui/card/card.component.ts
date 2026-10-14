import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, ],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  @Input() variant: 'glass' | 'solid' | 'image' = 'glass';
  @Input() size: 'sm' | 'md' | 'lg' | 'full' = 'md';
  @Input() align: 'left' | 'center' | 'right' | 'between' = 'left';

  @Input() bgImage?: string;
  @Input() hover = false;
  @Input() customClass = '';

  // Mapeo de Flexbox según la alineación elegida
  private readonly alignMap = {
    left: 'flex flex-col items-start text-left gap-3',
    center: 'flex flex-col items-center justify-center text-center gap-3',
    right: 'flex flex-col items-end text-right gap-3',
    between: 'flex flex-col justify-between items-stretch gap-4 h-full',
  };

  get cardClasses(): string {
    const classes = [
      'card',
      `card-${this.variant}`,
      `card-size-${this.size}`, // SCSS maneja el padding y el ancho máximo acá
      this.alignMap[this.align] || this.alignMap.left,
      this.customClass
    ];

    if (this.hover) {
      classes.push('card-hover cursor-pointer');
    }

    return classes.filter(Boolean).join(' ');
  }

  get backgroundImageStyle(): string | null {
    return this.bgImage ? `url(${this.bgImage})` : null;
  }
}