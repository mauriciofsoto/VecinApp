import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

export interface SelectOption<T = unknown> {
  label: string;
  value: T;
  disabled?: boolean;
}

export type SelectVariant = 'default' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-select',
  standalone: true,
  templateUrl: './select.html',
  styleUrl: './select.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() value: unknown = null;
  @Input() placeholder = 'Seleccioná una opción';
  @Input() disabled = false;
  @Input() required = false;
  @Input() id = '';
  @Input() name = '';
  @Input() ariaLabel = '';
  @Input() errorMessage = '';
  @Input() invalid = false;
  @Input() variant: SelectVariant = 'default';

  @Output() readonly valueChange = new EventEmitter<unknown>();
  @Output() readonly selectionChange = new EventEmitter<unknown>();

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  get selectedIndex(): string {
    return String(this.options.findIndex(option => Object.is(option.value, this.value)));
  }

  get isInvalid(): boolean {
    return this.invalid || Boolean(this.errorMessage);
  }

  get errorId(): string | null {
    return this.id && this.errorMessage ? `${this.id}-error` : null;
  }

  writeValue(value: unknown): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleChange(event: Event): void {
    const index = Number((event.target as HTMLSelectElement).value);
    const option = this.options[index];
    const nextValue = option ? option.value : null;

    this.value = nextValue;
    this.onChange(nextValue);
    this.valueChange.emit(nextValue);
    this.selectionChange.emit(nextValue);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
