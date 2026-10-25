import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Terminal, Compass } from 'lucide-react';
import PioneerBadge from './PioneerBadge';
import VerifiedBadge from './VerifiedBadge';
import { storageService } from '../services/storageService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';

export default function NewChatModal({ isOpen, onClose, currentUser, onSelectUser }) {
  const [searchQuery, setSearchQuery] = useState('');

  const { containerProps, backdropStyle } = useSwipeDownDismiss({
    onClose,
    enabled: isOpen
  });

  if (!isOpen) return null;

  const allUsers = storageService.getUsers();
  const availableUsers = allUsers.filter((u) => u.uid !== currentUser?.uid);

  const filteredUsers = availableUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = u.displayName && u.displayName.toLowerCase().includes(q);
    const usernameMatch = u.username && u.username.toLowerCase().includes(q);
    return nameMatch || usernameMatch;
  });

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      style={backdropStyle}
      onClick={onClose}
    >
      <div 
        {...containerProps}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0E0E12] border-t sm:border border-[#252530] rounded-t-3xl sm:rounded-3xl p-5 animate-sheet-up pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-2xl relative flex flex-col max-h-[85vh] will-change-transform"
      >
        {/* Top Handle Pill */}
        <div className="w-10 h-1 bg-[#3A3A40] rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E1E26]">
          <h3 className="text-sm font-bold text-white">بدء محادثة خاصة جديدة</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors tap-press"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mt-3 mb-2">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو اسم المستخدم @..."
            dir="auto"
            className="w-full bg-[#16161E] border border-[#2B2B38] focus:border-white/30 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
          />
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-0.5">
          {filteredUsers.map((user) => {
            const isFounder = user.isFounder || user.username === 'my';

            return (
              <div
                key={user.uid}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#1A1A24] cursor-pointer transition-all tap-press group border border-transparent hover:border-white/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.avatar || DEFAULT_AVATAR}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-[#2A2A35] aspect-square"
                    />
                    {isFounder && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center p-[1px]">
                        <Terminal size={9} className="text-black stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 text-right">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white group-hover:text-neutral-300 transition-colors truncate">
                        {user.displayName}
                      </span>
                      {isFounder ? (
                        <span className="text-[8px] font-extrabold bg-white/10 text-white px-1 rounded font-mono border border-white/20">
                          DEV
                        </span>
                      ) : user.isVerified ? (
                        <VerifiedBadge size={13} />
                      ) : null}
                      <PioneerBadge number={user.pioneerNumber || (isFounder ? 1 : null)} size="xs" />
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono mt-0.5" dir="ltr">
                      @{user.username}
                    </div>
                  </div>
                </div>

                <button className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white hover:text-black border border-white/20 text-neutral-300 text-xs font-bold tap-press transition-all">
                  مراسلة
                </button>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-500 font-mono">
              لم يتم العثور على مستخدم يطابق بحثك.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
