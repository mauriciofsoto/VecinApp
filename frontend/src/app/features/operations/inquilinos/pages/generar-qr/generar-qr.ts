import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { CodigosInvitacionService } from '../../../../../core/services/codigos-invitacion.service';
import { QrCode } from '../../../../../shared/components/molecules/qr-code/qr-code';

@Component({
  selector: 'app-generar-qr',
  imports: [QrCode],
  templateUrl: './generar-qr.html',
  styleUrl: './generar-qr.scss',
})
export class GenerarQr implements OnInit {
  private readonly invitaciones = inject(CodigosInvitacionService);
  readonly identificadorPublico = signal<string | null>(null);
  readonly loading = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly enlace = computed(() => {
    const identificador = this.identificadorPublico();
    if (!identificador || typeof window === 'undefined') return '';
    return new URL(`/acceso/${identificador}`, window.location.origin).toString();
  });

  ngOnInit(): void {
    this.cargarQrComunitario();
  }

  cargarQrComunitario(): void {
    this.loading.set(true);
    this.error.set('');
    this.invitaciones.obtenerQrComunidad().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: acceso => {
        this.identificadorPublico.set(acceso.identificadorPublico);
      },
      error: err => this.error.set(err?.error?.message ?? 'No se pudo cargar el QR del edificio.'),
    });
  }

  async copiarEnlace(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.enlace());
      this.mensaje.set('Enlace copiado. Ya podés compartirlo.');
    } catch {
      this.error.set('No se pudo copiar automáticamente. Seleccioná y copiá el enlace.');
    }
  }

  async compartirEnlace(): Promise<void> {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Invitación a VecinApp', text: 'Sumate a la comunidad de tu edificio en VecinApp.', url: this.enlace() });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') this.error.set('No se pudo compartir el enlace desde este dispositivo.');
      }
    } else {
      await this.copiarEnlace();
    }
  }

  descargarQr(): void {
    const image = document.querySelector<HTMLImageElement>('.invitation-card app-qr-code img');
    if (!image?.src) return;
    const anchor = document.createElement('a');
    anchor.href = image.src;
    anchor.download = 'invitacion-vecinapp.png';
    anchor.click();
  }

  imprimir(): void {
    document.body.classList.add('printing-invitation');
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-invitation'), { once: true });
    window.print();
  }

}
