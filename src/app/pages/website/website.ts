import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteSettingsService, WebsiteSettings } from '../../core/services/website-settings';
import { BannerService, Banner } from '../../core/services/banner';

@Component({
  selector: 'app-website',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './website.html',
  styleUrl: './website.scss',
})
export class Website {
  activeTab: 'general' | 'banners' = 'general';
  loading = true;
  saving = false;

  settings: WebsiteSettings | null = null;
  logoPreview: string | null = null;
  logoFile: File | null = null;

  banners: Banner[] = [];
  bannerUrls: Map<number, string> = new Map();
  showBannerModal = false;
  editingBanner: Banner | null = null;
  bannerForm: Partial<Banner> = {};
  bannerFile: File | null = null;
  bannerFilePreview: string | null = null;

  constructor(
    private settingsService: WebsiteSettingsService,
    private bannerService: BannerService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const [settings, banners] = await Promise.all([
        this.settingsService.get(),
        this.bannerService.getAll(),
      ]);
      this.settings = settings;
      this.banners = banners;
      if (settings.logo_url) {
        this.logoPreview = this.settingsService.getPublicUrl(settings.logo_url);
      }
      this.bannerUrls.clear();
      for (const b of banners) {
        if (b.id) {
          this.bannerUrls.set(b.id, this.bannerService.getPublicUrl(b.image_path));
        }
      }
    } catch (e: any) {
      alert('Failed to load: ' + (e.message || e));
    }
    this.loading = false;
    this.cdr.markForCheck();
  }

  // --- General Tab ---

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  async saveGeneral(): Promise<void> {
    if (!this.settings) return;
    this.saving = true;
    this.cdr.markForCheck();
    try {
      if (this.logoFile) {
        const path = await this.settingsService.uploadLogo(this.logoFile);
        this.settings.logo_url = path;
        this.logoFile = null;
      }
      await this.settingsService.update({
        logo_url: this.settings.logo_url,
        announcement_text: this.settings.announcement_text,
        announcement_bg_color: this.settings.announcement_bg_color,
        announcement_text_color: this.settings.announcement_text_color,
        announcement_enabled: this.settings.announcement_enabled,
      });
      alert('Settings saved!');
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
    this.saving = false;
    this.cdr.markForCheck();
  }

  // --- Banners Tab ---

  openAddBanner(): void {
    this.editingBanner = null;
    this.bannerForm = { title: '', subtitle: '', button_text: '', button_link: '', display_order: this.banners.length, is_active: true };
    this.bannerFile = null;
    this.bannerFilePreview = null;
    this.showBannerModal = true;
    this.cdr.markForCheck();
  }

  openEditBanner(banner: Banner): void {
    this.editingBanner = banner;
    this.bannerForm = { ...banner };
    this.bannerFile = null;
    this.bannerFilePreview = banner.id ? (this.bannerUrls.get(banner.id) || null) : null;
    this.showBannerModal = true;
    this.cdr.markForCheck();
  }

  onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.bannerFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.bannerFilePreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  async saveBanner(): Promise<void> {
    if (!this.bannerFile && !this.editingBanner) {
      alert('Please select an image');
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    try {
      let imagePath = this.editingBanner?.image_path || '';

      if (this.bannerFile) {
        if (this.editingBanner?.image_path) {
          await this.bannerService.deleteImage(this.editingBanner.image_path);
        }
        imagePath = await this.bannerService.uploadImage(this.bannerFile);
      }

      if (this.editingBanner?.id) {
        await this.bannerService.update(this.editingBanner.id, {
          image_path: imagePath,
          title: this.bannerForm.title,
          subtitle: this.bannerForm.subtitle,
          button_text: this.bannerForm.button_text,
          button_link: this.bannerForm.button_link,
          display_order: Number(this.bannerForm.display_order) || 0,
          is_active: this.bannerForm.is_active,
        });
      } else {
        await this.bannerService.create({
          image_path: imagePath,
          title: this.bannerForm.title,
          subtitle: this.bannerForm.subtitle,
          button_text: this.bannerForm.button_text,
          button_link: this.bannerForm.button_link,
          display_order: Number(this.bannerForm.display_order) || 0,
          is_active: this.bannerForm.is_active,
        });
      }

      this.showBannerModal = false;
      await this.load();
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
    this.saving = false;
    this.cdr.markForCheck();
  }

  async deleteBanner(banner: Banner): Promise<void> {
    if (!confirm('Delete this banner?')) return;
    try {
      if (banner.image_path) {
        await this.bannerService.deleteImage(banner.image_path);
      }
      await this.bannerService.delete(banner.id!);
      await this.load();
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
  }

  async toggleBannerActive(banner: Banner): Promise<void> {
    try {
      await this.bannerService.update(banner.id!, { is_active: !banner.is_active });
      banner.is_active = !banner.is_active;
      this.cdr.markForCheck();
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
  }

  closeBannerModal(): void {
    this.showBannerModal = false;
    this.cdr.markForCheck();
  }
}
