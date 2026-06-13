import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CostService, Cost, CostCategory } from '../../core/services/cost';

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

  categories: CostCategory[] = ['perfume_bottle','marketing_ads','syringes','vials_5ml','vials_10ml','packaging','other'];

  get totalCosts() { return this.costs.reduce((s, c) => s + Number(c.amount), 0); }
  get unpaidTotal() { return this.costs.filter(c => c.payment_status === 'pending').reduce((s, c) => s + Number(c.amount), 0); }

  constructor(private svc: CostService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

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
      if (this.isEdit && this.editId) await this.svc.update(this.editId, this.form);
      else await this.svc.create(this.form);
      this.showModal = false;
      await this.load();
    } catch (e: any) {
      this.error = e.message;
      this.cdr.markForCheck();
    }
  }

  async remove(id: number) {
    if (!confirm('Delete this cost?')) return;
    try { await this.svc.delete(id); await this.load(); }
    catch (e: any) { this.error = e.message; this.cdr.markForCheck(); }
  }
}
