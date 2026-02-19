# Ardenus Nexus

Next.js 14 internal team app (time tracking, task board, rooms). Uses SQLite (better-sqlite3), NextAuth, Tailwind CSS.

## Deployment

**Every time code is pushed to GitHub, also deploy to Lightsail.**

### Steps

1. **Push to GitHub**: Repo is `Ardenus-Technologies/Ardenus-Nexus` (main branch). Clone first to preserve history since the local directory is not a git repo.

2. **SSH into Lightsail**:
   ```
   ssh -i "/c/Users/fvnre/Downloads/LightsailDefaultKey-us-east-1.pem" ubuntu@100.53.222.77
   ```

3. **Pull, build, copy static assets, restart**:
   ```bash
   cd ~/app
   git pull origin main
   npx next build
   cp -r .next/static .next/standalone/.next/static
   cp -r public .next/standalone/public
   pm2 restart ardenus-nexus
   ```

   The static asset copy is **required** — the standalone server does not bundle `.next/static` or `public` automatically. Skipping this step causes CSS/JS/fonts to not load.

### Infrastructure

- **Host**: AWS Lightsail instance at `100.53.222.77`
- **Domain**: `nexus.ardenus.com`
- **Process manager**: PM2 (config in `ecosystem.config.js`, runs `.next/standalone/server.js` on port 3000)
- **Reverse proxy**: Caddy (TLS termination)
- **Database**: SQLite at `/home/ubuntu/app/data/tracker.db`
