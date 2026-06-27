import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../core/services/customer';
import { OrderService, Order } from '../../core/services/order';

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

  showOrdersModal = false;
  selectedCustomer: Customer | null = null;
  customerOrders: Order[] = [];
  loadingOrders = false;

  constructor(
    private svc: CustomerService,
    private orderSvc: OrderService,
    private cdr: ChangeDetectorRef
  ) {}

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

  async viewOrders(c: Customer) {
    this.selectedCustomer = c;
    this.customerOrders = [];
    this.loadingOrders = true;
    this.showOrdersModal = true;
    try {
      this.customerOrders = await this.orderSvc.getByCustomer(c.id!);
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loadingOrders = false;
      this.cdr.markForCheck();
    }
  }

  orderTotal(o: Order): number {
    if (!o.order_items) return 0;
    return o.order_items.reduce((sum, item) => {
      if (!item.perfume) return sum;
      let price = 0;
      if (item.decant_size_ml === 5) price = Number(item.perfume.price_5ml);
      else if (item.decant_size_ml === 10) price = Number(item.perfume.price_10ml);
      else if (item.decant_size_ml === 30) price = Number(item.perfume.price_30ml);
      return sum + price * item.quantity;
    }, 0);
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
