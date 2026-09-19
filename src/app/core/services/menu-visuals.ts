import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { compressImage } from '../utils/image';

export interface MenuVisual {
  slot: string;
  image_path: string | null;
  overlay_opacity: number;
  is_enabled: boolean;
  updated_at?: string;
}

/** Header-dropdown background slots, in dashboard display order. */
export const MENU_VISUAL_GROUPS: { label: string; slots: { slot: string; label: string; hint: string }[] }[] = [
  {
    label: 'Shop menu',
    slots: [
      { slot: 'shop_bg', label: 'Menu background', hint: 'Behind the whole Shop dropdown. ~1600×500px.' },
      { slot: 'shop_button', label: 'Link background', hint: 'Behind each link in the Shop dropdown. ~320×90px, tileable or simple.' },
      { slot: 'shop_col_collections', label: 'Collections column', hint: 'Behind the Collections column. ~420×420px.' },
      { slot: 'shop_col_category', label: 'Category column', hint: 'Behind the Category column. ~420×420px.' },
      { slot: 'shop_col_brands', label: 'Brands column', hint: 'Behind the Shop-by-Brand column. ~600×420px.' },
    ],
  },
  {
    label: 'Full Bottles menu',
    slots: [
      { slot: 'full_bottles_bg', label: 'Menu background', hint: 'Behind the whole Full Bottles dropdown. ~1600×300px.' },
      { slot: 'full_bottles_button', label: 'Link background', hint: 'Behind each gender card. ~320×160px.' },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class MenuVisualsService {
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<MenuVisual[]> {
    const { data, error } = await this.supa.client
      .from('website_menu_visuals')
      .select('*');
    if (error) throw error;
    return (data as MenuVisual[]) || [];
  }

  /** Upsert so a slot works even if the phase-5 seed row is missing. */
  async update(slot: string, patch: Partial<MenuVisual>): Promise<void> {
    const payload: any = { slot, updated_at: new Date().toISOString() };
    if (patch.image_path !== undefined) payload.image_path = patch.image_path;
    if (patch.overlay_opacity !== undefined) payload.overlay_opacity = Number(patch.overlay_opacity);
    if (patch.is_enabled !== undefined) payload.is_enabled = patch.is_enabled;

    const { error } = await this.supa.client
      .from('website_menu_visuals')
      .upsert(payload, { onConflict: 'slot' });
    if (error) throw error;
  }

  async uploadImage(slot: string, file: File): Promise<string> {
    const compressed = await compressImage(file, 1600, 0.85);
    const path = `menu/${slot}-${Date.now()}.webp`;
    const { error } = await this.supa.client.storage
      .from('website')
      .upload(path, compressed, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
    if (error) throw error;
    return path;
  }

  async deleteImage(path: string): Promise<void> {
    await this.supa.client.storage.from('website').remove([path]);
  }

  getPublicUrl(path: string): string {
    return this.supa.client.storage.from('website').getPublicUrl(path).data.publicUrl;
  }
}
