import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { compressImage } from '../utils/image';

export interface Brand {
  id?: number;
  name: string;
  company_id: number;
  company?: { name: string };
  description?: string;
  cost_price?: number | null;
  full_bottle_price?: number | null;
  full_bottle_sale_price?: number | null;
  gender?: 'men' | 'women' | 'unisex';
  created_at?: string;
}

export interface BrandImage {
  id?: number;
  brand_id: number;
  image_path: string;
  display_order: number;
  created_at?: string;
}

export const MAX_BRAND_IMAGES = 6;

@Injectable({ providedIn: 'root' })
export class BrandService {
  private table = 'brands';
  constructor(private supa: SupabaseService) {}

  async getAll(): Promise<Brand[]> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*, company:companies(name)')
      .order('name');
    if (error) throw error;
    return data as Brand[];
  }

  async getByCompany(companyId: number): Promise<Brand[]> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*, company:companies(name)')
      .eq('company_id', companyId)
      .order('name');
    if (error) throw error;
    return data as Brand[];
  }

  async create(b: Partial<Brand>): Promise<void> {
    if (!b.company_id) throw new Error('Company is required');
    const payload = {
      name: String(b.name).trim(),
      company_id: Number(b.company_id),
      description: b.description || null,
      gender: b.gender || 'unisex',
    };
    const { error } = await this.supa.client.from(this.table).insert([payload]);
    if (error) throw error;
  }

  async update(id: number, b: Partial<Brand>): Promise<void> {
    const payload: any = {};
    if (b.name !== undefined) payload.name = String(b.name).trim();
    if (b.company_id !== undefined) payload.company_id = Number(b.company_id);
    if (b.description !== undefined) payload.description = b.description || null;
    if (b.gender !== undefined) payload.gender = b.gender;
    if (b.cost_price !== undefined) payload.cost_price = b.cost_price === null || b.cost_price === ('' as any) ? null : Number(b.cost_price);
    if (b.full_bottle_price !== undefined) payload.full_bottle_price = b.full_bottle_price === null || b.full_bottle_price === ('' as any) ? null : Number(b.full_bottle_price);
    if (b.full_bottle_sale_price !== undefined) payload.full_bottle_sale_price = b.full_bottle_sale_price === null || b.full_bottle_sale_price === ('' as any) ? null : Number(b.full_bottle_sale_price);
    const { error } = await this.supa.client.from(this.table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  // --- Image gallery ---

  async getImages(brandId: number): Promise<BrandImage[]> {
    const { data, error } = await this.supa.client
      .from('brand_images')
      .select('*')
      .eq('brand_id', brandId)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data as BrandImage[]) || [];
  }

  async uploadImage(file: File, brandId: number, existingCount: number): Promise<BrandImage> {
    if (existingCount >= MAX_BRAND_IMAGES) {
      throw new Error(`Maximum ${MAX_BRAND_IMAGES} images per brand`);
    }
    const compressed = await compressImage(file, 1000, 0.85);
    const path = `brand-images/${brandId}/${Date.now()}.webp`;
    const { error: uploadError } = await this.supa.client.storage
      .from('website')
      .upload(path, compressed, { contentType: 'image/webp' });
    if (uploadError) throw uploadError;

    const { data, error } = await this.supa.client
      .from('brand_images')
      .insert([{ brand_id: brandId, image_path: path, display_order: existingCount }])
      .select()
      .single();
    if (error) throw error;
    return data as BrandImage;
  }

  async deleteImage(image: BrandImage): Promise<void> {
    await this.supa.client.storage.from('website').remove([image.image_path]);
    const { error } = await this.supa.client.from('brand_images').delete().eq('id', image.id!);
    if (error) throw error;
  }

  async reorderImages(images: BrandImage[]): Promise<void> {
    await Promise.all(
      images.map((img, index) =>
        this.supa.client.from('brand_images').update({ display_order: index }).eq('id', img.id!)
      )
    );
  }

  getImageUrl(path: string): string {
    return this.supa.client.storage.from('website').getPublicUrl(path).data.publicUrl;
  }
}
