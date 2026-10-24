path = r'src/pages/LiveSpaceRoom.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Look for line 187: "  };\n" followed by "    setFloatingEmojis((prev) => [...prev, newReaction]);\n"
new_lines = []
i = 0
found = False
while i < len(lines):
    if not found and 'const triggerReaction = (reaction) => {' in lines[i]:
        # Keep until line 187
        while i < len(lines) and lines[i].strip() != '};':
            new_lines.append(lines[i])
            i += 1
        new_lines.append(lines[i]) # add the '  };\n'
        i += 1
        # Now if lines[i] has setFloatingEmojis, skip the duplicate block until its '};'
        if i < len(lines) and 'setFloatingEmojis' in lines[i]:
            while i < len(lines) and lines[i].strip() != '};':
                i += 1
            i += 1 # skip the extra '};'
        found = True
    else:
        new_lines.append(lines[i])
        i += 1

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Cleaned up duplicate triggerReaction tail in LiveSpaceRoom.jsx')
