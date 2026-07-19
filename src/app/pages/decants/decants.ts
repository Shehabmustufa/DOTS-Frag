import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DecantService, Decant } from '../../core/services/decant';

@Component({
  selector: 'app-decants',
  imports: [CommonModule],
  templateUrl: './decants.html',
  styleUrl: './decants.scss',
})
export class Decants implements OnInit {
  decants: Decant[] = [];
  error = '';
  loading = false;

  constructor(private svc: DecantService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      this.decants = await this.svc.getAll();
    } catch (e: any) {
      this.error = e?.message || 'Failed to load';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  get groupedDecants(): { perfumeName: string; company: string; items: Decant[] }[] {
    const map = new Map<number, { perfumeName: string; company: string; items: Decant[] }>();
    for (const d of this.decants) {
      if (!map.has(d.perfume_id)) {
        map.set(d.perfume_id, {
          perfumeName: d.perfume?.brand?.name || 'Unknown',
          company: d.perfume?.brand?.company?.name || '',
          items: [],
        });
      }
      map.get(d.perfume_id)!.items.push(d);
    }
    return Array.from(map.values());
  }

  getTotalMl(items: Decant[]): number {
    return items.reduce((sum, d) => sum + d.size_ml * d.quantity, 0);
  }

  async remove(d: Decant) {
    if (!confirm(`Delete this ${d.size_ml}ml decant entry?`)) return;
    try {
      await this.svc.delete(d.id!);
      this.decants = this.decants.filter(x => x.id !== d.id);
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e?.message || 'Delete failed';
      this.cdr.markForCheck();
    }
  }
}
