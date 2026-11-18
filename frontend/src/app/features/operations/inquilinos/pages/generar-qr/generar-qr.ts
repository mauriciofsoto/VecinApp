import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { CodigosInvitacionService } from '../../../../../core/services/codigos-invitacion.service';
import { AuthService } from '../../../../../core/services/auth';
import { QrCode } from '../../../../../shared/components/molecules/qr-code/qr-code';

@Component({
  selector: 'app-generar-qr',
  imports: [QrCode],
  templateUrl: './generar-qr.html',
  styleUrl: './generar-qr.scss',
})
export class GenerarQr implements OnInit {
  private readonly invitaciones = inject(CodigosInvitacionService);
  private readonly auth = inject(AuthService);
  readonly identificadorPublico = signal<string | null>(null);
  readonly edificio = signal<{ idEdificio: number; nombreEdificio: string; direccionEdificio: string } | null>(null);
  readonly loading = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  private readonly sessionDelAcceso = signal<{ userId: string | null; version: number } | null>(null);
  private requestVersion = 0;

  readonly enlace = computed(() => {
    const identificador = this.identificadorPublico();
    if (!identificador || typeof window === 'undefined') return '';
    return new URL(`/acceso/${identificador}`, window.location.origin).toString();
  });

  constructor() {
    effect(() => {
      const session = this.auth.captureSession();
      const loadedSession = this.sessionDelAcceso();
      if (loadedSession && (loadedSession.userId !== session.userId || loadedSession.version !== session.version)) {
        this.requestVersion++;
        this.loading.set(false);
        this.limpiarAcceso();
        this.error.set('La sesión cambió. Volvé a cargar el acceso de tu edificio.');
      }
    });
  }

  ngOnInit(): void {
    this.cargarQrComunitario();
  }

  cargarQrComunitario(): void {
    const requestVersion = ++this.requestVersion;
    const session = this.auth.captureSession();
    this.loading.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.limpiarAcceso();
    this.sessionDelAcceso.set(session);
    this.invitaciones.obtenerQrComunidad().pipe(finalize(() => {
      if (requestVersion === this.requestVersion) this.loading.set(false);
    })).subscribe({
      next: acceso => {
        if (requestVersion !== this.requestVersion) return;
        if (!this.auth.isCurrentSession(session)) {
          this.error.set('La sesión cambió. Volvé a cargar el acceso de tu edificio.');
          return;
        }
        this.edificio.set({
          idEdificio: acceso.idEdificio,
          nombreEdificio: acceso.nombreEdificio,
          direccionEdificio: acceso.direccionEdificio,
        });
        this.identificadorPublico.set(acceso.identificadorPublico);
      },
      error: err => {
        if (requestVersion !== this.requestVersion) return;
        if (!this.auth.isCurrentSession(session)) {
          this.error.set('La sesión cambió. Volvé a cargar el acceso de tu edificio.');
          return;
        }
        this.error.set(err?.error?.message ?? 'No se pudo cargar el QR del edificio.');
      },
    });
  }

  private limpiarAcceso(): void {
    this.identificadorPublico.set(null);
    this.edificio.set(null);
    this.sessionDelAcceso.set(null);
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
