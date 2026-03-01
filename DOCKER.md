# Facet Docker Container

This document describes how to build and use the Facet Docker container for generating PDFs and HTML from React templates.

## Features

- **Multi-architecture support**: Builds for both `linux/amd64` and `linux/arm64` platforms
- **Chromium browser**: Pre-installed and configured for PDF generation via Puppeteer
- **All dependencies cached**: Fonts, libraries, and browser binaries are included in the image
- **Facet CLI**: Ready to use for generating PDFs and HTML from React templates
- **Example included**: Sample template and data files for testing

## Building the Image

### Local Build

```bash
# Build for your current architecture
docker build -t facet:latest .

# Build for a specific architecture
docker build --platform linux/amd64 -t facet:amd64 .
docker build --platform linux/arm64 -t facet:arm64 .

# Build for multiple architectures (requires buildx)
docker buildx build --platform linux/amd64,linux/arm64 -t facet:latest .
```

## GitHub Actions CI/CD

The repository includes a GitHub Actions workflow (`.github/workflows/docker-build.yml`) that automatically builds and pushes multi-arch Docker images to GitHub Container Registry (ghcr.io).

### Workflow Triggers

- **Push to main**: Builds and pushes with `latest` tag
- **Push to feature branches**: Builds and pushes with branch name tag
- **Tags (v*)**: Builds and pushes with version tags
- **Pull requests**: Builds without pushing (validation only)
- **Manual**: Can be triggered via workflow_dispatch

### Published Images

Images are published to: `ghcr.io/flanksource/facet`

Tags:
- `latest` - Latest build from main branch
- `v1.2.3` - Specific version tags
- `main-<sha>` - Build from specific commit
- `<branch>` - Build from feature branch

## Using the Container

### Basic Usage

Generate a PDF from your templates:

```bash
docker run --rm \
  -v $(pwd):/work \
  ghcr.io/flanksource/facet \
  pdf /work/MyTemplate.tsx --data /work/data.json -o /work/output.pdf
```

Generate HTML:

```bash
docker run --rm \
  -v $(pwd):/work \
  ghcr.io/flanksource/facet \
  html /work/MyTemplate.tsx --data /work/data.json -o /work/output.html
```

### Try the Built-in Example

Test the container with the included sample:

```bash
docker run --rm \
  -v $(pwd):/work \
  ghcr.io/flanksource/facet \
  pdf /app/examples/SimpleReport.tsx \
      --data /app/examples/simple-data.json \
      -o /work/sample.pdf
```

This will create `sample.pdf` in your current directory.

### Interactive Usage

Start an interactive shell in the container:

```bash
docker run --rm -it \
  -v $(pwd):/work \
  ghcr.io/flanksource/facet \
  /bin/bash
```

Then run facet commands:

```bash
facet pdf /work/template.tsx --data /work/data.json
```

## Environment Variables

The container sets the following environment variables:

- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` - Uses system Chromium
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` - Path to Chromium binary

## Architecture Details

### Multi-stage Build

The Dockerfile uses a multi-stage build:

1. **Builder stage**: Installs build dependencies, copies source, and builds the CLI library
2. **Runtime stage**: Minimal image with only runtime dependencies, Chromium, and compiled artifacts

### Installed Components

- **Node.js 20**: JavaScript runtime
- **Chromium**: Headless browser for PDF generation
- **Fonts**: Liberation, Noto Color Emoji, and various international fonts
- **Facet CLI**: Built library and source files
- **Dependencies**: All npm packages required for PDF generation

### Working Directories

- `/app`: Application files and built CLI
- `/app/examples`: Sample templates
- `/workspace`: Default working directory (mount your files here)

## Troubleshooting

### Permission Issues

If you encounter permission issues with generated files:

```bash
docker run --rm \
  -v $(pwd):/work \
  --user $(id -u):$(id -g) \
  ghcr.io/flanksource/facet \
  pdf /work/template.tsx --data /work/data.json
```

### Missing Dependencies

If the container fails to generate PDFs, verify Chromium is working:

```bash
docker run --rm ghcr.io/flanksource/facet chromium --version
```

### Debugging

Run the container with verbose output:

```bash
docker run --rm \
  -v $(pwd):/work \
  ghcr.io/flanksource/facet \
  pdf /work/template.tsx --data /work/data.json --verbose
```

## Development

### Testing Local Changes

Build and test locally before pushing:

```bash
# Build
docker build -t facet:dev .

# Test
docker run --rm facet:dev pdf /app/examples/SimpleReport.tsx \
  --data /app/examples/simple-data.json -o /tmp/test.pdf

# Verify output
docker run --rm facet:dev ls -lh /tmp/test.pdf
```

### Optimizing Build

The `.dockerignore` file excludes unnecessary files from the build context:
- Git files and history
- Node modules (installed during build)
- Test files
- Documentation
- Build artifacts

## License

See the main [README.md](./README.md) for license information.
