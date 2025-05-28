import type { JSONSchema7, JSONSchema7Type } from 'json-schema'
import type { ObjectPropertyEntry, Type } from './type'
import {
  arrayOf,
  exclude,
  intersectionOf,
  isNever,
  keyword,
  NEVER,
  objectOf,
  recordOf,
  spreadOf,
  stringLiteral,
  tupleOf,
  unionOf,
  UNKNOWN,
  unquotedLiteral,
} from './type'

export type Schema = JSONSchema7 & {
  prefixItems?: SchemaDefinition[],
  unevaluatedItems?: SchemaDefinition,
  minContains?: number,
  maxContains?: number,
  unevaluatedProperties?: SchemaDefinition,
  dependentRequired?: Record<string, string[]>,
  dependentSchemas?: Record<string, SchemaDefinition>,
}
export type SchemaValue = JSONSchema7Type
export type SchemaObject = Record<string, SchemaValue>

export type SchemaDefinition = boolean | Schema

function isObject(value: unknown): value is SchemaObject {
  return typeof value === 'object' && Boolean(value) && !Array.isArray(value)
}

export interface TransformOptions {
  additionalProperties?: boolean,
}

function transformProperty(schema: Schema, property: string, options: TransformOptions) {
  if (schema[property] !== undefined) {
    return transformJSONSchema(schema[property], options)
  }
  return UNKNOWN
}

function transformPropertyArray(schema: Schema, property: string, options: TransformOptions) {
  if (Array.isArray(schema[property])) {
    return schema[property].map(item => transformJSONSchema(item, options))
  }
  return undefined
}

function transformPropertyObject(schema: Schema, property: string, options: TransformOptions) {
  if (isObject(schema[property])) {
    return Object.entries(schema[property] as Record<string, SchemaDefinition>).map(
      ([name, value]): ObjectPropertyEntry => [
        name,
        transformJSONSchema(value, options),
        {},
      ],
    )
  }
  return undefined
}

function getRequiredProperties(schema: Schema) {
  if (Array.isArray(schema.required)) {
    return schema.required.filter((value): value is string => typeof value === 'string')
  }
  return []
}

function defineObjectProperties(properties: ObjectPropertyEntry[] | undefined, requiredProperties: string[]) {
  if (!properties) {
    return properties
  }
  return properties.map<ObjectPropertyEntry>(([name, type, descriptor]) => [
    name,
    type,
    {
      ...descriptor,
      optional: !requiredProperties.includes(name),
    },
  ])
}

function transformLiteral(value: SchemaValue): Type {
  if (typeof value === 'string') {
    return stringLiteral(value)
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return unquotedLiteral(value)
  }
  if (value === null) {
    return keyword('null')
  }
  if (Array.isArray(value)) {
    return tupleOf(
      value.map(item => transformLiteral(item)),
    )
  }
  if (isObject(value)) {
    return objectOf(
      Object.entries(value).map(([name, property]) => [
        name,
        transformLiteral(property),
        {},
      ]),
    )
  }
  return NEVER
}

function transformEnum(schema: Schema) {
  if (Array.isArray(schema.enum)) {
    return unionOf(
      schema.enum.map(value => transformLiteral(value)),
    )
  }
  return UNKNOWN
}

function transformConst(schema: Schema) {
  if (schema.const !== undefined) {
    return transformLiteral(schema.const)
  }
  return UNKNOWN
}

function transformAllOf(schema: Schema, options: TransformOptions) {
  if (Array.isArray(schema.allOf)) {
    return intersectionOf(
      schema.allOf.map(item => transformJSONSchema(item, options)),
    )
  }
  return UNKNOWN
}

function transformAnyOf(schema: Schema, options: TransformOptions) {
  if (Array.isArray(schema.anyOf)) {
    return unionOf(
      schema.anyOf.map(item => transformJSONSchema(item, options)),
    )
  }
  return UNKNOWN
}

function transformOneOf(schema: Schema, options: TransformOptions) {
  // Fallback to anyOf
  if (Array.isArray(schema.oneOf)) {
    return unionOf(
      schema.oneOf.map(item => transformJSONSchema(item, options)),
    )
  }
  return UNKNOWN
}

function transformNot(schema: Schema, options: TransformOptions) {
  if (schema.not !== undefined) {
    return transformJSONSchema(schema.not, options)
  }
  return NEVER
}

