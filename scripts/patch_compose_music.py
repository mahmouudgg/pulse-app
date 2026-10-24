with open('src/components/ComposeModal.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Imports
if 'soundService' not in c:
    c = c.replace(
        "import { DEFAULT_AVATAR } from '../utils/defaultAvatar';",
        "import { DEFAULT_AVATAR } from '../utils/defaultAvatar';\nimport { soundService } from '../services/soundService';"
    )
if 'Play, Pause' not in c and 'Play,' not in c:
    c = c.replace(
        "Quote, AlignLeft, Crop",
        "Quote, AlignLeft, Crop, Play, Pause"
    )

# 2. Add state and subscription for playingMusicId
old_init = "const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);"
new_init = """const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [playingMusicId, setPlayingMusicId] = useState(null);

  useEffect(() => {
    const unsub = soundService.subscribe((state) => {
      setPlayingMusicId(state.playingId);
    });
    return () => unsub();
  }, []);"""

if old_init in c and "playingMusicId" not in c:
    c = c.replace(old_init, new_init)

# 3. Replace attachedMusic UI with Threads-style layout
old_card = """              {/* Attached Media: PULSE Music Banner */}
              {attachedMusic && (
                <div className="relative mt-3 p-2.5 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between group">
                  <div className="flex items-center gap-3 min-w-0 flex-1 me-2">
                    <img 
                      src={attachedMusic.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80'} 
                      alt="" 
                      className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0" 
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">{attachedMusic.title}</div>
                      <div className="text-[11px] text-neutral-400 truncate mt-0.5 flex items-center gap-1.5">
                        <span className="truncate">{attachedMusic.artist}</span>
                        <span>·</span>
                        <span className="font-mono">{attachedMusic.duration}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedMusic(null)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white tap-press"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}"""

new_card = """              {/* Attached Media: PULSE Music Card matching Threads screenshot */}
              {attachedMusic && (
                <div className="mt-3">
                  <div className="relative p-3 rounded-2xl bg-[#141417] border border-[#26262B] flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0 relative">
                        <img 
                          src={attachedMusic.coverUrl || DEFAULT_AVATAR} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate leading-tight">{attachedMusic.title}</div>
                        <div className="text-xs text-neutral-400 truncate mt-0.5">{attachedMusic.artist}</div>
                      </div>
                    </div>

                    {/* Circular Play / Pause Button matching Threads screenshot */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticsService.light?.();
                          soundService.playPreview(attachedMusic);
                        }}
                        className="w-10 h-10 rounded-full bg-[#24242A] hover:bg-[#2C2C34] active:scale-95 text-white flex items-center justify-center transition-all shadow-sm"
                        aria-label={playingMusicId === attachedMusic.id ? 'Pause' : 'Play'}
                      >
                        {playingMusicId === attachedMusic.id ? (
                          <Pause size={18} className="fill-current text-white" />
                        ) : (
                          <Play size={18} className="fill-current text-white ml-0.5" />
                        )}
                      </button>

                      {/* Threads 'X' Button on the card */}
                      <button
                        type="button"
                        onClick={() => {
                          soundService.stopPreview();
                          setAttachedMusic(null);
                        }}
                        className="w-7 h-7 rounded-full bg-[#24242A] hover:bg-[#2C2C34] text-neutral-400 hover:text-white flex items-center justify-center tap-press transition-colors"
                        aria-label="Remove music"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 'Adjust clip' text link underneath matching Threads screenshot */}
                  <div className="mt-1.5 px-1">
                    <button
                      type="button"
                      onClick={() => setIsMusicModalOpen(true)}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      {isAr ? 'تعديل المقطع' : 'Adjust clip'}
                    </button>
                  </div>
                </div>
              )}"""

if old_card in c:
    c = c.replace(old_card, new_card)
    print("Replaced attachedMusic card successfully")
else:
    print("Warning: old_card pattern not matched exactly, checking alternate")

with open('src/components/ComposeModal.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Finished patching ComposeModal.jsx")
