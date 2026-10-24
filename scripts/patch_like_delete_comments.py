storage_path = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\services\storageService.js"

with open(storage_path, "r", encoding="utf-8") as f:
    code = f.read()

old_like = """  toggleLikeComment(postId, commentId, user) {

    if (!postId || !commentId || !user) return null;

    try {

      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};

      if (!all[postId]) return null;

      const comment = all[postId].find((c) => c.id === commentId);

      if (!comment) return null;"""

new_like = """  toggleLikeComment(postId, commentId, user) {
    if (!postId || !commentId || !user) return null;
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
      let list = all[postId];
      if (!Array.isArray(list)) {
        list = (list && typeof list === 'object' && list !== null) ? Object.values(list) : [];
      }
      const comment = list.find((c) => c && c.id === commentId);
      if (!comment) return null;"""

if old_like in code:
    code = code.replace(old_like, new_like)
    print("toggleLikeComment updated!")
else:
    print("old_like not found")

old_del = """  deleteComment(postId, commentId, userId) {

    try {

      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};

      if (!all[postId]) return;

      all[postId] = all[postId].filter((c) => c.id !== commentId || (c.authorId !== userId && userId !== 'dev_mahmoud_yasser'));

      this.safeSetItem(STORAGE_KEYS.COMMENTS, all);"""

new_del = """  deleteComment(postId, commentId, userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
      let list = all[postId];
      if (!Array.isArray(list)) {
        list = (list && typeof list === 'object' && list !== null) ? Object.values(list) : [];
      }
      all[postId] = list.filter((c) => c && c.id !== commentId && (c.authorId === userId || userId === 'dev_mahmoud_yasser' || userId === OFFICIAL_FOUNDER.uid));
      this.safeSetItem(STORAGE_KEYS.COMMENTS, all);"""

if old_del in code:
    code = code.replace(old_del, new_del)
    print("deleteComment updated!")
else:
    print("old_del not found")

with open(storage_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Finished!")
