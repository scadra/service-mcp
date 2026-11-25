<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/CodeClarityCE/identity/blob/main/logo/vectorized/logo_name_white.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/CodeClarityCE/identity/blob/main/logo/vectorized/logo_name_black.svg">
  <img alt="codeclarity-logo" src="https://github.com/CodeClarityCE/identity/blob/main/logo/vectorized/logo_name_black.svg">
</picture>
<br>
<br>

Secure your software empower your team.

[![License](https://img.shields.io/github/license/codeclarityce/codeclarity-dev)](LICENSE)

<details open="open">
<summary>Table of Contents</summary>

- [CodeClarity Service - MCP](#codeclarity-service---mcp)
  - [Usage](#usage)
  - [Development](#development)
  - [Contributing](#contributing)
  - [Reporting Issues](#reporting-issues)

</details>

---

# CodeClarity Service - MCP

An [MCP](https://modelcontextprotocol.io) server that lets an AI assistant read a CodeClarity organization's
results. It reaches the instance only through the API, with an Organization token.

## Usage

An organization admin creates an Organization token of scope `read` on the instance's Organization tokens page.
The server reads the same variables as the `codeclarity` CLI and speaks MCP over stdin and stdout.

```sh
docker build -f .cloud/docker/Dockerfile -t codeclarity-mcp .
claude mcp add codeclarity \
  -e CODECLARITY_URL=https://codeclarity.example.com/api \
  -e CODECLARITY_ORG=<organization id> \
  -e CODECLARITY_TOKEN=ccot_... \
  -- docker run --rm -i -e CODECLARITY_URL -e CODECLARITY_ORG -e CODECLARITY_TOKEN codeclarity-mcp
```

Without Docker, Node 22 or later runs it: `pnpm install && pnpm build`, then `node dist/main.js` in place of
`docker run ...`.

Every tool only reads:

| Tool     | What it returns                                                |
| -------- | -------------------------------------------------------------- |
| `whoami` | the organization the token reads, and how many projects it has |

- Logs go to stderr as JSON; stdout carries only MCP messages.
- The server exits with code 1, naming every missing variable, when one of the three is not set.
- An instance with a private CA: point `NODE_EXTRA_CA_CERTS` at the CA certificate.

## Development

```sh
pnpm install
pnpm test          # vitest
pnpm lint:check    # eslint, with the api's rules
pnpm type-check
pnpm build         # CommonJS in dist/
```

## Contributing

If you'd like to contribute code or documentation, please see [CONTRIBUTING.md](https://github.com/CodeClarityCE/codeclarity-dev/blob/main/CONTRIBUTING.md) for guidelines on how to do so.

## Reporting Issues

Please report any issues with the setup process or other problems encountered while using this repository by opening a new issue in this project's GitHub page.
