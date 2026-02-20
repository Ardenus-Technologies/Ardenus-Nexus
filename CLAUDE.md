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

## Troubleshooting

### Pages show unstyled "Loading..." / "Skip to main content" (no CSS)

This is a recurring issue where the `.next` cache gets corrupted and the dev server serves 404 for `/_next/static/css/app/layout.css`. Symptoms: page renders raw HTML, `sr-only` elements are visible, no header/styles.

**Fix** (run these commands in order):
```bash
# 1. Kill ALL node processes on port 3000 (and 3001 if present)
netstat -ano | grep ":3000" | grep LISTENING
taskkill //F //PID <pid>

# 2. Delete the .next cache
rm -rf .next

# 3. Restart the dev server
npm run dev
```

Do NOT start a new dev server without killing the old one first — Next.js will silently start on port 3001 while the broken server stays on 3000.
