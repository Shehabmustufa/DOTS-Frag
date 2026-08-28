import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Perfume {
  id?: number;
  brand_id: number;
  brand?: { name: string; company_id: number; company?: { name: string } };
  full_ml: number;
  current_ml: number;
  bought_from?: string;
  price_original: number;
  price_5ml: number;
  price_10ml: number;
  price_30ml: number;
  bottles_available: number;
  bottles_bought: number;
  perfume_status?: 'available' | 'low' | 'empty';
  description?: string;
  notes?: string;
  gender?: 'men' | 'women' | 'unisex';
  is_published?: boolean;
  sale_price_5ml?: number | null;
  sale_price_10ml?: number | null;
  sale_price_30ml?: number | null;
  created_at?: string;
}

export interface PerfumeBottle {
  id?: number;
  perfume_id: number;
  full_ml: number;
  current_ml: number;
  cost_id?: number | null;
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

  async getById(id: number): Promise<Perfume | null> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Perfume;
  }

  async addBottle(p: Partial<Perfume>, costPrice: number, brandName: string): Promise<void> {
    const { error } = await this.supa.client.rpc('add_perfume_bottle', {
      p_brand_id: Number(p.brand_id),
      p_full_ml: Number(p.full_ml),
      p_price_original: Number(p.price_original) || 0,
      p_price_5ml: Number(p.price_5ml) || 0,
      p_price_10ml: Number(p.price_10ml) || 0,
      p_price_30ml: Number(p.price_30ml) || 0,
      p_bought_from: p.bought_from || null,
      p_cost_price: costPrice || 0,
      p_cost_title: `Bottle: ${brandName}`,
    });
    if (error) throw error;
  }

  async update(id: number, p: Partial<Perfume>): Promise<void> {
    const payload: any = {};
    if (p.brand_id !== undefined) payload.brand_id = Number(p.brand_id);
    if (p.full_ml !== undefined) payload.full_ml = Number(p.full_ml);
    if (p.current_ml !== undefined) payload.current_ml = Number(p.current_ml);
    if (p.bought_from !== undefined) payload.bought_from = p.bought_from || null;
    if (p.price_original !== undefined) payload.price_original = Number(p.price_original);
    if (p.price_5ml !== undefined) payload.price_5ml = Number(p.price_5ml);
    if (p.price_10ml !== undefined) payload.price_10ml = Number(p.price_10ml);
    if (p.price_30ml !== undefined) payload.price_30ml = Number(p.price_30ml);
    if (p.bottles_available !== undefined) payload.bottles_available = Number(p.bottles_available);
    if (p.bottles_bought !== undefined) payload.bottles_bought = Number(p.bottles_bought);
    if (p.perfume_status !== undefined) payload.perfume_status = p.perfume_status;
    if (p.description !== undefined) payload.description = p.description;
    if (p.notes !== undefined) payload.notes = p.notes;
    if (p.gender !== undefined) payload.gender = p.gender;
    if (p.is_published !== undefined) payload.is_published = p.is_published;
    if (p.sale_price_5ml !== undefined) payload.sale_price_5ml = p.sale_price_5ml === null || (p.sale_price_5ml as any) === '' ? null : Number(p.sale_price_5ml);
    if (p.sale_price_10ml !== undefined) payload.sale_price_10ml = p.sale_price_10ml === null || (p.sale_price_10ml as any) === '' ? null : Number(p.sale_price_10ml);
    if (p.sale_price_30ml !== undefined) payload.sale_price_30ml = p.sale_price_30ml === null || (p.sale_price_30ml as any) === '' ? null : Number(p.sale_price_30ml);

    const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async deleteFull(id: number): Promise<void> {
    const { error } = await this.supa.client.rpc('delete_perfume_full', { p_perfume_id: id });
    if (error) throw error;
  }

  // --- Bottle methods ---

  async getBottles(perfumeId: number): Promise<PerfumeBottle[]> {
    const { data, error } = await this.supa.client
      .from('perfume_bottles')
      .select('*')
      .eq('perfume_id', perfumeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PerfumeBottle[]) || [];
  }

  async updateBottleMl(bottleId: number, currentMl: number): Promise<void> {
    const { error } = await this.supa.client.rpc('update_bottle_ml', {
      p_bottle_id: bottleId,
      p_current_ml: currentMl,
    });
    if (error) throw error;
  }

  async deleteBottle(bottleId: number): Promise<void> {
    const { error } = await this.supa.client.rpc('delete_perfume_bottle', { p_bottle_id: bottleId });
    if (error) throw error;
  }
}
