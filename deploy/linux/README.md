# DormCheck Linux package

The archive contains a Linux backend binary and the built frontend. Packages are produced for `amd64` and `arm64`.

## 1. Configure PostgreSQL

Create a PostgreSQL database and a user that can create and update tables. Copy the sample environment file and fill in the database connection values:

```sh
tar -xzf dormcheck-linux-amd64.tar.gz  # use the arm64 archive on ARM servers
cd dormcheck-linux-amd64/backend
cp .env.example .env
chmod 600 .env
```

Edit `.env`, especially `PGPASSWORD`. Keep this file private. Start the backend from this directory so it can read `.env`:

```sh
./dormcheck
```

The backend listens on port `8081` and applies database migrations during startup.

## 2. Serve the frontend

Serve `frontend/dist` with Nginx or another static web server. The default frontend API base is `/api/`; proxy that path to the backend and remove the `/api/` prefix when forwarding. Example Nginx server block:

```nginx
server {
    listen 80;
    server_name your-domain.example;
    root /srv/dormcheck/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8081/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

If the API is hosted at another URL, set the repository variable `VITE_API_BASE` in GitHub Actions, or enter `api_base_url` when manually running the workflow. Then build and download a new package. The URL is compiled into the frontend bundle.

Use HTTPS for public deployments and keep PostgreSQL credentials and other secrets out of the frontend bundle.
