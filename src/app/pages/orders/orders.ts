import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../core/services/order';
import { CustomerService, Customer } from '../../core/services/customer';
import { PerfumeService, Perfume } from '../../core/services/perfume';
import { CostService } from '../../core/services/cost';

interface DayGroup {
  date: string;
  label: string;
  orders: Order[];
  revenue: number;
  page: number;
}

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
  revenueFilter: 'all' | 'week' | 'month' = 'all';
  pageSize = 10;

  showModal = false;
  selectedCustomerId: number | null = null;
  items: { perfume_id: number | null; decant_size_ml: 5 | 10 | 30; quantity: number }[] = [];
  orderDiscount = 0;
  orderIsGift = false;
  expandedOrderId: number | null = null;

  customerSearch = '';
  customerDropdownOpen = false;
  perfumeSearches: string[] = [];
  perfumeDropdownOpen: number | null = null;

  constructor(
    private svc: OrderService,
    private customerSvc: CustomerService,
    private perfumeSvc: PerfumeService,
    private costSvc: CostService,
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
    let result = this.orders;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(o =>
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.mobile_number?.includes(q) ||
        String(o.id).includes(q)
      );
    }

    const now = new Date();
    if (this.revenueFilter === 'week') {
      const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      result = result.filter(o => new Date(o.created_at!) >= weekAgo);
    } else if (this.revenueFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      result = result.filter(o => new Date(o.created_at!) >= monthAgo);
    }

    return result;
  }

  get totalRevenue(): number {
    return this.filteredOrders.reduce((s, o) => s + this.orderTotal(o), 0);
  }

  get totalOrders(): number {
    return this.filteredOrders.length;
  }

  get dayGroups(): DayGroup[] {
    const map = new Map<string, Order[]>();
    for (const o of this.filteredOrders) {
      const d = new Date(o.created_at!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    const groups: DayGroup[] = [];
    for (const [date, orders] of map) {
      const d = new Date(date + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      groups.push({
        date,
        label,
        orders,
        revenue: orders.reduce((s, o) => s + this.orderTotal(o), 0),
        page: 1,
      });
    }
    groups.sort((a, b) => b.date.localeCompare(a.date));
    return groups;
  }

  getPagedOrders(group: DayGroup): Order[] {
    const start = (group.page - 1) * this.pageSize;
    return group.orders.slice(start, start + this.pageSize);
  }

  totalPages(group: DayGroup): number {
    return Math.ceil(group.orders.length / this.pageSize);
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
      (p.brand?.name || '').toLowerCase().includes(q) ||
      (p.brand?.company?.name || '').toLowerCase().includes(q)
    );
  }

  selectCustomer(c: Customer) {
    this.selectedCustomerId = c.id!;
    this.customerSearch = `${c.name} (${c.mobile_number})`;
    this.customerDropdownOpen = false;
  }

  selectPerfume(index: number, p: Perfume) {
    this.items[index].perfume_id = p.id!;
    this.perfumeSearches[index] = p.brand?.name || `Perfume #${p.id}`;
    this.perfumeDropdownOpen = null;
  }

  openAdd() {
    this.selectedCustomerId = null;
    this.customerSearch = '';
    this.items = [{ perfume_id: null, decant_size_ml: 5, quantity: 1 }];
    this.perfumeSearches = [''];
    this.orderDiscount = 0;
    this.orderIsGift = false;
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
    const subtotal = o.order_items.reduce((sum, item) => {
      if (!item.perfume) return sum;
      let price = 0;
      if (item.decant_size_ml === 5) price = Number(item.perfume.price_5ml);
      else if (item.decant_size_ml === 10) price = Number(item.perfume.price_10ml);
      else if (item.decant_size_ml === 30) price = Number(item.perfume.price_30ml);
      return sum + price * item.quantity;
    }, 0);
    const discount = Number(o.discount_percentage) || 0;
    return Math.round(subtotal * (1 - discount / 100));
  }

  getNewOrderSubtotal(): number {
    return this.items.reduce((sum, item) => {
      if (!item.perfume_id) return sum;
      const p = this.perfumes.find(pf => pf.id === item.perfume_id);
      if (!p) return sum;
      let price = 0;
      if (item.decant_size_ml === 5) price = Number(p.price_5ml);
      else if (item.decant_size_ml === 10) price = Number(p.price_10ml);
      else if (item.decant_size_ml === 30) price = Number(p.price_30ml);
      return sum + price * item.quantity;
    }, 0);
  }

  getNewOrderTotal(): number {
    const subtotal = this.getNewOrderSubtotal();
    return Math.round(subtotal * (1 - (this.orderDiscount || 0) / 100));
  }

  async save() {
    this.error = '';
    if (!this.selectedCustomerId) { this.error = 'Please select a customer.'; return; }
    const validItems = this.items.filter(i => i.perfume_id !== null) as { perfume_id: number; decant_size_ml: 5 | 10 | 30; quantity: number }[];
    if (!validItems.length) { this.error = 'Add at least one item.'; return; }
    try {
      await this.svc.create(this.selectedCustomerId, validItems, this.orderDiscount, this.orderIsGift);

      if (this.orderIsGift) {
        const total = this.getNewOrderTotal();
        const customer = this.customers.find(c => c.id === this.selectedCustomerId);
        await this.costSvc.create({
          title: `Gift order for ${customer?.name || 'customer'}`,
          category: 'gift',
          amount: total,
          payment_status: 'paid',
        });
      }

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
