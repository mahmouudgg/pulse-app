import { Contacts } from '@capacitor-community/contacts';
import { Share } from '@capacitor/share';

export const contactsService = {
  // Check and request contacts permission, then load real phone contacts
  async getRealContacts() {
    // 1. Try Capacitor Native Contacts Plugin
    try {
      if (typeof Contacts !== 'undefined' && Contacts.getContacts) {
        // Direct call to getContacts - on Capacitor Android it auto-prompts if needed
        try {
          if (Contacts.requestPermissions) {
            await Contacts.requestPermissions();
          }
        } catch (pErr) {
          console.warn('Permission request notice:', pErr);
        }

        const res = await Contacts.getContacts({
          projection: {
            name: true,
            phones: true
          }
        });

        if (res && res.contacts && Array.isArray(res.contacts)) {
          const parsed = res.contacts
            .map((c, idx) => {
              const displayName = 
                c.name?.display || 
                c.displayName ||
                `${c.name?.given || ''} ${c.name?.family || ''}`.trim() || 
                '';
              const phone = 
                c.phones?.[0]?.number || 
                c.phoneNumbers?.[0]?.number || 
                c.phones?.[0]?.value || 
                '';
              return {
                id: c.contactId || `contact_${idx}`,
                name: displayName || (phone ? `جهة اتصال (${phone})` : `جهة اتصال #${idx + 1}`),
                phone: phone || ''
              };
            })
            .filter((c) => c.name || c.phone);

          if (parsed.length > 0) {
            parsed.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            return { success: true, contacts: parsed };
          }
        }
      }
    } catch (capErr) {
      console.warn('Capacitor contacts notice:', capErr);
    }

    // 2. Fallback to W3C Contact Picker API (Chrome / Android WebView)
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in navigator.contacts) {
      try {
        const selected = await navigator.contacts.select(['name', 'tel'], { multiple: true });
        if (selected && Array.isArray(selected)) {
          const parsed = selected.map((c, idx) => ({
            id: `web_contact_${idx}`,
            name: (c.name && c.name[0]) || 'جهة اتصال',
            phone: (c.tel && c.tel[0]) || ''
          }));
          return { success: true, contacts: parsed };
        }
      } catch (webErr) {
        console.warn('Web contacts picker error:', webErr);
      }
    }

    return { 
      success: false, 
      error: 'unsupported_or_denied'
    };
  },

  // Send personal invite via SMS or WhatsApp to a specific phone number
  inviteContact(contact, pioneerNumber = 1, username = 'my') {
    const profileUrl = `https://pulseeg.wuaze.com/${encodeURIComponent(username || 'my')}`;
    const inviteText = `انضم إلى منصة PULSE عبر دعوتي كأحد الرواد المؤسسين الأوائل (PIONEER #${pioneerNumber}) واحجز مكانك:\n${profileUrl}`;
    const cleanPhone = (contact.phone || '').replace(/[^\d+]/g, '');

    if (cleanPhone) {
      // Try WhatsApp first, fallback to SMS
      window.open(`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(inviteText)}`, '_system');
    } else {
      this.shareNative(pioneerNumber, username);
    }
  },

  // Share general invite via native share dialog
  async shareNative(pioneerNumber = 1, username = 'my') {
    const profileUrl = `https://pulseeg.wuaze.com/${encodeURIComponent(username || 'my')}`;
    const inviteText = `احجز مكانك ضمن أول 10,000 رائد فكري على منصة PULSE واحصل على شارة الرائد المؤسس الدائمة:\n${profileUrl}`;
    try {
      if (typeof Share !== 'undefined' && Share.share) {
        await Share.share({
          title: 'دعوة للانضمام إلى PULSE',
          text: inviteText,
          url: profileUrl,
          dialogTitle: 'شارك شارة الرائد المؤسس'
        });
        return;
      }
    } catch {}

    if (navigator.share) {
      navigator.share({
        title: 'دعوة للانضمام إلى PULSE',
        text: inviteText,
        url: profileUrl
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(inviteText);
      if (window.showToast) {
        window.showToast('تم نسخ نص ورابط الدعوة بنجاح!');
      }
    }
  }
};
