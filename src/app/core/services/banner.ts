import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { compressImage } from '../utils/image';

export interface Banner {
  id?: number;
  image_path: string;
  /** Optional dedicated image for phones; falls back to image_path when null. */
  mobile_image_path?: string | null;
  title?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class BannerService {
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Banner[]> {
    const { data, error } = await this.supa.client
      .from('homepage_banners')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data as Banner[]) || [];
  }

  async create(banner: Partial<Banner>): Promise<void> {
    const payload = {
      image_path: banner.image_path!,
      mobile_image_path: banner.mobile_image_path || null,
      title: banner.title || null,
      subtitle: banner.subtitle || null,
      button_text: banner.button_text || null,
      button_link: banner.button_link || null,
      display_order: banner.display_order || 0,
      is_active: banner.is_active ?? true,
    };
    const { error } = await this.supa.client.from('homepage_banners').insert([payload]);
    if (error) throw error;
  }

  async update(id: number, banner: Partial<Banner>): Promise<void> {
    const payload: any = { updated_at: new Date().toISOString() };
    if (banner.image_path !== undefined) payload.image_path = banner.image_path;
    if (banner.mobile_image_path !== undefined) payload.mobile_image_path = banner.mobile_image_path || null;
    if (banner.title !== undefined) payload.title = banner.title || null;
    if (banner.subtitle !== undefined) payload.subtitle = banner.subtitle || null;
    if (banner.button_text !== undefined) payload.button_text = banner.button_text || null;
    if (banner.button_link !== undefined) payload.button_link = banner.button_link || null;
    if (banner.display_order !== undefined) payload.display_order = banner.display_order;
    if (banner.is_active !== undefined) payload.is_active = banner.is_active;

    const { error } = await this.supa.client.from('homepage_banners').update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from('homepage_banners').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadImage(file: File, variant: 'desktop' | 'mobile' = 'desktop'): Promise<string> {
    const compressed = await compressImage(file, variant === 'mobile' ? 1200 : 1920, 0.82);
    const path = `banners/${variant === 'mobile' ? 'mobile-' : ''}${Date.now()}.webp`;

    const { error } = await this.supa.client.storage
      .from('website')
      .upload(path, compressed, { contentType: 'image/webp', cacheControl: '31536000' });
    if (error) throw error;
    return path;
  }

  async deleteImage(path: string): Promise<void> {
    await this.supa.client.storage.from('website').remove([path]);
  }

  getPublicUrl(path: string): string {
    const { data } = this.supa.client.storage.from('website').getPublicUrl(path);
    return data.publicUrl;
  }
}
