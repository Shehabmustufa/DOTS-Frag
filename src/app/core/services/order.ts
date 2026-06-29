import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface OrderItem {
  id?: number;
  order_id?: number;
  perfume_id: number;
  decant_size_ml: 5 | 10 | 30;
  quantity: number;
  perfume?: { price_5ml: number; price_10ml: number; price_30ml: number; brand: { name: string } };
}

export interface Order {
  id?: number;
  customer_id: number;
  order_status: 'placed' | 'delivery' | 'delivered';
  discount_percentage?: number;
  is_gift?: boolean;
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
      .select(`*, customer:customers(name, mobile_number), order_items(*, perfume:perfumes(price_5ml, price_10ml, price_30ml, brand:brands(name)))`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }

  async getByCustomer(customerId: number): Promise<Order[]> {
    const { data, error } = await this.supa.client
      .from('orders')
      .select(`*, order_items(*, perfume:perfumes(price_5ml, price_10ml, price_30ml, brand:brands(name)))`)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }

  async getGiftCustomerIds(): Promise<Set<number>> {
    const { data, error } = await this.supa.client
      .from('orders')
      .select('customer_id')
      .eq('is_gift', true);
    if (error) throw error;
    return new Set((data || []).map((d: any) => d.customer_id));
  }

  async create(
    customerId: number,
    items: { perfume_id: number; decant_size_ml: 5 | 10 | 30; quantity: number }[],
    discountPercentage: number = 0,
    isGift: boolean = false
  ): Promise<Order> {
    const { data: order, error: oErr } = await this.supa.client
      .from('orders')
      .insert([{
        customer_id: Number(customerId),
        order_status: 'placed',
        discount_percentage: Number(discountPercentage) || 0,
        is_gift: isGift,
      }])
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

    return order as Order;
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
