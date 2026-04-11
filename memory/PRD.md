# Berlin.rent - PRD & Implementation Status

## Original Problem Statement
Build a simple, modern web application inspired by bengaluru.rent that helps users explore real rental prices in Berlin with:
- Interactive map with anonymous rent data points
- Webstore-style browsing experience with cards + map
- Filters for rent range, neighborhood, apartment type, size
- Warmmiete/Kaltmiete toggle
- Am I Overpaying estimator
- Community validation (upvote/downvote)

## User Choices
- Map: Leaflet with OpenStreetMap (free, no API key needed)
- Database: MongoDB Atlas (user-provided cloud connection)
- "Am I Overpaying?": Simple comparison (no AI)
- Pre-loaded sample data: Yes (49 Berlin rental listings)
- Backend deployed to Render
- Frontend deploying to Vercel

## User Personas
1. **Renters** - Looking to understand fair rental prices in Berlin neighborhoods
2. **New Movers** - Want to know if they're overpaying for their apartment
3. **Community Contributors** - Submit anonymous rent data to help others

## Core Requirements
- [x] Interactive Berlin map with rent data pins
- [x] Anonymous rent submission form
- [x] Neighborhood filters (15 Berlin Bezirke)
- [x] Apartment type filters (WG room, studio, 1-3+ Zimmer)
- [x] Warmmiete/Kaltmiete toggle
- [x] Price range filters
- [x] Price per sqm calculation
- [x] "Am I Overpaying?" estimator
- [x] Community upvote/downvote
- [x] Building type indicator (Altbau/Neubau)
- [x] AI-powered price suggestions & description generation
- [x] Dashboard with market insights
- [x] WhatsApp sharing
- [x] Comments on listings

## What's Been Implemented (Jan-Apr 2026)

### Backend (FastAPI + MongoDB Atlas)
- `GET /api/listings` - Get listings with filters
- `POST /api/listings` - Create anonymous rental listing
- `POST /api/listings/{id}/comments` - Add comments
- `GET /api/stats/dashboard` - Dashboard market stats
- `GET /api/neighborhoods` - Returns 15 Berlin neighborhoods
- `POST /api/seed` - Seed sample listings
- `POST /api/ai/suggest-price` - AI price suggestion
- `POST /api/ai/generate-description` - AI description generation

### Frontend (React + Leaflet + Tailwind)
- Split-screen layout (map + listings)
- Interactive Leaflet map with color-coded pins
- Filter bar with search, type toggle, neighborhood, apartment type
- Listing cards with price, size, contact info
- Create listing modal (3-step wizard)
- View listing modal with comments
- Dashboard modal with charts
- WhatsApp sharing
- Mobile responsive with bottom action bar

### Deployment
- Backend: Deployed to Render (DONE)
- Frontend: Vercel deployment FIX PROVIDED (Apr 11 2026)
  - Root cause: Bloated package.json with ~40 unused radix-ui packages causing ajv version conflicts
  - Fix: Minimal package.json with only required dependencies + changed @/ imports to relative paths
  - Build verified locally: SUCCESS

## Prioritized Backlog

### P1 (Should Have)
- [ ] "Am I Overpaying" badges on individual listing cards
- [ ] Heatmap overlay showing expensive vs affordable areas
- [ ] Mobile bottom sheet for listings (improved UX)

### P2 (Nice to Have)
- [ ] Historical price trends per neighborhood
- [ ] Export data as CSV
- [ ] Dark mode toggle
- [ ] Search suggestions/autocomplete

## Architecture
- `/app/backend/` - FastAPI backend (also deployed as /app/deploy-backend/)
- `/app/frontend/` - Original React frontend (Emergent preview)
- `/app/vercel-frontend/` - Clean Vercel-ready frontend (verified build)

## 3rd Party Integrations
- MongoDB Atlas (user-provided connection string)
- OpenAI GPT-4o-mini via Emergent LLM Key (AI suggestions)
