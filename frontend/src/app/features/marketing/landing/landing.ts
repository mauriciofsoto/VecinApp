import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  readonly menuOpen = signal(false);
  readonly submitted = signal(false);
  readonly formNotice = signal('');

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  submitContact(form: NgForm): void {
    this.submitted.set(true);
    this.formNotice.set('');
    if (form.invalid) return;

    this.formNotice.set('Este formulario todavía no está conectado. Podés volver a esta página cuando habilitemos el canal de consultas.');
  }
}
