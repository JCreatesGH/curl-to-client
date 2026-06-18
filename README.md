# curl-to-client

[![CI](https://github.com/JCreatesGH/curl-to-client/actions/workflows/ci.yml/badge.svg)](https://github.com/JCreatesGH/curl-to-client/actions)
[![TypeScript](https://img.shields.io/badge/types-included-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Paste a `cURL` command, get a **typed TypeScript fetch client**, a **Python `requests`** function, or a **Go `net/http`** function — with the response type inferred from a sample JSON body. Turns the snippet from someone's API docs into real, typed code in one step.

![screenshot](assets/screenshot.png)

## Install

```bash
npm install curl-to-client
```

## CLI

```bash
curl-to-client 'curl -X POST https://api.x.com/users -H "Authorization: Bearer t" -d "{\"name\":\"Ada\"}"'
curl-to-client '<curl…>' --target go --name createUser
curl-to-client '<curl…>' --sample '{"id":1,"name":"Ada"}'   # infer the fetch return type
pbpaste | curl-to-client --target python                     # or pipe it in
```

Quote the whole cURL command as one argument (so its own `-X`/`-H` flags aren't consumed by the CLI). Exit code is `2` on a usage/parse error.

## Use it as a library

```ts
import { generateClient } from "curl-to-client";

const code = generateClient(
  `curl -X POST https://api.x.com/users -H 'Authorization: Bearer t' -d '{"name":"Ada"}'`,
  { functionName: "createUser", sampleResponse: { id: 1, name: "Ada" } }
);
```

produces:

```ts
export interface Response { id: number; name: string; }

export async function createUser(): Promise<Response> {
  const url = new URL("https://api.x.com/users");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Authorization": "Bearer t" },
    body: '{"name":"Ada"}',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<Response>;
}
```

## Python and Go targets

```ts
generateClient(curlCommand, { target: "python", functionName: "create_user" });
generateClient(curlCommand, { target: "go", functionName: "createUser" });
```

```python
import requests


def create_user():
    url = "https://api.x.com/users"
    headers = {"Authorization": "Bearer t"}
    data = '{"name":"Ada"}'
    resp = requests.post(url, headers=headers, data=data)
    resp.raise_for_status()
    return resp.json()
```

```go
package main

import (
	"io"
	"net/http"
	"strings"
)

func CreateUser() ([]byte, error) {
	req, err := http.NewRequest("POST", "https://api.x.com/users", strings.NewReader("{\"name\":\"Ada\"}"))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer t")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
```

The Go target only imports what it uses — `net/url` is added when there's a query string, `strings` when there's a body.

## What it understands

- **cURL parsing** — `-X/--request`, `-H/--header`, `-d/--data(-raw|-binary)`, `--data-urlencode`, `--json`, `-u` (basic auth → header), `-A`, query strings, quoted args, and `\`-line continuations. **Attached short flags** (`-XPOST`, `-d'{…}'`) are split, and **repeated `-d` flags are joined with `&`** the way curl does. Method defaults to GET (or POST when a body is present).
- **Type inference** — nested objects become named `interface`s (deduped by shape), arrays infer their item type, non-identifier keys are quoted, root arrays become a `type` alias.
- **Three targets** — a typed `fetch` client (default), a Python `requests` function, or a Go `net/http` function.
- **Composable** — `parseCurl`, `inferTypes`, and `tokenize` are exported individually.

## Development

```bash
npm install && npm test    # 26 tests
npm run build              # tsc, clean
```

## License

MIT
