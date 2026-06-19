# Docker VM Deployment

This stack runs:

- `frontend`: React/Vite static build served by Nginx on port `8080`
- `backend`: FastAPI served by Uvicorn on port `8000` inside Docker
- `mongo`: MongoDB with a persistent Docker volume
- `caddy`: optional HTTPS reverse proxy on ports `80` and `443`

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
http://YOUR_VM_IP:8080/
```

## HTTPS

Trusted HTTPS requires a real domain name. Point a DNS record such as
`ems.example.com` to the VM/public router, forward public ports `80` and `443`
to this VM, then set this in `.env`:

```bash
DOMAIN=ems.example.com
```

Restart the stack:

```bash
docker compose up -d --build
```

Caddy will request and renew a Let's Encrypt certificate automatically. The app
will then be available at:

```text
https://ems.example.com/
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

If port `8080` is already used on the VM, change this in `.env`:

```bash
WEB_PORT=80
```

Then open `http://YOUR_VM_IP/`.
