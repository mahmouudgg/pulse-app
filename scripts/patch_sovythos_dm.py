import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app"

# 1. Patch sovythosService.js
sovy_file = os.path.join(BASE_DIR, "src", "services", "sovythosService.js")
with open(sovy_file, 'r', encoding='utf-8') as f:
    sovy_content = f.read()

is_crlf_sovy = '\r\n' in sovy_content
sovy_norm = sovy_content.replace('\r\n', '\n')

old_call = "const response = await this.callApi(messages, config);"
new_call = "const response = await this.callChatApi(messages, { max_tokens: 220, temperature: 0.45 });"

if old_call in sovy_norm:
    sovy_norm = sovy_norm.replace(old_call, new_call)
    if is_crlf_sovy:
        sovy_norm = sovy_norm.replace('\n', '\r\n')
    with open(sovy_file, 'w', encoding='utf-8') as f:
        f.write(sovy_norm)
    print("Fixed this.callApi -> this.callChatApi in sovythosService.js successfully!", flush=True)
else:
    print("Could not find old_call in sovythosService.js", flush=True)

# 2. Patch chatService.js
chat_file = os.path.join(BASE_DIR, "src", "services", "chatService.js")
with open(chat_file, 'r', encoding='utf-8') as f:
    chat_content = f.read()

is_crlf_chat = '\r\n' in chat_content
chat_norm = chat_content.replace('\r\n', '\n')

# 2A: Fix message request bypass for Sovythos
old_request_check = """    if (!isAccepted) {
      if (recipientFollowsSender || sender.uid === 'dev_mahmoud_yasser' || sender.username === 'my') {
        isAccepted = true;
        isRequest = false;
      } else {"""

new_request_check = """    const isSovythosRecipient = recipient.uid === 'user_1789917894698' || recipient.username?.toLowerCase() === 'sovythos';
    const isSovythosSender = sender.uid === 'user_1789917894698' || sender.username?.toLowerCase() === 'sovythos';

    if (!isAccepted) {
      if (isSovythosRecipient || isSovythosSender || recipientFollowsSender || sender.uid === 'dev_mahmoud_yasser' || sender.username === 'my') {
        isAccepted = true;
        isRequest = false;
      } else {"""

if old_request_check in chat_norm:
    chat_norm = chat_norm.replace(old_request_check, new_request_check)
    print("Added Sovythos request bypass in chatService.js!", flush=True)
else:
    print("Could not find old_request_check in chatService.js", flush=True)

# 2B: Fix ReferenceError: text is not defined in sendMessage
old_sovy_trigger = """      // Check if recipient is Sovythos — trigger intelligent Pro DM or varied Free response
      const isRecipientSovythos = recipient.uid === 'user_1789917894698' || recipient.username?.toLowerCase() === 'sovythos';
      if (isRecipientSovythos && sender.uid !== 'user_1789917894698') {
        this.triggerSovythosDmAutoReply(conversationId, sender, text);
      }"""

new_sovy_trigger = """      // Check if recipient is Sovythos — trigger intelligent Pro DM or varied Free response
      const isRecipientSovythos = recipient.uid === 'user_1789917894698' || recipient.username?.toLowerCase() === 'sovythos';
      if (isRecipientSovythos && sender.uid !== 'user_1789917894698') {
        const messageText = isVoice ? '' : (typeof content === 'string' ? content : '');
        this.triggerSovythosDmAutoReply(conversationId, sender, messageText);
      }"""

if old_sovy_trigger in chat_norm:
    chat_norm = chat_norm.replace(old_sovy_trigger, new_sovy_trigger)
    print("Fixed text -> messageText reference in chatService.js!", flush=True)
else:
    print("Could not find old_sovy_trigger in chatService.js", flush=True)

# 2C: Enhance triggerSovythosDmAutoReply with typing indicator and robust delay
old_auto_reply_fn = """  // Sovythos Witty DM Reply System (Real Generative AI for Pro subscribers, 50 Varied Egyptian Responses for Free users)
  async triggerSovythosDmAutoReply(conversationId, userSender, userMessageText = '') {
    if (!conversationId || !userSender) return;

    // Natural reading & typing delay
    setTimeout(async () => {"""

