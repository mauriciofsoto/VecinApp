import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {
  @Input() showTopLink = true;
  @Input() topLinkText = 'Crear cuenta';
  @Input() topLinkRoute = '/registro';
}