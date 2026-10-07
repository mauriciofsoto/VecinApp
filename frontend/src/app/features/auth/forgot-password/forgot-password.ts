import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthLayout } from '../auth-layout/auth-layout';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink, AuthLayout],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {}