new_auto_reply_fn = """  // Sovythos Witty DM Reply System (Real Generative AI for Pro subscribers, 50 Varied Egyptian Responses for Free users)
  async triggerSovythosDmAutoReply(conversationId, userSender, userMessageText = '') {
    if (!conversationId || !userSender) return;

    // Immediately show Sovythos typing indicator
    try {
      this.setTyping(conversationId, 'user_1789917894698', true);
    } catch {}

    // Natural human-like reading & typing delay
    const delay = Math.floor(1200 + Math.random() * 800);

    setTimeout(async () => {"""

if old_auto_reply_fn in chat_norm:
    chat_norm = chat_norm.replace(old_auto_reply_fn, new_auto_reply_fn)
    print("Added typing indicator to triggerSovythosDmAutoReply in chatService.js!", flush=True)
else:
    print("Could not find old_auto_reply_fn in chatService.js", flush=True)

# Also clear typing indicator after sending
old_save_reply = """        // 1. Save auto-reply message
        await set(ref(database, `messages/${conversationId}/${replyMessageId}`), replyPayload);

        // 2. Fetch current unread count for user and update conversation metadata"""

new_save_reply = """        // 1. Save auto-reply message
        await set(ref(database, `messages/${conversationId}/${replyMessageId}`), replyPayload);

        // Clear Sovythos typing indicator
        try {
          this.setTyping(conversationId, 'user_1789917894698', false);
        } catch {}

        // 2. Fetch current unread count for user and update conversation metadata"""

if old_save_reply in chat_norm:
    chat_norm = chat_norm.replace(old_save_reply, new_save_reply)
    print("Added typing clear in triggerSovythosDmAutoReply in chatService.js!", flush=True)
else:
    print("Could not find old_save_reply in chatService.js", flush=True)

if is_crlf_chat:
    chat_norm = chat_norm.replace('\n', '\r\n')

with open(chat_file, 'w', encoding='utf-8') as f:
    f.write(chat_norm)

# 3. Patch ChatConversationPage.jsx to auto-reply to unanswered Sovythos message
page_file = os.path.join(BASE_DIR, "src", "pages", "ChatConversationPage.jsx")
with open(page_file, 'r', encoding='utf-8') as f:
    page_content = f.read()

is_crlf_page = '\r\n' in page_content
page_norm = page_content.replace('\r\n', '\n')

old_autoscroll = """  // Auto-scroll on new message or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);"""

new_autoscroll = """  // Auto-scroll on new message or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  // Auto-catchup: If user previously messaged Sovythos and Sovythos hasn't responded yet, trigger response
  const hasTriggeredCatchupRef = useRef(false);
  useEffect(() => {
    if (!isRecipientSovythos || messages.length === 0 || !currentUser?.uid || hasTriggeredCatchupRef.current) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.senderId === currentUser.uid && lastMsg.type === 'text') {
      const timeSinceLast = Date.now() - (lastMsg.timestamp || 0);
      if (timeSinceLast > 1000 && !String(lastMsg.id).startsWith('opt_')) {
        hasTriggeredCatchupRef.current = true;
        const timer = setTimeout(() => {
          chatService.triggerSovythosDmAutoReply(conversationId, currentUser, lastMsg.content);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [conversationId, isRecipientSovythos, messages, currentUser]);"""

if old_autoscroll in page_norm:
    page_norm = page_norm.replace(old_autoscroll, new_autoscroll)
    if is_crlf_page:
        page_norm = page_norm.replace('\n', '\r\n')
    with open(page_file, 'w', encoding='utf-8') as f:
        f.write(page_norm)
    print("ChatConversationPage.jsx auto-catchup added successfully!", flush=True)
else:
    print("Could not find old_autoscroll in ChatConversationPage.jsx", flush=True)

print("Finished patch_sovythos_dm.py completely!", flush=True)
