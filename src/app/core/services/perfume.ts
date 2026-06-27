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
  discount_percentage: number;
  price_5ml: number;
  price_10ml: number;
  price_30ml: number;
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

  async findExisting(brandId: number, name: string): Promise<Perfume | null> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*')
      .eq('brand_id', brandId)
      .ilike('name', name.trim())
      .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? data[0] as Perfume : null;
  }

  async create(p: Partial<Perfume>): Promise<void> {
    if (!p.brand_id) throw new Error('Brand is required');
    if (!p.name?.trim()) throw new Error('Name is required');

    const existing = await this.findExisting(Number(p.brand_id), p.name);
    if (existing) {
      const newBottles = Number(p.bottles_bought) || 1;
      const addedMl = Number(p.full_ml) * newBottles;
      await this.update(existing.id!, {
        bottles_available: existing.bottles_available + newBottles,
        bottles_bought: existing.bottles_bought + newBottles,
        full_ml: existing.full_ml + addedMl,
        current_ml: existing.current_ml + addedMl,
        price_original: Number(p.price_original) || existing.price_original,
        price_5ml: Number(p.price_5ml) || existing.price_5ml,
        price_10ml: Number(p.price_10ml) || existing.price_10ml,
        price_30ml: Number(p.price_30ml) || existing.price_30ml,
        discount_percentage: p.discount_percentage !== undefined ? Number(p.discount_percentage) : existing.discount_percentage,
      });
      return;
    }

    const payload = {
      name: String(p.name).trim(),
      brand_id: Number(p.brand_id),
      full_ml: Number(p.full_ml),
      current_ml: Number(p.current_ml),
      bought_from: p.bought_from || null,
      price_original: Number(p.price_original),
      discount_percentage: Number(p.discount_percentage) || 0,
      price_5ml: Number(p.price_5ml),
      price_10ml: Number(p.price_10ml),
      price_30ml: Number(p.price_30ml) || 0,
      bottles_available: Number(p.bottles_available),
      bottles_bought: Number(p.bottles_bought),
      perfume_status: p.perfume_status || 'available',
    };
    const { error } = await this.supa.client.from(this.table).insert([payload]);
    if (error) throw error;
  }

  async update(id: number, p: Partial<Perfume>): Promise<void> {
    const payload: any = {};
    if (p.name !== undefined) payload.name = String(p.name).trim();
    if (p.brand_id !== undefined) payload.brand_id = Number(p.brand_id);
    if (p.full_ml !== undefined) payload.full_ml = Number(p.full_ml);
    if (p.current_ml !== undefined) payload.current_ml = Number(p.current_ml);
    if (p.bought_from !== undefined) payload.bought_from = p.bought_from || null;
    if (p.price_original !== undefined) payload.price_original = Number(p.price_original);
    if (p.discount_percentage !== undefined) payload.discount_percentage = Number(p.discount_percentage);
    if (p.price_5ml !== undefined) payload.price_5ml = Number(p.price_5ml);
    if (p.price_10ml !== undefined) payload.price_10ml = Number(p.price_10ml);
    if (p.price_30ml !== undefined) payload.price_30ml = Number(p.price_30ml);
    if (p.bottles_available !== undefined) payload.bottles_available = Number(p.bottles_available);
    if (p.bottles_bought !== undefined) payload.bottles_bought = Number(p.bottles_bought);
    if (p.perfume_status !== undefined) payload.perfume_status = p.perfume_status;

    const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}
