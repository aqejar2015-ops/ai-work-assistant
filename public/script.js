// DOM Elements
const urlInput = document.getElementById('urlInput');
const loadBtn = document.getElementById('loadBtn');
const refreshBtn = document.getElementById('refreshBtn');
const pageFrame = document.getElementById('pageFrame');
const loading = document.getElementById('loading');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const summarizeBtn = document.getElementById('summarizeBtn');
const helpBtn = document.getElementById('helpBtn');

// State
let conversationHistory = [];
let currentPageContent = '';
let isLoading = false;

// Load page from URL
function loadPage() {
  const url = urlInput.value.trim();
  
  if (!url) {
    showError('يرجى إدخال رابط صحيح');
    return;
  }

  // Validate URL format
  let validUrl;
  try {
    validUrl = new URL(url);
  } catch {
    if (!url.startsWith('http')) {
      validUrl = new URL('https://' + url);
    } else {
      showError('رابط غير صحيح');
      return;
    }
  }

  loading.style.display = 'block';
  pageFrame.style.opacity = '0.5';

  // Use CORS proxy for better compatibility
  const proxyUrl = `https://cors-anywhere.herokuapp.com/${validUrl.toString()}`;
  
  pageFrame.src = validUrl.toString();

  pageFrame.onload = () => {
    loading.style.display = 'none';
    pageFrame.style.opacity = '1';
    extractPageContent();
    addMessage('مساعد', `تم تحميل الصفحة: ${validUrl.hostname}`);
  };

  pageFrame.onerror = () => {
    loading.style.display = 'none';
    pageFrame.style.opacity = '1';
    showError('فشل تحميل الصفحة. قد يكون الموقع لا يسمح بالعرض في إطار.');
  };
}

// Extract page content from iframe
function extractPageContent() {
  try {
    const iframeDoc = pageFrame.contentDocument || pageFrame.contentWindow.document;
    if (!iframeDoc) {
      currentPageContent = 'لا يمكن الوصول إلى محتوى الصفحة';
      return;
    }

    const htmlContent = iframeDoc.documentElement.innerHTML;
    
    // Send to server for processing
    fetch('/api/extract-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html: htmlContent }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        currentPageContent = data.content;
      }
    })
    .catch(error => console.error('Error extracting content:', error));
  } catch (error) {
    console.error('Cannot access iframe content:', error);
    currentPageContent = 'لا يمكن الوصول إلى محتوى الصفحة (قد يكون الموقع محمياً)';
  }
}

// Send chat message
async function sendMessage() {
  const message = chatInput.value.trim();
  
  if (!message) return;

  // Add user message to UI
  addMessage('أنت', message);
  chatInput.value = '';
  sendBtn.disabled = true;

  // Add to conversation history
  conversationHistory.push({
    role: 'user',
    content: message,
  });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: conversationHistory,
        pageContent: currentPageContent,
      }),
    });

    const data = await response.json();

    if (data.success) {
      const assistantMessage = data.message;
      addMessage('مساعد', assistantMessage);
      conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });
    } else {
      showError(data.error || 'حدث خطأ في المعالجة');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('فشل الاتصال بالخادم. تأكد من أن السيرفر يعمل.');
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// Add message to chat
function addMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + (sender === 'أنت' ? 'user-message' : 'assistant-message');
  
  const content = document.createElement('p');
  content.textContent = text;
  messageDiv.appendChild(content);

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message error-message';
  errorDiv.textContent = '❌ ' + message;
  chatMessages.appendChild(errorDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Summarize page
async function summarizePage() {
  if (!currentPageContent) {
    showError('لا توجد محتوى صفحة لتلخيصها');
    return;
  }

  const message = 'قم بتلخيص محتوى الصفحة الحالية بشكل موجز في 3-4 نقاط رئيسية';
  chatInput.value = message;
  sendMessage();
}

// Get help on current task
async function getHelp() {
  const message = 'ما هي الخطوات التالية التي يجب أن أتخذها على هذه الصفحة؟ وكيف يمكنني إكمال مهمتي؟';
  chatInput.value = message;
  sendMessage();
}

// Clear chat
function clearChat() {
  chatMessages.innerHTML = '';
  conversationHistory = [];
  addMessage('مساعد', 'تم مسح المحادثة. كيف يمكنني مساعدتك؟');
}

// Event Listeners
loadBtn.addEventListener('click', loadPage);
refreshBtn.addEventListener('click', () => {
  pageFrame.src = pageFrame.src;
});
sendBtn.addEventListener('click', sendMessage);
clearBtn.addEventListener('click', clearChat);
summarizeBtn.addEventListener('click', summarizePage);
helpBtn.addEventListener('click', getHelp);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Load default page on startup
window.addEventListener('load', () => {
  loadPage();
});
