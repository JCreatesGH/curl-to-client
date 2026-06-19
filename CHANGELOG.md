# Changelog

All notable changes are documented here, following
[Keep a Changelog](https://keepachangelog.com/) and [SemVer](https://semver.org/).

## [0.3.0]

### Added
- **Rust (`reqwest`) target** (`--target rust`) — emits a `reqwest::blocking` function with the
  required `Cargo.toml` line, a snake_cased function name, a fluent
  `.query`/`.header`/`.body` chain, `.error_for_status()`, and `Method::from_bytes` for verbs
  beyond the built-in `get`/`post`/`put`/`delete`/`patch`/`head`.

## [0.2.0]

### Added
- A `curl-to-client` CLI: `'<curl>' [--target fetch|python|go] [--name fn]
  [--sample '<json>']`, reading the command from an argument or stdin.
- A **Go `net/http`** target with conditional imports (`net/url` only with a
  query string, `strings` only with a body).

## [0.1.0]

### Added
- Convert a cURL command into a typed TypeScript `fetch` client or a Python
  `requests` function, with the response type inferred from a sample JSON body.
- Composable `parseCurl`, `inferTypes`, and `tokenize` exports.
