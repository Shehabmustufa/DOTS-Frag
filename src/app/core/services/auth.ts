import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private supa: SupabaseService) {}

  get isLoggedIn(): boolean {
    return sessionStorage.getItem('dots_logged_in') === 'true';
  }

  async login(username: string, password: string): Promise<boolean> {
    const { data, error } = await this.supa.client
      .from('app_users')
      .select('id')
      .eq('username', username)
      .eq('password', password)
      .limit(1);
    if (error) throw error;
    if (data && data.length > 0) {
      sessionStorage.setItem('dots_logged_in', 'true');
      sessionStorage.setItem('dots_username', username);
      return true;
    }
    return false;
  }

  logout() {
    sessionStorage.removeItem('dots_logged_in');
    sessionStorage.removeItem('dots_username');
  }

  get username(): string {
    return sessionStorage.getItem('dots_username') || '';
  }
}
