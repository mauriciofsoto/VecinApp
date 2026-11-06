
import { Component, input, model, output } from '@angular/core';

import { Paquete } from '../../models/paquete';
import { Modal } from '../../../../../shared/components/organisms/modal/modal';

@Component({
  selector: 'app-confirmar-recepcion-modal',
  standalone: true,
  imports: [Modal],
  templateUrl: './confirmar-recepcion-modal.html',
  styleUrl: './confirmar-recepcion-modal.scss',
})
export class ConfirmarRecepcionModal {
  readonly paquete = input.required<Paquete>();
  readonly open = model(false);

  readonly confirmar = output<void>();

  cancelar(): void {
    this.open.set(false);
  }

  confirmarRecepcion(): void {
    this.confirmar.emit();
    this.open.set(false);
  }
}
