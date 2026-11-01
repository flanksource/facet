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
RUN FACET_PACKAGE_PATH=/app/facet.tgz facet --skip-modules pdf FacetReport.tsx --data simple-data.json --output /app/.tmp/warmup.pdf
RUN rm -f /app/.tmp/warmup.html /app/.tmp/warmup.pdf
WORKDIR /app

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3010/healthz || exit 1

CMD ["facet", "serve", "--templates-dir", "/templates"]
