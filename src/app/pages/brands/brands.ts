import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService, Brand, BrandImage, MAX_BRAND_IMAGES } from '../../core/services/brand';
import { CompanyService, Company } from '../../core/services/company';
import { PerfumeService, Perfume } from '../../core/services/perfume';

@Component({
  selector: 'app-brands',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brands.html',
  styleUrl: './brands.scss',
})
export class Brands implements OnInit {
  companies: Company[] = [];
  brands: Brand[] = [];
  perfumes: Perfume[] = [];
  error = '';
  loading = false;

  expandedCompanyId: number | null = null;
  showModal = false;
  showAddCompanyForm = false;
  isEdit = false;
  editId: number | null = null;
  selectedCompanyId: number | null = null;

  form: Partial<Brand> = { name: '', company_id: undefined, description: '', cost_price: null, full_bottle_price: null, full_bottle_sale_price: null, gender: 'unisex', is_summer: false, is_winter: false };
  newCompany: Partial<Company> = { name: '', country: '' };

  brandImages: BrandImage[] = [];
  brandImagesLoading = false;
  uploadingImage = false;
  readonly maxBrandImages = MAX_BRAND_IMAGES;

  showCompanyModal = false;
  isEditCompany = false;
  editCompanyId: number | null = null;
  companyForm: Partial<Company> = { name: '', country: '' };

  constructor(
    private brandSvc: BrandService,
    private companySvc: CompanyService,
    private perfumeSvc: PerfumeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      [this.brands, this.companies, this.perfumes] = await Promise.all([
        this.brandSvc.getAll(),
        this.companySvc.getAll(),
        this.perfumeSvc.getAll(),
      ]);
    } catch (e: any) {
      this.error = e?.message || 'Failed to load';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  getInventory(brandId: number): Perfume | null {
    return this.perfumes.find(p => p.brand_id === brandId) || null;
  }

  getCompanyBrands(companyId: number): Brand[] {
    return this.brands.filter(b => b.company_id === companyId);
  }

  toggleCompany(companyId: number) {
    this.expandedCompanyId = this.expandedCompanyId === companyId ? null : companyId;
  }

  async addCompany() {
    this.error = '';
    try {
      await this.companySvc.create(this.newCompany);
      this.showAddCompanyForm = false;
      this.newCompany = { name: '', country: '' };
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Failed to add company';
      this.cdr.markForCheck();
    }
  }

  openEditCompany(c: Company) {
    this.isEditCompany = true;
    this.editCompanyId = c.id!;
    this.companyForm = { name: c.name, country: c.country || '' };
    this.showCompanyModal = true;
  }

  async saveCompany() {
    this.error = '';
    try {
      if (this.isEditCompany && this.editCompanyId) {
        await this.companySvc.update(this.editCompanyId, this.companyForm);
      }
      this.showCompanyModal = false;
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Save failed';
      this.cdr.markForCheck();
    }
  }

  async removeCompany(id: number) {
    const brandCount = this.getCompanyBrands(id).length;
    const msg = brandCount > 0
      ? `This company has ${brandCount} brand(s). Delete anyway?`
      : 'Delete this company?';
    if (!confirm(msg)) return;
    try {
      await this.companySvc.delete(id);
      if (this.expandedCompanyId === id) this.expandedCompanyId = null;
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Delete failed';
      this.cdr.markForCheck();
    }
  }

  openAddBrand(companyId: number) {
    this.isEdit = false;
    this.editId = null;
    this.selectedCompanyId = companyId;
    this.brandImages = [];
    this.form = { name: '', company_id: companyId, description: '', cost_price: null, full_bottle_price: null, full_bottle_sale_price: null, gender: 'unisex', is_summer: false, is_winter: false };
    this.showModal = true;
  }

  async openEditBrand(b: Brand) {
    this.isEdit = true;
    this.editId = b.id!;
    this.selectedCompanyId = b.company_id || null;
    this.form = {
      name: b.name, company_id: b.company_id, description: b.description,
      cost_price: b.cost_price ?? null, full_bottle_price: b.full_bottle_price ?? null, full_bottle_sale_price: b.full_bottle_sale_price ?? null,
      gender: b.gender || 'unisex',
      is_summer: b.is_summer ?? false, is_winter: b.is_winter ?? false,
    };
    this.showModal = true;
    await this.loadBrandImages(b.id!);
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
    this.uploadingImage = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      const img = await this.brandSvc.uploadImage(file, this.editId, this.brandImages.length);
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
      if (this.isEdit && this.editId) await this.brandSvc.update(this.editId, this.form);
      else await this.brandSvc.create(this.form);
      this.showModal = false;
      this.brandImages = [];
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Save failed';
      this.cdr.markForCheck();
    }
  }

  async remove(id: number) {
    if (!confirm('Delete this brand?')) return;
    try {
      await this.brandSvc.delete(id);
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Delete failed';
      this.cdr.markForCheck();
    }
  }
}
