# Dual Container Registry Publishing Design

## Goal

Publish each version-tagged Sub2API container image to both the existing Aliyun ACR repository and GitHub Container Registry (GHCR). Aliyun remains available as the current domestic registry while overseas deployments can pull the same image from GHCR.

## Scope

The change is limited to `.github/workflows/docker-acr.yml`. The workflow continues to run for Git tags matching `v*`. Existing deployment configuration remains unchanged until a GHCR image has been published and verified from the overseas server.

## Publishing Flow

1. Check out the tagged revision.
2. Strip the leading `v` from the Git tag to derive the image version.
3. Convert `github.repository_owner` to lowercase for the GHCR namespace.
4. Log in to Aliyun ACR with the existing repository secrets.
5. Log in to GHCR with the workflow-scoped `GITHUB_TOKEN`.
6. Build the container image once with `docker/build-push-action`.
7. Push that build under two tags:
   - `${ACR_REGISTRY}/${ACR_NAMESPACE}/${ACR_REPOSITORY}:${VERSION}`
   - `ghcr.io/${LOWERCASE_REPOSITORY_OWNER}/sub2api:${VERSION}`

Building once ensures both registries receive the same image content for a version.

## Authentication and Permissions

The workflow declares `contents: read` and `packages: write` permissions. Aliyun continues to use `ACR_REGISTRY`, `ACR_USERNAME`, and `ACR_PASSWORD`. GHCR uses GitHub Actions' automatically generated `GITHUB_TOKEN`; no personal access token is stored as an Actions secret.

The production server uses a separate personal access token with only `read:packages` permission when pulling a private GHCR image. A token with `write:packages` is not required on the production server.

## Failure Behavior

Both image tags are passed to the same build-and-push step. If authentication, building, or pushing to either registry fails, the workflow fails. This prevents a partially published release from appearing successful.

The workflow will not automatically deploy or alter either server. Deployment remains an explicit operation after publishing.

## Verification

Before triggering a release, validate that the workflow is syntactically valid and that it contains both registry logins, the required package permission, and both image tags. For the first release after the change:

1. Push a normal `v*` release tag.
2. Confirm the Actions run succeeds.
3. Confirm both registries contain the same version tag.
4. Log in to GHCR on the overseas server with a read-only token.
5. Pull the GHCR image and compare its repository digest with the published result.
6. Only then update the operations deployment image from Aliyun ACR to GHCR.

## Non-goals

- Removing Aliyun ACR or its repository secrets.
- Changing the existing manual `release.yml` workflow.
- Publishing a `latest` tag or additional major/minor aliases.
- Changing the production deployment scripts before GHCR is verified.
