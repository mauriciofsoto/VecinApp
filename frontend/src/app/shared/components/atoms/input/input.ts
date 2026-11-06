import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './input.html',
  styleUrl: './input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  @Input() value: string | number = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() multiline = false;
  @Input() rows = 3;
  @Input() disabled = false;
  @Input() required = false;
  @Input() min: string | number | null = null;
  @Input() max: string | number | null = null;
  @Input() maxlength: number | null = null;
  @Input() autocomplete: string | null = null;
  @Input() id = '';
  @Input() name = '';
  @Input() clearable = false;
  @Input() prefixIcon?: string;
  @Input() errorMessage = '';
  @Input() invalid = false;

  @Output() readonly valueChange = new EventEmitter<string | number>();
  @Output() readonly keydown = new EventEmitter<KeyboardEvent>();
  @Output() readonly onFocus = new EventEmitter<FocusEvent>();
  @Output() readonly onBlur = new EventEmitter<FocusEvent>();

  private onChange: (value: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  get isInvalid(): boolean {
    return this.invalid || Boolean(this.errorMessage);
  }

  get errorId(): string | null {
    return this.id && this.errorMessage ? `${this.id}-error` : null;
  }

  get canClear(): boolean {
    return this.clearable && !this.disabled && this.value !== '';
  }

  writeValue(value: string | number | null | undefined): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = this.type === 'number' && target.value !== '' && target instanceof HTMLInputElement
      ? target.valueAsNumber
      : target.value;

    this.updateValue(value);
  }

  clearValue(): void {
    this.updateValue('');
  }

  handleKeyDown(event: KeyboardEvent): void {
    this.keydown.emit(event);
  }

  handleFocus(event: FocusEvent): void {
    this.onFocus.emit(event);
  }

  handleBlur(event: FocusEvent): void {
    this.onTouched();
    this.onBlur.emit(event);
  }

  private updateValue(value: string | number): void {
    this.value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }
}
