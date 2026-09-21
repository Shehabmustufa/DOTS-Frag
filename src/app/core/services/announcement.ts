import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Announcement {
  id?: number;
  text: string;
  bg_color: string;
  text_color: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private table = 'website_announcements';
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Announcement[]> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data as Announcement[]) || [];
  }

  async create(a: Partial<Announcement>): Promise<void> {
    const payload = {
      text: String(a.text || '').trim(),
      bg_color: a.bg_color || '#1a1a2e',
      text_color: a.text_color || '#ffffff',
      display_order: Number(a.display_order) || 0,
      is_active: a.is_active ?? true,
    };
    const { error } = await this.supa.client.from(this.table).insert([payload]);
    if (error) throw error;
  }

  async update(id: number, a: Partial<Announcement>): Promise<void> {
    const payload: any = {};
    if (a.text !== undefined) payload.text = String(a.text).trim();
    if (a.bg_color !== undefined) payload.bg_color = a.bg_color;
    if (a.text_color !== undefined) payload.text_color = a.text_color;
    if (a.display_order !== undefined) payload.display_order = Number(a.display_order) || 0;
    if (a.is_active !== undefined) payload.is_active = a.is_active;
    const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}
