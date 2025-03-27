This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## convex setup

```sh
cd docker/convex
docker compose up -d
```

Run the command to get your admin key

```sh
docker compose exec backend ./generate_admin_key.sh
```

paste the key in your .env.local

```sh
CONVEX_SELF_HOSTED_URL='http://127.0.0.1:3210'
CONVEX_SELF_HOSTED_ADMIN_KEY='<your admin key>'
```

the install convex into repo

```sh
npm install convex@latest
```

you can start convex individually with

```sh
npx convex dev
```

or run with frontend

```sh
pnpm dev:stack
```

## libre translate

To start the container

```sh
cd ./docker/
git clone https://github.com/LibreTranslate/LibreTranslate/tree/main
```

Modify the dockerfile to change the ports and file mounts

```yaml
services:
  libretranslate:
    container_name: libretranslate
    build:
      context: .
      dockerfile: ./docker/Dockerfile
    restart: unless-stopped
    ports:
      - "6000:5000"
    tty: true
    healthcheck:
      test: ["CMD-SHELL", "./venv/bin/python scripts/healthcheck.py"]
    environment:
      - LT_API_KEYS=true
      - LT_API_KEYS_DB_PATH=/app/db/api_keys.db
      - LT_UPDATE_MODELS=true
    volumes:
      - ~/libretranslate/api_keys:/app/db
      - ~/libretranslate/models:/home/libretranslate/.local:rw

volumes:
  libretranslate_api_keys:
  libretranslate_models:
```

Then bring the docker container up

```sh
docker-compose up -d --build
```

The Api docs for the container are at `https://libretranslate.com/docs/#/translate/get_languages`
