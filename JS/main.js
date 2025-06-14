// Auto-resize textarea based on content
    function autoResizeTextarea(textarea) {
      textarea.style.height = 'auto'; // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`; // Adjust to content height
    }

    // Apply auto-resize to textareas
    document.querySelectorAll('#prompt, #codePrompt').forEach(textarea => {
      textarea.addEventListener('input', () => autoResizeTextarea(textarea));
    });

    // مفتاح API (يجب استبداله بمفتاح حقيقي في الإنتاج)
    const apiKey = "AIzaSyB7YsXWxDR_gMuJxM_lUnnsTPLigRoZtNo";

    // استيراد جميع تعليمات النظام
    import behaviorInstructions from './instructions/behavior.js';
    import programmingInstructions from './instructions/programming.js';
    import skillsInstructions from './instructions/skills.js';
    import restrictionsInstructions from './instructions/restrictions.js';
    import responsesInstructions from './instructions/responses.js';
    import localizationInstructions from './instructions/localization.js';
    import errorHandlingInstructions from './instructions/error_handling.js';
    import contextInstructions from './instructions/context.js';
    import cookingInstructions from './instructions/cooking.js'; 
    import sportsInstructions from './instructions/sports.js'; 

    // إنشاء معرف UUID فريد
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    let currentConversationId = generateUUID();
    let isNewConversation = true;

    // حفظ المحادثة في localStorage
    function saveConversation(messages, isNew = false) {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const timestamp = new Date().toISOString();
      const firstMessage = messages.find(msg => msg.role === 'user')?.text || 'محادثة جديدة';
      const title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');

      if (isNew) {
        currentConversationId = generateUUID();
        conversations.unshift({ id: currentConversationId, title, timestamp, messages });
      } else {
        const conversationIndex = conversations.findIndex(conv => conv.id === currentConversationId);
        if (conversationIndex !== -1) {
          conversations[conversationIndex].messages = [
            ...conversations[conversationIndex].messages,
            ...messages,
          ];
          conversations[conversationIndex].timestamp = timestamp;
          conversations[conversationIndex].title = title;
        } else {
          conversations.unshift({ id: currentConversationId, title, timestamp, messages });
        }
      }

      localStorage.setItem('conversations', JSON.stringify(conversations));
      loadConversations();
    }

    // تحميل المحادثات في قائمة المحادثات
    function loadConversations() {
      const conversationList = document.getElementById('conversationList');
      if (!conversationList) return;

      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      conversationList.innerHTML = '';
      conversations.forEach(conv => {
        const li = document.createElement('li');
        li.className = `conversation-item ${conv.id === currentConversationId ? 'active' : ''}`;
        li.innerHTML = `<p>${conv.title}</p><span class="time">${formatDate(conv.timestamp)}</span>`;
        li.addEventListener('click', () => {
          loadConversation(conv.id);
          closeSidebar();
        });
        conversationList.appendChild(li);
      });
    }

    // تنسيق التاريخ والوقت
    function formatDate(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      return date.toDateString() === now.toDateString()
        ? date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    }

    // تحميل محادثة محددة
    function loadConversation(id) {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const conversation = conversations.find(conv => conv.id === id);
      if (!conversation) return;

      currentConversationId = id;
      isNewConversation = false;
      const chatArea = document.getElementById('chatArea');
      if (!chatArea) return;

      chatArea.innerHTML = '';
      conversation.messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`;
        messageDiv.innerHTML = msg.role === 'bot'
          ? `<span class="message-text">${msg.text}</span><div class="message-time">${formatDate(msg.timestamp)}</div>`
          : `${msg.text}<div class="message-time">${formatDate(msg.timestamp)}</div>`;
        chatArea.appendChild(messageDiv);
      });
      chatArea.scrollTop = chatArea.scrollHeight;
      loadConversations();
    }

    // بدء محادثة جديدة
    function startNewConversation() {
      currentConversationId = generateUUID();
      isNewConversation = true;
      const chatArea = document.getElementById('chatArea');
      if (chatArea) {
        chatArea.innerHTML = `
          <div class="message bot-message">
            <span class="message-text">مرحبًا! كيف يمكنني مساعدتك اليوم؟ <i class="fas fa-brain"></i></span>
            <div class="message-time">${getCurrentTime()}</div>
          </div>
        `;
        chatArea.scrollTop = chatArea.scrollHeight;
      }
      const codeOutput = document.getElementById('codeOutput');
      if (codeOutput) codeOutput.classList.remove('active');
      loadConversations();
      closeSidebar();
    }

    // إعداد التسجيل الصوتي
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let isRecording = false;

    function startSpeechRecognition() {
      const micBtn = document.getElementById('micBtn');
      if (!micBtn) return;

      if (isRecording) {
        recognition.stop();
        return;
      }

      isRecording = true;
      micBtn.classList.add('active');
      recognition.start();

      recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        const promptInput = document.getElementById('prompt');
        if (promptInput) promptInput.value = transcript;
        isRecording = false;
        micBtn.classList.remove('active');
        askGemini();
      };

      recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('active');
      };

      recognition.onerror = event => {
        console.error('Speech recognition error:', event.error);
        isRecording = false;
        micBtn.classList.remove('active');
        const promptInput = document.getElementById('prompt');
        if (promptInput) promptInput.value = 'حدث خطأ في التسجيل الصوتي. حاول مرة أخرى.';
      };
    }

    // عرض رسوم متحركة للكتابة
    function showTypingAnimation() {
      const chatArea = document.getElementById('chatArea');
      if (!chatArea) return null;

      const existingTyping = document.querySelector('.typing-message');
      if (existingTyping) existingTyping.remove();

      const typing = document.createElement('div');
      typing.className = 'typing-message active';
      typing.innerHTML = `
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
      chatArea.appendChild(typing);
      chatArea.scrollTop = chatArea.scrollHeight;
      return typing;
    }

    // تأثير الكتابة التدريجية
    function typeWriter(element, text, speed = 5) {
      if (!element) return Promise.resolve();

      const cleanText = text.replace(/<[^>]+>/g, '');
      const chars = cleanText.split('');
      let i = 0;
      let currentText = '';

      return new Promise(resolve => {
        function type() {
          if (i < chars.length) {
            currentText += chars[i];
            element.innerHTML = currentText + '<span class="typewriter-cursor">|</span>';
            i++;
            setTimeout(type, speed);
          } else {
            element.innerHTML = text;
            resolve();
          }
        }
        type();
      });
    }

    // تحديد التعليمات النظامية بناءً على نوع الطلب
    function getSystemInstructions(promptText) {
      const isCodeRequest = promptText.includes('كود') || promptText.includes('برمجة');
      const isCookingRequest = promptText.includes('طبخ') || promptText.includes('وصفة');
      const isSportsRequest = promptText.includes('رياضة') || promptText.includes('تمرين');
      
      let specificInstructions;
      if (isCodeRequest) {
        specificInstructions = programmingInstructions;
      } else if (isCookingRequest) {
        specificInstructions = cookingInstructions;
      } else if (isSportsRequest) {
        specificInstructions = sportsInstructions;
      } else {
        specificInstructions = skillsInstructions;
      }

      return [
        behaviorInstructions,
        specificInstructions,
        restrictionsInstructions,
        responsesInstructions,
        localizationInstructions,
        errorHandlingInstructions,
        contextInstructions,
      ].join('\n');
    }

    // جلب الرسائل السابقة للمحادثة الحالية
    function getPreviousMessages() {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const conversation = conversations.find(conv => conv.id === currentConversationId);
      return conversation ? conversation.messages : [];
    }

    // طلب API للدردشة مع السياق
    async function askGemini() {
      const promptInput = document.getElementById('prompt');
      const chatArea = document.getElementById('chatArea');
      if (!promptInput || !chatArea) return;

      const promptText = promptInput.value.trim();
      if (!promptText) return;

      const userMessage = document.createElement('div');
      userMessage.className = 'message user-message';
      userMessage.innerHTML = `${promptText}<div class="message-time">${getCurrentTime()}</div>`;
      chatArea.appendChild(userMessage);

      const typing = showTypingAnimation();
      chatArea.scrollTop = chatArea.scrollHeight;
      promptInput.value = '';

      // جلب الرسائل السابقة للمحادثة الحالية
      const previousMessages = getPreviousMessages();
      const newMessage = { role: 'user', text: promptText, timestamp: new Date().toISOString() };
      const messages = [...previousMessages, newMessage]; // إضافة الرسالة الجديدة إلى السياق

      const systemInstruction = getSystemInstructions(promptText);

      try {
        const apiMessages = [
          { role: 'user', parts: [{ text: systemInstruction }] },
          // تحويل الرسائل السابقة والحالية إلى تنسيق API
          ...messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
          })),
        ];

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: apiMessages }),
          }
        );

        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

        const data = await res.json();
        if (typing) typing.remove();

        const botMessage = document.createElement('div');
        botMessage.className = 'message bot-message';
        const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أستطع الرد حاليًا.';
        const messageText = document.createElement('span');
        messageText.className = 'message-text';
        botMessage.appendChild(messageText);
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = getCurrentTime();
        botMessage.appendChild(timeDiv);
        chatArea.appendChild(botMessage);

        await typeWriter(messageText, botText);
        messages.push({ role: 'bot', text: botText, timestamp: new Date().toISOString() });
        saveConversation([newMessage], isNewConversation); // حفظ الرسالة الجديدة فقط
        isNewConversation = false;
      } catch (error) {
        console.error('Error:', error);
        if (typing) typing.remove();

        const botMessage = document.createElement('div');
        botMessage.className = 'message bot-message';
        botMessage.innerHTML = `حدث خطأ أثناء الاتصال. حاول مرة أخرى.<div class="message-time">${getCurrentTime()}</div>`;
        chatArea.appendChild(botMessage);
        messages.push({ role: 'bot', text: 'حدث خطأ أثناء الاتصال.', timestamp: new Date().toISOString() });
        saveConversation([newMessage], isNewConversation);
        isNewConversation = false;
      }
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // توليد الكود
    async function generateCode() {
      const lang = document.getElementById('codeLanguage')?.value;
      const prompt = document.getElementById('codePrompt')?.value;
      const codeOutput = document.getElementById('codeOutput');
      if (!lang || !prompt || !codeOutput) return;

      codeOutput.innerHTML = `
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
      codeOutput.classList.add('active');

      const systemInstruction = [
        behaviorInstructions,
        programmingInstructions,
        restrictionsInstructions,
        localizationInstructions,
        errorHandlingInstructions,
      ].join('\n');

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: systemInstruction }] },
                { role: 'user', parts: [{ text: `اكتب كود ${lang}: ${prompt}` }] },
              ],
            }),
          }
        );

        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

        const data = await res.json();
        const codeText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أستطع توليد الكود.';
        codeOutput.innerText = codeText;
      } catch (error) {
        console.error('Error:', error);
        codeOutput.innerText = 'حدث خطأ أثناء توليد الكود.';
      }
      codeOutput.scrollTop = codeOutput.scrollHeight;
    }

    // تبديل واجهة إدخال الكود
    function toggleCodeInput() {
      const chatInput = document.getElementById('chatInput');
      const codeInput = document.getElementById('codeInput');
      if (chatInput && codeInput) {
        chatInput.style.display = 'none';
        codeInput.style.display = 'flex';
      }
    }

    // تبديل واجهة إدخال الدردشة
    function toggleChatInput() {
      const chatInput = document.getElementById('chatInput');
      const codeInput = document.getElementById('codeInput');
      const codeOutput = document.getElementById('codeOutput');
      if (chatInput && codeInput && codeOutput) {
        chatInput.style.display = 'flex';
        codeInput.style.display = 'none';
        codeOutput.classList.remove('active');
        document.getElementById('codeLanguage').value = '';
        document.getElementById('codePrompt').value = '';
      }
    }

    // الحصول على الوقت الحالي
    function getCurrentTime() {
      return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }

    // تبديل الشريط الجانبي
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
      }
    }

    // إغلاق الشريط الجانبي
    function closeSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
      }
    }

    // تهيئة التطبيق
    document.addEventListener('DOMContentLoaded', () => {
      loadConversations();
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      if (conversations.length === 0) {
        saveConversation([
          {
            role: 'bot',
            text: 'مرحبًا! كيف يمكنني مساعدتك اليوم؟ <i class="fas fa-brain"></i>',
            timestamp: new Date().toISOString(),
          },
        ], true);
      }

      document.getElementById('sendBtn')?.addEventListener('click', askGemini);
      document.getElementById('prompt')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          askGemini();
        }
      });
      document.getElementById('micBtn')?.addEventListener('click', startSpeechRecognition);
      document.getElementById('newChatBtn')?.addEventListener('click', startNewConversation);
      document.getElementById('toggleSidebar')?.addEventListener('click', toggleSidebar);
      document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
      document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
      document.getElementById('codeBtn')?.addEventListener('click', toggleCodeInput);
      document.getElementById('chatBtn')?.addEventListener('click', toggleChatInput);
      document.getElementById('generateCodeBtn')?.addEventListener('click', generateCode);

      document.addEventListener('click', e => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const toggleBtn = document.getElementById('toggleSidebar');
        if (
          sidebar?.classList.contains('active') &&
          !sidebar.contains(e.target) &&
          e.target !== toggleBtn
        ) {
          closeSidebar();
        }
      });
    });