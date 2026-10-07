import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthLayout } from '../auth-layout/auth-layout';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink, AuthLayout],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {}