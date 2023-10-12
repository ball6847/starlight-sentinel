# starlight-sentinel

My personal tool for vendor dependency for deno app, including local aliases

## vendor.json

example for vendor.json

```json
{
  "vendor": {
    "api": {
      "root": "./api",
      "entrypoint": "src/main.ts",
      "copy": {
        "./core": "vendor/core"
      },
      "imports": {
        "@myapp/core": "./core/mod.ts"
      }
    },
    "worker": {
      "root": "./worker",
      "entrypoint": "src/main.ts",
      "copy": {
        "./core": "vendor/core"
      },
      "imports": {
        "@myapp/core": "./core/mod.ts"
      }
    }
  }
}

```

install cli

```sh
deno install -n starlight --allow-net --allow-read --allow-write --allow-run https://cdn.jsdelivr.net/gh/ball6847/starlight-sentinel/cli.ts
```

To run starlight

```sh
starlight build --pkg api
```

or run without installing

```sh
deno run --allow-net --allow-read --allow-write --allow-run https://cdn.jsdelivr.net/gh/ball6847/starlight-sentinel/cli.ts build --pkg api
```