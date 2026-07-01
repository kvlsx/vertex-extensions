# Vertex Extensions

Public registry of **extensions** for the [Vertex](https://github.com/kvlsx/vertex)
desktop multi-service hub. Extensions let new services be added to Vertex without
shipping a new app build.

> **Security:** extensions are **data only** — plain JSON describing services
> (name, URL, icon, color). No executable code is fetched or run. This keeps the
> hardened Vertex renderer safe.

## How Vertex consumes this repo

Vertex fetches the registry index and then the individual extension manifests via
raw GitHub URLs (no authentication needed, this repo is public):

- Registry index:
  `https://raw.githubusercontent.com/kvlsx/vertex-extensions/main/registry.json`
- A manifest, e.g.:
  `https://raw.githubusercontent.com/kvlsx/vertex-extensions/main/extensions/productivity-pack/manifest.json`

Flow:
1. Download `registry.json` → list of available extensions.
2. Show them to the user (name, description, version).
3. On install, download the extension's `manifest`.
4. Merge its `services[]` into the user's Vertex service list.

## Registry format (`registry.json`)

```json
{
  "schemaVersion": 1,
  "updated": "2026-07-01",
  "extensions": [
    {
      "id": "productivity-pack",
      "name": "Productivity Pack",
      "version": "1.0.0",
      "description": "...",
      "author": "kvls",
      "type": "service-pack",
      "manifest": "extensions/productivity-pack/manifest.json"
    }
  ]
}
```

## Manifest format (`service-pack`)

```json
{
  "id": "productivity-pack",
  "name": "Productivity Pack",
  "version": "1.0.0",
  "description": "...",
  "author": "kvls",
  "type": "service-pack",
  "services": [
    { "type": "clickup", "name": "ClickUp", "url": "https://app.clickup.com", "icon": "🟣", "color": "#7b68ee" }
  ]
}
```

Field reference is defined in [`schema/manifest.schema.json`](schema/manifest.schema.json).
A service's icon is normally resolved automatically from its favicon by Vertex; the
`icon` (emoji) and `color` are fallbacks.

## Contributing an extension

1. Create `extensions/<your-id>/manifest.json` following the schema.
2. Add an entry to `registry.json`.
3. Open a pull request.

## Repository layout

```
registry.json                     # index of all extensions
schema/manifest.schema.json       # JSON Schema for manifests
extensions/<id>/manifest.json     # one folder per extension
```
