import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthLayout } from '../auth-layout/auth-layout';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, AuthLayout],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {}