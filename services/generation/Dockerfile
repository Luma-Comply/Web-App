FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies from the service directory
COPY services/generation/package*.json ./
RUN npm ci --omit=dev

# Copy shared lib modules from monorepo root
COPY src/lib/lcd-validation.ts src/lib/lcd-validation.ts
COPY src/lib/lcd-requirements.ts src/lib/lcd-requirements.ts
COPY src/lib/novitas-ctp-products.ts src/lib/novitas-ctp-products.ts
COPY src/lib/mac-jurisdictions.ts src/lib/mac-jurisdictions.ts
COPY src/lib/phi-utils.ts src/lib/phi-utils.ts
COPY src/lib/validation/ src/lib/validation/
COPY src/lib/requirements/ src/lib/requirements/

# Copy service source and config
COPY services/generation/src/ src/
COPY services/generation/tsconfig.json ./

# Install build tools, compile, resolve path aliases, then prune
RUN npm install --save-dev typescript tsc-alias && npx tsc && npx tsc-alias --resolve-full-paths && npm prune --omit=dev

# Production stage
FROM node:22-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./

EXPOSE 3001
CMD ["node", "dist/index.js"]
