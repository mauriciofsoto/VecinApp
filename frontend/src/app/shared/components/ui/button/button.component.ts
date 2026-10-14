import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Input() variant:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'success'
    | 'outline'
    | 'ghost' = 'primary';

  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() isSelected = false;
  @Input() fullWidth = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() customClass = '';

  @Output() buttonClick = new EventEmitter<void>();

  // Mapa de utilidades Tailwind para estructura y padding
  private readonly sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-medium',
    md: 'px-4 py-2.5 text-sm font-medium',
    lg: 'px-6 py-3 text-base font-semibold',
  };

  handleClick(): void {
    if (!this.disabled) {
      this.buttonClick.emit();
    }
  }

  get buttonClasses(): string {
    const classes = [
      'btn', // Clase base SCSS
      `btn-${this.variant}`, // Variante de color SCSS
      'inline-flex items-center justify-center gap-2', // Layout de Tailwind
      this.sizeClasses[this.size] || this.sizeClasses.md, // Estructura/Tamaño Tailwind
      this.customClass // Clases extras opcionales de Tailwind
    ];

    if (this.fullWidth) {
      classes.push('w-full');
    }

    if (this.isSelected) {
      classes.push('btn-selected');
    }

    return classes.join(' ');
  }
}