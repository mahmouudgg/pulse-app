import os

index_path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    text = f.read()

target = '<script type="module" src="./src/main.jsx"></script>'
replacement = '''<script type="module" src="./src/main.jsx"></script>
    <script>
      // Fallback boot safety: guarantees the boot splash never permanently blocks the UI
      (function() {
        var dissolve = function() {
          var s = document.getElementById('pulse-boot-splash');
          if (s) {
            s.style.opacity = '0';
            s.style.pointerEvents = 'none';
            setTimeout(function() { try { s.remove(); } catch(e) {} }, 400);
          }
        };
        if (document.readyState === 'complete') {
          setTimeout(dissolve, 1200);
        } else {
          window.addEventListener('load', function() { setTimeout(dissolve, 1200); });
        }
      })();
    </script>'''

if target in text:
    text = text.replace(target, replacement, 1)
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('index.html updated successfully with fallback boot safety!')
else:
    print('target not found')
