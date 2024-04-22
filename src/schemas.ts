import { FieldMissingError, JSONArrayNotFoundError, NullNotAllowedError } from "./errors";
import { InferSourceFromSchema, InferTargetFromSchema, SchemaSource, SchemaTarget } from "./type-conversions";
import JSONBig from "json-bigint";

export type DefaultBehaviour = { allowNull: boolean, optional: boolean }
interface NotNull extends DefaultBehaviour { allowNull: false }
interface Optional extends DefaultBehaviour { optional: true, allowNull: true }
type AllowNull<T, B extends DefaultBehaviour> = B extends NotNull ? T : B extends Optional ? T | null | undefined : T | null;

export type PrimitiveSchemaTypes = "string" | "int" | "float" | "bigint" | "bool" | "date";
export type MetadataTypes = PrimitiveSchemaTypes | "object" | "array";
/**
 * Metadata for the schema type
 */
export interface TypedMetadata {
    /**
     * Data type
     */
    dataType: MetadataTypes,
    /**
     * True if null is accepted by the object
     */
    notNull: boolean,
    /**
     * True if the object is optional, i.e. the field can be absent or the object undefined
     */
    optional: boolean,
    /**
     * True if the object has a default/validation rule defined
     */
    hasDefaultRule?: boolean
}

/**
 * Facade exposing a map child schemas of the schema object
 */
export type FieldsMap = {
    /**
     * Get the field's schema by field name
     * @param fieldName Field's name
     * @returns Schema object for the named field or undefined if the field does not exist
     */
    get: (fieldName: string) => Schema | undefined,
    /**
     * Executes for each key of the underlying object 
     * @param func Function to execute for each field of the object
     */
    forEach: (func: (fieldName: string, schema: Schema) => void) => void
    /**
     * Executes for each key of the underlying object and returns the value for each iteration
     * @param func Function to execute for each field of the object
     * @returns Array of objects returned from each consecutive field
     */
    map: <T>(func: (fieldName: string, schema: Schema) => T) => T[]
    /**
     * Returns only the fields matching the condition implemented by the function
     * Function returning true
     * @param func Function checking each field in the object. If true, the schema is added to the resulting array
     */
    filter: (func: (fieldName: string, schema: Schema) => boolean) => { key: string, schema: Schema }[]

    /**
     * Returns the number of fields (and thus field schemas) returned by the object
     */
    get size(): number
}

class FieldsMapFacade<T extends SchemaDefinition> implements FieldsMap {
    constructor(private definition: T) { }

    get = (fieldName: string) => this.definition[fieldName]

    forEach = (func: (fieldName: string, schema: Schema) => void) => {
        Object.keys(this.definition).forEach(key => func(key, this.definition[key]))
    }

    map = <T>(func: (fieldName: string, schema: Schema) => T) =>
        Object.keys(this.definition).map(key => func(key, this.definition[key]))

    filter = (func: (fieldName: string, schema: Schema) => boolean) =>
        Object.keys(this.definition)
            .filter(key => func(key, this.definition[key]))
            .map(key => ({ key, schema: this.definition[key] }))

    get size() { return Object.keys(this.definition).length }
}

/**
 * Metadata for the object schema
 */
export interface ObjectMetadata extends TypedMetadata {
    dataType: "object",
    /**
     * Map of schemas for every field of the object
     */
    fields: FieldsMap
}
/**
 * Metadata for the array schema
 */
export interface ArrayMetadata extends TypedMetadata {
    dataType: "array",
    /**
     * Schema for every element of the array. Only one schema because all the array elements are of the same type
     */
    elements: Schema
}

/**
 * Setting that define the way the object described by the schema is unboxed
 */
export type UnboxingProperties = {
    /**
     * True if the "null" string is interpreted as a string. Otherwise it is unboxed as null
     */
    keepNullString?: boolean,
    /**
     * True if the "undefined" string is interpreted as a string. Otherwise it is unboxed as undefined
     */
    keepUndefinedString?: boolean
}

export type MetadataForSchema<T> =
    T extends ObjectS<any> ? ObjectMetadata :
    T extends ArrayS<any> ? ArrayMetadata :
    TypedMetadata

/**
 * Base for all schemas defining their common behaviour
 */
export interface Schema<
    Target = any,
    Sources = any,
    B extends DefaultBehaviour = DefaultBehaviour,
    Original extends Schema = any
> {
    /**
     * Runtime information about the schema object
     */
    get metadata(): MetadataForSchema<Original>,
    /**
     * Converts the loosely-typed source to the exact type defined by the schema
     * @param source Source that can be of a type that can be converted to one defined by the schema
     * @param props Unboxing options. By default, "null" string is unboxed as null, but "undefined" string as an "undefined" string
     * @returns Value converted to the type managed by the schema
     */
    unbox: (source: AllowNull<Sources, B>, props?: UnboxingProperties) => AllowNull<Target, B>;
}

