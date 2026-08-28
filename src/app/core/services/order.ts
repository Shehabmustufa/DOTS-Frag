import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface OrderItem {
  id?: number;
  order_id?: number;
  perfume_id?: number | null;
  brand_id?: number | null;
  decant_size_ml: number;
  quantity: number;
  is_full_bottle?: boolean;
  is_refundable_bottle?: boolean;
  bottle_sale_price?: number;
  bottle_cost_price?: number;
  perfume?: { price_5ml: number; price_10ml: number; price_30ml: number; price_original: number; full_ml: number; brand: { name: string } };
  brand?: { name: string; company: { name: string } };
}

export interface OrderPackaging {
  id?: number;
  order_id?: number;
  packaging_item_id: number;
  quantity: number;
  packaging_item?: { id: number; name: string; type: string; remaining_count: number; max_count: number };
}

export interface Order {
  id?: number;
  customer_id: number;
  order_status: 'placed' | 'delivery' | 'delivered' | 'cancelled';
  discount_percentage?: number;
  is_gift?: boolean;
  is_money_collected?: boolean;
  /** 'dashboard' (default) or 'website' — where the order originated. */
  source?: 'dashboard' | 'website';
  payment_method?: string | null;
  delivery_fee?: number | null;
  customer_note?: string | null;
  created_at?: string;
  customer?: { name: string; mobile_number: string };
  order_items?: OrderItem[];
  order_packaging?: OrderPackaging[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private supa: SupabaseService) {}

  private readonly selectQuery = `*, customer:customers(name, mobile_number), order_items(*, perfume:perfumes(price_5ml, price_10ml, price_30ml, price_original, full_ml, brand:brands(name)), brand:brands(name, company:companies(name))), order_packaging(*, packaging_item:packaging_items(id, name, type, remaining_count, max_count))`;

  async getAll(): Promise<Order[]> {
    const { data, error } = await this.supa.client
      .from('orders')
      .select(this.selectQuery)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }

  async getByCustomer(customerId: number): Promise<Order[]> {
    const { data, error } = await this.supa.client
      .from('orders')
      .select(`*, order_items(*, perfume:perfumes(price_5ml, price_10ml, price_30ml, price_original, full_ml, brand:brands(name)), brand:brands(name, company:companies(name))), order_packaging(*, packaging_item:packaging_items(id, name, type, remaining_count, max_count))`)
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
    items: { perfume_id?: number | null; brand_id?: number | null; decant_size_ml: number; quantity: number; is_full_bottle?: boolean; is_refundable_bottle?: boolean; bottle_sale_price?: number; bottle_cost_price?: number }[],
    discountPercentage: number = 0,
    isGift: boolean = false
  ): Promise<number> {
    const { data, error } = await this.supa.client.rpc('create_order_with_items', {
      p_customer_id: Number(customerId),
      p_discount: Number(discountPercentage) || 0,
      p_is_gift: isGift,
      p_items: items.map(i => ({
        perfume_id: i.perfume_id ? Number(i.perfume_id) : null,
        brand_id: i.brand_id ? Number(i.brand_id) : null,
        decant_size_ml: Number(i.decant_size_ml) || 0,
        quantity: Number(i.quantity),
        is_full_bottle: i.is_full_bottle || false,
        is_refundable_bottle: i.is_refundable_bottle || false,
        bottle_sale_price: Number(i.bottle_sale_price) || 0,
        bottle_cost_price: Number(i.bottle_cost_price) || 0,
      })),
    });
    if (error) throw error;
    return data as number;
  }

  async updateStatus(id: number, status: Order['order_status']): Promise<void> {
    const { error } = await this.supa.client
      .from('orders').update({ order_status: status }).eq('id', id);
    if (error) throw error;
  }

  /** Fill in the purchase cost for a refundable-bottle line (used to complete website orders). */
  async setItemCostPrice(itemId: number, costPrice: number): Promise<void> {
    const { error } = await this.supa.client
      .from('order_items')
      .update({ bottle_cost_price: Number(costPrice) || 0 })
      .eq('id', itemId);
    if (error) throw error;
  }

  async toggleMoneyCollected(id: number, value: boolean): Promise<void> {
    const { error } = await this.supa.client
      .from('orders').update({ is_money_collected: value }).eq('id', id);
    if (error) throw error;
  }

  async cancel(id: number): Promise<void> {
    const { error } = await this.supa.client.rpc('cancel_order_restore_inventory', { p_order_id: id });
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.rpc('delete_order_restore_inventory', { p_order_id: id });
    if (error) throw error;
  }
}
