# ITS US

**Travel like a local, not like a tourist.** ITS US helps travelers discover local guides and shape thoughtful, AI-assisted trips, starting in Hyderabad, India.

## Project status

ITS US is under active development. The web and API foundations, account registration/login, data-driven city discovery, guide profile submissions, admin-curated places, AI-assisted itinerary drafts, traveler-owned saved trips, guide booking requests, and booking-scoped messaging are in place. Hyderabad is the initial city record; guide profiles and places appear publicly only after an admin publishes them. Publication is not identity verification. Booking requests are not confirmations; payments, ratings, and real-time availability are not represented as production features.

## Stack

- Web: Next.js App Router, React, TypeScript, Tailwind CSS, lucide-react, Framer Motion
- API: Python 3.12, FastAPI, Pydantic v2, JWT
- Data: MongoDB with PyMongo `AsyncMongoClient`
- AI: OpenAI API called from the backend only

## Run locally

1. Copy `.env.example` to `.env` and set a random `JWT_SECRET` (at least 32 characters).
2. Start the full stack with `docker compose up --build`.
3. Open the web app at http://localhost:3000 and the API docs at http://localhost:8000/docs.

For frontend-only work, run `cd frontend && npm install && npm run dev`. For the API, create a Python 3.12 virtual environment, run `pip install -e '.[dev]'` from `backend`, then `uvicorn app.main:app --reload`.

## Configuration

See `.env.example`. Never commit `.env` or credentials. The application can start without MongoDB or an OpenAI key in development; database-backed features report service unavailability gracefully, and AI planning returns an unavailable response when `OPENAI_API_KEY` is not configured.

## Authentication API

- `POST /api/v1/auth/register` creates a traveler or guide account and returns a bearer token. Public registration cannot grant the admin role.
- `POST /api/v1/auth/login` authenticates with email and password.
- `GET /api/v1/auth/me` returns the current account's public fields.
- `GET /api/v1/cities` lists active city records.
- `GET /api/v1/cities/{slug}/catalog` returns one city and its published places and guide profiles.
- `GET /api/v1/guides/me/profile` and `PUT /api/v1/guides/me/profile` let a guide read or edit only their own profile. Edits return to pending review.
- `GET /api/v1/admin/guides?status=pending` lists guide submissions; `PATCH /api/v1/admin/guides/{id}/status` handles publication review.
- `GET /api/v1/admin/places?status=draft` lists place drafts. `POST /api/v1/admin/cities/{slug}/places` creates a private draft; `PUT /api/v1/admin/places/{id}` edits it; `PATCH /api/v1/admin/places/{id}/status` publishes or hides it. Any content edit returns a place to draft.
- `POST /api/v1/ai/plan` creates an unsaved itinerary draft for an authenticated traveler from a city's published place catalog.
- `POST /api/v1/trips`, `GET /api/v1/trips`, `GET /api/v1/trips/{id}`, `PUT /api/v1/trips/{id}`, and `DELETE /api/v1/trips/{id}` manage only the authenticated traveler's saved plans. Place references must be published in the selected city.
- `POST /api/v1/bookings` sends a request to a published guide; `GET /api/v1/bookings` and `GET /api/v1/bookings/{id}` show only the current traveler's requests; `GET /api/v1/bookings/guide` shows requests only for the signed-in guide's own profile; `POST /api/v1/bookings/{id}/cancel` cancels a still-requested traveler request. No acceptance or payment is implied.
- `POST /api/v1/messages` sends a message tied to an active booking request. `GET /api/v1/messages/conversations` and `GET /api/v1/messages/conversations/{id}` are scoped to the traveler and guide who participate in that booking.

Passwords are stored as Argon2 hashes. Access tokens are signed with `JWT_SECRET`; authenticated requests reload the account from MongoDB so current role changes take effect.

The web app provides account registration and sign-in at **Profile**. The Next.js server stores the API token in an HTTP-only, same-site cookie and proxies authenticated actions, so browser JavaScript never receives the bearer token. Travelers can save AI drafts, manage their trips and requests, message guides, and request time with published guides. Guides can review requests for their own profile and reply in the guide workspace. Admins can review guides and curate places at **/admin**. Guide profile edits return to pending review.

## Structure

```text
backend/app/{api,core,database,models,schemas,services,middleware,utils}/
backend/tests/
frontend/src/{app,components,hooks,lib,services,types}/
docs/
docker-compose.yml
```

Cities are database records, not code branches: Hyderabad is seeded from `backend/data/cities.json`, and additional destinations can be added to that data file. Seed records are inserted only once and won't overwrite later database edits. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first startup to bootstrap an initial admin; both are optional, and an existing account is never silently promoted. Admin credentials are read from environment variables and never stored in the repository.

The Hyderabad starter catalog contains two visible entries labeled **DEMO**. They are placeholders rather than real venues or bookable experiences, and are included only to exercise the planner and city page. Replace or remove them through the admin place API before production use. Generated itineraries can only reference published place IDs; the backend rejects unknown IDs and unsupported price, opening-time, or availability claims. Plans are not persisted in this stage.

## Quality checks

- API: `cd backend && pytest`
- Web: `cd frontend && npm run lint && npm run build`

## License

No license has been selected yet.
