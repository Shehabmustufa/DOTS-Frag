import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Customer {
  id?: number;
  name: string;
  mobile_number: string;
  location: string;
  found_via?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private table = 'customers';
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Customer[]> {
    const { data, error } = await this.supa.client
      .from(this.table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Customer[];
  }

  async create(c: Partial<Customer>): Promise<void> {
    const payload = {
      name: String(c.name).trim(),
      mobile_number: String(c.mobile_number).trim(),
      location: String(c.location).trim(),
      found_via: c.found_via || 'direct',
    };
    const { error } = await this.supa.client.from(this.table).insert([payload]);
    if (error) throw error;
  }

  async update(id: number, c: Partial<Customer>): Promise<void> {
    const payload: any = {};
    if (c.name !== undefined) payload.name = String(c.name).trim();
    if (c.mobile_number !== undefined) payload.mobile_number = String(c.mobile_number).trim();
    if (c.location !== undefined) payload.location = String(c.location).trim();
    if (c.found_via !== undefined) payload.found_via = c.found_via;
    const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}
