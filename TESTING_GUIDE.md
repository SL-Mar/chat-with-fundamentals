# Testing Guide - Chat with Fundamentals (EODHD Client)

## 🚀 Quick Start - 3 Ways to Test

---

## Option 1: Quick Test Script (⚡ Fastest)

Test the new EODHD client without launching the full app.

### Step 1: Set your API key

```bash
cd /home/user/chat-with-fundamentals
export EODHD_API_KEY=your_key_here
```

Or create a `.env` file in the backend directory:

```bash
echo "EODHD_API_KEY=your_key_here" > backend/.env
```

### Step 2: Run the quick test

```bash
python test_eodhd_client.py
```

**What it tests:**
- ✅ API authentication
- ✅ Live price data
- ✅ Fundamental data
- ✅ News
- ✅ Exchange information
- ✅ Technical indicators

**Expected output:**
```
🚀 TESTING NEW EODHD CLIENT
✅ API Key found
✅ Client initialized successfully
✅ Plan: All-World
✅ Requests today: 5 / 100000
✅ Price: $175.43
✅ Market Cap: $2,750,000,000,000
✅ Found 3 articles
✅ NEW EODHD CLIENT TESTS COMPLETED!
```

---

## Option 2: Full Examples (🔍 Most Comprehensive)

Run all endpoint examples to see every feature in action.

```bash
cd /home/user/chat-with-fundamentals
export EODHD_API_KEY=your_key_here
python backend/tools/eodhd_client/examples.py
```

**What it demonstrates:**
- All 50+ endpoints
- Real data from every category
- Practical usage patterns
- Error handling examples

**Time:** ~2-3 minutes (makes many API calls)

---

## Option 3: Full Application (🌐 Complete Experience)

Launch the full frontend + backend web application.

### Prerequisites

1. **Install dependencies** (if not already done):

```bash
cd /home/user/chat-with-fundamentals
bash deploy.sh
```

This will:
- Create Python virtual environment
- Install Python dependencies
- Install Node.js dependencies
- Copy `.env.model` to `.env`

2. **Configure API keys** in `backend/.env`:

```bash
nano backend/.env
```

Add:
```env
EODHD_API_KEY=your_eodhd_key
OPENAI_API_KEY=your_openai_key
MODEL_NAME=gpt-4o
```

### Launch the App

```bash
cd /home/user/chat-with-fundamentals
bash launch.sh
```

**This will:**
- ✅ Start Frontend (Next.js) on http://localhost:3000
- ✅ Start Backend (FastAPI) on http://localhost:8000
- ✅ Open both in your browser
- ✅ Open API docs at http://localhost:8000/docs

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main web interface |
| **Backend API** | http://localhost:8000 | FastAPI server |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger docs |
| **Alternative Docs** | http://localhost:8000/redoc | ReDoc documentation |

---

## 🧪 Testing Individual Endpoints

### Interactive Python Shell

```bash
cd /home/user/chat-with-fundamentals
export EODHD_API_KEY=your_key_here
python
```

```python
from backend.tools.eodhd_client import EODHDClient

client = EODHDClient()

# Test live price
live = client.historical.get_live_price("AAPL.US")
print(f"AAPL: ${live['close']}")

# Test fundamentals
fund = client.fundamental.get_fundamentals("AAPL.US", filter_param="Highlights")
print(fund['Highlights']['MarketCapitalization'])

# Test news
news = client.news.get_news("AAPL", limit=5)
for article in news:
    print(article['title'])

# Test screener
stocks = client.technical.screen_stocks(
    filters=["market_capitalization>10000000000", "pe_ratio<30"],
    limit=10
)
print(stocks)

# Check usage
usage = client.user.get_user_info()
print(f"API calls today: {usage['apiRequests']}")
```

---

## 📊 Testing via API Endpoints (FastAPI)

Once the backend is running, test via HTTP:

### Using curl

```bash
# Get live price
curl "http://localhost:8000/equity/simulate?ticker=AAPL&horizon=20"

# Get returns analysis
curl "http://localhost:8000/equity/returns?ticker=AAPL&years=3&benchmark=SPY"

# Analyze fundamentals
curl -X POST "http://localhost:8000/analyzer/analyze" \
  -H "Content-Type: application/json" \
  -d '{"user_query": "Analyze AAPL fundamentals"}'
```

