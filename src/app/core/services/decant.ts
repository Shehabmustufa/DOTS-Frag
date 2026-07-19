import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Decant {
  id?: number;
  perfume_id: number;
  size_ml: number;
  quantity: number;
  created_at?: string;
  perfume?: { brand: { name: string; company: { name: string } } };
}

@Injectable({ providedIn: 'root' })
export class DecantService {
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Decant[]> {
    const { data, error } = await this.supa.client
      .from('decants')
      .select('*, perfume:perfumes(brand:brands(name, company:companies(name)))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Decant[]) || [];
  }
  // fixing the deployment 

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from('decants').delete().eq('id', id);
    if (error) throw error;
  }
}
