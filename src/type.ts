export interface Descriptor {
  modifier?: string,
  optional?: boolean,
}

export type ObjectPropertyEntry = [string, Type, Descriptor]

interface BaseType {
  kind: string,
  expression: string,
}

interface KeywordType extends BaseType {
  kind: 'keyword',
}

interface LiteralType extends BaseType {
  kind: 'literal',
  literal: string | number | boolean,
}

interface UnionType extends BaseType {
  kind: 'union',
  elements: Type[],
}

interface IntersectionType extends BaseType {
  kind: 'intersection',
  elements: Type[],
}

interface SpreadType extends BaseType {
  kind: 'spread',
  argument: Type,
}

interface TupleType extends BaseType {
  kind: 'tuple',
  elements: Type[],
}

interface RecordType extends BaseType {
  kind: 'record',
  argument: Type,
}

interface ObjectType extends BaseType {
  kind: 'object',
  members: ObjectPropertyEntry[],
}

interface ExpressionType extends BaseType {
  kind: 'expression',
}

export type Type = KeywordType
  | LiteralType
  | UnionType
  | IntersectionType
  | SpreadType
  | TupleType
  | RecordType
  | ObjectType
  | ExpressionType

function isEquivalent(a: Type, b: Type) {
  return a.kind === b.kind && a.expression === b.expression
}

export function keyword(expression: string): Type {
  return {
    kind: 'keyword',
    expression,
  }
}

export const UNKNOWN = keyword('unknown')
export const NEVER = keyword('never')

export function isKeyword(type: Type, expression: string) {
  return type.kind === 'keyword' && type.expression === expression
}

export function isUnknown(type: Type) {
  return isKeyword(type, 'unknown')
}

export function isNever(type: Type) {
  return isKeyword(type, 'never')
}

export function isLiteral(type: Type, literal: 'string' | 'number' | 'boolean') {
  return type.kind === 'literal' && typeof type.literal === literal
}

export function stringLiteral(value: string): Type {
  return {
    kind: 'literal',
    expression: `'${value.replace(/'/g, '\\\'')}'`,
    literal: value,
  }
}

export function unquotedLiteral(value: number | boolean): Type {
  return {
    kind: 'literal',
    expression: String(value),
    literal: value,
  }
}

function enclose(type: Type, kind: Type['kind']) {
  const shouldEnclose = kind === 'union'
    ? false
    : (
      kind === 'intersection'
        ? type.kind === 'union'
        : type.kind === 'union' || type.kind === 'intersection'
    )
  return shouldEnclose
    ? `(${type.expression})`
    : type.expression
}

export function arrayOf(type: Type): Type {
  return {
    kind: 'expression',
    expression: `${enclose(type, 'expression')}[]`,
  }
}

function mergeSpreadTypes(types: Type[]) {
  const spreadTypes = types.filter(type => isSpread(type))
  const argumentIntersection = spreadTypes.length
    ? intersectionOf(spreadTypes.map(item => item.argument))
    : NEVER
  if (isNever(argumentIntersection)) {
    return types.filter(type => !isSpread(type))
  } else {
    const lastSpreadIndex = types.findLastIndex(type => isSpread(type))
    return types.flatMap((type, index) => {
      if (isSpread(type)) {
        return index === lastSpreadIndex
          ? [spreadOf(argumentIntersection)]
          : []
      }
      return [type]
    })
  }
}

export function tupleOf(types: Type[]): Type {
  types = types.flatMap(type => {
    if (type.kind === 'spread' && type.argument.kind === 'tuple') {
      return type.argument.elements
    }
    return [type]
  })
  types = mergeSpreadTypes(types)
  return {
    kind: 'tuple',
    expression: `[${types.map(type => type.expression).join(', ')}]`,
    elements: types,
  }
}

export function spreadOf(type: Type): Type {
  return {
    kind: 'spread',
    expression: `...${enclose(type, 'spread')}`,
    argument: type,
  }
}

function isSpread(type: Type): type is SpreadType {
  return type.kind === 'spread' && Boolean(type.argument)
}

