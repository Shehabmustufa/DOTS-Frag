import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../core/services/customer';

@Component({
  selector: 'app-customers',
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class Customers implements OnInit {
  customers: Customer[] = [];
  error = '';
  loading = false;

  showModal = false;
  isEdit = false;
  editId: number | null = null;
  form: Partial<Customer> = { name: '', mobile_number: '', location: '', found_via: 'direct' };

  foundViaOptions = ['direct', 'social media', 'referral', 'search', 'other'];

  constructor(private svc: CustomerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      this.customers = await this.svc.getAll();
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
    this.form = { name: '', mobile_number: '', location: '', found_via: 'direct' };
    this.showModal = true;
  }

  openEdit(c: Customer) {
    this.isEdit = true;
    this.editId = c.id!;
    this.form = { name: c.name, mobile_number: c.mobile_number, location: c.location, found_via: c.found_via };
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
    if (!confirm('Delete this customer?')) return;
    try { await this.svc.delete(id); await this.load(); }
    catch (e: any) { this.error = e.message; this.cdr.markForCheck(); }
  }
}
