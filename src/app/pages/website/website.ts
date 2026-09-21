import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteSettingsService, WebsiteSettings } from '../../core/services/website-settings';
import { BannerService, Banner } from '../../core/services/banner';
import { MenuVisualsService, MenuVisual, MENU_VISUAL_GROUPS } from '../../core/services/menu-visuals';
import { AnnouncementService, Announcement } from '../../core/services/announcement';

@Component({
  selector: 'app-website',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './website.html',
  styleUrl: './website.scss',
})
export class Website {
  activeTab: 'general' | 'announcements' | 'banners' | 'menus' = 'general';
  loading = true;
  saving = false;

  readonly menuGroups = MENU_VISUAL_GROUPS;
  visuals = new Map<string, MenuVisual>();
  visualUrls = new Map<string, string>();
  visualBusy: string | null = null;

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
  bannerMobileFile: File | null = null;
  bannerMobilePreview: string | null = null;

  announcements: Announcement[] = [];
  showAnnouncementModal = false;
  editingAnnouncement: Announcement | null = null;
  announcementForm: Partial<Announcement> = {};

  constructor(
    private settingsService: WebsiteSettingsService,
    private bannerService: BannerService,
    private menuVisualsService: MenuVisualsService,
    private announcementService: AnnouncementService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const [settings, banners, visuals, announcements] = await Promise.all([
        this.settingsService.get(),
        this.bannerService.getAll(),
        this.menuVisualsService.getAll(),
        this.announcementService.getAll(),
      ]);
      this.settings = settings;
      this.announcements = announcements;
      this.settings.logo_shape ||= 'circle';
      this.settings.logo_size ||= 56;
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
      this.visuals.clear();
      this.visualUrls.clear();
      for (const v of visuals) {
        this.visuals.set(v.slot, v);
        if (v.image_path) this.visualUrls.set(v.slot, this.menuVisualsService.getPublicUrl(v.image_path));
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
        whatsapp_number: this.settings.whatsapp_number,
        logo_shape: this.settings.logo_shape,
        logo_size: this.settings.logo_size,
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
    this.bannerMobileFile = null;
    this.bannerMobilePreview = null;
    this.showBannerModal = true;
    this.cdr.markForCheck();
  }

  openEditBanner(banner: Banner): void {
    this.editingBanner = banner;
    this.bannerForm = { ...banner };
    this.bannerFile = null;
    this.bannerFilePreview = banner.id ? (this.bannerUrls.get(banner.id) || null) : null;
    this.bannerMobileFile = null;
    this.bannerMobilePreview = banner.mobile_image_path
      ? this.bannerService.getPublicUrl(banner.mobile_image_path)
      : null;
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

  onBannerMobileFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.bannerMobileFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.bannerMobilePreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  async clearBannerMobileImage(): Promise<void> {
    if (this.editingBanner?.id && this.editingBanner.mobile_image_path) {
      if (!confirm('Remove the mobile image? Phones will use the main image.')) return;
      try {
        await this.bannerService.deleteImage(this.editingBanner.mobile_image_path);
        await this.bannerService.update(this.editingBanner.id, { mobile_image_path: null });
        this.editingBanner.mobile_image_path = null;
      } catch (e: any) {
        alert('Error: ' + (e.message || e));
        return;
      }
    }
    this.bannerMobileFile = null;
    this.bannerMobilePreview = null;
    this.cdr.markForCheck();
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
      let mobilePath = this.editingBanner?.mobile_image_path ?? null;

      if (this.bannerFile) {
        if (this.editingBanner?.image_path) {
          await this.bannerService.deleteImage(this.editingBanner.image_path);
        }
        imagePath = await this.bannerService.uploadImage(this.bannerFile, 'desktop');
      }

      if (this.bannerMobileFile) {
        if (this.editingBanner?.mobile_image_path) {
          await this.bannerService.deleteImage(this.editingBanner.mobile_image_path);
        }
        mobilePath = await this.bannerService.uploadImage(this.bannerMobileFile, 'mobile');
      }

      if (this.editingBanner?.id) {
        await this.bannerService.update(this.editingBanner.id, {
          image_path: imagePath,
          mobile_image_path: mobilePath,
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
          mobile_image_path: mobilePath,
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

  // --- Announcements Tab ---

  openAddAnnouncement(): void {
    this.editingAnnouncement = null;
    this.announcementForm = { text: '', bg_color: '#1a1a2e', text_color: '#ffffff', display_order: this.announcements.length, is_active: true };
    this.showAnnouncementModal = true;
    this.cdr.markForCheck();
  }

  openEditAnnouncement(a: Announcement): void {
    this.editingAnnouncement = a;
    this.announcementForm = { ...a };
    this.showAnnouncementModal = true;
    this.cdr.markForCheck();
  }

  closeAnnouncementModal(): void {
    this.showAnnouncementModal = false;
    this.cdr.markForCheck();
  }

  async saveAnnouncement(): Promise<void> {
    if (!this.announcementForm.text?.trim()) {
      alert('Please enter the announcement text');
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    try {
      if (this.editingAnnouncement?.id) {
        await this.announcementService.update(this.editingAnnouncement.id, this.announcementForm);
      } else {
        await this.announcementService.create(this.announcementForm);
      }
      this.showAnnouncementModal = false;
      await this.load();
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
    this.saving = false;
    this.cdr.markForCheck();
  }

  async deleteAnnouncement(a: Announcement): Promise<void> {
    if (!confirm('Delete this announcement?')) return;
    try {
      await this.announcementService.delete(a.id!);
      await this.load();
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
  }

  async toggleAnnouncementActive(a: Announcement): Promise<void> {
    try {
      await this.announcementService.update(a.id!, { is_active: !a.is_active });
      a.is_active = !a.is_active;
      this.cdr.markForCheck();
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
  }

  // --- Menu Visuals Tab ---

  visual(slot: string): MenuVisual {
    let v = this.visuals.get(slot);
    if (!v) {
      v = { slot, image_path: null, overlay_opacity: 0.35, is_enabled: true };
      this.visuals.set(slot, v);
    }
    return v;
  }

  async onVisualFileSelected(slot: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.visualBusy = slot;
    this.cdr.markForCheck();
    try {
      const current = this.visuals.get(slot);
      if (current?.image_path) {
        await this.menuVisualsService.deleteImage(current.image_path).catch(() => {});
      }
      const path = await this.menuVisualsService.uploadImage(slot, file);
      await this.menuVisualsService.update(slot, { image_path: path });
      this.visuals.set(slot, { ...this.visual(slot), image_path: path });
      this.visualUrls.set(slot, this.menuVisualsService.getPublicUrl(path));
    } catch (e: any) {
      alert('Upload failed: ' + (e.message || e));
    }
    this.visualBusy = null;
    this.cdr.markForCheck();
  }

  async clearVisualImage(slot: string): Promise<void> {
    const current = this.visuals.get(slot);
    if (!current?.image_path || !confirm('Remove this image?')) return;

    this.visualBusy = slot;
    this.cdr.markForCheck();
    try {
      await this.menuVisualsService.deleteImage(current.image_path).catch(() => {});
      await this.menuVisualsService.update(slot, { image_path: null });
      this.visuals.set(slot, { ...this.visual(slot), image_path: null });
      this.visualUrls.delete(slot);
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
    this.visualBusy = null;
    this.cdr.markForCheck();
  }

  async toggleVisualEnabled(slot: string): Promise<void> {
    const next = !this.visual(slot).is_enabled;
    this.visuals.set(slot, { ...this.visual(slot), is_enabled: next });
    this.cdr.markForCheck();
    try {
      await this.menuVisualsService.update(slot, { is_enabled: next });
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
  }

  async saveVisualOverlay(slot: string): Promise<void> {
    try {
      await this.menuVisualsService.update(slot, { overlay_opacity: this.visual(slot).overlay_opacity });
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
  }
}
