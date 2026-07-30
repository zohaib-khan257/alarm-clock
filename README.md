# Alarm Clock

A production-ready web-based alarm clock built with Django.

## Features

- Live digital clock display
- Set alarms with label and repeat (once / daily)
- Enable / disable alarms
- Snooze for 5 minutes
- Cancel alarms
- Audio alarm via Web Audio API
- Dark glassmorphism UI
- Server-side rendering with real-time JavaScript enhancement

## Local Development

### Prerequisites

- Python 3.10+
- pip

### Setup

```bash
# Create and activate virtual environment
python3 -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create a superuser (optional, for admin)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

Open http://localhost:8000 in your browser.

### Admin Panel

Visit http://localhost:8000/admin and log in with your superuser credentials.

## Deployment (Railway)

### Prerequisites

- A [Railway](https://railway.app) account
- The [Railway CLI](https://docs.railway.app/develop/cli) (optional)

### Steps

1. Push the repository to GitHub

2. Create a new project on Railway and connect your GitHub repo

3. Railway auto-detects:
   - `runtime.txt` → Python 3.10
   - `requirements.txt` → pip install
   - `Procfile` → gunicorn server

4. Add a PostgreSQL database plugin via Railway dashboard

5. Set environment variables in Railway:
   ```
   DJANGO_SECRET_KEY=<generate a long random key>
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=<your-app-url>.railway.app
   DJANGO_CSRF_TRUSTED_ORIGINS=https://<your-app-url>.railway.app
   ```

6. Railway provides `DATABASE_URL` automatically via the Postgres plugin

7. Run migrations from Railway dashboard:
   ```bash
   python manage.py migrate
   ```

8. (Optional) Create a superuser via Railway dashboard:
   ```bash
   python manage.py createsuperuser
   ```

Your app will be live at `https://<your-app-name>.railway.app`.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Production | SQLite (dev) | PostgreSQL connection string |
| `DJANGO_SECRET_KEY` | Production | dev key | Django secret key |
| `DJANGO_DEBUG` | No | `True` (dev) | Set to `False` in production |
| `DJANGO_ALLOWED_HOSTS` | Production | `localhost,127.0.0.1` | Comma-separated hostnames |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Production | local dev URLs | Comma-separated origins |

## Architecture

- **Backend**: Django with plain class-based views (no generic views)
- **Frontend**: Server-side rendered HTML + vanilla JavaScript
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Static files**: Whitenoise
- **Alarm sound**: Web Audio API (client-side oscillator)
# alarm-clock
