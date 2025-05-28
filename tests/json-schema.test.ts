import { describe, expect, test } from 'vitest'
import { transform } from '../src'

describe('JSON data types', () => {

  test('array', () => {
    expect(
      transform({
        type: 'array',
      }),
    ).toBe(`unknown[]`)
    expect(
      transform({
        type: 'array',
        items: {
          type: 'number',
        },
      }),
    ).toBe(`number[]`)
    expect(
      transform({
        type: 'array',
        prefixItems: [
          { type: 'number' },
          { type: 'string' },
          { enum: ['Street', 'Avenue', 'Boulevard'] },
          { enum: ['NW', 'NE', 'SW', 'SE'] },
        ],
      }),
    ).toBe(`[number, string, 'Street' | 'Avenue' | 'Boulevard', 'NW' | 'NE' | 'SW' | 'SE', ...unknown[]]`)
    expect(
      transform({
        type: 'array',
        prefixItems: [
          { type: 'number' },
          { type: 'string' },
          { enum: ['Street', 'Avenue', 'Boulevard'] },
          { enum: ['NW', 'NE', 'SW', 'SE'] },
        ],
        items: false,
      }),
    ).toBe(`[number, string, 'Street' | 'Avenue' | 'Boulevard', 'NW' | 'NE' | 'SW' | 'SE']`)
    expect(
      transform({
        type: 'array',
        prefixItems: [
          { type: 'number' },
          { type: 'string' },
          { enum: ['Street', 'Avenue', 'Boulevard'] },
          { enum: ['NW', 'NE', 'SW', 'SE'] },
        ],
        items: { type: 'string' },
      }),
    ).toBe(`[number, string, 'Street' | 'Avenue' | 'Boulevard', 'NW' | 'NE' | 'SW' | 'SE', ...string[]]`)
    expect(
      transform({
        prefixItems: [
          { type: 'string' },
          { type: 'number' },
        ],
        unevaluatedItems: false,
      }),
    ).toBe(`[string, number]`)
  })

  test('boolean', () => {
    expect(
      transform({
        type: 'boolean',
      }),
    ).toBe(`boolean`)
  })

  test('null', () => {
    expect(
      transform({
        type: 'null',
      }),
    ).toBe(`null`)
  })

  test('numeric types', () => {
    expect(
      transform({
        type: 'integer',
      }),
    ).toBe(`number`)
    expect(
      transform({
        type: 'number',
      }),
    ).toBe(`number`)
  })

  test('object', () => {
    expect(
      transform({
        type: 'object',
      }),
    ).toBe(`object`)
    expect(
      transform({
        type: 'object',
        properties: {
          number: { type: 'number' },
          street_name: { type: 'string' },
          street_type: { enum: ['Street', 'Avenue', 'Boulevard'] },
        },
      }),
    ).toBe(`{ number?: number, street_name?: string, street_type?: 'Street' | 'Avenue' | 'Boulevard' } & Record<string, unknown>`)
    expect(
      transform({
        type: 'object',
        properties: {
          number: { type: 'number' },
          street_name: { type: 'string' },
          street_type: { enum: ['Street', 'Avenue', 'Boulevard'] },
        },
        additionalProperties: false,
      }),
    ).toBe(`{ number?: number, street_name?: string, street_type?: 'Street' | 'Avenue' | 'Boulevard' }`)
    // TODO: this is an invalid type
    expect(
      transform({
        type: 'object',
        properties: {
          builtin: { type: 'number' },
        },
        additionalProperties: { type: 'string' },
      }),
    ).toBe(`{ builtin?: number } & Record<string, string>`)
    expect(
      transform({
        allOf: [
          {
            type: 'object',
            properties: {
              street_address: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
            },
            required: ['street_address', 'city', 'state'],
            additionalProperties: false,
          },
        ],
        properties: {
          type: { enum: ['residential', 'business'] },
        },
        required: ['type'],
      }),
    ).toBe(`{ street_address: string, city: string, state: string } & { type: 'residential' | 'business' } & Record<string, unknown>`)
    expect(
      transform({
        allOf: [
          {
            type: 'object',
            properties: {
              street_address: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
            },
            required: ['street_address', 'city', 'state'],
          },
        ],
        properties: {
          street_address: true,
          city: true,
          state: true,
          type: { enum: ['residential', 'business'] },
        },
        required: ['type'],
        additionalProperties: false,
      }),
    ).toBe(`{ street_address: string, city: string, state: string } & Record<string, unknown> & { street_address?: unknown, city?: unknown, state?: unknown, type: 'residential' | 'business' }`)
    expect(
      transform({
        allOf: [
          {
            type: 'object',
            properties: {
              street_address: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
            },
            required: ['street_address', 'city', 'state'],
          },
        ],
        properties: {
          type: { enum: ['residential', 'business'] },
        },
        required: ['type'],
        unevaluatedProperties: false,
      }),
    ).toBe(`{ street_address: string, city: string, state: string } & Record<string, unknown> & { type: 'residential' | 'business' }`)
    expect(
      transform({
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          telephone: { type: 'string' },
        },
        required: ['name', 'email'],
      }),
    ).toBe(`{ name: string, email: string, address?: string, telephone?: string } & Record<string, unknown>`)
  })

  test('additionalProperties = false', () => {
    expect(
      transform({
        type: 'object',
        properties: {
          number: { type: 'number' },
          street_name: { type: 'string' },
          street_type: { enum: ['Street', 'Avenue', 'Boulevard'] },
        },
      }, { additionalProperties: false }),
    ).toBe(`{ number?: number, street_name?: string, street_type?: 'Street' | 'Avenue' | 'Boulevard' }`)
    expect(
      transform({
        allOf: [
          {
            type: 'object',
            properties: {
              street_address: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
            },
            required: ['street_address', 'city', 'state'],
            additionalProperties: false,
          },
        ],
        properties: {
          type: { enum: ['residential', 'business'] },
        },
        required: ['type'],
      }, { additionalProperties: false }),
    ).toBe(`{ street_address: string, city: string, state: string } & { type: 'residential' | 'business' }`)
    expect(
      transform({
        allOf: [
          {
            type: 'object',
            properties: {
              street_address: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
            },
            required: ['street_address', 'city', 'state'],
          },
        ],
        properties: {
          street_address: true,
          city: true,
          state: true,
          type: { enum: ['residential', 'business'] },
        },
        required: ['type'],
        additionalProperties: false,
      }, { additionalProperties: false }),
    ).toBe(`{ street_address: string, city: string, state: string } & { street_address?: unknown, city?: unknown, state?: unknown, type: 'residential' | 'business' }`)
    expect(
      transform({
        allOf: [
          {
            type: 'object',
            properties: {
              street_address: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
            },
            required: ['street_address', 'city', 'state'],
          },
        ],
        properties: {
          type: { enum: ['residential', 'business'] },
        },
        required: ['type'],
        unevaluatedProperties: false,
      }, { additionalProperties: false }),
    ).toBe(`{ street_address: string, city: string, state: string } & { type: 'residential' | 'business' }`)
    expect(
      transform({
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          telephone: { type: 'string' },
        },
        required: ['name', 'email'],
      }, { additionalProperties: false }),
    ).toBe(`{ name: string, email: string, address?: string, telephone?: string }`)
  })

  test('string', () => {
    expect(
      transform({
        type: 'string',
      }),
    ).toBe(`string`)
  })

})

