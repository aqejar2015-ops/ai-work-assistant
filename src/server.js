import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, pageContent } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'API key not configured' });
    }

    // System prompt that includes page context
    const systemPrompt = `أنت مساعد عمل ذكي يساعد المستخدم في تصفح والعمل على المواقع الإلكترونية.
معلومات عن الصفحة الحالية:
${pageContent || 'لا توجد معلومات عن الصفحة الحالية'}

تعليماتك:
- اجب بشكل واضح وموجز
- ركز على مساعدة المستخدم في فهم الخطوات
- اطلب تأكيد قبل تنفيذ إجراءات حساسة
- كن مفيداً وودياً
- أجب باللغة العربية إلا إذا طلب المستخدم غير ذلك`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    res.json({
      success: true,
      message: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// API endpoint to get page content
app.post('/api/extract-content', async (req, res) => {
  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    // Simple text extraction - remove scripts, styles, and extra whitespace
    let text = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to first 2000 characters for API efficiency
    text = text.substring(0, 2000);

    res.json({
      success: true,
      content: text,
    });
  } catch (error) {
    console.error('Content extraction error:', error);
    res.status(500).json({ error: 'Failed to extract content' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('Make sure you have set OPENAI_API_KEY in .env file');
});
