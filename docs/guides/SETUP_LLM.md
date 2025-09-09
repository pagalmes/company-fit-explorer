# 🚀 LLM Setup Guide

This guide will help you set up real LLM integration for testing on your local machine.

## 🏗️ Architecture

```
Frontend (Next.js:3000) ──→ Backend API (Express:3001) ──→ LLM APIs
                                     ↑
                              Environment Variables
                              (API Keys stored securely)
```

## ⚡ Quick Setup

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

```bash
cd server
cp .env.example .env
```

Edit the `.env` file with your API keys:

```bash
# Add your real API keys here
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
OPENAI_API_KEY=sk-proj-your-actual-key-here
GOOGLE_API_KEY=AIza-your-actual-key-here
PORT=3001
```

### 3. Start Both Services

**Terminal 1 - Backend API:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 🧪 Testing

1. **Open the app**: http://localhost:3000
2. **Configure LLM**: Click the gear icon → Add your provider (Anthropic works best)
3. **Test validation**: Click "Validate API Key" (should connect to real API)
4. **Add company**: Try adding a company - it will use real Claude analysis!

## 🔍 How It Works

### Frontend Request
```typescript
// src/utils/llm/providers/anthropic.ts
const response = await fetch('http://localhost:3001/api/llm/anthropic/analyze', {
  method: 'POST',
  body: JSON.stringify({ request: companyAnalysisRequest })
});
```

### Backend Processing
```javascript
// server/server.js
app.post('/api/llm/anthropic/analyze', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY; // Secure!
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    headers: { 'x-api-key': apiKey },
    body: JSON.stringify(llmRequest)
  });
  
  res.json(await response.json());
});
```

## 📊 What You'll See

With real LLM integration:
- ✅ **Real company analysis** based on actual data
- ✅ **Accurate match scores** computed by AI
- ✅ **Intelligent connections** between companies
- ✅ **Usage tracking** (tokens, costs)
- ✅ **Proper error handling**

## 🔒 Security Benefits

- **API keys stay server-side** (never exposed to browser)
- **Rate limiting** can be implemented on backend
- **Request validation** and sanitization
- **Usage monitoring** and cost control
- **Production-ready architecture**

## 🚀 Deployment

This setup works for:
- **Local development** (current setup)
- **Vercel/Netlify** (deploy backend as serverless functions)
- **Docker** (containerize both frontend and backend)
- **Cloud providers** (AWS, GCP, Azure)

## 🔧 Troubleshooting

**Backend won't start:**
- Check if port 3001 is available
- Verify Node.js version (16+ recommended)

**API validation fails:**
- Verify API key format in .env
- Check server logs for detailed errors
- Ensure backend is running on port 3001

**CORS errors:**
- Backend includes CORS middleware
- Frontend configured for localhost:3001

## 🎯 Next Steps

- Add OpenAI and Google providers to backend
- Implement rate limiting with express-rate-limit
- Add request caching for better performance
- Deploy to cloud for public access