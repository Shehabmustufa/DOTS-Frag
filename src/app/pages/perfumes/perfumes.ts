import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PerfumeService, Perfume, PerfumeBottle } from '../../core/services/perfume';
import { BrandService, Brand, BrandImage, MAX_BRAND_IMAGES } from '../../core/services/brand';
import { CompanyService, Company } from '../../core/services/company';
import { OrderService, Order, OrderItem } from '../../core/services/order';

@Component({
  selector: 'app-perfumes',
  imports: [CommonModule, FormsModule],
  templateUrl: './perfumes.html',
  styleUrl: './perfumes.scss',
})
export class Perfumes implements OnInit {
  perfumes: Perfume[] = [];
  brands: Brand[] = [];
  companies: Company[] = [];
  error = '';
  loading = false;

  showModal = false;
  isEdit = false;
  editId: number | null = null;
  editingRowId: number | null = null;
  savingRowId: number | null = null;
  selectedCompanyId: number | null = null;
  costPrice = 0;

  private _searchQuery = '';
  get searchQuery() { return this._searchQuery; }
  set searchQuery(val: string) { this._searchQuery = val; this.applyFilter(); }

  private _filterCompanyId: number | null = null;
  get filterCompanyId() { return this._filterCompanyId; }
  set filterCompanyId(val: number | null) { this._filterCompanyId = val; this.applyFilter(); }

  filteredPerfumes: Perfume[] = [];

  /** perfume_id -> total ml sold via decants, lifetime. Loaded once in load() and used
   *  by getDeficitMl()/getDeficitPercent() for every row's deficit/lackage column. */
  private decantSoldByPerfume = new Map<number, number>();
  deficitSortDir: 'asc' | 'desc' | null = null;

  expandedPerfumeId: number | null = null;
  expandedBottles: PerfumeBottle[] = [];
  editingBottleId: number | null = null;

  // --- Orders-for-perfume modal ---
  showOrdersModal = false;
  ordersModalPerfume: Perfume | null = null;
  perfumeOrders: Order[] = [];
  loadingPerfumeOrders = false;
  perfumeOrdersError = '';

  form: Partial<Perfume> = {
    brand_id: undefined, full_ml: 0, current_ml: 0,
    bought_from: '', price_original: 0,
    price_5ml: 0, price_10ml: 0, price_30ml: 0,
    description: '', notes: '', gender: 'unisex', unisex_lean: null,
    is_published: false, is_summer: false, is_winter: false,
    sale_price_5ml: null, sale_price_10ml: null, sale_price_30ml: null,
  };

  // --- Brand-level full-bottle catalog (shared with the Brands panel) ---
  brandForm: Partial<Brand> = { cost_price: null, full_bottle_price: null, full_bottle_sale_price: null, gender: 'unisex', unisex_lean: null };
  brandImages: BrandImage[] = [];
  brandImagesLoading = false;
  uploadingImage = false;
  readonly maxBrandImages = MAX_BRAND_IMAGES;

