# Multi-stage Dockerfile for facet CLI with Chromium browser
# Supports multi-arch builds (amd64, arm64)

FROM node:20-bookworm-slim AS builder

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY cli/package*.json ./cli/

# Install dependencies
RUN npm install
RUN cd cli && npm install

# Copy source code
COPY . .

# Build the CLI library
RUN cd cli && npm run build:lib

# Final stage with Chromium browser
FROM node:20-bookworm-slim

# Install Chromium browser and dependencies for Puppeteer
# Using Chromium from Debian repos for better multi-arch support
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set Chromium executable path for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy built files and dependencies from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/cli/package*.json ./cli/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/cli/node_modules ./cli/node_modules
COPY --from=builder /app/cli/dist ./cli/dist
COPY --from=builder /app/cli/src ./cli/src
COPY --from=builder /app/src ./src

# Copy example files for demonstration
COPY cli/examples/SimpleReport.tsx ./examples/
COPY cli/examples/simple-data.json ./examples/

# Create a wrapper script to run facet CLI
# Note: The CLI has dependencies on bun for some functionality,
# so we provide it through the node_modules
RUN echo '#!/bin/sh\ncd /app/cli && NODE_PATH=/app/node_modules:/app/cli/node_modules node dist/index.mjs "$@"' > /usr/local/bin/facet && \
    chmod +x /usr/local/bin/facet

# Verify Chromium is installed and show version
RUN chromium --version

# Create workspace directory for user files
RUN mkdir -p /workspace

# Set default working directory
WORKDIR /workspace

# Add labels
LABEL org.opencontainers.image.title="Facet" \
      org.opencontainers.image.description="Generate beautiful PDFs and datasheets from React templates with Chrome" \
      org.opencontainers.image.source="https://github.com/flanksource/facet" \
      org.opencontainers.image.vendor="Flanksource"

# Default command shows help
CMD ["sh", "-c", "echo 'Facet CLI Container' && echo '' && echo 'Generate PDF:' && echo '  docker run --rm -v $(pwd):/work ghcr.io/flanksource/facet pdf template.tsx --data data.json' && echo '' && echo 'Example:' && echo '  docker run --rm -v $(pwd):/work ghcr.io/flanksource/facet pdf /app/examples/SimpleReport.tsx --data /app/examples/simple-data.json -o /work/output.pdf' && echo '' && chromium --version"]
