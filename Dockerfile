# Multi-stage Dockerfile for facet CLI with Chromium browser
# Supports multi-arch builds (amd64, arm64)

FROM node:22-bookworm-slim AS builder

ARG GIT_COMMIT=unknown

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

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

# Build the component library + styles that rendered templates import from
# "@flanksource/facet", then pack the package while dist/ holds only the library
# (the CLI binary is added to dist/ afterwards and would bloat the tarball),
# then build the standalone CLI binary (Node SEA) into dist/facet.
ENV GIT_COMMIT=${GIT_COMMIT}
RUN pnpm run build:components && pnpm run build:css
RUN cd /app && npm pack --pack-destination /app/ \
    && mv /app/flanksource-facet-*.tgz /app/facet.tgz

RUN cd cli && pnpm run build

# Final stage with Chromium browser
FROM node:22-bookworm-slim

ARG VERSION=dev

# Install Chromium browser and dependencies for Puppeteer
# Using Chromium from Debian repos for better multi-arch support
#
# Chromium is pinned to 149.0.7827.196: the 150.0.7871.46 security update
# crashes on startup (https://bugs.debian.org/1141488), and current mirrors
# only carry 150, so 149 comes from snapshot.debian.org. Remove the snapshot
# source and the pin once a fixed chromium reaches bookworm-security.
# ca-certificates is installed first: the snapshot source is https and the
# base image ships no system certificates.
RUN apt-get update && apt-get install -y ca-certificates \
    && echo "deb [check-valid-until=no] https://snapshot.debian.org/archive/debian-security/20260626T014759Z bookworm-security main" \
        > /etc/apt/sources.list.d/chromium-snapshot.list \
    && printf 'Package: chromium chromium-common chromium-sandbox\nPin: version 149.0.7827.196-1~deb12u1\nPin-Priority: 1001\n' \
        > /etc/apt/preferences.d/chromium \
    && apt-get update && apt-get install -y \
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

# Copy the @flanksource/facet tarball built in the builder stage. Renders
# resolve @flanksource/facet from the npm registry (honoring the template's
# pinned version); the tarball is only used for the build-time warmup below,
# and can be opted into at runtime with FACET_PACKAGE_PATH=/app/facet.tgz.
COPY --from=builder /app/facet.tgz /app/facet.tgz

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

# Populate the immutable shared module entry from the exact-version tarball and
# verify that the package can render. The cache rejects a tarball whose Facet
# version differs from the CLI version.
WORKDIR /app/examples
RUN mkdir -p /app/.tmp
RUN FACET_PACKAGE_PATH=/app/facet.tgz facet --skip-modules html FacetReport.tsx --data simple-data.json --output /app/.tmp/warmup.html
RUN rm -f /app/.tmp/warmup.html
WORKDIR /app

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3010/healthz || exit 1

CMD ["facet", "serve", "--templates-dir", "/templates"]
