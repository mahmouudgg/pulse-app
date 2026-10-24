// App Icon Customization Service for PULSE
// Luxury Obsidian & Stealth Collection inspired by Snapchat+ and Threads
// Anyone can change their app icon freely

export const APP_ICONS = [
  {
    id: 'default',
    name: 'Obsidian Matte',
    nameAr: 'أوبسيديان أسود مطفي',
    desc: 'Classic Pulse monochrome acoustic waves on pure matte black',
    descAr: 'تصميم أموليد الأسود النقي الكلاسيكي للمنصة',
    bg: '#000000',
    accent: '#FFFFFF',
    border: 'border-white/20',
    badgeText: 'Classic',
    badgeTextAr: 'كلاسيكي'
  },
  {
    id: 'titanium',
    name: 'Titanium Stealth',
    nameAr: 'تيتانيوم ستيلث',
    desc: 'Brushed aerospace-grade dark titanium finish',
    descAr: 'تيتانيوم أسود مطفي فائق الفخامة مع حواف فضية ناعمة',
    bg: '#141416',
    accent: '#E4E4E7',
    border: 'border-zinc-700',
    badgeText: 'Stealth',
    badgeTextAr: 'ستيلث'
  },
  {
    id: 'cyber',
    name: 'Carbon Fiber Weave',
    nameAr: 'ألياف الكربون (Carbon)',
    desc: 'Deep textured carbon fiber weave with crisp white acoustic bars',
    descAr: 'نسيج ألياف الكربون فائق المتانة مع شعار ناصع البياض',
    bg: '#0A0A0C',
    accent: '#F4F4F5',
    border: 'border-zinc-800',
    badgeText: 'Carbon',
    badgeTextAr: 'كربون'
  },
  {
    id: 'gold',
    name: 'Platinum Wireframe',
    nameAr: 'بلاتينيوم وايرفريم',
    desc: 'Ultra-minimal razor-thin white outline on deep abyss black',
    descAr: 'خطوط هندسية بيضاء ناصعة على خلفية سوداء عميقة',
    bg: '#08080A',
    accent: '#FFFFFF',
    border: 'border-white/30',
    badgeText: 'Platinum',
    badgeTextAr: 'بلاتينيوم'
  },
  {
    id: 'crimson',
    name: 'Eclipse Onyx',
    nameAr: 'كسوف الأونيكس (Eclipse)',
    desc: 'Nocturnal eclipse silhouette with subtle monochrome ring',
    descAr: 'قرص أونيكس أسود مع هالة فضية خافتة فخمة',
    bg: '#050507',
    accent: '#D4D4D8',
    border: 'border-zinc-800',
    badgeText: 'Onyx',
    badgeTextAr: 'أونيكس'
  },
  {
    id: 'midnight',
    name: 'Midnight Pitch Black',
    nameAr: 'منتصف الليل الحالك',
    desc: 'True AMOLED 100% pitch black with high-contrast white frequencies',
    descAr: 'سواد حالك بنسبة 100% مع ترددات صوتية بيضاء متباينة',
    bg: '#000000',
    accent: '#FFFFFF',
    border: 'border-white/40',
    badgeText: 'AMOLED',
    badgeTextAr: 'أموليد'
  }
];

class AppIconService {
  getActiveIconId() {
    try {
      if (window.PulseSecurityNative && typeof window.PulseSecurityNative.getActiveAppIcon === 'function') {
        const nativeIcon = window.PulseSecurityNative.getActiveAppIcon();
        if (nativeIcon) return nativeIcon;
      }
    } catch {
      // Fallback to local storage
    }
    return localStorage.getItem('pulse_app_icon') || 'default';
  }

  getActiveIcon() {
    const id = this.getActiveIconId();
    return APP_ICONS.find(i => i.id === id) || APP_ICONS[0];
  }

  async setAppIcon(iconId) {
    try {
      localStorage.setItem('pulse_app_icon', iconId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pulse_app_icon_changed', { detail: { iconId } }));
      }
      if (window.PulseSecurityNative && typeof window.PulseSecurityNative.setAppIcon === 'function') {
        const success = window.PulseSecurityNative.setAppIcon(iconId);
        return Boolean(success);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const appIconService = new AppIconService();
