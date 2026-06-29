import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CostService, Cost, CostCategory } from '../../core/services/cost';

interface DayGroup {
  date: string;
  label: string;
  costs: Cost[];
  total: number;
  page: number;
}

@Component({
  selector: 'app-costs',
  imports: [CommonModule, FormsModule],
  templateUrl: './costs.html',
  styleUrl: './costs.scss',
})
export class Costs implements OnInit {
  costs: Cost[] = [];
  error = '';
  loading = false;

  showModal = false;
  isEdit = false;
  editId: number | null = null;
  form: Partial<Cost> = { title: '', category: 'other', amount: 0, payment_status: 'paid' };

  categories: CostCategory[] = ['perfume_bottle','marketing_ads','syringes','vials_5ml','vials_10ml','packaging','gift','other'];

  filterFrom = '';
  filterTo = '';
  pageSize = 10;

  constructor(private svc: CostService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  get filteredCosts(): Cost[] {
    let result = this.costs;
    if (this.filterFrom) {
      const from = new Date(this.filterFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(c => new Date(c.created_at!) >= from);
    }
    if (this.filterTo) {
      const to = new Date(this.filterTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(c => new Date(c.created_at!) <= to);
    }
    return result;
  }

  get totalPaid(): number {
    return this.filteredCosts
      .filter(c => c.payment_status === 'paid')
      .reduce((s, c) => s + Number(c.amount), 0);
  }

  get totalPending(): number {
    return this.filteredCosts
      .filter(c => c.payment_status === 'pending')
      .reduce((s, c) => s + Number(c.amount), 0);
  }

  get totalAll(): number {
    return this.filteredCosts.reduce((s, c) => s + Number(c.amount), 0);
  }

  get dayGroups(): DayGroup[] {
    const map = new Map<string, Cost[]>();
    for (const c of this.filteredCosts) {
      const d = new Date(c.created_at!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    const groups: DayGroup[] = [];
    for (const [date, costs] of map) {
      const d = new Date(date + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      groups.push({
        date,
        label,
        costs,
        total: costs.reduce((s, c) => s + Number(c.amount), 0),
        page: 1,
      });
    }
    groups.sort((a, b) => b.date.localeCompare(a.date));
    return groups;
  }

  getPagedCosts(group: DayGroup): Cost[] {
    const start = (group.page - 1) * this.pageSize;
    return group.costs.slice(start, start + this.pageSize);
  }

  totalPages(group: DayGroup): number {
    return Math.ceil(group.costs.length / this.pageSize);
  }

  clearFilters() {
    this.filterFrom = '';
    this.filterTo = '';
  }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      this.costs = await this.svc.getAll();
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  openAdd() {
    this.isEdit = false;
    this.editId = null;
    this.form = { title: '', category: 'other', amount: 0, payment_status: 'paid' };
    this.showModal = true;
  }

  openEdit(c: Cost) {
    this.isEdit = true;
    this.editId = c.id!;
    this.form = { title: c.title, category: c.category, amount: c.amount, payment_status: c.payment_status };
    this.showModal = true;
  }

  async save() {
    this.error = '';
    try {
      if (this.isEdit && this.editId) {
        await this.svc.update(this.editId, this.form);
        const idx = this.costs.findIndex(c => c.id === this.editId);
        if (idx !== -1) Object.assign(this.costs[idx], this.form);
        this.costs = [...this.costs];
      } else {
        await this.svc.create(this.form);
        await this.load();
      }
      this.showModal = false;
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e.message;
      this.cdr.markForCheck();
    }
  }

  async remove(id: number) {
    if (!confirm('Delete this cost?')) return;
    try {
      await this.svc.delete(id);
      this.costs = this.costs.filter(c => c.id !== id);
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e.message;
      this.cdr.markForCheck();
    }
  }
}
