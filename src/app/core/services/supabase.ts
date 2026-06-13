import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  client!: SupabaseClient;

  constructor() {
    try {
      const url = 'https://gssmtrgnldwzxhgfzctx.supabase.co';
      const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzc210cmdubGR3enhoZ2Z6Y3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODQxNzgsImV4cCI6MjA5NjU2MDE3OH0.x7ajQw3tvfclmuCXjl-z9uNd8GrdYRh7_c_t3V61XVc';
      
      if (!url || !key) {
        throw new Error('Missing Supabase credentials');
      }
      
      this.client = createClient(url, key, {
        auth: { persistSession: true },
      });
    } catch (error) {
      console.error('Supabase init error:', error);
      // Initialize with dummy client to prevent crashes
      this.client = createClient('https://dummy.supabase.co', 'dummy-key');
    }
  }
}
