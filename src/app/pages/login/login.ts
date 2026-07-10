import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async submit() {
    this.error = '';
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Please enter username and password.';
      return;
    }
    this.loading = true;
    try {
      const ok = await this.auth.login(this.username.trim(), this.password);
      if (ok) {
        this.router.navigate(['/perfumes']);
      } else {
        this.error = 'Invalid username or password.';
      }
    } catch (e: any) {
      this.error = e.message || 'Login failed.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
