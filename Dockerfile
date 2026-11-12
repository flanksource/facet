# Multi-stage Dockerfile for facet CLI with Chromium browser
# Supports multi-arch builds (amd64, arm64)

ARG NODE_IMAGE=node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85
FROM ${NODE_IMAGE} AS builder

ARG GIT_COMMIT=unknown

# Install system dependencies
RUN apk add --no-cache \
    bash \
    build-base \
    python3 \
    git \
    curl \
    unzip

# Install the package-manager version pinned by package.json
RUN npm install -g pnpm@11.22.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cli/package.json cli/pnpm-lock.yaml cli/pnpm-workspace.yaml ./cli/

# Install dependencies
RUN pnpm install --frozen-lockfile
RUN cd cli && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the library and its installed runtime before embedding both in the binary.
ENV GIT_COMMIT=${GIT_COMMIT}
RUN pnpm run build
RUN pnpm --dir cli run build:cli

# Final stage with Chromium browser
FROM ${NODE_IMAGE}

ARG VERSION=dev

# Install Chromium and fonts from the same Alpine release on amd64 and arm64.
RUN apk add --no-cache \
    bash \
    chromium \
    coreutils \
    font-freefont \
    font-liberation \
    font-noto \
    font-noto-arabic \
    font-noto-cjk \
    font-noto-emoji \
    font-noto-thai \
    ca-certificates \
    curl \
    unzip \
    imagemagick \
    imagemagick-pdf \
    ghostscript \
    bubblewrap \
    socat \
    ripgrep \
    tar

# Install pnpm (used by facet at runtime to install template dependencies)
RUN npm install -g pnpm@11.22.0

# Install sandbox-runtime for template execution isolation
RUN npm install -g @anthropic-ai/sandbox-runtime

# Set Chromium executable path for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy the compiled standalone binary from builder
COPY --from=builder /app/dist/facet /usr/local/bin/facet

# Copy example files for demonstration
COPY cli/examples/SimpleReport.tsx /app/examples/
COPY cli/examples/FacetReport.tsx /app/examples/
COPY cli/examples/simple-data.json /app/examples/

# Verify Chromium and facet binary are available
RUN chromium --version && facet --version

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

# Verify the embedded runtime; these renders never install dependencies.
WORKDIR /app/examples
RUN mkdir -p /app/.tmp
RUN facet --skip-modules html FacetReport.tsx --data simple-data.json --output /app/.tmp/warmup.html
RUN facet --skip-modules pdf FacetReport.tsx --data simple-data.json --output /app/.tmp/warmup.pdf
RUN rm -f /app/.tmp/warmup.html /app/.tmp/warmup.pdf
WORKDIR /app

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3010/healthz || exit 1

CMD ["facet", "serve", "--templates-dir", "/templates"]
