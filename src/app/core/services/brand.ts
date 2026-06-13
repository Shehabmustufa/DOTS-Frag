import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Brand {
  id?: number;
  name: string;
  company_id: number;
  company?: { name: string };
  description?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  private table = 'brands';
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Brand[]> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*, company:companies(name)')
      .order('name');
    if (error) throw error;
    return data as Brand[];
  }

  async getByCompany(companyId: number): Promise<Brand[]> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*, company:companies(name)')
      .eq('company_id', companyId)
      .order('name');
    if (error) throw error;
    return data as Brand[];
  }

  async create(b: Partial<Brand>): Promise<void> {
    if (!b.company_id) throw new Error('Company is required');
    const payload = {
      name: String(b.name).trim(),
      company_id: Number(b.company_id),
      description: b.description || null,
    };
    const { error } = await this.supa.client.from(this.table).insert([payload]);
    if (error) throw error;
  }

  async update(id: number, b: Partial<Brand>): Promise<void> {
    const payload: any = {};
    if (b.name !== undefined) payload.name = String(b.name).trim();
    if (b.company_id !== undefined) payload.company_id = Number(b.company_id);
    if (b.description !== undefined) payload.description = b.description || null;
    const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}
