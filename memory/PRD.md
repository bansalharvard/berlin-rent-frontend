# Berlin.rent - PRD & Implementation Status

## Original Problem Statement
Build a modern web application inspired by bengaluru.rent for Berlin rentals. Interactive Leaflet map, anonymous rent data, community-driven, no login required. Users can view/add rent data points, filter, compare rents, and share listings.

## User Choices
- Map: Leaflet with OpenStreetMap/CARTO tiles (free, no API key)
- Database: MongoDB Atlas (user-provided cloud connection)
- Backend deployed to Render
- Frontend deploying to Vercel
- 3 listing modes: Offering, Looking, Just Sharing My Rent

## Core Requirements
- [x] Interactive Berlin map with color-coded pins (green/purple/orange)
- [x] 3 listing modes: Offering / Looking / Just Sharing My Rent
- [x] Direct map click to create listings (no Pin & List button)
- [x] Anonymous rent submission (no login)
- [x] Neighborhood filters (15 Berlin Bezirke)
- [x] Apartment type filters (WG room, studio, 1-3+ Zimmer)
- [x] Warmmiete/Kaltmiete toggle
- [x] Price per sqm calculation
- [x] AI-powered price suggestions & description generation
- [x] Dashboard with market insights (charts, stats)
- [x] WhatsApp sharing
- [x] Comments on listings
- [x] Mobile responsive (bottom sheet modals, scrollable filters, compact stats)
- [x] "Built by Sachin" credit visible on map
- [x] Map legend at top-left for visibility

## What's Been Implemented

### Backend (FastAPI + MongoDB Atlas)
- `GET /api/listings` - Get listings with filters
- `POST /api/listings` - Create listing (supports offering/looking/sharing_rent)
- `POST /api/listings/{id}/comments` - Add comments
- `GET /api/stats/dashboard` - Dashboard market stats
- `GET /api/neighborhoods` - Returns 15 Berlin neighborhoods
- `POST /api/seed` - Seeds 23 listings (10 offering, 3 looking, 10 sharing_rent)
- `POST /api/ai/suggest-price` - AI price suggestion
- `POST /api/ai/generate-description` - AI description generation

### Frontend (React + Leaflet + Tailwind)
- Split-screen layout (60% map / 40% listings on desktop)
- 3 pin types: green (offering), purple (looking), orange (rent data)
- Direct map click → bottom sheet create modal with type selection
- Filter bar with type toggle (All/🏠/👀/📊), search, neighborhood, apartment type
- Stats bar: Total, Offering, Looking, Rents
- Mobile responsive: compact header, scrollable filters, bottom-sheet modals
- View listing modal with comments
- Dashboard modal with charts

### Deployment
- Backend: Deployed to Render (DONE)
- Frontend: Vercel build fix provided (clean package.json + relative imports + CSS fix)

## Prioritized Backlog

### P1
- [ ] "Am I Overpaying" badges on individual listing cards
- [ ] Mietpreisbremse (rent cap) check feature
- [ ] WBS-eligible filter
- [ ] Anmeldung-friendly filter

### P2
- [ ] Heatmap overlay showing expensive vs affordable areas
- [ ] U-Bahn/S-Bahn proximity filter
- [ ] Community ratings (locality + value for money)
- [ ] Historical price trends per neighborhood
- [ ] Flatmate matching
- [ ] Report system (3 reports auto-hide)

## Architecture
- `/app/backend/` - FastAPI backend
- `/app/frontend/` - React frontend (Emergent preview)
- `/app/vercel-frontend/` - Clean Vercel-ready frontend

## 3rd Party Integrations
- MongoDB Atlas (user-provided connection string)
- OpenAI GPT-4o-mini via Emergent LLM Key (AI suggestions)
