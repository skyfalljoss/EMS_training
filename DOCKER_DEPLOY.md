# Docker VM Deployment

This stack runs:

- `frontend`: React/Vite static build served by Nginx on port `80`
- `backend`: FastAPI served by Uvicorn on port `8000` inside Docker
- `mongo`: MongoDB with a persistent Docker volume

## First Deploy

On your VM, install Docker and the Docker Compose plugin, then from the project root:

```bash
cp .env.docker.example .env
nano .env
docker compose up -d --build
```

Set `JWT_SECRET_KEY` in `.env` to a long random value before starting the app.

The app will be available at:

```text
http://YOUR_VM_IP/
```

The frontend sends API calls to `/api/*`; Nginx proxies those requests to the
backend container.

## Useful Commands

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
docker compose up -d --build
```

If port `80` is already used on the VM, change this in `.env`:

```bash
WEB_PORT=8080
```

Then open `http://YOUR_VM_IP:8080/`.
