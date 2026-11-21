FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 DB_PATH=/var/lib/clinic/clinic.sqlite
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npm_ca if [ -f /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; npm ci --omit=dev --no-audit && mkdir -p /var/lib/clinic && chown node:node /var/lib/clinic
COPY --chown=node:node . .
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
