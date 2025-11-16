# GitHub Actions Workflows

## Release Workflow

The `release.yml` workflow automatically builds and publishes the facet CLI on every push to the `main` branch.

### What it does

1. **Auto-bumps version** - Increments patch version in `cli/package.json` and `package.json`
2. **Builds standalone binaries** - Creates platform-specific executables for:
   - Linux (x64)
   - macOS (ARM64)
   - Windows (x64)
3. **Creates GitHub Release** - Publishes a new release with all binaries attached
4. **Publishes to npm** - Publishes the package to npm registry

### Setup Requirements

Before this workflow can run successfully, you need to configure:

#### 1. NPM Token

1. Generate an npm access token at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Select "Automation" token type
3. Add it as a repository secret:
   - Go to your repository on GitHub
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token

#### 2. Repository Permissions

Ensure GitHub Actions has permission to push to main and create releases:

1. Go to Settings → Actions → General
2. Under "Workflow permissions", select:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### How to Trigger a Release

Simply push to the `main` branch:

```bash
git push origin main
```

The workflow will automatically:
- Bump the version
- Build binaries for all platforms
- Create a GitHub release with binaries
- Publish to npm

### Manual Release (Alternative)

If you prefer manual releases, you can:

1. Update version manually in `cli/package.json`
2. Create and push a git tag:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```
3. Modify the workflow trigger to use `tags` instead of `push`

### Workflow Jobs

The workflow consists of 4 jobs that run in sequence:

1. **version-bump** - Increments version and creates git tag
2. **build-binaries** - Builds binaries on Linux, macOS, and Windows (runs in parallel)
3. **create-release** - Creates GitHub release with all binaries
4. **publish-npm** - Publishes package to npm registry

### Troubleshooting

**Build fails on "npm version patch"**
- Check that `cli/package.json` exists and has a valid version field

**Binary build fails**
- Ensure Bun is installed correctly (the workflow uses `oven-sh/setup-bun@v2`)
- Check that `npm run build:cli` works locally

**npm publish fails**
- Verify `NPM_TOKEN` secret is set correctly
- Check that the package name in `package.json` is available on npm
- Ensure you have publishing rights to the `@flanksource` scope

**GitHub release fails**
- Verify repository has "Read and write permissions" for workflows
- Check that the tag doesn't already exist

### Customization

To modify the workflow:

- **Change versioning strategy**: Edit the `npm version patch` command in the `version-bump` job
- **Add more platforms**: Add entries to the matrix strategy in `build-binaries`
- **Change trigger**: Modify the `on:` section at the top of the workflow
