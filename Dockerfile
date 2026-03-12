# Multi-stage Dockerfile for facet CLI with Chromium browser
# Supports multi-arch builds (amd64, arm64)

FROM node:20-bookworm-slim AS builder

# Install system dependencies and bun
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

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
    curl \
    unzip \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Allow ImageMagick to read/write PDFs (blocked by default policy)
RUN sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml 2>/dev/null || true

# Install bun (needed to run vite-ssr-loader.ts at template build time)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Set Chromium executable path for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy the compiled standalone binary from builder
COPY --from=builder /app/dist/facet /usr/local/bin/facet

# Copy source files needed at runtime (component library + examples)
COPY --from=builder /app/src /app/src
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

# Copy example files for demonstration
COPY cli/examples/SimpleReport.tsx /app/examples/
COPY cli/examples/simple-data.json /app/examples/

# Pre-populate npm cache with the locally-built @flanksource/facet package.
# This means `npm install @flanksource/facet@<version>` inside .facet/ at
# runtime will resolve from cache rather than fetching from the registry.
RUN mkdir -p /tmp/facet-pack && \
    TARBALL=$(cd /app && npm pack --pack-destination /tmp/facet-pack/ 2>/dev/null | tail -1) && \
    npm cache add /tmp/facet-pack/${TARBALL} && \
    rm -rf /tmp/facet-pack

# Verify Chromium and facet binary are available
RUN chromium --version && facet --version

# Pack @flanksource/facet to a permanent tarball path.
# FACET_PACKAGE_PATH tells the CLI to use this local tarball instead of
# fetching from the npm registry (the version may not yet be published).
RUN cd /app && npm pack --pack-destination /app/ 2>/dev/null
ENV FACET_PACKAGE_PATH=/app/facet.tgz
RUN mv /app/flanksource-facet-*.tgz /app/facet.tgz

RUN mkdir -p /workspace /templates

# Set default working directory
WORKDIR /workspace

EXPOSE 3000

# Add labels
LABEL org.opencontainers.image.title="Facet" \
      org.opencontainers.image.description="Generate beautiful PDFs and datasheets from React templates with Chrome" \
      org.opencontainers.image.source="https://github.com/flanksource/facet" \
      org.opencontainers.image.vendor="Flanksource"

CMD ["facet", "serve", "--templates-dir", "/templates"]
