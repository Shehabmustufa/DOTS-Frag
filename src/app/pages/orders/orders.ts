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

  searchQuery = '';
  showModal = false;
  selectedCustomerId: number | null = null;
  items: { perfume_id: number | null; decant_size_ml: 5 | 10 | 30; quantity: number }[] = [];
  expandedOrderId: number | null = null;

  customerSearch = '';
  customerDropdownOpen = false;
  perfumeSearches: string[] = [];
  perfumeDropdownOpen: number | null = null;

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

  get filteredOrders(): Order[] {
    if (!this.searchQuery.trim()) return this.orders;
    const q = this.searchQuery.toLowerCase().trim();
    return this.orders.filter(o =>
      o.customer?.name?.toLowerCase().includes(q) ||
      o.customer?.mobile_number?.includes(q) ||
      String(o.id).includes(q)
    );
  }

  get filteredCustomers(): Customer[] {
    if (!this.customerSearch.trim()) return this.customers;
    const q = this.customerSearch.toLowerCase().trim();
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.mobile_number.includes(q)
    );
  }

  getFilteredPerfumes(index: number): Perfume[] {
    const q = (this.perfumeSearches[index] || '').toLowerCase().trim();
    if (!q) return this.perfumes;
    return this.perfumes.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand?.name || '').toLowerCase().includes(q)
    );
  }

  selectCustomer(c: Customer) {
    this.selectedCustomerId = c.id!;
    this.customerSearch = `${c.name} (${c.mobile_number})`;
    this.customerDropdownOpen = false;
  }

  selectPerfume(index: number, p: Perfume) {
    this.items[index].perfume_id = p.id!;
    this.perfumeSearches[index] = `${p.brand?.name || ''} - ${p.name}`;
    this.perfumeDropdownOpen = null;
  }

  openAdd() {
    this.selectedCustomerId = null;
    this.customerSearch = '';
    this.items = [{ perfume_id: null, decant_size_ml: 5, quantity: 1 }];
    this.perfumeSearches = [''];
    this.showModal = true;
  }

  addItem() {
    this.items.push({ perfume_id: null, decant_size_ml: 5, quantity: 1 });
    this.perfumeSearches.push('');
  }

  removeItem(i: number) {
    this.items.splice(i, 1);
    this.perfumeSearches.splice(i, 1);
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

  async save() {
    this.error = '';
    if (!this.selectedCustomerId) { this.error = 'Please select a customer.'; return; }
    const validItems = this.items.filter(i => i.perfume_id !== null) as { perfume_id: number; decant_size_ml: 5 | 10 | 30; quantity: number }[];
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
