import { Component, ElementRef, effect, input, model, output, viewChild } from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg';

let nextId = 0;

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {

  readonly open = model(false);
  readonly heading = input('');
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input(true);
  readonly showClose = input(true);
  readonly preventClose = input(false);

  readonly closed = output<void>();
  readonly closeBlocked = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Sincroniza la signal `open` con el estado real del <dialog>
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;
      const wantsOpen = this.open();
      if (wantsOpen && !dialog.open) dialog.showModal();
      else if (!wantsOpen && dialog.open) dialog.close();
    });
  }

  /** Cierre pedido por el usuario con la ✕ o el click afuera */
  protected requestClose(): void {
    if (this.preventClose()) {
      this.closeBlocked.emit();
      return;
    }
    this.open.set(false);
  }

  /** Tecla Esc: el evento "cancel" se puede frenar con preventDefault */
  protected onCancel(event: Event): void {
    if (this.preventClose()) {
      event.preventDefault();
      this.closeBlocked.emit();
    }
  }

  /** El evento "close" del <dialog> salta con Esc y también con dialog.close() */
  protected onNativeClose(): void {
    const dialog = this.dialogRef()?.nativeElement;
    // Red de seguridad: si el navegador cerró igual (algunos ignoran preventDefault en Esc)
    // y todavía no se pidió cerrar por código, lo reabrimos.
    if (dialog && this.open() && this.preventClose()) {
      dialog.showModal();
      this.closeBlocked.emit();
      return;
    }
    this.open.set(false);
    this.closed.emit();
  }

  /** Click en el fondo: el target es el propio <dialog> (el panel ocupa todo su contenido) */
  protected onDialogClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === this.dialogRef()?.nativeElement) {
      this.requestClose();
    }
  }

}