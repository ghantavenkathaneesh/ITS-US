# Contributing

Thanks for helping improve ITS US. The project is under active development; use the [README](README.md) and [pilot runbook](docs/pilot-runbook.md) as the source of truth for setup, current behavior and readiness.

## Local setup

Follow the README to configure the backend and frontend. Copy .env.example to a local .env, use a random development JWT secret, and keep API keys on the server. Never commit .env files, credentials, tokens or real traveler data.

## Checks

Run the checks that cover your change and include their results in your pull request:

```bash
cd backend && pytest
cd frontend && npm run lint && npm run build
```

For a pilot or broader change, follow the readiness checks in the pilot runbook. Report any checks you could not run and why.

## Pull request checklist

- Keep changes focused and describe the user-visible behavior.
- Add or update tests for behavior changes.
- Update API or setup documentation when routes, permissions or configuration change.
- Keep traveler, guide and admin access boundaries intact.
- Treat the seeded Hyderabad catalog entries as demo placeholders. Do not describe them as real venues or confirmed bookable experiences.
- Do not imply that guide publication verifies identity or that booking requests represent confirmed bookings or payments.
