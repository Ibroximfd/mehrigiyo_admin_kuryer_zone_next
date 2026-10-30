FROM nginx:alpine

# Sayt sozlamasi (SPA fallback + /api, /media, /ws reverse proxy).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# `npm run build` natijasi — statik fayllar (Flutter'dagi `build/web` o'rniga).
COPY out /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
