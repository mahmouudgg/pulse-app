import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { storageService, OFFICIAL_SOVYTHOS } from '../services/storageService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

export default function MentionAutocomplete({ 
  query = '', 
  onSelect, 
  isOpen = true, 
  placement = 'bottom' 
}) {
  const users = useMemo(() => {
    try {
      const all = storageService.getUsers();
      // Ensure Sovythos is always present in candidate list
      const hasSovythos = all.some(u => u.uid === OFFICIAL_SOVYTHOS.uid || u.username?.toLowerCase() === 'sovythos');
      const list = hasSovythos ? all : [OFFICIAL_SOVYTHOS, ...all];
      return list;
    } catch {
      return [OFFICIAL_SOVYTHOS];
    }
  }, []);

  const cleanQuery = (query || '').toLowerCase().trim();

  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return [OFFICIAL_SOVYTHOS];

    return users
      .filter((u) => {
        if (!u || !u.username) return false;
        if (!cleanQuery) return true; // Show top accounts when just @ is typed
        const uName = (u.username || '').toLowerCase();
        const dName = (u.displayName || '').toLowerCase();
        return uName.includes(cleanQuery) || dName.includes(cleanQuery);
      })
      .sort((a, b) => {
        // Prioritize Sovythos & Founder
        const aIsSovy = a.uid === OFFICIAL_SOVYTHOS.uid || a.username?.toLowerCase() === 'sovythos';
        const bIsSovy = b.uid === OFFICIAL_SOVYTHOS.uid || b.username?.toLowerCase() === 'sovythos';
        if (aIsSovy) return -1;
        if (bIsSovy) return 1;

        const aIsFounder = a.isFounder || a.username === 'my';
        const bIsFounder = b.isFounder || b.username === 'my';
        if (aIsFounder) return -1;
        if (bIsFounder) return 1;

        return (b.followersCount || 0) - (a.followersCount || 0);
      })
      .slice(0, 5);
  }, [users, cleanQuery]);

  if (!isOpen || filteredUsers.length === 0) return null;

  const positionClasses = 
    placement === 'top'
      ? 'absolute bottom-full mb-2 left-0 right-0 z-50'
      : placement === 'inline'
        ? 'w-full my-2.5 relative z-50'
        : 'absolute top-full mt-2 left-0 right-0 z-50';

  return (
    <div 
      className={`${positionClasses} bg-[#141418] border border-white/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl animate-fade-in-up`}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between text-[11px] font-bold text-neutral-400">
        <span>أشخاص للإشارة إليهم (@)</span>
        <span className="text-[10px] font-mono text-neutral-500">اختر حساباً</span>
      </div>

      <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
        {filteredUsers.map((user) => {
          const isSovy = user.uid === OFFICIAL_SOVYTHOS.uid || user.username?.toLowerCase() === 'sovythos';
          const isFounder = user.isFounder || user.username === 'my';

          return (
            <button
              key={user.uid || user.username}
              type="button"
              onClick={() => onSelect(user)}
              className="w-full p-2.5 flex items-center justify-between hover:bg-white/10 text-left rtl:text-right transition-colors tap-press group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={user.avatar || DEFAULT_AVATAR}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full aspect-square object-cover border border-white/20 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate group-hover:text-white">
                      {user.displayName}
                    </span>
                    {isFounder && (
                      <span className="px-1.5 py-0.2 rounded bg-white text-black text-[9px] font-black font-mono">
                        FOUNDER
                      </span>
                    )}
                    {user.isVerified && !isFounder && (
                      <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <Check size={9} className="text-black stroke-[3.5]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono block truncate" dir="ltr">
                    @{user.username}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-neutral-500 font-medium flex-shrink-0 mr-2">
                {isSovy ? 'سوفيثوس' : isFounder ? 'المؤسس' : 'عضو'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