/**
 * Schema for complex types
 */
export interface ExtendedSchema<
    Target = any,
    Sources = any,
    B extends DefaultBehaviour = DefaultBehaviour>
    extends Schema<Target, Sources, B> {
    /**
     * Indicates that the unboxed value cannot be null. Forbids null source values if true
     */
    notNull: NotNullFacade<Target, Sources, B, this>
    /**
     * Indicates that the unboxed value can be undefined or omitted if it is an object's field
     */
    optional: OptionalFacade<Target, Sources, B, this>
    /**
     * Indicates the default unboxing behaviour of the schema depending on the source unboxing value
     * @param target Either a default value to set or a function returning that default value, or an error to throw, in which case this is acting as a validator
     * @param condition Function defining the condition when the default value is applied (or the error is thrown). By default, applied when the source is null
     */
    byDefault: (
        target: Target | Error | ((s: Sources) => Target),
        condition?: (source: Sources) => boolean) =>
        ByDefaultFacade<Target, Sources, B, this>
}

export interface NotNullFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    extends Schema<Target, Sources, NotNull, Original> {
}

class NotNullFacadeImpl<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    implements NotNullFacade<Target, Sources, B, Original> {
    readonly #metadata: MetadataForSchema<Original>
    readonly #unbox

    /** {@inheritdoc Schema.metadata} */
    get metadata() {
        return this.#metadata
    }

    constructor(internal: Original) {
        this.#metadata = {
            ...internal.metadata as MetadataForSchema<Original>,
            notNull: true,
            optional: false
        }
        this.#unbox = internal.unbox
    }
    /** {@inheritdoc Schema.unbox} */
    unbox = (source: Sources, props?: UnboxingProperties): Target => {
        if (source === null || (props?.keepNullString !== true && source === "null")) throw new NullNotAllowedError();
        return this.#unbox(source as AllowNull<Sources, B>, props)!;
    }
}

export interface OptionalFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    extends Schema<Target, Sources, Optional, Original> {
}

export class OptionalFacadeImpl<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    implements OptionalFacade<Target, Sources, B, Original> {
    readonly #metadata: MetadataForSchema<Original>
    readonly #unbox

    /** {@inheritdoc Schema.metadata} */
    get metadata() {
        return this.#metadata
    }
    constructor(internal: Original) {
        this.#metadata = {
            ...internal.metadata as MetadataForSchema<Original>,
            notNull: false,
            optional: true
        }
        this.#unbox = internal.unbox
    }

    /** {@inheritdoc Schema.unbox} */
    unbox = (source: Sources | null | undefined, props?: UnboxingProperties): Target | null | undefined => {
        if (source === undefined || (props?.keepUndefinedString === false && source === "undefined")) return undefined
        return this.#unbox(source as any, props)
    }
}

