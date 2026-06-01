FROM node:20-alpine AS base

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (including devDependencies for client build and tsx execution)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the client frontend SPA
RUN npm run build

# Expose server port
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start Express server that hosts both the API and the static build
CMD ["npx", "tsx", "server.ts"]
