import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export type CostCategory = 'perfume_bottle' | 'marketing_ads' | 'syringes' | 'vials_5ml' | 'vials_10ml' | 'packaging' | 'gift' | 'other';
export type PaymentStatus = 'pending' | 'paid';

export interface Cost {
  id?: number;
  title: string;
  category: CostCategory;
  amount: number;
  payment_status: PaymentStatus;
  perfume_id?: number | null;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class CostService {
  private table = 'costs';
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Cost[]> {
    const { data, error } = await this.supa.client
      .from(this.table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Cost[];
  }

  async create(c: Partial<Cost>): Promise<void> {
    const payload = {
      title: String(c.title).trim(),
      category: c.category,
      amount: Number(c.amount),
      payment_status: c.payment_status || 'paid',
      perfume_id: null,
    };
    const { error } = await this.supa.client.from(this.table).insert([payload]);
    if (error) throw error;
  }

  async update(id: number, c: Partial<Cost>): Promise<void> {
    const payload: any = {};
    if (c.title !== undefined) payload.title = String(c.title).trim();
    if (c.category !== undefined) payload.category = c.category;
    if (c.amount !== undefined) payload.amount = Number(c.amount);
    if (c.payment_status !== undefined) payload.payment_status = c.payment_status;
    const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}
