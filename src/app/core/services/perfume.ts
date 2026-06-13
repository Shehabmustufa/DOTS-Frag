import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Perfume {
  id?: number;
  name: string;
  brand_id: number;
  brand?: { name: string; company_id: number; company?: { name: string } };
  full_ml: number;
  current_ml: number;
  bought_from?: string;
  price_original: number;
  price_5ml: number;
  price_10ml: number;
  bottles_available: number;
  bottles_bought: number;
  perfume_status?: 'available' | 'low' | 'empty';
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class PerfumeService {
  private table = 'perfumes';
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Perfume[]> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*, brand:brands(name, company_id, company:companies(name))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Perfume[]) || [];
  }

  async create(p: Partial<Perfume>): Promise<void> {
    if (!p.brand_id) throw new Error('Brand is required');
    if (!p.name?.trim()) throw new Error('Name is required');
    try {
      const payload = {
        name: String(p.name).trim(),
        brand_id: Number(p.brand_id),
        full_ml: Number(p.full_ml),
        current_ml: Number(p.current_ml),
        bought_from: p.bought_from || null,
        price_original: Number(p.price_original),
        price_5ml: Number(p.price_5ml),
        price_10ml: Number(p.price_10ml),
        bottles_available: Number(p.bottles_available),
        bottles_bought: Number(p.bottles_bought),
        perfume_status: p.perfume_status || 'available',
      };
      const { error } = await this.supa.client.from(this.table).insert([payload]);
      if (error) throw error;
    } catch (e) {
      console.error('Create error:', e);
      throw e;
    }
  }

  async update(id: number, p: Partial<Perfume>): Promise<void> {
    try {
      const payload: any = {};
      if (p.name !== undefined) payload.name = String(p.name).trim();
      if (p.brand_id !== undefined) payload.brand_id = Number(p.brand_id);
      if (p.full_ml !== undefined) payload.full_ml = Number(p.full_ml);
      if (p.current_ml !== undefined) payload.current_ml = Number(p.current_ml);
      if (p.bought_from !== undefined) payload.bought_from = p.bought_from || null;
      if (p.price_original !== undefined) payload.price_original = Number(p.price_original);
      if (p.price_5ml !== undefined) payload.price_5ml = Number(p.price_5ml);
      if (p.price_10ml !== undefined) payload.price_10ml = Number(p.price_10ml);
      if (p.bottles_available !== undefined) payload.bottles_available = Number(p.bottles_available);
      if (p.bottles_bought !== undefined) payload.bottles_bought = Number(p.bottles_bought);
      if (p.perfume_status !== undefined) payload.perfume_status = p.perfume_status;
      
      const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Update error:', e);
      throw e;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Delete error:', e);
      throw e;
    }
  }
}
