# Build stage
FROM node:20-alpine as builder
WORKDIR /app
COPY . .
RUN npm install --frozen-lockfile && npm run build

# Production stage
FROM caddy:2-alpine
COPY --from=builder /app/dist /usr/share/caddy
