import sys

path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\LiveSpaceRoom.jsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace definition
lines = code.splitlines()
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    if 'const EMOJI_REACTIONS' in line:
        new_lines.append('''const SPACE_REACTIONS = [
  { id: 'thumbs', Icon: ThumbsUp, label: 'Thumbs Up' },
  { id: 'light', Icon: Lightbulb, label: 'Idea' },
  { id: 'flame', Icon: Flame, label: 'Fire' },
  { id: 'heart', Icon: Heart, label: 'Love' },
  { id: 'brain', Icon: Brain, label: 'Deep' },
  { id: 'sparkles', Icon: Sparkles, label: 'Brilliant' }
];''')
    elif 'const triggerReaction = (emoji)' in line:
        new_lines.append('  const triggerReaction = (reaction) => {')
        new_lines.append('    const id = Date.now() + Math.random();')
        new_lines.append('    const newReaction = {')
        new_lines.append('      id,')
        new_lines.append('      reaction,')
        new_lines.append('      left: Math.random() * 70 + 15')
        new_lines.append('    };')
        new_lines.append('    setFloatingEmojis((prev) => [...prev, newReaction]);')
        new_lines.append('    setTimeout(() => {')
        new_lines.append('      setFloatingEmojis((prev) => prev.filter((r) => r.id !== id));')
        new_lines.append('    }, 2000);')
        new_lines.append('  };')
        # Skip old triggerReaction lines until closing brace
        while i < len(lines) and '};' not in lines[i]:
            i += 1
    elif '{/* Floating Reactions Canvas */}' in line:
        new_lines.append(line)
        new_lines.append('''      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {floatingEmojis.map((r) => {
          const ReactIcon = r.reaction.Icon;
          return (
            <div
              key={r.id}
              style={{ left: `${r.left}%` }}
              className="absolute bottom-24 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white animate-floating-reaction select-none shadow-lg"
            >
              <ReactIcon size={22} className="text-white" />
            </div>
          );
        })}
      </div>''')
        # Skip until end of old floating reactions canvas
        while i < len(lines) and '</div>' not in lines[i] or '{floatingEmojis.map' in lines[i]:
            i += 1
        # skip next closing tags
        while i < len(lines) and 'Top Navigation Bar' not in lines[i]:
            i += 1
        i -= 1 # adjust so next loop handles Top Navigation Bar
    elif '{/* Reaction Bar */}' in line:
        new_lines.append(line)
        new_lines.append('''          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {SPACE_REACTIONS.map((item) => {
              const IconComp = item.Icon;
              return (
                <button
                  key={item.id}
                  onClick={() => triggerReaction(item)}
                  className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center tap-press transition-transform active:scale-125"
                  title={item.label}
                >
                  <IconComp size={16} />
                </button>
              );
            })}
          </div>''')
        # Skip old reaction bar buttons
        while i < len(lines) and '{/* Right Action Buttons */}' not in lines[i]:
            i += 1
        i -= 1
    else:
        new_lines.append(line)
    i += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines) + '\n')

print('Successfully patched LiveSpaceRoom.jsx')
