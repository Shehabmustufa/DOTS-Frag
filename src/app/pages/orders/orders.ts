import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../core/services/order';
import { CustomerService, Customer } from '../../core/services/customer';
import { PerfumeService, Perfume } from '../../core/services/perfume';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnInit {
  orders: Order[] = [];
  customers: Customer[] = [];
  perfumes: Perfume[] = [];
  error = '';
  loading = false;

  showModal = false;
  selectedCustomerId: number | null = null;
  items: { perfume_id: number | null; decant_size_ml: 5 | 10; quantity: number }[] = [];
  expandedOrderId: number | null = null;

  constructor(
    private svc: OrderService,
    private customerSvc: CustomerService,
    private perfumeSvc: PerfumeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      [this.orders, this.customers, this.perfumes] = await Promise.all([
        this.svc.getAll(),
        this.customerSvc.getAll(),
        this.perfumeSvc.getAll()
      ]);
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  openAdd() {
    this.selectedCustomerId = null;
    this.items = [{ perfume_id: null, decant_size_ml: 5, quantity: 1 }];
    this.showModal = true;
  }

  addItem() { this.items.push({ perfume_id: null, decant_size_ml: 5, quantity: 1 }); }
  removeItem(i: number) { this.items.splice(i, 1); }

  orderTotal(o: Order): number {
    if (!o.order_items) return 0;
    return o.order_items.reduce((sum, item) => {
      if (!item.perfume) return sum;
      const price = item.decant_size_ml === 5 ? Number(item.perfume.price_5ml) : Number(item.perfume.price_10ml);
      return sum + price * item.quantity;
    }, 0);
  }

  async save() {
    this.error = '';
    if (!this.selectedCustomerId) { this.error = 'Please select a customer.'; return; }
    const validItems = this.items.filter(i => i.perfume_id !== null) as { perfume_id: number; decant_size_ml: 5 | 10; quantity: number }[];
    if (!validItems.length) { this.error = 'Add at least one item.'; return; }
    try {
      await this.svc.create(this.selectedCustomerId, validItems);
      this.showModal = false;
      await this.load();
    } catch (e: any) {
      this.error = e.message;
      this.cdr.markForCheck();
    }
  }

  async updateStatus(o: Order, status: Order['order_status']) {
    try { await this.svc.updateStatus(o.id!, status); await this.load(); }
    catch (e: any) { this.error = e.message; this.cdr.markForCheck(); }
  }

  async remove(id: number) {
    if (!confirm('Delete this order?')) return;
    try { await this.svc.delete(id); await this.load(); }
    catch (e: any) { this.error = e.message; this.cdr.markForCheck(); }
  }

  toggleExpand(id: number) {
    this.expandedOrderId = this.expandedOrderId === id ? null : id;
  }
}
