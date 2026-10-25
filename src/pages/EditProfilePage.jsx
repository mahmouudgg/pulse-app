import React, { useState, useRef } from 'react';
import { X, Camera, Lock, Check, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { hapticsService } from '../services/hapticsService';
import AvatarCropModal from '../components/AvatarCropModal';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { compressAvatar } from '../utils/imageCompressor';
import { cloudinaryService } from '../services/cloudinaryService';

export default function EditProfilePage({ onBack }) {
  const { currentUser, updateProfile } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const isAr = lang === 'ar';

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [website, setWebsite] = useState(currentUser?.website || '');
  const [location, setLocation] = useState(currentUser?.location || 'Cairo, Egypt');
  const [showLocation, setShowLocation] = useState(Boolean(currentUser?.showLocation));
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [isPrivate, setIsPrivate] = useState(!!currentUser?.isPrivate);

  const [cropSrc, setCropSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Handle avatar photo selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropSrc(reader.result);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (saving) return;

    if (!displayName.trim()) {
      showToast(isAr ? 'الاسم المعروض لا يمكن أن يكون فارغاً' : 'Display name cannot be empty', 'error');
      return;
    }

    setSaving(true);
    try {
      hapticsService.medium?.();
    } catch {}

    try {
      let finalAvatar = avatar || currentUser?.avatar || DEFAULT_AVATAR;

      if (finalAvatar && finalAvatar.startsWith('data:image')) {
        try {
          // Upload directly to Cloudinary unsigned CDN (pulse_avatars)
          finalAvatar = await cloudinaryService.uploadImage(finalAvatar, 'pulse_avatars');
        } catch (cloudErr) {
          console.warn('Cloudinary upload error, falling back to local compression:', cloudErr);
          try {
            finalAvatar = await compressAvatar(finalAvatar);
          } catch (e) {
            console.warn('Avatar compression fallback:', e);
          }
        }
      }

      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        location: location.trim(),
        showLocation: Boolean(showLocation),
        avatar: finalAvatar,
        isPrivate: !!isPrivate
      });

      showToast(isAr ? 'تم حفظ التعديلات بنجاح' : 'Profile updated successfully', 'success');
      setTimeout(() => {
        onBack?.();
      }, 200);
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast(isAr ? 'حدث خطأ أثناء حفظ التعديلات' : 'Failed to save changes', 'error');
      setSaving(false);
    }
  };

  const pageContent = (
    <div className="min-h-screen bg-black text-white flex flex-col select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Header (PULSE Core Style: X | Title | Done) */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-[#18181A] px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center hover:bg-[#18181A] active:scale-90 transition-all text-white tap-press"
          aria-label="Cancel"
        >
          <X size={22} className="text-white" />
        </button>

        <h1 className="text-base font-bold text-white tracking-tight">
          {isAr ? 'تعديل الملف الشخصي' : 'Edit profile'}
        </h1>

        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-bold text-white hover:text-neutral-300 active:scale-95 transition-all px-2 py-1 tap-press disabled:opacity-50"
        >
          {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تم' : 'Done')}
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-4 pb-20 max-w-lg mx-auto w-full">
        {/* Hidden File Input for Avatar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        {/* Threads Single Elegant Card Container (Image 5) */}
        <div className="bg-[#121214] border border-[#222226] rounded-[26px] overflow-hidden divide-y divide-[#1C1C20] shadow-xl">
          {/* Row 1: Name and Avatar */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                {isAr ? 'الاسم' : 'Name'}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={isAr ? 'اكتب اسمك المعروض' : 'Your display name'}
                className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-[#555555]"
                maxLength={50}
              />
            </div>

            {/* Circular Avatar with tap to change */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-14 h-14 rounded-full overflow-hidden border border-[#2A2A30] bg-[#18181A] cursor-pointer flex-shrink-0 tap-press group"
              title={isAr ? 'تغيير الصورة الشخصية' : 'Change avatar'}
            >
              <img
                src={avatar || currentUser?.avatar || DEFAULT_AVATAR}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
              </div>
            </div>
          </div>

          {/* Row 2: Username */}
          <div className="p-4">
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
              {isAr ? 'اسم المستخدم' : 'Username'}
            </label>
            <div className="text-sm font-semibold text-neutral-300 font-mono" dir="ltr">
              @{currentUser?.username}
            </div>
          </div>

          {/* Row 3: Bio */}
          <div className="p-4">
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
              {isAr ? 'النبذة التعريفية' : 'Bio'}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={isAr ? '+ اكتب نبذة عنك...' : '+ Write bio...'}
              rows={3}
              maxLength={160}
              className="w-full bg-transparent text-sm text-white outline-none resize-none placeholder:text-[#555555] leading-relaxed mt-1"
            />
          </div>

          {/* Row 4: Link */}
          <div className="p-4">
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
              {isAr ? 'الرابط' : 'Link'}
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={isAr ? '+ إضافة رابط' : '+ Add link'}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#555555] mt-1"
              dir="ltr"
            />
          </div>

          {/* Row 5: Location (CAIRO, EGYPT - Dynamically editable & togglable) */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 pr-1">
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                  {isAr ? 'الموقع الجغرافي' : 'Location'}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={isAr ? '+ أضف موقعك (مثال: Cairo, Egypt)' : '+ Add location (e.g. Cairo, Egypt)'}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#555555]"
                />
              </div>

              {/* Toggle to show/hide location on profile */}
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setShowLocation(!showLocation);
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out flex items-center flex-shrink-0 tap-press ${
                  showLocation ? 'bg-white justify-end' : 'bg-[#2A2A30] justify-start'
                }`}
                aria-label="Toggle location visibility"
              >
                <div
                  className={`w-5 h-5 rounded-full shadow-md transition-all duration-200 ease-in-out ${
                    showLocation ? 'bg-black' : 'bg-white'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-[#777777] leading-relaxed">
              {isAr
                ? (showLocation ? 'الموقع مفعل ويظهر في ملفك الشخصي.' : 'الموقع معطل ومخفي تلقائياً، قم بتفعيل المفتاح لإظهاره.')
                : (showLocation ? 'Location is enabled and visible on your profile.' : 'Location is disabled and hidden by default.')}
            </p>
          </div>

          {/* Row 5: Profile Privacy Toggle (PULSE Style Image 5) */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1 pr-1">
              <div className="text-sm font-bold text-white">
                {isAr ? 'الملف الشخصي الخاص' : 'Private profile'}
              </div>
              <p className="text-xs text-[#777777] mt-1 leading-relaxed max-w-[270px]">
                {isAr
                  ? 'إذا قمت بالتحويل إلى حساب خاص، فلن يتمكن من رؤية نبضاتك إلا المتابعون فقط.'
                  : 'If you switch to private, only approved followers can see your pulses.'}
              </p>
            </div>

            {/* iOS Smooth Toggle Switch */}
            <button
              type="button"
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                setIsPrivate(!isPrivate);
              }}
              className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out flex items-center flex-shrink-0 tap-press ${
                isPrivate ? 'bg-white justify-end' : 'bg-[#2A2A30] justify-start'
              }`}
              aria-label="Toggle profile privacy"
            >
              <div
                className={`w-5 h-5 rounded-full shadow-md transition-all duration-200 ease-in-out ${
                  isPrivate ? 'bg-black' : 'bg-white'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        imageSrc={cropSrc}
        onCropComplete={(croppedBase64) => {
          setAvatar(croppedBase64);
          setIsCropOpen(false);
        }}
      />
    </div>
  );

  return onBack ? (
    <SwipeBackWrapper onBack={onBack}>{pageContent}</SwipeBackWrapper>
  ) : (
    pageContent
  );
}
