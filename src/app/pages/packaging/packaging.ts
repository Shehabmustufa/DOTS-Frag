import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PackagingService, PackagingItem } from '../../core/services/packaging';

@Component({
  selector: 'app-packaging',
  imports: [CommonModule, FormsModule],
  templateUrl: './packaging.html',
  styleUrl: './packaging.scss',
})
export class Packaging implements OnInit {
  items: PackagingItem[] = [];
  error = '';
  loading = false;

  showModal = false;
  isEdit = false;
  editId: number | null = null;
  form: Partial<PackagingItem> = { name: '', type: '', max_count: 0, remaining_count: 0 };

  showRestockModal = false;
  restockId: number | null = null;
  restockName = '';
  restockQty = 0;

  constructor(private svc: PackagingService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      this.items = await this.svc.getAll();
    } catch (e: any) {
      this.error = e?.message || 'Failed to load';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  getPercentage(item: PackagingItem): number {
    if (item.max_count === 0) return 0;
    return Math.round((item.remaining_count / item.max_count) * 100);
  }

  getStatusColor(item: PackagingItem): string {
    const pct = this.getPercentage(item);
    if (pct === 0) return 'status-empty';
    if (pct <= 30) return 'status-low';
    if (pct <= 70) return 'status-medium';
    return 'status-high';
  }

  openAdd() {
    this.isEdit = false;
    this.editId = null;
    this.form = { name: '', type: '', max_count: 0, remaining_count: 0 };
    this.showModal = true;
  }

  openEdit(item: PackagingItem) {
    this.isEdit = true;
    this.editId = item.id!;
    this.form = { name: item.name, type: item.type, max_count: item.max_count, remaining_count: item.remaining_count };
    this.showModal = true;
  }

  openRestock(item: PackagingItem) {
    this.restockId = item.id!;
    this.restockName = item.name;
    this.restockQty = 0;
    this.showRestockModal = true;
  }

  async save() {
    this.error = '';
    if (!this.form.name?.trim() || !this.form.type?.trim()) {
      this.error = 'Name and Type are required.';
      return;
    }
    try {
      if (this.isEdit && this.editId) {
        await this.svc.update(this.editId, this.form);
      } else {
        await this.svc.create(this.form);
      }
      this.showModal = false;
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Save failed';
      this.cdr.markForCheck();
    }
  }

  async saveRestock() {
    this.error = '';
    if (!this.restockId || this.restockQty <= 0) {
      this.error = 'Enter a positive quantity.';
      return;
    }
    try {
      await this.svc.restock(this.restockId, this.restockQty);
      this.showRestockModal = false;
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Restock failed';
      this.cdr.markForCheck();
    }
  }

  async remove(id: number) {
    if (!confirm('Delete this packaging item? It will be removed from all orders.')) return;
    try {
      await this.svc.delete(id);
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Delete failed';
      this.cdr.markForCheck();
    }
  }
}
