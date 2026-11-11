import { Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  templateUrl: './qr-code.html',
  styleUrl: './qr-code.scss',
})
export class QrCode {
  readonly value = input('');
  readonly dataUrl = signal('');
  readonly error = signal('');
  private generation = 0;

  constructor() {
    effect(() => {
      const value = this.value();
      const generation = ++this.generation;
      this.dataUrl.set('');
      this.error.set('');
      if (!value) return;
      QRCode.toDataURL(value, {
        errorCorrectionLevel: 'H', margin: 2, width: 640,
        color: { dark: '#171923', light: '#FFFFFF' },
      }).then(dataUrl => {
        if (generation === this.generation) this.dataUrl.set(dataUrl);
      }).catch(() => {
        if (generation === this.generation) this.error.set('No se pudo generar el código QR. Intentá nuevamente.');
      });
    });
  }
}
