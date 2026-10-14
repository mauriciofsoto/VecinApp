import { Component, ElementRef, effect, input, model, output, viewChild } from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg';

let nextId = 0;

/** MODAL EL PROCESO, SIGO MÑN. 
 * Carcasa reutilizable de modal (usa el <dialog> nativo: Esc, foco y backdrop vienen gratis).
 *
 * Uso:
 *   <app-modal heading='Asignar QR' size='sm' [(open)]='showQr'>
 *     ...contenido...
 *     <ng-container ngProjectAs='[modal-footer]'>
 *       <button (click)='showQr.set(false)'>Cancelar</button>
 *     </ng-container>
 *   </app-modal>
 * 
 *  tengo que seguir viendo: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  /** Visibilidad. Se enlaza con [(open)]='miSignal' */
  readonly open = model(false);
  /** Título (no se llama 'title' para que el navegador no muestre un tooltip) */
  readonly heading = input('');
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input(true);
  readonly showClose = input(true);
  /** Se emite siempre que se cierra: botón, Esc, backdrop o cierre desde afuera */
  readonly closed = output<void>();

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

  protected close(): void {
    this.open.set(false);
  }

  // El evento 'close' del <dialog> salta con Esc y también con dialog.close() 
  protected onNativeClose(): void {
    this.open.set(false);
    this.closed.emit();
  }

  //Click en el fondo: el target es el propio <dialog> (el panel ocupa todo su contenido) 
  protected onDialogClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === this.dialogRef()?.nativeElement) {
      this.close();
    }
  }
}
