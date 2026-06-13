import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Company {
  id?: number;
  name: string;
  country?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private table = 'companies';
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Company[]> {
    const { data, error } = await this.supa.client
      .from(this.table).select('*').order('name');
    if (error) throw error;
    return data as Company[];
  }

  async create(c: Partial<Company>): Promise<void> {
    const payload = { name: String(c.name).trim(), country: c.country || null };
    const { error } = await this.supa.client.from(this.table).insert([payload]);
    if (error) throw error;
  }

  async update(id: number, c: Partial<Company>): Promise<void> {
    const payload: any = {};
    if (c.name !== undefined) payload.name = String(c.name).trim();
    if (c.country !== undefined) payload.country = c.country || null;
    const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}
