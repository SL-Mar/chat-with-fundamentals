# Security Guide

This document explains the security measures implemented in Chat with Fundamentals and how to deploy safely.

## 🔐 Security Features

### 1. API Key Authentication

All backend endpoints (except health check) require authentication via API key.

**How it works:**
- Frontend includes `X-API-Key` header in all requests
- Backend validates the key against `APP_API_KEY` environment variable
- Invalid/missing keys receive 401 Unauthorized response

**Development Mode:**
- If `APP_API_KEY` is NOT set → authentication is disabled (local development only)
- ⚠️ **Never deploy to production without setting APP_API_KEY!**

**Production Mode:**
- If `APP_API_KEY` IS set → authentication is enforced
- Protects your OpenAI and EODHD API keys from unauthorized access

### 2. Rate Limiting

Prevents abuse and protects against cost escalation:

- **5 requests/minute** per IP address on expensive endpoints
- Powered by `slowapi` middleware
- Returns 429 Too Many Requests when exceeded

### 3. CORS Configuration

**Development:**
```python
allow_origins=["http://localhost:3000", "http://localhost:3003"]
```

**Production:**
```python
allow_origins=[os.getenv("ALLOWED_ORIGINS")]
```

Only allows requests from specified frontend origins.

### 4. Secure Environment Variables

**Never committed to Git:**
- `.env` is in `.gitignore`
- API keys stored only in environment variables
- Loaded at runtime from deployment platform

---

## 🚀 Deployment Security Checklist

### Step 1: Generate API Key

```bash
# Run this to generate a secure random API key:
python backend/core/auth.py

# Output:
# APP_API_KEY=d4f7a8b9c2e1f3a6b5c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
```

Copy this key - you'll need it for both backend and frontend.

### Step 2: Set Backend Environment Variables

On your deployment platform (Railway/Render/Fly.io), set:

```bash
# REQUIRED
OPENAI_API_KEY=sk-proj-...
EODHD_API_KEY=...
APP_API_KEY=d4f7a8b9...  # From Step 1
MODEL_NAME=gpt-4o-mini   # Cheapest model

# OPTIONAL
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
```

### Step 3: Set Frontend Environment Variables

In your frontend deployment (Vercel/Netlify/etc):

```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_APP_API_KEY=d4f7a8b9...  # Same as backend APP_API_KEY
```

### Step 4: Verify Security

1. **Test authentication:**
   ```bash
   # Without API key - should fail with 401
   curl https://your-backend.railway.app/analyzer/chat

   # With API key - should work
   curl -H "X-API-Key: d4f7a8b9..." https://your-backend.railway.app/analyzer/chat
   ```

2. **Check health endpoint (no auth required):**
   ```bash
   curl https://your-backend.railway.app/
   # Should return: {"status":"ok","auth_required":true}
   ```

3. **Test rate limiting:**
   ```bash
   # Send 10 requests rapidly
   for i in {1..10}; do curl -H "X-API-Key: ..." your-backend/log-test; done
   # Should see 429 errors after 5 requests
   ```

---

## 💰 Cost Protection

Even with authentication, protect against unexpected costs:

### 1. OpenAI Budget Limits

Set hard limits on OpenAI dashboard:

1. Go to https://platform.openai.com/account/limits
2. Set **monthly budget**: $20 (or your preferred limit)
3. Enable **usage alerts** at $5, $10, $15
4. OpenAI will **stop** your API when limit is reached

### 2. Use Cheapest Model

We've configured `gpt-4o-mini` as default:

| Model | Cost (Input) | Cost (Output) | Savings vs gpt-4o |
|-------|-------------|---------------|-------------------|
| **gpt-4o-mini** | $0.15/1M | $0.60/1M | **90% cheaper** ⭐ |
| gpt-4o | $2.50/1M | $10.00/1M | Baseline |
| o1 | $15.00/1M | $60.00/1M | 6x more expensive |

Typical query costs:
- **gpt-4o-mini**: $0.01-0.05 per analysis
- **gpt-4o**: $0.10-0.50 per analysis
- **o1**: $0.60-3.00 per analysis

### 3. Monitor Usage

```bash
# Check OpenAI usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check app logs
railway logs  # or render logs, fly logs
```

---

## 🚨 Security Incident Response

### If API Key is Exposed

1. **Immediately revoke exposed key:**
   - OpenAI: https://platform.openai.com/api-keys → Delete key
   - EODHD: Contact support or regenerate

2. **Generate new APP_API_KEY:**
   ```bash
   python backend/core/auth.py
   ```

3. **Update environment variables:**
   - Backend: Set new `APP_API_KEY`
   - Frontend: Set new `NEXT_PUBLIC_APP_API_KEY`
   - Redeploy both services

### If Seeing Unusual Traffic

1. **Check logs for suspicious IPs:**
   ```bash
   railway logs | grep "Authentication failed"
   ```

2. **Add IP blocking if needed:**
   ```python
   # In backend/main.py
   BLOCKED_IPS = ["1.2.3.4", "5.6.7.8"]

   @app.middleware("http")
   async def block_ips(request: Request, call_next):
       if request.client.host in BLOCKED_IPS:
           raise HTTPException(403)
       return await call_next(request)
   ```

3. **Reduce rate limits temporarily:**
   ```python
   @limiter.limit("2/minute")  # Reduce from 5 to 2
   ```

---

## 🔍 Security Audit

Run these checks periodically:

```bash
# 1. Verify .env is not tracked
git check-ignore .env
# Should output: .env ✅

# 2. Check no secrets in git history
git log --all --full-history -- .env
# Should be empty ✅

# 3. Search for hardcoded secrets
git grep -i "sk-proj"
git grep -i "api_key.*="
# Should return nothing ✅

# 4. Verify authentication is enabled in production
curl https://your-backend.railway.app/
# Should show: "auth_required": true ✅
```

---

## 📚 Additional Resources

- **FastAPI Security**: https://fastapi.tiangolo.com/tutorial/security/
- **OpenAI Best Practices**: https://platform.openai.com/docs/guides/safety-best-practices
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/

---

## 📝 Summary

✅ **DO:**
- Generate strong APP_API_KEY for production
- Set OpenAI budget limits
- Monitor costs regularly
- Use gpt-4o-mini (cheapest model)
- Keep .env files in .gitignore
- Enable rate limiting
- Update dependencies regularly

❌ **DON'T:**
- Commit .env files to git
- Deploy without APP_API_KEY
- Share your APP_API_KEY publicly
- Hardcode API keys in code
- Disable authentication in production
- Ignore cost alerts

---

**Need help?** Open an issue at https://github.com/SL-Mar/chat-with-fundamentals/issues