export function recordOf(type: Type): Type {
  return {
    kind: 'record',
    expression: `Record<string, ${type.expression}>`,
    argument: type,
  }
}

function isRecord(type: Type): type is RecordType {
  return type.kind === 'record'
}

export function objectOf(types: ObjectPropertyEntry[]): Type {
  if (!types.length) {
    return recordOf(NEVER)
  }
  return {
    kind: 'object',
    expression: `{ ${
      types.map(
        ([name, type, descriptor]) => `${
          descriptor.modifier
            ? descriptor.modifier + ' '
            : ''
        }${name}${descriptor.optional ? '?' : ''}: ${type.expression}`,
      ).join(', ')
    } }`,
    members: types,
  }
}

function flattenElements(types: Type[], kind: 'intersection' | 'union'): Type[] {
  return types.flatMap(type => {
    if (type.kind === kind && Array.isArray(type.elements)) {
      return flattenElements(type.elements, kind)
    }
    return [type]
  })
}

function uniqueTypes(types: Type[]) {
  return types.reduce<Type[]>((items, type) => {
    if (!items.some(item => isEquivalent(item, type))) {
      items.push(type)
    }
    return items
  }, [])
}

function mergeRecordTypes(types: Type[]) {
  const recordTypes = types.filter(type => isRecord(type))
  const argumentIntersection = recordTypes.length
    ? intersectionOf(recordTypes.map(item => item.argument))
    : NEVER
  if (isNever(argumentIntersection)) {
    return types.filter(type => !isRecord(type))
  } else {
    const lastRecordIndex = types.findLastIndex(type => isRecord(type))
    return types.flatMap((type, index) => {
      if (isRecord(type)) {
        return index === lastRecordIndex
          ? [recordOf(argumentIntersection)]
          : []
      }
      return [type]
    })
  }
}

export function intersectionOf(types: Type[]): Type {
  types = uniqueTypes(flattenElements(types, 'intersection'))
  if (types.some(type => isNever(type))) {
    return NEVER
  }
  if (types.some(type => isLiteral(type, 'string'))) {
    types = types.filter(type => !isKeyword(type, 'string'))
  }
  if (types.some(type => isLiteral(type, 'number'))) {
    types = types.filter(type => !isKeyword(type, 'number'))
  }
  if (types.some(type => isLiteral(type, 'boolean'))) {
    types = types.filter(type => !isKeyword(type, 'boolean'))
  }
  types = mergeRecordTypes(types)
  types = types.filter(type => !isUnknown(type))
  if (!types.length) {
    return UNKNOWN
  }
  if (types.length === 1) {
    return types[0]
  }
  return {
    kind: 'intersection',
    expression: types.map(type => enclose(type, 'intersection')).join(' & '),
    elements: types,
  }
}

export function unionOf(types: Type[]): Type {
  types = uniqueTypes(flattenElements(types, 'union'))
  if (types.some(type => isUnknown(type))) {
    return NEVER
  }
  if (types.some(type => isKeyword(type, 'string'))) {
    types = types.filter(type => !isLiteral(type, 'string'))
  }
  if (types.some(type => isKeyword(type, 'number'))) {
    types = types.filter(type => !isLiteral(type, 'number'))
  }
  if (types.some(type => isKeyword(type, 'boolean'))) {
    types = types.filter(type => !isLiteral(type, 'boolean'))
  }
  types = types.filter(type => !isNever(type))
  if (!types.length) {
    return NEVER
  }
  if (types.length === 1) {
    return types[0]
  }
  return {
    kind: 'union',
    expression: types.map(type => enclose(type, 'union')).join(' | '),
    elements: types,
  }
}

export function exclude(type: Type, excluded: Type): Type {
  if (isNever(type)) {
    return NEVER
  }
  if (isNever(excluded)) {
    return type
  }
  if (isUnknown(excluded)) {
    return NEVER
  }
  return {
    kind: 'expression',
    expression: `Exclude<${type.expression}, ${excluded.expression}>`,
  }
}
