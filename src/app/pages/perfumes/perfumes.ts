import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfumeService, Perfume, PerfumeBottle } from '../../core/services/perfume';
import { BrandService, Brand, BrandImage, MAX_BRAND_IMAGES } from '../../core/services/brand';
import { CompanyService, Company } from '../../core/services/company';

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

  expandedPerfumeId: number | null = null;
  expandedBottles: PerfumeBottle[] = [];
  editingBottleId: number | null = null;

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      const [p, b, c] = await Promise.all([
        this.svc.getAll(),
        this.brandSvc.getAll(),
        this.companySvc.getAll()
      ]);
      this.perfumes = p || [];
      this.brands = b || [];
      this.companies = c || [];
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
    this.filteredPerfumes = result;
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

  async toggleExpand(p: Perfume) {
    if (p.bottles_available <= 1) return;
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

  // --- Bottle edit / delete (RPC-based) ---

  startBottleEdit(b: PerfumeBottle) {
    this.editingBottleId = b.id!;
  }

  async saveBottleMl(b: PerfumeBottle) {
    this.editingBottleId = null;
    try {
      await this.svc.updateBottleMl(b.id!, b.current_ml);
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
    if (!confirm('Delete this bottle? Its cost will also be removed.')) return;
    try {
      await this.svc.deleteBottle(b.id!);
      await this.load();
      if (this.expandedPerfumeId) {
        const remaining = await this.svc.getBottles(this.expandedPerfumeId);
        if (remaining.length <= 1) {
          this.expandedPerfumeId = null;
          this.expandedBottles = [];
        } else {
          this.expandedBottles = remaining;
        }
      }
      this.cdr.markForCheck();
    } catch (e: any) {
      this.error = e?.message || 'Delete failed';
      this.cdr.markForCheck();
    }
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
    if (p.bottles_available > 1) return;
    this.editingRowId = p.id!;
  }

  onGenderChange(gender: string) {
    if (gender !== 'unisex') this.form.unisex_lean = null;
  }

  onBrandGenderChange(gender: string) {
    if (gender !== 'unisex') this.brandForm.unisex_lean = null;
  }

  async saveInlineEdit(p: Perfume, field: string, value: any) {
    if (value === undefined || value === null || value === '') return;

    this.savingRowId = p.id!;
    this.error = '';
    try {
      if (field === 'current_ml') {
        const bottles = await this.svc.getBottles(p.id!);
        if (bottles.length === 1) {
          await this.svc.updateBottleMl(bottles[0].id!, Number(value));
        } else {
          await this.svc.update(p.id!, { current_ml: Number(value) });
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
