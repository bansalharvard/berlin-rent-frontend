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
- Database: MongoDB
- "Am I Overpaying?": Simple comparison (no AI)
- Pre-loaded sample data: Yes (49 Berlin rental listings)

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

## What's Been Implemented (January 2026)

### Backend (FastAPI + MongoDB)
- `GET /api/neighborhoods` - Returns 15 Berlin neighborhoods with coordinates
- `GET /api/rentals` - Get listings with filters (neighborhood, type, rent_type, price range)
- `POST /api/rentals` - Create anonymous rental listing
- `POST /api/rentals/{id}/vote` - Upvote/downvote listings
- `POST /api/check-overpaying` - Compare user's rent to market average
- `GET /api/stats/neighborhoods` - Aggregated stats per neighborhood
- `POST /api/seed` - Seed 49 sample Berlin rental listings

### Frontend (React + Leaflet)
- Split-screen layout (55% map / 45% listings)
- Interactive Leaflet map with CartoDB Positron tiles
- Color-coded pins (green=good deal, red=expensive, vermilion=average)
- Filter bar with search, dropdowns, toggle controls
- Listing cards with price, €/m², neighborhood, badges
- Add Rental modal form
- Am I Overpaying modal with comparison result
- Stats summary (listings count, avg rent, avg price/m²)
- Mobile-responsive with bottom action buttons

### Design System
- Swiss/High-Contrast archetype
- Cabinet Grotesk headings + IBM Plex Mono body
- Vermilion (#FF3800) accent color
- Sharp corners (rounded-none)
- 1px borders, harsh shadows on hover

## Prioritized Backlog

### P0 (Must Have) - COMPLETED
- [x] Core MVP features

### P1 (Should Have)
- [ ] Heatmap overlay showing expensive vs affordable areas
- [ ] Mobile bottom sheet for listings (improved UX)
- [ ] Search suggestions/autocomplete for neighborhoods

### P2 (Nice to Have)
- [ ] Historical price trends per neighborhood
- [ ] Export data as CSV
- [ ] Embed widget for other sites
- [ ] Dark mode toggle

## Next Tasks
1. Add heatmap visualization for price density
2. Improve mobile experience with draggable bottom sheet
3. Add more detailed filters (size range slider, move-in year)
4. Implement duplicate detection for submissions
