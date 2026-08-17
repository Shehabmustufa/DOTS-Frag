import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface PackagingItem {
  id?: number;
  name: string;
  type: string;
  max_count: number;
  remaining_count: number;
  created_at?: string;
}

export interface OrderPackaging {
  id?: number;
  order_id?: number;
  packaging_item_id: number;
  quantity: number;
  packaging_item?: PackagingItem;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class PackagingService {
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<PackagingItem[]> {
    const { data, error } = await this.supa.client
      .from('packaging_items')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as PackagingItem[];
  }

  async create(item: Partial<PackagingItem>): Promise<void> {
    const payload = {
      name: String(item.name).trim(),
      type: String(item.type).trim(),
      max_count: Number(item.max_count),
      remaining_count: Number(item.max_count),
    };
    const { error } = await this.supa.client.from('packaging_items').insert([payload]);
    if (error) throw error;
  }

  async update(id: number, item: Partial<PackagingItem>): Promise<void> {
    const payload: any = {};
    if (item.name !== undefined) payload.name = String(item.name).trim();
    if (item.type !== undefined) payload.type = String(item.type).trim();
    if (item.max_count !== undefined) payload.max_count = Number(item.max_count);
    if (item.remaining_count !== undefined) payload.remaining_count = Number(item.remaining_count);
    const { error } = await this.supa.client.from('packaging_items').update(payload).eq('id', id);
    if (error) throw error;
  }

  async restock(id: number, addCount: number): Promise<void> {
    const { data, error: fetchErr } = await this.supa.client
      .from('packaging_items').select('max_count, remaining_count').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    const { error } = await this.supa.client.from('packaging_items').update({
      max_count: data.max_count + addCount,
      remaining_count: data.remaining_count + addCount,
    }).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from('packaging_items').delete().eq('id', id);
    if (error) throw error;
  }

  async saveOrderPackaging(orderId: number, items: { packaging_item_id: number; quantity: number }[]): Promise<void> {
    const { error } = await this.supa.client.rpc('save_order_packaging', {
      p_order_id: orderId,
      p_items: items,
    });
    if (error) throw error;
  }
}
