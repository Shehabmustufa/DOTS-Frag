import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export type DeficitReason = 'lackage' | 'failed' | 'other';

export interface DeficitReport {
  id?: number;
  perfume_id: number;
  ml: number;
  reason: DeficitReason;
  note?: string | null;
  created_at?: string;
  perfume?: { brand: { name: string; company: { name: string } } };
}

@Injectable({ providedIn: 'root' })
export class DeficitReportService {
  private table = 'deficit_reports';
  constructor(private supa: SupabaseService) {}

  async getByPerfume(perfumeId: number): Promise<DeficitReport[]> {
    const { data, error } = await this.supa.client
      .from(this.table)
      .select('*')
      .eq('perfume_id', perfumeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DeficitReport[]) || [];
  }

  async create(r: Partial<DeficitReport>): Promise<void> {
    const payload = {
      perfume_id: Number(r.perfume_id),
      ml: Number(r.ml),
      reason: r.reason,
      note: r.note?.trim() || null,
    };
    const { error } = await this.supa.client.from(this.table).insert([payload]);
    if (error) throw error;
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supa.client.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}
