# ITS US pilot setup

This runbook configures a small pilot deployment with MongoDB Atlas. It does not turn payments, guide verification, ratings, or live availability into product features.

## 1. Prepare Atlas

1. Create an Atlas project and cluster in a region close to the pilot API host.
2. Create a database user with read/write access to the ITS US database. Use a unique, strong password.
3. Add only the pilot host's outbound IP addresses to the Atlas network access list. Avoid opening database access to every IP.
4. Copy the Atlas SRV connection URI. URL-encode special characters in the username or password before placing them in the URI.

The API uses PyMongo's async `AsyncMongoClient`. It pings Atlas and creates the required indexes during startup. The Atlas database user must have permission to create indexes.

## 2. Configure the deployment

Create a private `.env` from `.env.example` on the deployment host. Set values there; never put actual values in GitHub, tickets, screenshots, or chat.

```dotenv
MONGODB_URI=mongodb+srv://<encoded-user>:<encoded-password>@<cluster-host>/its_us?retryWrites=true&w=majority&appName=ITS-US
MONGODB_DATABASE=its_us
MONGODB_MAX_POOL_SIZE=50
JWT_SECRET=<at-least-32-random-characters>
ALLOW_DEGRADED_STARTUP=false
SEED_DEMO_DATA=false
ADMIN_EMAIL=<pilot-admin-email>
ADMIN_PASSWORD=<strong-initial-admin-password>
CORS_ORIGINS=["https://<pilot-web-host>"]
```

Use the same Atlas URI for Compose interpolation and the backend `env_file`. Keep any OpenAI key in the backend environment only. The AI feature can remain disabled during a pilot by leaving `OPENAI_API_KEY` empty.

Generate a signing secret locally, for example with Python's standard library:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Bootstrap credentials create the first admin only when that email is absent. Existing users are never silently promoted. After the first admin signs in, remove `ADMIN_PASSWORD` from the deployment environment and use the admin account for ongoing curation.

## 3. Start and check readiness

Run the application on the pilot host:

```powershell
docker compose up --build -d
docker compose ps
```

The backend health check calls `GET /api/v1/health/ready`. It returns `200` only when MongoDB answers a ping; if the database cannot connect and `ALLOW_DEGRADED_STARTUP=false`, the API exits rather than serving a broken pilot. `GET /api/v1/health/live` reports whether the API process is alive and does not imply database readiness.

Check the deployed API directly:

```powershell
Invoke-RestMethod https://<pilot-api-host>/api/v1/health/ready
```

For local Docker Compose, `.env.example` uses `mongodb://mongodb:27017`. For running the API directly on the host, use `mongodb://localhost:27017` when MongoDB is installed locally.

## 4. Pilot content and data

- Set `SEED_DEMO_DATA=false` before startup. The app will skip adding demo examples and hide built-in seeded demo places already in the database. It does not delete records.
- Review Hyderabad place details and guide profiles before publishing. Public guide publication is not identity verification.
- Keep guide requests as requests; do not promise a booking until a guide responds through the current workflow.
- Do not advertise prices, ratings, availability, or verified-guide status: the product does not currently back those claims with production services.
- Set up Atlas backups and test a restore before inviting travelers. Define who can access production data and how account/message retention and deletion requests will be handled.

## 5. Before inviting pilot travelers

- Confirm the deployed web origin is the only production entry in `CORS_ORIGINS`.
- Confirm the pilot admin can sign in and publish a reviewed guide or place.
- Register a test traveler and guide, submit a guide profile, and verify the public catalog only shows published profiles and places.
- Submit a request, cancel a request, and exchange messages from both participant accounts.
- Confirm the browser does not receive a bearer token and that `.env` is absent from Git.
- Provide a privacy notice and a support contact for pilot participants.
