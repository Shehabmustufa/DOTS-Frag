import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface OrderItem {
  id?: number;
  order_id?: number;
  perfume_id: number;
  decant_size_ml: 5 | 10;
  quantity: number;
  perfume?: { name: string; price_5ml: number; price_10ml: number; brand: { name: string } };
}

export interface Order {
  id?: number;
  customer_id: number;
  order_status: 'placed' | 'delivery' | 'delivered';
  created_at?: string;
  customer?: { name: string; mobile_number: string };
  order_items?: OrderItem[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Order[]> {
    const { data, error } = await this.supa.client
      .from('orders')
      .select(`*, customer:customers(name, mobile_number), order_items(*, perfume:perfumes(name, price_5ml, price_10ml, brand:brands(name)))`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }

  async create(customerId: number, items: { perfume_id: number; decant_size_ml: 5 | 10; quantity: number }[]): Promise<void> {
    const { data: order, error: oErr } = await this.supa.client
      .from('orders')
      .insert([{ customer_id: Number(customerId), order_status: 'placed' }])
      .select()
      .single();
    if (oErr) throw oErr;

    const rows = items.map(i => ({
      order_id: order.id,
      perfume_id: Number(i.perfume_id),
      decant_size_ml: Number(i.decant_size_ml),
      quantity: Number(i.quantity),
    }));
    const { error: iErr } = await this.supa.client.from('order_items').insert(rows);
    if (iErr) throw iErr;
  }

  async updateStatus(id: number, status: Order['order_status']): Promise<void> {
    const { error } = await this.supa.client
      .from('orders').update({ order_status: status }).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from('orders').delete().eq('id', id);
    if (error) throw error;
  }
}
