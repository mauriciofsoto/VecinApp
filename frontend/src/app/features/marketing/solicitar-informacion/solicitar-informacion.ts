import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-solicitar-informacion',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './solicitar-informacion.html',
  styleUrl: './solicitar-informacion.scss',
})
export class SolicitarInformacion {
  private readonly route = inject(ActivatedRoute);
  readonly revisado = signal(false);
  readonly notice = signal('');
  motivo = '';

  constructor() {
    const motivo = this.route.snapshot.queryParamMap.get('motivo');
    const motivos = ['Conocer los planes', 'Solicitar una propuesta comercial', 'Consultar por contratación', 'Solicitar una demostración', 'Otra consulta'];
    this.motivo = motivos.includes(motivo ?? '') ? motivo! : '';
  }

  revisar(form: NgForm): void {
    this.revisado.set(true);
    this.notice.set(form.invalid
      ? ''
      : 'Los datos están completos, pero la solicitud no se envió: todavía no hay un canal de recepción conectado.');
  }
}
