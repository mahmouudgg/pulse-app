import os, sys

file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "pages", "SettingsPage.jsx"))

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add imports
import_target = "import VerificationPage from './VerificationPage';"
import_replacement = """import VerificationPage from './VerificationPage';
import CommunityStandardsPage from './CommunityStandardsPage';
import AccountAppealPage from './AccountAppealPage';"""

# 2. Add sub-page handlers before '// 8. Help Sub-Page'
subpage_target = "  // 8. Help Sub-Page (Report a Problem)"
subpage_replacement = """  // 7.4 Community Standards Full Page
  if (activeSubView === 'community_standards') {
    return (
      <CommunityStandardsPage 
        onBack={() => setActiveSubView('status')} 
        onOpenAppeal={() => setActiveSubView('account_appeal')} 
      />
    );
  }

  // 7.5 Account Appeal & Review Full Page
  if (activeSubView === 'account_appeal') {
    return (
      <AccountAppealPage 
        onBack={() => setActiveSubView('status')} 
        onOpenCommunityStandards={() => setActiveSubView('community_standards')} 
      />
    );
  }

  // 8. Help Sub-Page (Report a Problem)"""

text_norm = text.replace("\r\n", "\n")
import_target_norm = import_target.replace("\r\n", "\n")
import_replacement_norm = import_replacement.replace("\r\n", "\n")
subpage_target_norm = subpage_target.replace("\r\n", "\n")
subpage_replacement_norm = subpage_replacement.replace("\r\n", "\n")

if import_target_norm in text_norm:
    text_norm = text_norm.replace(import_target_norm, import_replacement_norm)
    print("Imports added successfully")
else:
    print("Import target not found")

if subpage_target_norm in text_norm:
    text_norm = text_norm.replace(subpage_target_norm, subpage_replacement_norm)
    print("Subpage routes added successfully")
else:
    print("Subpage target not found")

# 3. Replace all community standards and appeal triggers
text_norm = text_norm.replace(
    "onClick={() => setShowCommunityStandardsModal(true)}",
    "onClick={() => { try { hapticsService.light?.(); } catch {} setActiveSubView('community_standards'); }}"
)

text_norm = text_norm.replace(
    "onClick={() => setShowAppealModal(true)}",
    "onClick={() => { try { hapticsService.light?.(); } catch {} setActiveSubView('account_appeal'); }}"
)
print("Triggers updated successfully")

with open(file_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text_norm.replace("\n", "\r\n"))

print("SettingsPage.jsx successfully updated!")
