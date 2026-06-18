# Changelog

All notable changes are documented here, following
[Keep a Changelog](https://keepachangelog.com/) and [SemVer](https://semver.org/).

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
