import sys

path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\AdsManagerPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''              {/* Publisher ID */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Google Publisher ID (AdSense)
                </label>
                <input
                  type="text"
                  value={googleConfig.publisherId || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, publisherId: e.target.value })}
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>

              {/* Ad Slot ID */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {isAr ? 'معرف وحدة الإعلان (Ad Slot ID)' : 'Ad Slot ID'}
                </label>
                <input
                  type="text"
                  value={googleConfig.adSlotId || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, adSlotId: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>'''

replacement = '''              {/* AdMob App ID */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Google AdMob App ID
                </label>
                <input
                  type="text"
                  value={googleConfig.appId || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, appId: e.target.value })}
                  placeholder="ca-app-pub-3044896651670937~6674193241"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>

              {/* AdMob Unit ID / Native */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {isAr ? 'معرف وحدة إعلان AdMob (Native Ad Unit ID)' : 'AdMob Native Unit ID'}
                </label>
                <input
                  type="text"
                  value={googleConfig.adUnitId || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, adUnitId: e.target.value })}
                  placeholder="ca-app-pub-3044896651670937/5677995718"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>

              {/* Publisher ID */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Google Publisher ID (AdSense)
                </label>
                <input
                  type="text"
                  value={googleConfig.publisherId || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, publisherId: e.target.value })}
                  placeholder="ca-app-pub-3044896651670937"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>

              {/* Ad Slot ID */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {isAr ? 'معرف وحدة الإعلان (Ad Slot ID)' : 'Ad Slot ID'}
                </label>
                <input
                  type="text"
                  value={googleConfig.adSlotId || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, adSlotId: e.target.value })}
                  placeholder="5677995718"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>'''

norm_content = content.replace('\r\n', '\n')
if target in norm_content:
    norm_content = norm_content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(norm_content)
    print('SUCCESS: Replaced AdMob fields in AdsManagerPage.jsx')
else:
    print('Target not found in normalized content')
