# Multi-stage Dockerfile for facet CLI with Chromium browser
# Supports multi-arch builds (amd64, arm64)

FROM oven/bun:1 AS builder

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

# Build the standalone binary (bun compile) and the lib
RUN cd cli && npm run build

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

# Copy the compiled standalone binary from builder
COPY --from=builder /app/dist/facet /usr/local/bin/facet

# Copy source files needed at runtime (component library + examples)
COPY --from=builder /app/src /app/src
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

# Copy example files for demonstration
COPY cli/examples/SimpleReport.tsx /app/examples/
COPY cli/examples/simple-data.json /app/examples/

# Verify Chromium and facet binary are available
RUN chromium --version && facet --version

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
