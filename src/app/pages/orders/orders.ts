import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order, OrderItem } from '../../core/services/order';
import { CustomerService, Customer } from '../../core/services/customer';
import { PerfumeService, Perfume } from '../../core/services/perfume';
import { BrandService, Brand } from '../../core/services/brand';
import { CostService } from '../../core/services/cost';
import { DecantService } from '../../core/services/decant';
import { PackagingService, PackagingItem } from '../../core/services/packaging';

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
  brands: Brand[] = [];
  packagingItems: PackagingItem[] = [];
  decantInventory = new Map<string, number>();
  error = '';
  loading = false;

  private readonly ownerNumbers = new Set(['01127755134', '01113171088', '01148400440', '01010459780']);

  filteredOrders: Order[] = [];
  totalRevenue = 0;
  totalOrders = 0;
  totalCollected = 0;
  dayGroups: DayGroup[] = [];

  private _filterOwner: '' | 'exclude' | 'only' = '';
  get filterOwner() { return this._filterOwner; }
  set filterOwner(val: '' | 'exclude' | 'only') {
    this._filterOwner = val;
    this.applyFiltersAndGrouping();
  }

  private _filterStatus: '' | 'placed' | 'delivery' | 'delivered' | 'cancelled' = '';
  get filterStatus() { return this._filterStatus; }
  set filterStatus(val: '' | 'placed' | 'delivery' | 'delivered' | 'cancelled') {
    this._filterStatus = val;
    this.applyFiltersAndGrouping();
  }

  isOwnerOrder(o: Order): boolean {
    return !!o.customer?.mobile_number && this.ownerNumbers.has(o.customer.mobile_number);
  }

  private _searchQuery = '';
  get searchQuery() { return this._searchQuery; }
  set searchQuery(val: string) {
    this._searchQuery = val;
    this.applyFiltersAndGrouping();
  }

  private _filterFrom = '';
  get filterFrom() { return this._filterFrom; }
  set filterFrom(val: string) {
    this._filterFrom = val;
    this.applyFiltersAndGrouping();
  }

  private _filterTo = '';
  get filterTo() { return this._filterTo; }
  set filterTo(val: string) {
    this._filterTo = val;
    this.applyFiltersAndGrouping();
  }

  private _filterCollected: '' | 'yes' | 'no' = '';
  get filterCollected() { return this._filterCollected; }
  set filterCollected(val: '' | 'yes' | 'no') {
    this._filterCollected = val;
    this.applyFiltersAndGrouping();
  }

  private _filterSource: '' | 'website' | 'dashboard' | 'needs_cost' | 'unconfirmed' = '';
  get filterSource() { return this._filterSource; }
  set filterSource(val: '' | 'website' | 'dashboard' | 'needs_cost' | 'unconfirmed') {
    this._filterSource = val;
    this.applyFiltersAndGrouping();
  }

  /** Inline "set cost price" input state, keyed by order_item id. */
  costEdits: Record<number, number | null> = {};
  savingCostItemId: number | null = null;
  confirmingOrderId: number | null = null;

  pageSize = 10;
  showModal = false;
  selectedCustomerId: number | null = null;
  items: { perfume_id: number | null; brand_id: number | null; decant_size_ml: number; quantity: number; is_full_bottle: boolean; is_refundable_bottle: boolean; bottle_sale_price: number; bottle_cost_price: number }[] = [];
  newOrderPackaging: { packaging_item_id: number; quantity: number }[] = [];
  orderDiscount = 0;
  orderIsGift = false;
  expandedOrderId: number | null = null;

  editingPackagingOrderId: number | null = null;
  packagingEdit: { packaging_item_id: number; quantity: number }[] = [];

  customerSearch = '';
  customerDropdownOpen = false;
  perfumeSearches: string[] = [];
  perfumeDropdownOpen: number | null = null;

  constructor(
    private svc: OrderService,
    private customerSvc: CustomerService,
    private perfumeSvc: PerfumeService,
    private brandSvc: BrandService,
    private costSvc: CostService,
    private decantSvc: DecantService,
    private packagingSvc: PackagingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      const [orders, customers, perfumes, brands, decants, packaging] = await Promise.all([
        this.svc.getAll(),
        this.customerSvc.getAll(),
        this.perfumeSvc.getAll(),
        this.brandSvc.getAll(),
        this.decantSvc.getAll(),
        this.packagingSvc.getAll()
      ]);
      this.orders = orders;
      this.customers = customers;
      this.perfumes = perfumes;
      this.brands = brands;
      this.packagingItems = packaging;
      this.decantInventory = new Map();
      for (const d of decants) {
        const key = `${d.perfume_id}:${d.size_ml}`;
        this.decantInventory.set(key, (this.decantInventory.get(key) || 0) + d.size_ml * d.quantity);
      }
      this.applyFiltersAndGrouping();
    } catch (e: any) {
      this.error = e?.message || 'Unknown error';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  applyFiltersAndGrouping() {
    let result = this.orders;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(o =>
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.mobile_number?.includes(q) ||
        String(o.id).includes(q)
      );
    }

    if (this._filterOwner === 'exclude') {
      result = result.filter(o => !this.isOwnerOrder(o));
    } else if (this._filterOwner === 'only') {
      result = result.filter(o => this.isOwnerOrder(o));
    }

    if (this._filterStatus) {
      result = result.filter(o => o.order_status === this._filterStatus);
    }

    if (this._filterCollected === 'yes') {
      result = result.filter(o => o.is_money_collected);
    } else if (this._filterCollected === 'no') {
      result = result.filter(o => !o.is_money_collected);
    }

    if (this._filterSource === 'website') {
      result = result.filter(o => o.source === 'website');
    } else if (this._filterSource === 'dashboard') {
      result = result.filter(o => o.source !== 'website');
    } else if (this._filterSource === 'needs_cost') {
      result = result.filter(o => this.orderNeedsCost(o));
    } else if (this._filterSource === 'unconfirmed') {
      result = result.filter(o => this.isAwaitingConfirmation(o));
    }

    if (this._filterFrom) {
      const from = new Date(this._filterFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(o => new Date(o.created_at!) >= from);
    }
    if (this._filterTo) {
      const to = new Date(this._filterTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(o => new Date(o.created_at!) <= to);
    }

    this.filteredOrders = result;
    this.totalOrders = result.length;
    this.totalRevenue = result.reduce((s, o) => s + this.orderTotal(o), 0);
    this.totalCollected = result
      .filter(o => o.is_money_collected && o.order_status !== 'cancelled')
      .reduce((s, o) => s + this.orderTotal(o), 0);

    const map = new Map<string, Order[]>();
    for (const o of this.filteredOrders) {
      const d = new Date(o.created_at!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }

    const oldPages = new Map(this.dayGroups.map(g => [g.date, g.page]));
    const groups: DayGroup[] = [];
    for (const [date, orders] of map) {
      const d = new Date(date + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      groups.push({
        date, label, orders,
        revenue: orders.reduce((s, o) => s + this.orderTotal(o), 0),
        page: oldPages.get(date) || 1,
      });
    }
    groups.sort((a, b) => b.date.localeCompare(a.date));
    this.dayGroups = groups;
  }

  clearFilters() {
    this._filterFrom = '';
    this._filterTo = '';
    this._filterOwner = '';
    this._filterStatus = '';
    this._filterCollected = '';
    this._filterSource = '';
    this.applyFiltersAndGrouping();
  }

  /** A website order with a refundable bottle whose purchase cost hasn't been entered yet. */
  orderNeedsCost(o: Order): boolean {
    return o.source === 'website'
      && !!o.order_items?.some(i => i.is_refundable_bottle && !Number(i.bottle_cost_price));
  }

  /** A website order request whose inventory hasn't been deducted yet. */
  isAwaitingConfirmation(o: Order): boolean {
    return o.source === 'website' && !o.confirmed_at && o.order_status !== 'cancelled';
  }

  async confirmOrder(o: Order): Promise<void> {
    if (!o.id || this.confirmingOrderId) return;
    this.confirmingOrderId = o.id;
    this.error = '';
    this.cdr.markForCheck();
    try {
      await this.svc.confirmWebsiteOrder(o.id);
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Could not confirm order';
      this.cdr.markForCheck();
    } finally {
      this.confirmingOrderId = null;
      this.cdr.markForCheck();
    }
  }

  async saveItemCost(item: OrderItem): Promise<void> {
    const value = Number(this.costEdits[item.id!]);
    if (!item.id || !value || value <= 0) return;
    this.savingCostItemId = item.id;
    this.cdr.markForCheck();
    try {
      await this.svc.setItemCostPrice(item.id, value);
      item.bottle_cost_price = value;
      delete this.costEdits[item.id];
      this.applyFiltersAndGrouping();
    } catch (e: any) {
      this.error = e?.message || 'Failed to save cost price';
    } finally {
      this.savingCostItemId = null;
      this.cdr.markForCheck();
    }
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

  getFilteredBrands(index: number): Brand[] {
    const q = (this.perfumeSearches[index] || '').toLowerCase().trim();
    if (!q) return this.brands;
    return this.brands.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.company?.name || '').toLowerCase().includes(q)
    );
  }

  selectPerfume(index: number, p: Perfume) {
    this.items[index].perfume_id = p.id!;
    this.items[index].brand_id = null;
    this.perfumeSearches[index] = p.brand?.name || `Perfume #${p.id}`;
    this.perfumeDropdownOpen = null;
  }

  selectBrand(index: number, b: Brand) {
    this.items[index].brand_id = b.id!;
    this.items[index].perfume_id = null;
    this.perfumeSearches[index] = `${b.company?.name || ''} — ${b.name}`;
    this.perfumeDropdownOpen = null;
  }

  openAdd() {
    this.selectedCustomerId = null;
    this.customerSearch = '';
    this.items = [{ perfume_id: null, brand_id: null, decant_size_ml: 5, quantity: 1, is_full_bottle: false, is_refundable_bottle: false, bottle_sale_price: 0, bottle_cost_price: 0 }];
    this.perfumeSearches = [''];
    this.orderDiscount = 0;
    this.orderIsGift = false;
    this.newOrderPackaging = this.packagingItems.map(pi => ({
      packaging_item_id: pi.id!,
      quantity: 0
    }));
    this.showModal = true;
  }

  addItem() {
    this.items.push({ perfume_id: null, brand_id: null, decant_size_ml: 5, quantity: 1, is_full_bottle: false, is_refundable_bottle: false, bottle_sale_price: 0, bottle_cost_price: 0 });
    this.perfumeSearches.push('');
  }

  removeItem(i: number) {
    this.items.splice(i, 1);
    this.perfumeSearches.splice(i, 1);
  }

  orderTotal(o: Order): number {
    if (!o.order_items || o.order_status === 'cancelled') return 0;
    const subtotal = o.order_items.reduce((sum, item) => {
      if (item.is_refundable_bottle) {
        return sum + (Number(item.bottle_sale_price) - Number(item.bottle_cost_price)) * item.quantity;
      }
      if (!item.perfume) return sum;
      let price = 0;
      if (item.is_full_bottle) price = Number(item.perfume.price_original);
      else if (item.decant_size_ml === 5) price = Number(item.perfume.price_5ml);
      else if (item.decant_size_ml === 10) price = Number(item.perfume.price_10ml);
      else if (item.decant_size_ml === 30 || item.decant_size_ml === 35) price = Number(item.perfume.price_30ml);
      return sum + price * item.quantity;
    }, 0);
    return Math.round(subtotal * (1 - (Number(o.discount_percentage) || 0) / 100));
  }

  // perfumes.full_ml is the SUM of every bottle ever bought for that perfume
  // (maintained by add_perfume_bottle), not one bottle's size. Selling "a full
  // bottle" needs the size of a single bottle, so approximate it as the average
  // over every bottle bought — exact when all restocks are the same nominal size.
  nominalBottleMl(p: Perfume): number {
    return p.bottles_bought > 0 ? Math.round(p.full_ml / p.bottles_bought) : p.full_ml;
  }

  getItemPrice(item: { perfume_id: number | null; decant_size_ml: number; is_full_bottle: boolean; is_refundable_bottle: boolean; bottle_sale_price: number; bottle_cost_price: number }): number {
    if (item.is_refundable_bottle) {
      return (Number(item.bottle_sale_price) || 0) - (Number(item.bottle_cost_price) || 0);
    }
    if (!item.perfume_id) return 0;
    const p = this.perfumes.find(pf => pf.id === item.perfume_id);
    if (!p) return 0;
    if (item.is_full_bottle) return Number(p.price_original);
    if (item.decant_size_ml === 5) return Number(p.price_5ml);
    if (item.decant_size_ml === 10) return Number(p.price_10ml);
    if (item.decant_size_ml === 30 || item.decant_size_ml === 35) return Number(p.price_30ml);
    return 0;
  }

  getNewOrderSubtotal(): number {
    return this.items.reduce((sum, item) => sum + this.getItemPrice(item) * item.quantity, 0);
  }

  onSizeChange(item: { perfume_id: number | null; brand_id: number | null; decant_size_ml: number; is_full_bottle: boolean; is_refundable_bottle: boolean; bottle_sale_price: number; bottle_cost_price: number }, value: string) {
    const wasRefundable = item.is_refundable_bottle;
    if (value === 'refundable') {
      item.is_refundable_bottle = true;
      item.is_full_bottle = false;
      item.decant_size_ml = 0;
      if (!wasRefundable) {
        item.perfume_id = null;
        item.brand_id = null;
        const idx = this.items.indexOf(item as any);
        if (idx >= 0) this.perfumeSearches[idx] = '';
      }
    } else if (value === 'full') {
      item.is_refundable_bottle = false;
      item.is_full_bottle = true;
      if (wasRefundable) {
        item.brand_id = null;
        item.perfume_id = null;
        const idx = this.items.indexOf(item as any);
        if (idx >= 0) this.perfumeSearches[idx] = '';
      }
      const p = item.perfume_id ? this.perfumes.find(pf => pf.id === item.perfume_id) : null;
      item.decant_size_ml = p ? this.nominalBottleMl(p) : 0;
    } else {
      item.is_refundable_bottle = false;
      item.is_full_bottle = false;
      item.decant_size_ml = Number(value);
      if (wasRefundable) {
        item.brand_id = null;
        item.perfume_id = null;
        const idx = this.items.indexOf(item as any);
        if (idx >= 0) this.perfumeSearches[idx] = '';
      }
    }
  }

  getSizeValue(item: { decant_size_ml: number; is_full_bottle: boolean; is_refundable_bottle: boolean }): string {
    if (item.is_refundable_bottle) return 'refundable';
    return item.is_full_bottle ? 'full' : String(item.decant_size_ml);
  }

  getNewOrderTotal(): number {
    return Math.round(this.getNewOrderSubtotal() * (1 - (this.orderDiscount || 0) / 100));
  }

  // --- Packaging helpers ---

  getPackagingName(id: number): string {
    return this.packagingItems.find(p => p.id === id)?.name || 'Unknown';
  }

  getPackagingType(id: number): string {
    return this.packagingItems.find(p => p.id === id)?.type || '';
  }

  getPackagingAvailable(id: number): number {
    return this.packagingItems.find(p => p.id === id)?.remaining_count || 0;
  }

  startEditPackaging(o: Order) {
    this.editingPackagingOrderId = o.id!;
    this.packagingEdit = this.packagingItems.map(pi => {
      const existing = o.order_packaging?.find(op => op.packaging_item_id === pi.id!);
      return { packaging_item_id: pi.id!, quantity: existing?.quantity || 0 };
    });
  }

  async savePackaging(orderId: number) {
    this.error = '';
    const items = this.packagingEdit.filter(p => p.quantity > 0);
    try {
      await this.packagingSvc.saveOrderPackaging(orderId, items);
      this.editingPackagingOrderId = null;
      await this.load();
    } catch (e: any) {
      this.error = e.message;
      this.cdr.markForCheck();
    }
  }

  // --- Money collection ---

  async toggleCollected(o: Order) {
    try {
      const newValue = !o.is_money_collected;
      await this.svc.toggleMoneyCollected(o.id!, newValue);
      o.is_money_collected = newValue;
      this.totalCollected = this.filteredOrders
        .filter(x => x.is_money_collected && x.order_status !== 'cancelled')
        .reduce((s, x) => s + this.orderTotal(x), 0);
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e.message;
      this.cdr.markForCheck();
    }
  }

  // --- Save order ---

  async save() {
    this.error = '';
    if (!this.selectedCustomerId) { this.error = 'Please select a customer.'; return; }
    const validItems = this.items.filter(i => i.perfume_id !== null || i.brand_id !== null).map(i => {
      if (i.is_refundable_bottle) {
        return { ...i, perfume_id: null, brand_id: i.brand_id!, decant_size_ml: 0 };
      }
      if (i.is_full_bottle) {
        const p = this.perfumes.find(pf => pf.id === i.perfume_id);
        return { ...i, perfume_id: i.perfume_id!, decant_size_ml: p ? this.nominalBottleMl(p) : i.decant_size_ml };
      }
      return { ...i, perfume_id: i.perfume_id! };
    });
    if (!validItems.length) { this.error = 'Add at least one item.'; return; }
    const decantUsed = new Map<string, number>();
    const bottleNeeded = new Map<number, number>();
    for (const item of validItems) {
      if (item.is_refundable_bottle || !item.perfume_id) continue;
      const totalNeeded = item.decant_size_ml * item.quantity;
      const decantKey = `${item.perfume_id}:${item.decant_size_ml}`;
      const decantTotal = this.decantInventory.get(decantKey) || 0;
      const alreadyUsed = decantUsed.get(decantKey) || 0;
      const decantAvail = Math.max(0, decantTotal - alreadyUsed);
      const fromDecants = Math.min(totalNeeded, decantAvail);
      decantUsed.set(decantKey, alreadyUsed + fromDecants);
      const fromBottles = totalNeeded - fromDecants;
      bottleNeeded.set(item.perfume_id, (bottleNeeded.get(item.perfume_id) || 0) + fromBottles);
    }
    for (const [perfumeId, needed] of bottleNeeded) {
      const perfume = this.perfumes.find(p => p.id === perfumeId);
      if (!perfume) { this.error = 'Perfume not found.'; this.cdr.markForCheck(); return; }
      if (needed > perfume.current_ml) {
        this.error = `Not enough inventory for ${perfume.brand?.name || 'perfume'}. Available: ${perfume.current_ml}ml in bottles, Need: ${needed}ml`;
        this.cdr.markForCheck();
        return;
      }
    }

    const pkgItems = this.newOrderPackaging.filter(p => p.quantity > 0);
    for (const pkg of pkgItems) {
      const pi = this.packagingItems.find(p => p.id === pkg.packaging_item_id);
      if (pi && pkg.quantity > pi.remaining_count) {
        this.error = `Not enough packaging: ${pi.name}. Available: ${pi.remaining_count}, Requested: ${pkg.quantity}`;
        this.cdr.markForCheck();
        return;
      }
    }

    try {
      const orderId = await this.svc.create(this.selectedCustomerId, validItems, this.orderDiscount, this.orderIsGift);
      if (pkgItems.length > 0) {
        await this.packagingSvc.saveOrderPackaging(orderId, pkgItems);
      }
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

  async updateStatus(o: Order, newStatus: Order['order_status']) {
    if (o.order_status === 'cancelled') return;
    if (o.order_status === 'placed' && (newStatus === 'delivery' || newStatus === 'delivered')
        && (!o.order_packaging || o.order_packaging.length === 0)) {
      this.error = 'Packaging must be assigned before moving to delivery/delivered.';
      await this.load();
      this.cdr.markForCheck();
      return;
    }
    try {
      if (newStatus === 'cancelled') {
        if (!confirm('Cancel this order? Items will be returned to inventory.')) {
          await this.load();
          return;
        }
        await this.svc.cancel(o.id!);
      } else {
        await this.svc.updateStatus(o.id!, newStatus);
      }
      await this.load();
    } catch (e: any) {
      this.error = e.message;
      this.cdr.markForCheck();
    }
  }

  async remove(id: number) {
    if (!confirm('Delete this order permanently?')) return;
    try { await this.svc.delete(id); await this.load(); }
    catch (e: any) { this.error = e.message; this.cdr.markForCheck(); }
  }

  toggleExpand(id: number) {
    this.expandedOrderId = this.expandedOrderId === id ? null : id;
    this.editingPackagingOrderId = null;
  }
}
