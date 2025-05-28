# transchema

[![npm](https://img.shields.io/npm/v/transchema.svg)](https://www.npmjs.com/package/transchema)

Transform JSON Schema definition into inline TypeScript type.

## Usage

```ts
import { transform } from 'transchema'

transform({
  type: 'array',
  prefixItems: [
    { type: 'number' },
    { type: 'string' },
    { enum: ['Street', 'Avenue', 'Boulevard'] },
    { enum: ['NW', 'NE', 'SW', 'SE'] },
  ],
  items: { type: 'string' },
}) // [number, string, 'Street' | 'Avenue' | 'Boulevard', 'NW' | 'NE' | 'SW' | 'SE', ...string[]]
```

`transform` supports the following options:

- `additionalProperties`: `additionalProperties` for objects defaults to `true` in the JSON Schema specification, which means that all object types are non-closed. In this case, transchema will add `& Record<string, unknown>` union types to these objects to ensure semantic consistency. You can change its default value by setting `additionalProperties: false` to reduce the appearance of this type.

## Why use it?

The typical scenario is to display type of a JSON Schema in the browser. This is useful for displaying MCP tool parameters.

Unlike other Json-Schema-to-TypeScript tools, it has:

- 0 runtime dependencies, so it's safe to run in the browser.
- Inline types generation, which will render human-readable types.

As such, modular combination features such as `$ref` are not supported.

## Other Tools

- If you want to transform JSON Schema to a complete TypeScript declaration file, you can use [`json-schema-to-typescript-lite`](https://github.com/antfu/json-schema-to-typescript-lite).
- If you use `zod` as the schema describer, [`zod-to-ts`](https://github.com/sachinraja/zod-to-ts) supports generating inline types.