function inferType(schema: Schema) {
  if (
    schema.items !== undefined
    || schema.prefixItems !== undefined
    || schema.additionalItems !== undefined // Before 2019-09
    || schema.unevaluatedItems !== undefined
    || schema.contains !== undefined
    || schema.minContains !== undefined
    || schema.maxContains !== undefined
    || schema.minItems !== undefined
    || schema.maxItems !== undefined
    || schema.uniqueItems !== undefined
  ) {
    return 'array'
  }
  if (
    schema.multipleOf !== undefined
    || schema.minimum !== undefined
    || schema.exclusiveMinimum !== undefined
    || schema.maximum !== undefined
    || schema.exclusiveMaximum !== undefined
  ) {
    return 'number'
  }
  if (
    schema.properties !== undefined
    || schema.additionalProperties !== undefined
    || schema.unevaluatedProperties !== undefined
    || schema.required !== undefined
    || schema.patternProperties !== undefined
    || schema.propertyNames !== undefined
    || schema.minProperties !== undefined
    || schema.maxProperties !== undefined
    || schema.dependentRequired !== undefined
    || schema.dependencies !== undefined // Before 2019-09
  ) {
    return 'object'
  }
  if (
    schema.minLength !== undefined
    || schema.maxLength !== undefined
    || schema.pattern !== undefined
  ) {
    return 'string'
  }
  return undefined
}

function transformType(schema: Schema, options: TransformOptions) {
  const type = schema.type ?? inferType(schema)
  switch (type) {
    case 'array': {
      const prefixItems = schema.prefixItems !== undefined
        ? transformPropertyArray(schema, 'prefixItems', options)
        : (
          Array.isArray(schema.items)
            ? transformPropertyArray(schema, 'items', options) // Before 2019-09
            : undefined
        )
      const items = schema.items !== undefined && !Array.isArray(schema.items)
        ? transformProperty(schema, 'items', options)
        : (
          schema.additionalItems !== undefined
            ? transformProperty(schema, 'additionalItems', options) // Before 2019-09
            : transformProperty(schema, 'unevaluatedItems', options)
        )
      // Language Limitations: contains, minContains, maxContains, minItems, maxItems, uniqueItems
      return prefixItems
        ? (
          isNever(items)
            ? tupleOf(prefixItems)
            : tupleOf([...prefixItems, spreadOf(arrayOf(items))])
        )
        : arrayOf(items)
    }
    case 'boolean':
      return keyword('boolean')
    case 'null':
      return keyword('null')
    case 'integer':
    case 'number':
      // Language limitations: integer, multipleOf, minimum, exclusiveMinimum, maximum, exclusiveMaximum
      return keyword('number')
    case 'object': {
      const required = getRequiredProperties(schema)
      const properties = defineObjectProperties(
        transformPropertyObject(schema, 'properties', options),
        required,
      )
      const additionalProperties = schema.additionalProperties !== undefined
        ? transformProperty(schema, 'additionalProperties', options)
        : (
          schema.unevaluatedProperties !== undefined
            ? transformProperty(schema, 'unevaluatedProperties', options)
            : transformJSONSchema(options.additionalProperties ?? true, options)
        )
      if (properties) {
        return isNever(additionalProperties)
          ? objectOf(properties)
          : intersectionOf([objectOf(properties), recordOf(additionalProperties)])
      }
      // TODO: dependentRequired or dependency (before 2019-09), dependentSchemas
      // Language limitations: patternProperties, propertyNames, minProperties, maxProperties
      return keyword('object')
    }
    case 'string':
      // Language limitations: minLength, maxLength, pattern
      return keyword('string')
    default:
      return UNKNOWN
  }
}

function transformJSONSchema(schema: SchemaDefinition, options: TransformOptions): Type {
  if (typeof schema === 'boolean') {
    return schema ? UNKNOWN : NEVER
  }
  let type = intersectionOf([
    transformEnum(schema),
    transformConst(schema),
    transformAllOf(schema, options),
    transformAnyOf(schema, options),
    transformOneOf(schema, options),
    transformType(schema, options),
  ])
  if (schema.unevaluatedItems !== undefined) {
    const unevaluatedItems = transformProperty(schema, 'unevaluatedItems', options)
    type = isNever(unevaluatedItems)
      ? type
      : tupleOf([spreadOf(type), spreadOf(arrayOf(unevaluatedItems))])
  }
  if (schema.unevaluatedProperties !== undefined) {
    const unevaluatedProperties = transformProperty(schema, 'unevaluatedProperties', options)
    return isNever(unevaluatedProperties)
      ? type
      : intersectionOf([type, recordOf(unevaluatedProperties)])
  }
  if (schema.not !== undefined) {
    type = exclude(type, transformNot(schema, options))
  }
  // TODO: if, then, else
  return type
}

export function transform(schema: boolean | SchemaObject, options?: TransformOptions) {
  const type = transformJSONSchema(schema, options ?? {})
  return type.expression
}