  constructor(
    private svc: PerfumeService,
    private brandSvc: BrandService,
    private companySvc: CompanyService,
    private orderSvc: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      const [p, b, c, decantTotals] = await Promise.all([
        this.svc.getAll(),
        this.brandSvc.getAll(),
        this.companySvc.getAll(),
        this.orderSvc.getDecantMlSoldByPerfume(),
      ]);
      this.perfumes = p || [];
      this.brands = b || [];
      this.companies = c || [];
      this.decantSoldByPerfume = decantTotals;
      this.applyFilter();
    } catch (e: any) {
      this.error = e?.message || 'Failed to load data';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  applyFilter() {
    let result = this.perfumes;
    if (this._searchQuery.trim()) {
      const q = this._searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        (p.brand?.name || '').toLowerCase().includes(q) ||
        (p.brand?.company?.name || '').toLowerCase().includes(q)
      );
    }
    if (this._filterCompanyId) {
      result = result.filter(p => p.brand?.company_id === this._filterCompanyId);
    }
    if (this.deficitSortDir) {
      const dir = this.deficitSortDir === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => (this.getEffectiveDeficitMl(a) - this.getEffectiveDeficitMl(b)) * dir);
    }
    this.filteredPerfumes = result;
  }

  toggleDeficitSort() {
    this.deficitSortDir = this.deficitSortDir === 'desc' ? 'asc' : 'desc';
    this.applyFilter();
  }

  /** ml withdrawn from this perfume's current bottles (full_ml - current_ml) minus what was
   *  actually sold via decants — what's left over is unaccounted for: evaporation, spillage,
   *  bad pours, testers. Full-bottle sales are deliberately excluded (see chat context: the
   *  data model doesn't reliably tie a full-bottle sale to a specific perfume_bottles row). */
  getDeficitMl(p: Perfume): number {
    const withdrawn = Number(p.full_ml) - Number(p.current_ml);
    const sold = this.decantSoldByPerfume.get(p.id!) || 0;
    return withdrawn - sold;
  }

  getDeficitPercent(p: Perfume): number {
    if (!p.full_ml) return 0;
    return Math.round((this.getDeficitMl(p) / Number(p.full_ml)) * 1000) / 10;
  }

  isDeficitManual(p: Perfume): boolean {
    return p.manual_deficit_ml !== null && p.manual_deficit_ml !== undefined;
  }

  /** What's actually shown/sorted on — the manual override when one is set (you already
   *  know the real figure from a physical stock-take and don't trust the computed one),
   *  otherwise the auto-calculated deficit from getDeficitMl(). */
  getEffectiveDeficitMl(p: Perfume): number {
    return this.isDeficitManual(p) ? Number(p.manual_deficit_ml) : this.getDeficitMl(p);
  }

  getEffectiveDeficitPercent(p: Perfume): number {
    if (!p.full_ml) return 0;
    return Math.round((this.getEffectiveDeficitMl(p) / Number(p.full_ml)) * 1000) / 10;
  }

  clearFilters() {
    this._searchQuery = '';
    this._filterCompanyId = null;
    this.applyFilter();
  }

  getFilteredBrands(): Brand[] {
    if (!this.selectedCompanyId) return this.brands;
    return this.brands.filter(b => b.company_id === this.selectedCompanyId);
  }

  getPercentage(p: Perfume): number {
    if (p.full_ml === 0) return 0;
    return Math.round((p.current_ml / p.full_ml) * 100);
  }

  getStatusColor(p: Perfume): string {
    const pct = this.getPercentage(p);
    if (pct === 0) return 'status-empty';
    if (pct <= 30) return 'status-low';
    if (pct <= 70) return 'status-medium';
    return 'status-high';
  }

  getBottlePercentage(b: PerfumeBottle): number {
    if (b.full_ml === 0) return 0;
    return Math.round((b.current_ml / b.full_ml) * 100);
  }

  // --- Expand / Collapse ---

  /** Bottles currently being drawn from or waiting to be opened. */
  get activeBottles(): PerfumeBottle[] {
    return this.expandedBottles.filter(b => !b.archived_at);
  }

  /** Emptied bottles marked finished instead of deleted — kept (and their cost record
   *  with them) so inventory history isn't lost, just hidden from the active list. */
  get finishedBottles(): PerfumeBottle[] {
    return this.expandedBottles.filter(b => !!b.archived_at);
  }

  async toggleExpand(p: Perfume) {
    if (this.expandedPerfumeId === p.id) {
      this.expandedPerfumeId = null;
      this.expandedBottles = [];
      return;
    }
    try {
      this.expandedPerfumeId = p.id!;
      this.expandedBottles = await this.svc.getBottles(p.id!);
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e?.message || 'Failed to load bottles';
      this.cdr.markForCheck();
    }
  }

  // --- Orders for this perfume (lazy-loaded on demand, not on page load) ---

  async openOrdersForPerfume(p: Perfume, event?: Event) {
    event?.stopPropagation();
    this.ordersModalPerfume = p;
    this.showOrdersModal = true;
    this.perfumeOrders = [];
    this.perfumeOrdersError = '';
    this.loadingPerfumeOrders = true;
    this.cdr.markForCheck();
    try {
      this.perfumeOrders = await this.orderSvc.getByPerfume(p.id!, p.brand_id);
    } catch (e: any) {
      this.perfumeOrdersError = e?.message || 'Failed to load orders';
    } finally {
      this.loadingPerfumeOrders = false;
      this.cdr.markForCheck();
    }
  }

  closeOrdersModal() {
    this.showOrdersModal = false;
    this.ordersModalPerfume = null;
    this.perfumeOrders = [];
  }

  /** Jump to the Orders page with this order expanded in place. */
  openFullOrder(o: Order) {
    this.router.navigate(['/orders'], { queryParams: { orderId: o.id } });
  }

  /** Revenue for one line — refundable (full) bottles count only their profit (sale − cost),
   *  decant lines count their full price. is_full_bottle is dead weight in this app's orders
   *  (full bottles are always sold as refundable-bottle lines) but kept here just in case. */
  private getItemRevenue(item: OrderItem): number {
    if (item.is_refundable_bottle) {
      return (Number(item.bottle_sale_price) - Number(item.bottle_cost_price)) * item.quantity;
    }
    return Number(item.unit_sale_price) * item.quantity;
  }

  /** Total money profited on this perfume across the loaded orders — decant lines at full
   *  price, refundable-bottle lines at profit only, same per-order discount formula as the
   *  Orders page. An order with several refundable-bottle lines sums all of their profits.
   *  Cancelled orders are excluded since nothing was ultimately paid. */
  get perfumeMoneySummary(): { totalProfited: number } {
    let total = 0;
    for (const o of this.perfumeOrders) {
      if (o.order_status === 'cancelled') continue;
      const subtotal = (o.order_items || []).reduce((sum, item) => sum + this.getItemRevenue(item), 0);
      total += Math.round(subtotal * (1 - (Number(o.discount_percentage) || 0) / 100));
    }
    return { totalProfited: total };
  }

  /** Total ml deducted by decant sales of this perfume — decant_size_ml × quantity per line,
   *  summed directly. Refundable-bottle and (unused) full-bottle lines are excluded since
   *  they aren't decant sales. Needs no migration/tracking column — decant_size_ml and
   *  quantity have always been on every order, so this works for every order ever placed.
   *  Cancelled orders are excluded since cancelling returns the stock. */
  get perfumeDecantSummary(): { totalMl: number } {
    let totalMl = 0;
    for (const o of this.perfumeOrders) {
      if (o.order_status === 'cancelled') continue;
      for (const item of o.order_items || []) {
        if (item.is_refundable_bottle || item.is_full_bottle) continue;
        totalMl += (Number(item.decant_size_ml) || 0) * (item.quantity || 0);
      }
    }
    return { totalMl };
  }

  /** Whole bottles sold — full bottles are sold as refundable-bottle order lines in this app,
   *  so this counts quantity on those lines (never is_full_bottle). Works for every order
   *  regardless of migration date, since quantity was always stored. Cancelled excluded. */
  get perfumeBottlesSoldSummary(): { count: number } {
    let count = 0;
    for (const o of this.perfumeOrders) {
      if (o.order_status === 'cancelled') continue;
      for (const item of o.order_items || []) {
        if (item.is_refundable_bottle) count += item.quantity;
      }
    }
    return { count };
  }

  /** ml withdrawn from this perfume's current bottles (full_ml - current_ml) minus what
   *  perfumeDecantSummary says was actually sold — the leftover is unaccounted for:
   *  evaporation, spillage, bad pours, testers. Full-bottle sales are deliberately left
   *  out of this (not reliably tied to a perfume_bottles depletion in this data model).
   *  Shows the manual override instead, when one is set on the perfume. */
  get perfumeDeficitSummary(): { ml: number; percent: number; isManual: boolean } {
    const p = this.ordersModalPerfume;
    if (!p) return { ml: 0, percent: 0, isManual: false };
    const isManual = this.isDeficitManual(p);
    let ml: number;
    if (isManual) {
      ml = Number(p.manual_deficit_ml);
    } else {
      const withdrawn = Number(p.full_ml) - Number(p.current_ml);
      ml = withdrawn - this.perfumeDecantSummary.totalMl;
    }
    const percent = p.full_ml ? Math.round((ml / Number(p.full_ml)) * 1000) / 10 : 0;
    return { ml, percent, isManual };
  }

  // --- Bottle edit / delete (RPC-based) ---

  startBottleEdit(b: PerfumeBottle) {
    this.editingBottleId = b.id!;
  }

  async saveBottleMl(b: PerfumeBottle) {
    this.editingBottleId = null;
    try {
      await this.svc.updateBottleMl(b.id!, b.current_ml);
      await this.syncPerfumeAggregate(b.perfume_id);
      await this.load();
      if (this.expandedPerfumeId) {
        this.expandedBottles = await this.svc.getBottles(this.expandedPerfumeId);
      }
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e?.message || 'Failed to save';
      this.cdr.markForCheck();
    }
  }

  async removeBottle(p: Perfume, b: PerfumeBottle) {
    if (!confirm('Delete this bottle? Its cost will also be removed. If you just finished this bottle and want to keep its cost record, use Archive instead.')) return;
    try {
      await this.svc.deleteBottle(b.id!);
      await this.syncPerfumeAggregate(p.id!);
      await this.load();
      if (this.expandedPerfumeId) {
        this.expandedBottles = await this.svc.getBottles(this.expandedPerfumeId);
      }
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e?.message || 'Delete failed';
      this.cdr.markForCheck();
    }
  }

  /** Marks a finished/emptied bottle as archived (or brings it back) — unlike removeBottle(),
   *  this never touches the bottle row or its cost record, just hides it from the active list. */
  async toggleArchiveBottle(p: Perfume, b: PerfumeBottle) {
    try {
      await this.svc.archiveBottle(b.id!, !b.archived_at);
      await this.load();
      if (this.expandedPerfumeId) {
        this.expandedBottles = await this.svc.getBottles(this.expandedPerfumeId);
      }
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e?.message || 'Failed to archive bottle';
      this.cdr.markForCheck();
    }
  }

  /** The bottle currently being drawn from, for routing an aggregate ml edit down to one
   *  bottle — same rule as Orders' nominalBottleMl: prefer the most recently added bottle
   *  that still has stock, falling back to the most recently added bottle overall. */
  private pickActiveBottle(bottles: PerfumeBottle[]): PerfumeBottle | null {
    if (!bottles.length) return null;
    const nonArchived = bottles.filter(b => !b.archived_at);
    const pool0 = nonArchived.length ? nonArchived : bottles;
    const inStock = pool0.filter(b => b.current_ml > 0);
    const pool = inStock.length ? inStock : pool0;
    return pool.reduce((a, b) => ((a.created_at || '') > (b.created_at || '') ? a : b));
  }

  /** Recompute perfumes.current_ml as the sum of its bottles' current_ml and persist it,
   *  so the aggregate shown on the main row always matches bottle reality — whichever side
   *  (the aggregate cell or a bottle's own row) was just edited. */
  private async syncPerfumeAggregate(perfumeId: number): Promise<void> {
    const bottles = await this.svc.getBottles(perfumeId);
    const sum = bottles.reduce((s, b) => s + Number(b.current_ml), 0);
    await this.svc.update(perfumeId, { current_ml: sum });
  }

  // --- Duplicate bottle: prefill the Add modal from an existing bottle's data ---

  /** Main-row duplicate button: no specific bottle is in view, so clone whichever bottle
   *  was added last (getBottles() sorts newest first, so bottles[0] is "its last entry"). */
  async duplicateLastBottle(p: Perfume, event?: Event) {
    event?.stopPropagation();
    try {
      const bottles = await this.svc.getBottles(p.id!);
      this.openDuplicateForm(p, bottles[0] || null);
    } catch (e: any) {
      this.error = e?.message || 'Failed to load bottle';
      this.cdr.markForCheck();
    }
  }

  /** Expanded-list duplicate button: clone this exact bottle. */
  duplicateBottle(p: Perfume, b: PerfumeBottle, event?: Event) {
    event?.stopPropagation();
    this.openDuplicateForm(p, b);
  }

  /** Opens the same Add-bottle modal used for a brand-new perfume, but pre-filled with the
   *  source bottle's size/cost and the perfume's existing prices/bought_from — so the only
   *  thing left to do is review and click Add Bottle. Goes through the normal save() ->
   *  addBottle() RPC path, same as adding a bottle any other way. */
  private openDuplicateForm(p: Perfume, source: PerfumeBottle | null) {
    this.isEdit = false;
    this.editId = null;
    const brand = this.brands.find(b => b.id === p.brand_id);
    this.selectedCompanyId = brand?.company_id || null;
    this.costPrice = Number(source?.cost?.amount) || 0;
    this.brandImages = [];
    this.brandForm = { cost_price: null, full_bottle_price: null, full_bottle_sale_price: null, gender: 'unisex', unisex_lean: null };
    this.form = {
      brand_id: p.brand_id, full_ml: source?.full_ml ?? p.full_ml, current_ml: source?.full_ml ?? p.full_ml,
      bought_from: p.bought_from || '', price_original: p.price_original,
      price_5ml: p.price_5ml, price_10ml: p.price_10ml, price_30ml: p.price_30ml || 0,
      description: '', notes: '', gender: 'unisex', unisex_lean: null,
      is_published: false, is_summer: false, is_winter: false,
      sale_price_5ml: null, sale_price_10ml: null, sale_price_30ml: null,
    };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  // --- Add / Edit modal ---

  openAdd() {
    this.isEdit = false;
    this.editId = null;
    this.selectedCompanyId = null;
    this.costPrice = 0;
    this.brandImages = [];
    this.brandForm = { cost_price: null, full_bottle_price: null, full_bottle_sale_price: null, gender: 'unisex', unisex_lean: null };
    this.form = {
      brand_id: undefined, full_ml: 0, current_ml: 0,
      bought_from: '', price_original: 0,
      price_5ml: 0, price_10ml: 0, price_30ml: 0,
      description: '', notes: '', gender: 'unisex', unisex_lean: null,
      is_published: false,
      sale_price_5ml: null, sale_price_10ml: null, sale_price_30ml: null,
    };
    this.showModal = true;
  }

  async openEdit(p: Perfume) {
    this.isEdit = true;
    this.editId = p.id!;
    const brand = this.brands.find(b => b.id === p.brand_id);
    this.selectedCompanyId = brand?.company_id || null;
    this.form = {
      brand_id: p.brand_id, full_ml: p.full_ml, current_ml: p.current_ml,
      bought_from: p.bought_from, price_original: p.price_original,
      price_5ml: p.price_5ml, price_10ml: p.price_10ml, price_30ml: p.price_30ml || 0,
      description: p.description || '', notes: p.notes || '',
      gender: p.gender || 'unisex', unisex_lean: p.unisex_lean ?? null, is_published: p.is_published || false,
      is_summer: p.is_summer || false, is_winter: p.is_winter || false,
      sale_price_5ml: p.sale_price_5ml ?? null, sale_price_10ml: p.sale_price_10ml ?? null, sale_price_30ml: p.sale_price_30ml ?? null,
    };
    this.brandForm = {
      cost_price: brand?.cost_price ?? null,
      full_bottle_price: brand?.full_bottle_price ?? null,
      full_bottle_sale_price: brand?.full_bottle_sale_price ?? null,
      gender: brand?.gender || 'unisex',
      unisex_lean: brand?.unisex_lean ?? null,
    };
    this.showModal = true;
    await this.loadBrandImages(p.brand_id);
  }

  private async loadBrandImages(brandId: number) {
    this.brandImagesLoading = true;
    this.cdr.markForCheck();
    try {
      this.brandImages = await this.brandSvc.getImages(brandId);
    } catch (e: any) {
      this.error = e?.message || 'Failed to load images';
    } finally {
      this.brandImagesLoading = false;
      this.cdr.markForCheck();
    }
  }

  getBrandImageUrl(img: BrandImage): string {
    return this.brandSvc.getImageUrl(img.image_path);
  }

  async onBrandImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.editId) return;
    const brand = this.brands.find(b => b.id === this.form.brand_id);
    if (!brand?.id) return;
    this.uploadingImage = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      const img = await this.brandSvc.uploadImage(file, brand.id, this.brandImages.length);
      this.brandImages.push(img);
    } catch (e: any) {
      this.error = e?.message || 'Image upload failed';
    } finally {
      this.uploadingImage = false;
      input.value = '';
      this.cdr.markForCheck();
    }
  }

  async removeBrandImage(img: BrandImage) {
    if (!confirm('Remove this image?')) return;
    try {
      await this.brandSvc.deleteImage(img);
      this.brandImages = this.brandImages.filter(i => i.id !== img.id);
    } catch (e: any) {
      this.error = e?.message || 'Failed to remove image';
      this.cdr.markForCheck();
    }
  }

  async moveBrandImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.brandImages.length) return;
    [this.brandImages[index], this.brandImages[target]] = [this.brandImages[target], this.brandImages[index]];
    this.cdr.markForCheck();
    try {
      await this.brandSvc.reorderImages(this.brandImages);
    } catch (e: any) {
      this.error = e?.message || 'Failed to reorder images';
      this.cdr.markForCheck();
    }
  }

  async save() {
    this.error = '';
    try {
      if (this.isEdit && this.editId) {
        await this.svc.update(this.editId, this.form);
        if (this.form.brand_id) {
          await this.brandSvc.update(Number(this.form.brand_id), this.brandForm);
        }
      } else {
        const brand = this.brands.find(b => b.id === Number(this.form.brand_id));
        await this.svc.addBottle(this.form, this.costPrice, brand?.name || 'Unknown');
        // The cost and full-bottle sale price entered here also become the brand's
        // full-bottle catalog values, so they never have to be typed in again on
        // the Brands panel.
        if (brand?.id && (this.costPrice || this.form.price_original)) {
          await this.brandSvc.update(brand.id, {
            cost_price: this.costPrice || undefined,
            full_bottle_price: this.form.price_original || undefined,
          });
        }
      }
      this.showModal = false;
      this.brandImages = [];
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Save failed';
      this.cdr.markForCheck();
    }
  }

  // --- Inline edit for single-bottle perfumes ---

  startInlineEdit(p: Perfume) {
    this.editingRowId = p.id!;
  }

  onGenderChange(gender: string) {
    if (gender !== 'unisex') this.form.unisex_lean = null;
  }

  onBrandGenderChange(gender: string) {
    if (gender !== 'unisex') this.brandForm.unisex_lean = null;
  }

  async saveInlineEdit(p: Perfume, field: string, value: any) {
    // manual_deficit_ml is the one field where an empty value is meaningful — it clears
    // the override and falls back to the auto-calculated deficit — so it skips the
    // "blank means do nothing" guard every other field uses.
    const isClearingDeficitOverride = field === 'manual_deficit_ml' && (value === undefined || value === null || value === '');
    if (!isClearingDeficitOverride && (value === undefined || value === null || value === '')) return;

    this.savingRowId = p.id!;
    this.error = '';
    try {
      if (field === 'manual_deficit_ml') {
        const override = isClearingDeficitOverride ? null : Number(value);
        await this.svc.update(p.id!, { manual_deficit_ml: override });
        p.manual_deficit_ml = override;
      } else if (field === 'current_ml') {
        const bottles = await this.svc.getBottles(p.id!);
        if (bottles.length === 0) {
          await this.svc.update(p.id!, { current_ml: Number(value) });
        } else if (bottles.length === 1) {
          await this.svc.updateBottleMl(bottles[0].id!, Number(value));
          await this.syncPerfumeAggregate(p.id!);
        } else {
          // Multiple bottles: route the change to whichever bottle is actively being
          // drawn from, rather than spreading it evenly or overwriting the aggregate
          // directly — e.g. a 100ml (full) + 20ml (opened) perfume showing 120ml total:
          // typing a new total here adjusts the 20ml bottle by the difference, not the 100ml one.
          const oldSum = bottles.reduce((s, b) => s + Number(b.current_ml), 0);
          const delta = Number(value) - oldSum;
          const target = this.pickActiveBottle(bottles)!;
          const newMl = Math.max(0, Math.min(target.full_ml, Number(target.current_ml) + delta));
          await this.svc.updateBottleMl(target.id!, newMl);
          await this.syncPerfumeAggregate(p.id!);
        }
        if (this.expandedPerfumeId === p.id) {
          this.expandedBottles = await this.svc.getBottles(p.id!);
        }
        await this.load();
      } else {
        const updates: any = {};
        updates[field] = field.startsWith('price') || field.startsWith('full') || field.startsWith('bottles')
          ? Number(value)
          : value;
        await this.svc.update(p.id!, updates);
        Object.assign(p, updates);
        if (field === 'price_original' && p.brand_id) {
          await this.brandSvc.update(p.brand_id, { full_bottle_price: Number(value) });
        }
      }
      this.editingRowId = null;
    } catch (e: any) {
      this.error = `Failed to save: ${e?.message}`;
    } finally {
      this.savingRowId = null;
      this.cdr.markForCheck();
    }
  }

  // --- Delete whole perfume (RPC-based) ---

  async remove(id: number) {
    if (!confirm('Delete this perfume? All bottles and associated costs will be removed.')) return;
    try {
      await this.svc.deleteFull(id);
      if (this.expandedPerfumeId === id) {
        this.expandedPerfumeId = null;
        this.expandedBottles = [];
      }
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Delete failed';
      this.cdr.markForCheck();
    }
  }
}
