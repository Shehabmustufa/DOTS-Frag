import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService, Brand } from '../../core/services/brand';
import { CompanyService, Company } from '../../core/services/company';

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
  error = '';
  loading = false;

  expandedCompanyId: number | null = null;
  showModal = false;
  showAddCompanyForm = false;
  isEdit = false;
  editId: number | null = null;
  selectedCompanyId: number | null = null;

  form: Partial<Brand> = { name: '', company_id: undefined, description: '' };
  newCompany: Partial<Company> = { name: '', country: '' };

  showCompanyModal = false;
  isEditCompany = false;
  editCompanyId: number | null = null;
  companyForm: Partial<Company> = { name: '', country: '' };

  constructor(
    private brandSvc: BrandService,
    private companySvc: CompanyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      [this.brands, this.companies] = await Promise.all([
        this.brandSvc.getAll(),
        this.companySvc.getAll()
      ]);
    } catch (e: any) {
      this.error = e?.message || 'Failed to load';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
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
    this.form = { name: '', company_id: companyId, description: '' };
    this.showModal = true;
  }

  openEditBrand(b: Brand) {
    this.isEdit = true;
    this.editId = b.id!;
    this.selectedCompanyId = b.company_id || null;
    this.form = { name: b.name, company_id: b.company_id, description: b.description };
    this.showModal = true;
  }

  async save() {
    this.error = '';
    try {
      if (this.isEdit && this.editId) await this.brandSvc.update(this.editId, this.form);
      else await this.brandSvc.create(this.form);
      this.showModal = false;
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
