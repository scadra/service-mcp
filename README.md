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

Every tool only reads, and returns a summary of the API's answer:

| Tool                 | What it returns                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `whoami`             | the organization the token reads, and how many projects it has                           |
| `list_projects`      | the organization's projects, each with its most recent analysis                          |
| `list_analyses`      | a project's analyses, the most recent first: status, branch, tag, failure reason         |
| `get_findings`       | an analysis's vulnerabilities, the most serious first, down to `min_severity`            |
| `list_licenses`      | an analysis's licenses and the dependencies under each, the policy violations first      |
| `explain_dependency` | one dependency: license, latest version, vulnerabilities and the import paths to it      |
| `fix_next`           | the organization's upgrades that fix the most first, each with its command               |
| `get_vulnerability`  | one vulnerability: severity, EPSS, CISA listing, fixed versions and the projects it hits |

`get_findings`, `list_licenses` and `explain_dependency` take a `project_id`, and read its most recent ended
analysis unless `analysis_id` names another one, in the workspace `.` unless `workspace` names another one.

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
