import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfumeService, Perfume } from '../../core/services/perfume';
import { BrandService, Brand } from '../../core/services/brand';
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
  
  form: Partial<Perfume> = {
    name: '', brand_id: undefined, full_ml: 0, current_ml: 0,
    bought_from: '', price_original: 0, price_5ml: 0, price_10ml: 0,
    bottles_available: 1, bottles_bought: 1, perfume_status: 'available'
  };

  constructor(
    private svc: PerfumeService,
    private brandSvc: BrandService,
    private companySvc: CompanyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { 
    this.load(); 
  }

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
    } catch (e: any) {
      this.error = e?.message || 'Failed to load data';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  getBrandName(brandId: number): string {
    return this.brands.find(b => b.id === brandId)?.name || 'Unknown';
  }

  getCompanyName(companyId: number | undefined): string {
    return this.companies.find(c => c.id === companyId)?.name || '—';
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

  openAdd() {
    this.isEdit = false;
    this.editId = null;
    this.selectedCompanyId = null;
    this.form = {
      name: '', brand_id: undefined, full_ml: 0, current_ml: 0,
      bought_from: '', price_original: 0, price_5ml: 0, price_10ml: 0,
      bottles_available: 1, bottles_bought: 1, perfume_status: 'available'
    };
    this.showModal = true;
  }

  openEdit(p: Perfume) {
    this.isEdit = true;
    this.editId = p.id!;
    const brand = this.brands.find(b => b.id === p.brand_id);
    this.selectedCompanyId = brand?.company_id || null;
    this.form = {
      name: p.name, brand_id: p.brand_id, full_ml: p.full_ml, current_ml: p.current_ml,
      bought_from: p.bought_from, price_original: p.price_original,
      price_5ml: p.price_5ml, price_10ml: p.price_10ml,
      bottles_available: p.bottles_available, bottles_bought: p.bottles_bought,
      perfume_status: p.perfume_status,
    };
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
      this.error = e?.message || 'Save failed';
      this.cdr.markForCheck();
    }
  }

  startInlineEdit(p: Perfume) {
    this.editingRowId = p.id!;
  }

  async saveInlineEdit(p: Perfume, field: string, value: any) {
    if (value === undefined || value === null || value === '') return;
    
    this.savingRowId = p.id!;
    this.error = '';
    try {
      const updates: any = {};
      updates[field] = field.startsWith('price') || field.startsWith('full') || field.startsWith('current') || field.startsWith('bottles') 
        ? Number(value) 
        : value;
      await this.svc.update(p.id!, updates);
      Object.assign(p, updates);
      this.editingRowId = null;
    } catch (e: any) {
      this.error = `Failed to save: ${e?.message}`;
    } finally {
      this.savingRowId = null;
      this.cdr.markForCheck();
    }
  }

  async remove(id: number) {
    if (!confirm('Delete this perfume?')) return;
    try {
      await this.svc.delete(id);
      await this.load();
    } catch (e: any) {
      this.error = e?.message || 'Delete failed';
      this.cdr.markForCheck();
    }
  }
}
