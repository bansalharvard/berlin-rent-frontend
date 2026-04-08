# Berlin.rent Backend API

FastAPI backend for the Berlin rental marketplace.

## Deploy to Railway

1. Connect this repo to Railway
2. Add environment variables:
   - MONGO_URL
   - DB_NAME
   - CORS_ORIGINS
   - EMERGENT_LLM_KEY

## Local Development

```bash
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```
