import React from 'react';
import { Mic, MicOff, Radio, Maximize2, X, Users, Square } from 'lucide-react';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

export default function MiniSpacePlayer({
  space,
  currentUser,
  onExpand,
  onLeave,
  onToggleMute,
  isMuted = false
}) {
  if (!space) return null;

  const isHost = space.host?.uid === currentUser?.uid;
  const isSpeaker = isHost || (space.speakers && space.speakers[currentUser?.uid]);
  const speakerCount = space.speakers ? Object.keys(space.speakers).length : 1;
  const listenerCount = space.listeners ? Object.keys(space.listeners).length : 0;
  const total = speakerCount + listenerCount;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom-5 duration-200">
      <div 
        onClick={onExpand}
        className="bg-[#121217]/95 border border-white/20 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center justify-between gap-3 cursor-pointer tap-press hover:border-white/40 transition-all"
      >
        {/* Left: Pulsing Audio Wave + Avatar */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-0.5 rounded-full border border-white/20"></div>
            <img
              src={space.host?.avatar || DEFAULT_AVATAR}
              alt={space.host?.displayName}
              className="relative w-9 h-9 rounded-full object-cover border border-white/20 aspect-square"
            />
            {/* Live animated equalizer bars */}
            <div className="absolute -bottom-1 -right-1 flex items-end gap-[1.5px] bg-black/90 p-0.5 rounded-md">
              <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1 h-3.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1 h-2.5 bg-white rounded-full animate-bounce"></span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-1 py-0.2 rounded font-mono">
                LIVE
              </span>
              <h4 className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
                {space.title}
              </h4>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5 font-mono">
              <span className="text-neutral-300 truncate">@{space.host?.username}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Users size={10} />
                <span>{total}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {isSpeaker && (
            <button
              onClick={onToggleMute}
              className={`p-2 rounded-xl transition-all tap-press ${
                isMuted
                  ? 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                  : 'bg-white border border-white text-black hover:bg-neutral-200'
              }`}
              title={isMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
            >
              {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}

          <button
            onClick={onExpand}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors tap-press"
            title="تكبير المجلس"
          >
            <Maximize2 size={15} />
          </button>

          <button
            onClick={onLeave}
            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors tap-press"
            title={isHost ? 'إنهاء المجلس' : 'مغادرة المجلس'}
          >
            {isHost ? <Square size={14} className="fill-rose-400" /> : <X size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
