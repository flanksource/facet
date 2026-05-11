# Multi-stage Dockerfile for facet CLI with Chromium browser
# Supports multi-arch builds (amd64, arm64)

FROM node:20-bookworm-slim AS builder

ARG GIT_COMMIT=unknown

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

# Install pnpm
RUN npm install -g pnpm@9.15.9

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY cli/package.json cli/pnpm-lock.yaml ./cli/

# Install dependencies
RUN pnpm install --frozen-lockfile
RUN cd cli && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the standalone binary (bun compile) and the lib
ENV GIT_COMMIT=${GIT_COMMIT}
RUN cd cli && pnpm run build

# Final stage with Chromium browser
FROM node:20-bookworm-slim

ARG VERSION=dev

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
    bubblewrap \
    socat \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm (used by facet at runtime to install template dependencies)
RUN npm install -g pnpm@9.15.9

# Install sandbox-runtime for template execution isolation
RUN npm install -g @anthropic-ai/sandbox-runtime

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
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml

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

RUN mkdir -p /workspace /templates /etc/facet
COPY srt-settings.json /etc/facet/srt-settings.json

# Set default working directory
WORKDIR /workspace

EXPOSE 3010

# Add labels
LABEL org.opencontainers.image.title="Facet" \
      org.opencontainers.image.description="Generate beautiful PDFs and datasheets from React templates with Chrome" \
      org.opencontainers.image.source="https://github.com/flanksource/facet" \
      org.opencontainers.image.vendor="Flanksource" \
      org.opencontainers.image.version="${VERSION}"

# Warm the node_modules / .facet cache by rendering the playground sample
RUN cd /app/examples && \
    facet pdf SimpleReport.tsx --data simple-data.json --output /tmp/warmup.pdf && \
    rm -f /tmp/warmup.pdf

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3010/healthz || exit 1

CMD ["facet", "serve", "--templates-dir", "/templates"]
