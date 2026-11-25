# syntax=docker/dockerfile:1

ARG USERNAME=codeclarity

# Toolchain image: pinned Node + corepack + the pnpm version from package.json's
# packageManager field. CI runs install, lint and tests inside this target, as the api does.
# Corepack must be >= 0.34.5: pnpm >= 11 ships bin/pnpm.mjs and older corepack looks for pnpm.cjs.
FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS toolchain
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
RUN npm install -g corepack@0.36.0 --force && corepack enable
COPY package.json ./
# World-writable so the unprivileged CI runner uid can use the cached pnpm.
RUN corepack install && chmod -R a+rwX /opt/corepack

# Build image
FROM toolchain AS mcp-build
ENV PNPM_STORE_DIR=/pnpm/store
COPY . .
# Stage the pnpm config at the build root (minimumReleaseAge), as the api does.
COPY .cloud/docker/pnpm-workspace.yaml ./pnpm-workspace.yaml
# Full install, with the devDependencies the build needs.
RUN --mount=type=cache,id=pnpm-store-mcp,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile
RUN pnpm run build
# Keep only the production dependencies for the image.
RUN pnpm prune --prod

# Prod image
FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS mcp
ARG USERNAME
RUN adduser -D ${USERNAME}
USER ${USERNAME}
WORKDIR /home/${USERNAME}/app
COPY --chown=${USERNAME}:${USERNAME} --from=mcp-build /app/dist ./dist
COPY --chown=${USERNAME}:${USERNAME} --from=mcp-build /app/node_modules ./node_modules
COPY --chown=${USERNAME}:${USERNAME} --from=mcp-build /app/package.json ./package.json
# Speaks MCP on stdin and stdout: run it with docker run -i.
ENTRYPOINT ["node", "dist/main.js"]
