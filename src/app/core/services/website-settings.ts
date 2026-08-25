import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface WebsiteSettings {
  id: number;
  logo_url: string | null;
  announcement_text: string;
  announcement_bg_color: string;
  announcement_text_color: string;
  announcement_enabled: boolean;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class WebsiteSettingsService {
  constructor(private supa: SupabaseService) {}

  async get(): Promise<WebsiteSettings> {
    const { data, error } = await this.supa.client
      .from('website_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data as WebsiteSettings;
  }

  async update(settings: Partial<WebsiteSettings>): Promise<void> {
    const payload: any = { updated_at: new Date().toISOString() };
    if (settings.logo_url !== undefined) payload.logo_url = settings.logo_url;
    if (settings.announcement_text !== undefined) payload.announcement_text = settings.announcement_text;
    if (settings.announcement_bg_color !== undefined) payload.announcement_bg_color = settings.announcement_bg_color;
    if (settings.announcement_text_color !== undefined) payload.announcement_text_color = settings.announcement_text_color;
    if (settings.announcement_enabled !== undefined) payload.announcement_enabled = settings.announcement_enabled;

    const { error } = await this.supa.client
      .from('website_settings')
      .update(payload)
      .eq('id', 1);
    if (error) throw error;
  }

  async uploadLogo(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const path = `logo/logo.${ext}`;

    const { error } = await this.supa.client.storage
      .from('website')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  }

  getPublicUrl(path: string): string {
    const { data } = this.supa.client.storage.from('website').getPublicUrl(path);
    return data.publicUrl;
  }
}
