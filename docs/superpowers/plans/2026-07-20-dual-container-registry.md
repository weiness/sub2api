# Dual Container Registry Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every `v*` tag build one Sub2API image and push the versioned image to both the existing Aliyun ACR repository and GHCR.

**Architecture:** Extend the existing tag-triggered `docker-acr.yml` workflow instead of creating another build. The workflow authenticates independently to both registries, then passes both destination tags to one `docker/build-push-action` step so both registries receive the same build output.

**Tech Stack:** GitHub Actions YAML, Docker Login Action v3, Docker Build Push Action v6, GitHub Actions `GITHUB_TOKEN`, Aliyun ACR repository secrets.

## Global Constraints

- Preserve the existing `v*` tag trigger and Aliyun ACR publishing behavior.
- Use `contents: read` and `packages: write` workflow permissions.
- Use `${{ secrets.GITHUB_TOKEN }}` for GHCR publishing; do not add a personal access token to repository secrets.
- Push only the explicit version tag; do not add `latest`, major, or minor tags.
- Do not modify deployment scripts until a GHCR image has been published and pulled successfully.

---

### Task 1: Publish the Existing Build to Aliyun ACR and GHCR

**Files:**
- Modify: `.github/workflows/docker-acr.yml`
- Reference: `docs/superpowers/specs/2026-07-20-dual-container-registry-design.md`

**Interfaces:**
- Consumes: Git tag `GITHUB_REF_NAME`, repository owner `github.repository_owner`, actor `github.actor`, built-in `secrets.GITHUB_TOKEN`, and existing `ACR_*` secrets.
- Produces: `${ACR_REGISTRY}/${ACR_NAMESPACE}/${ACR_REPOSITORY}:${VERSION}` and `ghcr.io/${LOWERCASE_REPOSITORY_OWNER}/sub2api:${VERSION}` from one build.

- [ ] **Step 1: Run a static assertion that demonstrates GHCR publishing is absent**

```powershell
@'
from pathlib import Path
import yaml

path = Path('.github/workflows/docker-acr.yml')
workflow = yaml.load(path.read_text(encoding='utf-8'), Loader=yaml.BaseLoader)
assert workflow['permissions'] == {'contents': 'read', 'packages': 'write'}
steps = workflow['jobs']['docker']['steps']
login = next(step for step in steps if step.get('name') == 'Login to GHCR')
assert login['with']['registry'] == 'ghcr.io'
assert login['with']['password'] == '${{ secrets.GITHUB_TOKEN }}'
build = next(step for step in steps if step.get('name') == 'Build and push image')
tags = [line.strip() for line in build['with']['tags'].splitlines() if line.strip()]
assert len(tags) == 2
assert any(tag.startswith('${{ secrets.ACR_REGISTRY }}/') for tag in tags)
assert 'ghcr.io/${{ steps.ghcr.outputs.owner }}/sub2api:${{ steps.version.outputs.version }}' in tags
'@ | python -
```

Expected: FAIL because the current workflow has no top-level `permissions` mapping or GHCR login.

- [ ] **Step 2: Add GHCR permissions, lowercase owner resolution, login, and destination tag**

Update `.github/workflows/docker-acr.yml` to this complete content:

```yaml
name: Build and Push Docker Image to ACR and GHCR

on:
  push:
    tags:
      - "v*"

permissions:
  contents: read
  packages: write

jobs:
  docker:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Resolve image version
        id: version
        shell: bash
        run: |
          VERSION="${GITHUB_REF_NAME#v}"
          echo "version=${VERSION}" >> "$GITHUB_OUTPUT"

      - name: Resolve lowercase GHCR owner
        id: ghcr
        shell: bash
        run: echo "owner=$(echo '${{ github.repository_owner }}' | tr '[:upper:]' '[:lower:]')" >> "$GITHUB_OUTPUT"

      - name: Login to Aliyun ACR
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.ACR_REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          build-args: |
            VERSION=${{ steps.version.outputs.version }}
          tags: |
            ${{ secrets.ACR_REGISTRY }}/${{ secrets.ACR_NAMESPACE }}/${{ secrets.ACR_REPOSITORY }}:${{ steps.version.outputs.version }}
            ghcr.io/${{ steps.ghcr.outputs.owner }}/sub2api:${{ steps.version.outputs.version }}
```

- [ ] **Step 3: Re-run the static assertion**

Run the PowerShell/Python assertion from Step 1 again.

Expected: exit code 0 with no assertion failure.

- [ ] **Step 4: Validate YAML parsing and whitespace**

```powershell
python -c "from pathlib import Path; import yaml; yaml.load(Path('.github/workflows/docker-acr.yml').read_text(encoding='utf-8'), Loader=yaml.BaseLoader); print('workflow YAML parsed')"
git diff --check
```

Expected: `workflow YAML parsed`, followed by no `git diff --check` errors.

- [ ] **Step 5: Review the exact change and commit it**

```powershell
git diff -- .github/workflows/docker-acr.yml
git add .github/workflows/docker-acr.yml
git commit -m "ci: publish release images to GHCR"
```

Expected: one workflow commit containing the dual-registry publishing change.

- [ ] **Step 6: Verify the first real release outside this local session**

Push the next normal `v*` tag, then verify in GitHub Actions that both registry pushes complete. On the overseas server, authenticate with a separate `read:packages` classic token and run:

```bash
read -rp "Published version without the v prefix: " VERSION
docker pull "ghcr.io/weiness/sub2api:${VERSION}"
```

Expected: the exact published version downloads successfully. Keep production deployment pointed at Aliyun until this check passes.