export interface ByDefaultFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    extends Schema<Target, Sources, B, Original> {
    optional: OptionalFacade<Target, Sources, B, Original>
}
class ByDefaultFacadeImpl<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B, Original>>
    implements ByDefaultFacade<Target, Sources, B, Original> {
    readonly #metadata: MetadataForSchema<Original>
    readonly #unbox

    /** {@inheritdoc Schema.metadata} */
    get metadata() { return this.#metadata }
    private targetCheck: (s: Sources) => Target;
    constructor(
        internal: Original,
        target: Target | Error | ((s: Sources) => Target),
        private condition: (source: Sources) => boolean) {
        this.#metadata = this.#metadata = {
            ...internal.metadata as MetadataForSchema<Original>,
            hasDefaultRule: true
        }
        this.#unbox = internal.unbox
        this.targetCheck =
            typeof target === "function" ? this.targetCheck = target as any :
                target instanceof Error ? this.targetCheck = _ => { throw target } :
                    _ => target
    }

    #optional = undefined as OptionalFacade<Target, Sources, B, any> | undefined
    /** {@inheritdoc ExtendedSchema.optional} */
    get optional() {
        if (!this.#optional) this.#optional = new OptionalFacadeImpl<Target, Sources, B, this>(this as any)
        return this.#optional
    }
    /** {@inheritdoc Schema.unbox} */
    unbox = (source: AllowNull<Sources, B>, props?: UnboxingProperties): AllowNull<Target, B> => {
        if (this.condition(source!)) return this.targetCheck(source!) as AllowNull<Target, B>;
        return this.#unbox(source, props);
    }
}

/**
 * Abstract schema type, parent class of all the base schema definitions
 */
export abstract class TypeSchema<Target = any, Sources = any, B extends DefaultBehaviour = { allowNull: true, optional: false }>
    implements ExtendedSchema<Target, Sources, B> {
    abstract get metadata(): TypedMetadata;
    protected abstract convert: (source: Sources, props?: UnboxingProperties) => Target
    /** {@inheritdoc Schema.unbox} */
    unbox = (source: AllowNull<Sources, B>, props?: UnboxingProperties): AllowNull<Target, B> => {
        if (source === null || (props?.keepNullString !== true && source === "null")) return null as any
        if (source === undefined || (props?.keepUndefinedString === false && source === "undefined")) throw new FieldMissingError()
        return this.convert(source, props) as AllowNull<Target, B>
    }

    #notNull = undefined as NotNullFacade<Target, Sources, B, this> | undefined
    /** {@inheritdoc ExtendedSchema.unbox} */
    get notNull() {
        if (!this.#notNull) this.#notNull = new NotNullFacadeImpl<Target, Sources, B, this>(this)
        return this.#notNull
    }

    #optional = undefined as OptionalFacade<Target, Sources, B, this> | undefined
    /** {@inheritdoc ExtendedSchema.unbox} */
    get optional() {
        if (!this.#optional) this.#optional = new OptionalFacadeImpl<Target, Sources, B, this>(this)
        return this.#optional
    }

    /** {@inheritdoc ExtendedSchema.unbox} */
    byDefault = (
        target: Target | Error | ((s: Sources) => Target),
        condition = (source => source === null) as (source: Sources) => boolean) =>
        new ByDefaultFacadeImpl(this as any, target, condition) as unknown as ByDefaultFacade<Target, Sources, B, this>
}

/**
 * Defines how a complex object's schema must be structured
 */
export type SchemaDefinition = {
    [K: string]: Schema
}

/**
 * Utility type to get the type hidden behind a .notNull or .optional facade extension
 */
export type ExtractFromFacade<T> =
    T extends NotNullFacade<any, any, any, infer S> ? S :
    T extends OptionalFacade<any, any, any, infer S> ? S :
    T

const getObjectSchemaSignature = (schema: FieldsMap): string => {
    return `{${schema.map((fieldName, schema) => `${fieldName}:${getSchemaSignature(schema)}`).join(",")}}`
}

const isSchema = (candidate: any): candidate is Schema => (candidate as Schema).metadata?.dataType !== undefined
const isObjectSchema = <T extends SchemaDefinition>(candidate: Schema): candidate is ObjectS<T> =>
    candidate.metadata.dataType === "object"
const isArraySchema = <T extends Schema>(candidate: Schema): candidate is ArrayS<T> =>
    candidate.metadata.dataType === "array"

const getTypeSchemaSignature = <T extends SchemaDefinition, B extends DefaultBehaviour>
    (schema: Schema<SchemaTarget<T>, SchemaSource<T>, B> | T): string => {
    if (!isSchema(schema)) return getObjectSchemaSignature(new FieldsMapFacade(schema as T))
    if (isObjectSchema(schema))
        return getObjectSchemaSignature(schema.metadata.fields)
    if (isArraySchema(schema)) return `${getSchemaSignature(schema.metadata.elements)}[]`
    return schema.metadata.dataType
}

/**
 * Gets the schema's signature as a string
 * @param schema Schema to obtain the string signature for
 * @returns Signature detailing the schema's structure
 */
export const getSchemaSignature = <T extends SchemaDefinition, B extends DefaultBehaviour>
    (schema: Schema<SchemaTarget<T>, SchemaSource<T>, B> | T): string => {
    if (!isSchema(schema)) return getTypeSchemaSignature(schema)
    return `${getTypeSchemaSignature(schema)}${schema.metadata.notNull ?
        ".NN" : schema.metadata.optional ?
            ".OPT" : ""}${schema.metadata.hasDefaultRule ? ".DEF" : ""}`
}

/**
 * Object schema representing a Typescript/Javascript object
 */
export interface ObjectS<T extends SchemaDefinition> extends ExtendedSchema<SchemaTarget<T>, SchemaSource<T>> {
    /**
     * Extended metadata containing names and schemas of object's fields
     */
    get metadata(): ObjectMetadata;
}
class ObjectSImpl<T extends SchemaDefinition>
    extends TypeSchema<SchemaTarget<T>, SchemaSource<T>>
    implements ObjectS<T> {
    private readonly _metadata;
    get metadata() { return this._metadata as ObjectMetadata; }

    constructor(definition: T) {
        super();
        this._metadata = {
            dataType: "object",
            fields: new FieldsMapFacade<T>(definition),
            notNull: false,
            optional: false
        }
    }

    protected convert = (source: SchemaSource<T>, props?: UnboxingProperties): SchemaTarget<T> => {
        const sourceConverted =
            typeof source === "string" ? JSONBig.parse(source) : source
        const convertedObject = {} as SchemaTarget<T>
        this._metadata.fields.forEach((key, schema) => {
            try {
                (convertedObject as any)[key as string] = schema.unbox(sourceConverted[key as string], props)
            } catch (e: any) {
                throw new Error(`Unboxing ${key}, value: ${sourceConverted[key as string]}: ${e.message}`);
            }
        })
        return convertedObject;
    }
}

type ObjectStore = {
    [K: string]: ObjectS<any>
}
class ObjectFactory {
    #store = {} as ObjectStore
    static #instance = new ObjectFactory()
    static get instance() { return this.#instance }
    private constructor() { }
    getOrCreateObject = <T extends SchemaDefinition>(schema: T) => {
        const signature = getSchemaSignature(schema)
        if (signature.indexOf(".DEF") > 0) return new ObjectSImpl(schema) as ObjectS<T>
        if (!this.#store[signature]) this.#store[signature] = new ObjectSImpl(schema) as ObjectS<T>
        return this.#store[signature]
    }
}
const objectFactory = ObjectFactory.instance

/**
 * Returns an object schema representing a Typescript/Javascript object with typed fields
 * @param definition Object containing fields with type definitions
 * @returns Object schema with typed fields schemas
 * @example The object schema defined like this:
 * ```ts
 * objectS({
 *      id: intS.notNull,
 *      name: stringS,
 *      valid: boolS.optional
 * })
 * ```
 * ...represents the Typescript object defined as
 * ```ts
 * {
 *      id: number,
 *      name: string | null,
 *      valid?: boolean | null
 * }
 * ```
 */
export const objectS = <T extends SchemaDefinition>(definition: T) => objectFactory.getOrCreateObject(definition)

/**
 * Object schema representing an array
 */
export interface ArrayS<S extends Schema> extends ExtendedSchema<InferTargetFromSchema<S>[], InferSourceFromSchema<S>[] | string> {
    /**
     * Extended metadata containing the information about the array elements' types
     */
    get metadata(): ArrayMetadata
}

class ArraySImpl<S extends Schema>
    extends TypeSchema<InferTargetFromSchema<S>[], InferSourceFromSchema<S>[] | string>
    implements ArrayS<S> {
    /** {@inheritdoc Schema.metadata} */
    get metadata() {
        return {
            dataType: "array",
            elements: this.elements,
            notNull: false,
            optional: false
        } as ArrayMetadata
    }
    constructor(private elements: S) {
        super();
    }
    protected convert = (source: InferSourceFromSchema<S>[] | string, props?: UnboxingProperties): InferTargetFromSchema<S>[] => {
        const sourceConverted =
            typeof source === "string" ? JSONBig.parse(source) : source;
        if (!Array.isArray(sourceConverted)) throw new JSONArrayNotFoundError();

        return sourceConverted.map((element: InferSourceFromSchema<S>, idx) => {
            try {
                return this.elements.unbox(element, props);
            } catch (e: any) {
                throw new Error(`Unboxing array element ${idx}, value: ${element}: ${e.message}`);
            }
        });
    }
}

type ArrayStore = {
    [K: string]: ArrayS<any>
}
class ArrayFactory {
    #store = {} as ArrayStore
    static #instance = new ArrayFactory()
    static get instance() { return this.#instance }
    private constructor() { }
    getOrCreateArray = <S extends Schema>(schema: S) => {
        const signature = getSchemaSignature(schema)
        if (signature.indexOf(".DEF") > 0) return new ArraySImpl(schema) as ArrayS<S>
        if (!this.#store[signature]) this.#store[signature] = new ArraySImpl(schema) as ArrayS<S>
        return this.#store[signature]
    }
}
const arrayFactory = ArrayFactory.instance


/**
 * Returns a schema object representing the array of elements of the same type
 * @param elements Schema type for each array element
 * @returns Object schema representing an array of containing type
 * @example A schema defined like this:
 * ```ts
 * arrayS(stringS.notNull)
 * ```
 * ...represents an object defined as 
 * ```ts
 * string[] | null
 * ```
 */
export const arrayS = <S extends Schema>(elements: S) => arrayFactory.getOrCreateArray(elements)

/**
 * Utility type returning an object schema even if the underlying object is `objectS(...).notNull` or `objectS(...).optional`
 */
export type ObjectOrFacadeS<T extends SchemaDefinition> =
    ObjectS<T> |
    NotNullFacade<SchemaTarget<T>, SchemaSource<T>, DefaultBehaviour, ObjectS<T>>