describe('Enumerated and constant values', () => {

  test('Enumerated values', () => {
    expect(
      transform({
        enum: ['red', 'amber', 'green'],
      }),
    ).toBe(`'red' | 'amber' | 'green'`)
    expect(
      transform({
        enum: ['red', 'amber', 'green', null, 42],
      }),
    ).toBe(`'red' | 'amber' | 'green' | null | 42`)
  })

  test('Constant values', () => {
    expect(
      transform({
        properties: {
          country: {
            const: 'United States of America',
          },
        },
      }),
    ).toBe(`{ country?: 'United States of America' } & Record<string, unknown>`)
  })

})

describe('Schema composition', () => {

  test('Boolean JSON Schema combination', () => {
    expect(
      transform({
        allOf: [
          { type: 'string' },
          { maxLength: 5 },
        ],
      }),
    ).toBe(`string`)
    expect(
      transform({
        anyOf: [
          { type: 'string', maxLength: 5 },
          { type: 'number', minimum: 0 },
        ],
      }),
    ).toBe(`string | number`)
    expect(
      transform({
        oneOf: [
          { type: 'number', multipleOf: 5 },
          { type: 'number', multipleOf: 3 },
        ],
      }),
    ).toBe(`number`)
    // TODO: `unknown` actually in TypeScript
    expect(
      transform({
        not: {
          type: 'string',
        },
      }),
    ).toBe(`Exclude<unknown, string>`)
    expect(
      transform({
        allOf: [
          { type: 'string' },
          { type: 'number' },
        ],
      }),
    ).toBe(`string & number`)
  })

})

describe('Other cases', () => {

  test('empty schema', () => {
    expect(
      transform({}),
    ).toBe('unknown')
  })

})