### Using the Swagger UI

1. Go to http://localhost:8000/docs
2. Click on any endpoint
3. Click "Try it out"
4. Enter parameters
5. Click "Execute"

---

## 🔍 Verifying the Upgrade

### Check Old vs New

**OLD CLIENT (still works for compatibility):**
```python
from backend.tools.EODHDTool import EODHDTool
tool = EODHDTool()
data = tool._run("AAPL")  # Only fundamentals
```

**NEW CLIENT (recommended):**
```python
from backend.tools.eodhd_client import EODHDClient
client = EODHDClient()

# Now you have access to 50+ endpoints:
client.historical.get_eod("AAPL.US")
client.historical.get_live_price("AAPL.US")
client.fundamental.get_fundamentals("AAPL.US")
client.news.get_news("AAPL")
client.technical.get_technical_indicator("AAPL.US", "rsi")
client.special.get_etf_holdings("SPY.US")
# ... and 44 more!
```

---

## ⚠️ Troubleshooting

### Issue: "EODHD_API_KEY environment variable not set"

**Solution:**
```bash
export EODHD_API_KEY=your_key_here
```

Or add to `backend/.env`:
```
EODHD_API_KEY=your_key_here
```

### Issue: "ModuleNotFoundError: No module named 'eodhd_client'"

**Solution:**
```bash
cd /home/user/chat-with-fundamentals
export PYTHONPATH="${PYTHONPATH}:/home/user/chat-with-fundamentals/backend"
python test_eodhd_client.py
```

### Issue: "HTTPError: 401 Unauthorized"

**Solution:** Check your API key is correct and active

### Issue: "HTTPError: 429 Too Many Requests"

**Solution:** You've hit the rate limit. Check usage:
```python
client = EODHDClient()
info = client.user.get_user_info()
print(f"Used: {info['apiRequests']} / {info['apiRequestsLimit']}")
```

### Issue: Frontend won't start

**Solution:**
```bash
cd /home/user/chat-with-fundamentals/frontend
npm install
npm run dev
```

### Issue: Backend won't start

**Solution:**
```bash
cd /home/user/chat-with-fundamentals/backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 📈 Performance Testing

### API Call Speed

```python
import time
from backend.tools.eodhd_client import EODHDClient

client = EODHDClient()

# Test single call speed
start = time.time()
data = client.historical.get_live_price("AAPL.US")
print(f"Live price call: {time.time() - start:.2f}s")

# Test bulk call speed
start = time.time()
bulk = client.historical.get_live_prices_bulk(["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN"])
print(f"Bulk 5 symbols: {time.time() - start:.2f}s")
```

---

## 🎯 What to Test

### Essential Tests

- [ ] Live price for AAPL
- [ ] EOD historical data
- [ ] Fundamental data (Highlights)
- [ ] News for a symbol
- [ ] API usage check
- [ ] Technical indicator (RSI)

### Advanced Tests

- [ ] Stock screener
- [ ] ETF holdings
- [ ] Insider transactions
- [ ] Economic calendar
- [ ] Bulk EOD download
- [ ] Options data
- [ ] ESG scores

### Full Integration Tests

- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] Search for a symbol
- [ ] Generate an analysis
- [ ] View charts
- [ ] Export data

---

## 📚 Next Steps After Testing

1. **Read the documentation:**
   - `backend/tools/eodhd_client/README.md`
   - `backend/tools/eodhd_client/QUICK_REFERENCE.md`

2. **Explore examples:**
   - `backend/tools/eodhd_client/examples.py`

3. **Integrate into workflows:**
   - Update `backend/workflows/analyze.py`
   - Add new routers in `backend/routers/`
   - Enhance frontend with new data

4. **Build new features:**
   - Add screener to frontend
   - Create ESG dashboard
   - Build earnings calendar widget
   - Add technical indicator charts

---

## 📞 Support

- **EODHD API Docs:** https://eodhd.com/financial-apis/
- **Client Documentation:** `backend/tools/eodhd_client/README.md`
- **Quick Reference:** `backend/tools/eodhd_client/QUICK_REFERENCE.md`
- **Project README:** `README.md`

---

**Happy Testing!** 🚀
