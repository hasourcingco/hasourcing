FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm@11.19.0 && pnpm install --frozen-lockfile
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec prisma generate
RUN APP_ENV=production DATABASE_URL=postgresql://build:build@localhost/build BETTER_AUTH_SECRET=build-only-placeholder-not-used-at-runtime-000000 SITE_URL=https://example.invalid DEMO_ENABLED=false PAYMENT_PROVIDER=disabled pnpm build
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S web && adduser -S web -G web
COPY --from=build --chown=web:web /app/.next/standalone ./
COPY --from=build --chown=web:web /app/.next/static ./.next/static
COPY --from=build --chown=web:web /app/public ./public
RUN mkdir -p /app/storage/private /app/public/uploads && chown -R web:web /app/storage /app/public/uploads
USER web
EXPOSE 3000
CMD ["node", "server.js"]
