import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

/** Dashboard auth, backed by Supabase Auth (email + password).
 *  Staff accounts are created in the Supabase dashboard; public sign-up is disabled. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private supa: SupabaseService) {}

  async login(email: string, password: string): Promise<boolean> {
    const { error } = await this.supa.client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return !error;
  }

  async logout(): Promise<void> {
    await this.supa.client.auth.signOut();
  }

  /** Resolves from the persisted session in localStorage — no network call. */
  async isLoggedIn(): Promise<boolean> {
    const { data } = await this.supa.client.auth.getSession();
    return !!data.session;
  }

  async email(): Promise<string> {
    const { data } = await this.supa.client.auth.getSession();
    return data.session?.user?.email ?? '';
  }
}
