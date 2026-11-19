import { FieldMissingError, JSONArrayNotFoundError, NullNotAllowedError, SourceNotObjectError } from "./errors";
import { InferSourceForDictionary, InferSourceFromSchema, InferTargetForDictionary, InferTargetFromSchema, SchemaSource, SchemaTarget } from "./type-conversions";
import JSONBig from "json-bigint";

export type DefaultBehaviour = { allowNull: boolean, optional: boolean }
export type NotNull = { allowNull: false, optional: false }
export type Optional = { allowNull: true, optional: true }

export type AllowNull<T, B extends DefaultBehaviour> = B extends NotNull ? T : B extends Optional ? T | null | undefined : T | null;

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

/**
 * Metadata for the schema type
 */
export type TypedMetadata = {
    /**
     * Data type
     */
    dataType: string,
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
 * Metadata for the object schema
 */
export type ObjectMetadata = TypedMetadata & {
    dataType: "object",
    /**
     * Map of schemas for every field of the object
     */
    fields: FieldsMap
}

/**
 * Metadata for the array schema
 */
export type ArrayMetadata = TypedMetadata & {
    dataType: "array",
    /**
     * Schema for every element of the array. Only one schema because all the array elements are of the same type
     */
    elements: Schema
}

/**
 * Metadata for the dictionary schema
 */
export type DictionaryMetadata = TypedMetadata & {
    dataType: "dictionary",
    /**
     * Schema for every value of the dictionary. Only one schema because all the dictionary values are of the same type
     */
    values: Schema
}

/**
 * Metadata for the union schema
 */
export type UnionMetadata = TypedMetadata & {
    dataType: "union",
    /**
     * Schemas that form the union. The first schema that successfully unboxes the value wins.
     */
    members: Schema[]
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
    size: number,
}

const createFieldsMap = (definition: SchemaDefinition): FieldsMap => ({
    get: (fieldName: string) => definition[fieldName],
    forEach: (func: (fieldName: string, schema: Schema) => void) => {
        Object.keys(definition).forEach(key => func(key, definition[key]))
    },
    map: <T>(func: (fieldName: string, schema: Schema) => T) =>
        Object.keys(definition).map(key => func(key, definition[key])),
    filter: (func: (fieldName: string, schema: Schema) => boolean) =>
        Object.keys(definition)
            .filter(key => func(key, definition[key]))
            .map(key => ({ key, schema: definition[key] })),
    get size() { return Object.keys(definition).length }
})

export type MetadataForSchema<T> =
    T extends ObjectS<any> ? ObjectMetadata :
    T extends ArrayS<any> ? ArrayMetadata :
    T extends DictionaryS<any> ? DictionaryMetadata :
    T extends UnionS<any> ? UnionMetadata :
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
    metadata: MetadataForSchema<Original>;
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

/**
 * Facade schema enforcing the not null restriction on any underlying unboxed object
 */
export interface NotNullFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    extends Schema<Target, Sources, NotNull, Original> {
    /**
     * This flag can be used for discriminators
     */
    readonly notNullFlag: true;
    /**
     * Returns the source schema without the not null restriction, making the value nullable again.
     */
    readonly nullable: Original;
    /**
     * Extends the object schema with additional fields
     * @param definition Object containing fields with type definitions
     * @returns Extended object schema
     */
    extend: Original extends ObjectS<infer X> ? <R extends SchemaDefinition>(definition: R) => ObjectS<X & R> : never
}

/**
 * Facade schema allowing unboxed values to be undefined and making related object fields optional
 */
export interface OptionalFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    extends Schema<Target, Sources, Optional, Original> {
    /**
     * This flag can be used for discriminators
     */
    readonly optionalFlag: true;
    /**
     * Returns a not-null schema that still allows undefined values.
     */
    notNull: NotNullFacade<Target, Sources, Optional, this>;
    /**
     * Extends the object schema with additional fields
     * @param definition Object containing fields with type definitions
     * @returns Extended object schema
     */
    extend: Original extends ObjectS<infer X> ? <R extends SchemaDefinition>(definition: R) => ObjectS<X & R> : never
}

/**
 * Facade schema with a default/validation rule applied during unboxing
 */
export interface ByDefaultFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    extends Schema<Target, Sources, B, Original> {
    optional: OptionalFacade<Target, Sources, B, Original>
}

/**
 * Utility type to get the type hidden behind a .notNull or .optional facade extension
 */
export type ExtractFromFacade<T> =
    T extends NotNullFacade<any, any, any, infer S> ? S :
    T extends OptionalFacade<any, any, any, infer S> ? S :
    T

/**
 * Defines how a complex object's schema must be structured
 */
export type SchemaDefinition = {
    [K: string]: Schema
}

/**
 * Object schema representing a Typescript/Javascript object
 */
export interface ObjectS<T extends SchemaDefinition> extends ExtendedSchema<SchemaTarget<T>, SchemaSource<T>> {
    /**
     * Extended metadata containing names and schemas of object's fields
     */
    get metadata(): ObjectMetadata
    /**
     * Extends the object schema with additional fields
     * @param definition Object containing fields with type definitions
     * @returns Extended object schema
     */
    extend: <R extends SchemaDefinition>(definition: R) => ObjectS<T & R>
}

/**
 * Schema representing an array
 */
export interface ArrayS<S extends Schema> extends ExtendedSchema<InferTargetFromSchema<S>[], InferSourceFromSchema<S>[] | string> {
    /**
     * Extended metadata containing the information about the array elements' types
     */
    get metadata(): ArrayMetadata
}

type InferUnionTarget<T extends readonly Schema[]> = {
    [K in keyof T]: InferTargetFromSchema<T[K]>
}[number];
type InferUnionSource<T extends readonly Schema[]> = {
    [K in keyof T]: InferSourceFromSchema<T[K]>
}[number];

/**
 * Schema representing a union of several schemas
 */
export interface UnionS<T extends readonly Schema[]> extends ExtendedSchema<InferUnionTarget<T>, InferUnionSource<T>> {
    /**
     * Extended metadata containing the schemas forming the union
     */
    get metadata(): UnionMetadata
}

/**
 * Schema representing a string-to-object dictionary
 */
export interface DictionaryS<V extends Schema> extends ExtendedSchema<InferTargetForDictionary<V>, InferSourceForDictionary<V> | string> {
    /**
     * Extended metadata containing the information about the dictionary values' types
     */
    get metadata(): DictionaryMetadata
}

/**
 * Utility type returning an object schema even if the underlying object is `objectS(...).notNull` or `objectS(...).optional`
 */
export type ObjectOrFacadeS<T extends SchemaDefinition> =
    ObjectS<T> |
    NotNullFacade<SchemaTarget<T>, SchemaSource<T>, DefaultBehaviour, ObjectS<T>>

const isSchema = (candidate: any): candidate is Schema => candidate?.metadata?.dataType !== undefined
const isObjectSchema = (candidate: Schema): boolean => candidate.metadata.dataType === "object"
const isArraySchema = (candidate: Schema): boolean => candidate.metadata.dataType === "array"
const isDictionarySchema = (candidate: Schema): boolean => candidate.metadata.dataType === "dictionary"
const isUnionSchema = (candidate: Schema): boolean => candidate.metadata.dataType === "union"

const defaultUnbox = (source: any, props?: UnboxingProperties): any => {
    if (source === null || (props?.keepNullString !== true && source === "null")) return null;
    if (source === undefined || (props?.keepUndefinedString === false && source === "undefined")) throw new FieldMissingError();
    return source;
}

const schemaPrototype: any = {
    get notNull() { return getNotNull(this); },
    get optional() { return getOptional(this); },
    get nullable() { return getNullable(this); },
    byDefault(this: any, target: any, condition?: any) { return getByDefault(this, target, condition); },
    extend(this: any, definition: any) { return extendSchema(this, definition); }
};
const facadePrototype: any = {
    get notNull() { return getNotNull(this); },
    get optional() { return getOptional(this); },
    get nullable() { return getNullable(this); },
    byDefault(this: any, target: any, condition?: any) { return getByDefault(this, target, condition); },
    extend(this: any, definition: any) { return extendSchema(this, definition); }
};

const createSchema = <Target, Sources, M extends TypedMetadata>(
    metadata: M,
    convert: (source: Sources, props?: UnboxingProperties) => Target
): any => {
    const schema = Object.create(schemaPrototype);
    schema.metadata = metadata;
    schema.unbox = (source: AllowNull<Sources, { allowNull: true, optional: false }>, props?: UnboxingProperties): AllowNull<Target, { allowNull: true, optional: false }> => {
        const normalized = defaultUnbox(source, props);
        if (normalized === null) return null as any;
        return convert(normalized as Sources, props) as any;
    };
    return schema;
}

const notNullCache = new WeakMap<any, any>();
const nullableSourceMap = new WeakMap<any, any>();
const optionalCache = new WeakMap<any, any>();

const getNotNull = (schema: any): any => {
    let cached = notNullCache.get(schema);
    if (!cached) {
        cached = Object.create(facadePrototype);
        cached.notNullFlag = true;
        cached.metadata = { ...schema.metadata, notNull: true, optional: false };
        cached.unbox = (source: any, props?: UnboxingProperties): any => {
            if (source === null || (props?.keepNullString !== true && source === "null")) throw new NullNotAllowedError();
            return schema.unbox(source, props);
        };
        nullableSourceMap.set(cached, schema);
        notNullCache.set(schema, cached);
    }
    return cached;
};

const getNullable = (schema: any): any => nullableSourceMap.get(schema) ?? schema;

const getOptional = (schema: any): any => {
    let cached = optionalCache.get(schema);
    if (!cached) {
        cached = Object.create(facadePrototype);
        cached.optionalFlag = true;
        cached.metadata = { ...schema.metadata, notNull: false, optional: true };
        cached.unbox = (source: any, props?: UnboxingProperties): any => {
            if (
                !schema.metadata.hasDefaultRule &&
                (source === undefined || (props?.keepUndefinedString === false && source === "undefined"))
            ) {
                return undefined;
            }
            try {
                return schema.unbox(source, props);
            } catch (e) {
                if (source === undefined) return undefined;
                throw e;
            }
        };
        optionalCache.set(schema, cached);
    }
    return cached;
};

const getByDefault = (
    schema: any,
    target: any,
    condition: (source: any) => boolean = (source => source === null || source === undefined)
): any => {
    const cached = Object.create(facadePrototype);
    cached.metadata = { ...schema.metadata, hasDefaultRule: true };
    cached.unbox = (source: any, props?: UnboxingProperties): any => {
        if (condition(source)) {
            if (target instanceof Error) throw target;
            if (typeof target === "function") return target(source);
            return target;
        }
        return schema.unbox(source, props);
    };
    return cached;
};

const extendSchema = (schema: any, definition: any): any => {
    if (schema.metadata.dataType !== "object") throw new Error("Cannot extend non-object schema");
    const currentDefinition: SchemaDefinition = {};
    schema.metadata.fields.forEach((key: string, s: Schema) => {
        currentDefinition[key] = s;
    });
    return objectS({ ...currentDefinition, ...definition });
};

export const createPrimitiveSchema = <Target, Sources>(
    dataType: string,
    convert: (source: Sources, props?: UnboxingProperties) => Target
): ExtendedSchema<Target, Sources> =>
    createSchema<Target, Sources, TypedMetadata>({ dataType, notNull: false, optional: false }, convert) as ExtendedSchema<Target, Sources>;

export abstract class TypeSchema<Target = any, Sources = any, B extends DefaultBehaviour = { allowNull: true, optional: false }> implements ExtendedSchema<Target, Sources, B> {
    abstract get metadata(): TypedMetadata;
    protected abstract convert: (source: Sources, props?: UnboxingProperties) => Target;

    unbox = (source: AllowNull<Sources, B>, props?: UnboxingProperties): AllowNull<Target, B> => {
        if (source === null || (props?.keepNullString !== true && source === "null")) return null as any;
        if (source === undefined || (props?.keepUndefinedString === false && source === "undefined")) throw new FieldMissingError();
        return this.convert(source as Sources, props) as AllowNull<Target, B>;
    }

    get notNull(): NotNullFacade<Target, Sources, B, this> {
        return getNotNull(this) as NotNullFacade<Target, Sources, B, this>;
    }

    get optional(): OptionalFacade<Target, Sources, B, this> {
        return getOptional(this) as OptionalFacade<Target, Sources, B, this>;
    }

    byDefault = (
        target: Target | Error | ((s: Sources) => Target),
        condition: (source: Sources) => boolean = (source => source === null || source === undefined) as (source: Sources) => boolean
    ): ByDefaultFacade<Target, Sources, B, this> => getByDefault(this, target, condition) as ByDefaultFacade<Target, Sources, B, this>;
}
Object.setPrototypeOf(schemaPrototype, TypeSchema.prototype);

const getObjectSchemaSignature = (schema: FieldsMap): string => {
    return `{${schema.map((fieldName, schema) => `${fieldName}:${getSchemaSignature(schema)}`).join(",")}}`;
}

const getTypeSchemaSignature = (schema: Schema | SchemaDefinition): string => {
    if (!isSchema(schema)) return getObjectSchemaSignature(createFieldsMap(schema as SchemaDefinition));
    if (isObjectSchema(schema))
        return getObjectSchemaSignature((schema.metadata as ObjectMetadata).fields);
    if (isArraySchema(schema)) return `${getSchemaSignature((schema.metadata as ArrayMetadata).elements)}[]`;
    if (isDictionarySchema(schema)) return `{[string]:${getSchemaSignature((schema.metadata as DictionaryMetadata).values)}}`;
    if (isUnionSchema(schema)) return `(${(schema.metadata as UnionMetadata).members.map(getSchemaSignature).join("|")})`;
    return schema.metadata.dataType;
}

/**
 * Gets the schema's signature as a string
 * @param schema Schema to obtain the string signature for
 * @returns Signature detailing the schema's structure
 */
export const getSchemaSignature = (schema: Schema | SchemaDefinition): string => {
    if (!isSchema(schema)) return getTypeSchemaSignature(schema);
    return `${getTypeSchemaSignature(schema)}${schema.metadata.notNull ?
        ".NN" : schema.metadata.optional ?
            ".OPT" : ""}${schema.metadata.hasDefaultRule ? ".DEF" : ""}`;
}

export type RecursiveS = { isRecursive: true } & Schema
export const recursiveS = {
    isRecursive: true,
    metadata: { dataType: "recursive", notNull: false, optional: true },
    unbox: () => { throw new Error("Recursive schema cannot be unboxed directly") }
} as unknown as RecursiveS

const createObjectSchema = <T extends SchemaDefinition>(definition: T): ObjectS<T> => {
    const metadata: ObjectMetadata = {
        dataType: "object",
        fields: createFieldsMap(definition),
        notNull: false,
        optional: false
    };
    const schema: any = Object.create(schemaPrototype);
    schema.metadata = metadata;
    schema.unbox = (source: any, props?: UnboxingProperties): any => {
        const normalized = defaultUnbox(source, props);
        if (normalized === null) return null;
        const sourceConverted = typeof normalized === "string" ? JSONBig.parse(normalized) : normalized;
        const convertedObject: any = {};
        metadata.fields.forEach((key, fieldSchema) => {
            try {
                const boxedField = sourceConverted[key];
                let unboxedField: any;
                if ((fieldSchema as RecursiveS).isRecursive) {
                    if (boxedField === undefined || boxedField === null) return;
                    unboxedField = schema.unbox(boxedField, props);
                } else {
                    unboxedField = fieldSchema.unbox(boxedField, props);
                }
                if (unboxedField === undefined) return;
                convertedObject[key] = unboxedField;
            } catch (e: any) {
                const elementStringified = JSONBig.stringify(sourceConverted[key]);
                throw new Error(`Unboxing ${key}, value: ${elementStringified}: ${e.message}`);
            }
        });
        return convertedObject;
    };
    return schema;
}

const objectCache = new Map<string, WeakRef<any>>();
const cleanupObjectCache = (key: string) => objectCache.delete(key);
const objectCacheRegistry = new FinalizationRegistry<string>(cleanupObjectCache);

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
export const objectS = <T extends SchemaDefinition>(definition: T): ObjectS<T> => {
    const signature = getSchemaSignature(definition);
    if (signature.indexOf(".DEF") > 0) {
        return createObjectSchema(definition);
    }
    const existing = objectCache.get(signature);
    if (existing) {
        const cached = existing.deref();
        if (cached) return cached;
        cleanupObjectCache(signature);
    }
    const schema = createObjectSchema(definition);
    objectCache.set(signature, new WeakRef(schema));
    objectCacheRegistry.register(schema, signature);
    return schema;
}

const createArraySchema = <S extends Schema>(elements: S): ArrayS<S> => {
    const metadata: ArrayMetadata = {
        dataType: "array",
        elements,
        notNull: false,
        optional: false
    };
    return createSchema<InferTargetFromSchema<S>[], InferSourceFromSchema<S>[] | string, ArrayMetadata>(
        metadata,
        (source, props) => {
            const sourceConverted = typeof source === "string" ? JSONBig.parse(source) : source;
            if (!Array.isArray(sourceConverted)) throw new JSONArrayNotFoundError();
            return sourceConverted.map((element: any, idx) => {
                try {
                    return elements.unbox(element, props) as InferTargetFromSchema<S>;
                } catch (e: any) {
                    const elementStringified = JSONBig.stringify(element);
                    throw new Error(`Unboxing array element ${idx}, value: ${elementStringified}: ${e.message}`);
                }
            });
        }
    );
}

const arrayCache = new Map<string, WeakRef<any>>();
const cleanupArrayCache = (key: string) => arrayCache.delete(key);
const arrayCacheRegistry = new FinalizationRegistry<string>(cleanupArrayCache);

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
export const arrayS = <S extends Schema>(elements: S): ArrayS<S> => {
    const signature = getSchemaSignature(elements);
    if (signature.indexOf(".DEF") > 0) {
        return createArraySchema(elements);
    }
    const existing = arrayCache.get(signature);
    if (existing) {
        const cached = existing.deref();
        if (cached) return cached;
        cleanupArrayCache(signature);
    }
    const schema = createArraySchema(elements);
    arrayCache.set(signature, new WeakRef(schema));
    arrayCacheRegistry.register(schema, signature);
    return schema;
}

const createDictionarySchema = <V extends Schema>(values: V): DictionaryS<V> => {
    const metadata: DictionaryMetadata = {
        dataType: "dictionary",
        values,
        notNull: false,
        optional: false
    };
    return createSchema<InferTargetForDictionary<V>, InferSourceForDictionary<V> | string, DictionaryMetadata>(
        metadata,
        (source, props) => {
            const sourceConverted = typeof source === "string" ? JSONBig.parse(source) : source;
            if (typeof sourceConverted !== "object" || Array.isArray(sourceConverted)) throw new SourceNotObjectError();
            return Object.keys(sourceConverted).reduce((accumulator: any, key) => {
                try {
                    accumulator[key] = values.unbox((sourceConverted as any)[key], props);
                } catch (e: any) {
                    const elementStringified = JSONBig.stringify((sourceConverted as any)[key]);
                    throw new Error(`Unboxing dictionary element ${key}, value: ${elementStringified}: ${e.message}`);
                }
                return accumulator;
            }, {} as InferTargetForDictionary<V>);
        }
    );
}

const dictionaryCache = new Map<string, WeakRef<any>>();
const cleanupDictionaryCache = (key: string) => dictionaryCache.delete(key);
const dictionaryCacheRegistry = new FinalizationRegistry<string>(cleanupDictionaryCache);

/**
 * Returns a schema object representing the string-to-object dictionary of elements of the same type
 * @param elements Schema type for each dictionary value
 * @returns Object schema representing an dictionary of values of containing type
 * @example A schema defined like this:
 * ```ts
 * dictionaryS(intS.notNull)
 * ```
 * ...represents an object defined as
 * ```ts
 * {
 *      [K:string]: number
 * } | null
 * ```
 */
export const dictionaryS = <V extends Schema>(values: V): DictionaryS<V> => {
    const signature = getSchemaSignature(values);
    if (signature.indexOf(".DEF") > 0) {
        return createDictionarySchema(values);
    }
    const existing = dictionaryCache.get(signature);
    if (existing) {
        const cached = existing.deref();
        if (cached) return cached;
        cleanupDictionaryCache(signature);
    }
    const schema = createDictionarySchema(values);
    dictionaryCache.set(signature, new WeakRef(schema));
    dictionaryCacheRegistry.register(schema, signature);
    return schema;
}

const createUnionSchema = <T extends Schema[]>(members: T): UnionS<T> => {
    const metadata: UnionMetadata = {
        dataType: "union",
        members,
        notNull: false,
        optional: false
    };
    return createSchema<InferUnionTarget<T>, InferUnionSource<T>, UnionMetadata>(
        metadata,
        (source, props) => {
            const errors: string[] = [];
            for (const member of members) {
                try {
                    return member.unbox(source, props) as InferUnionTarget<T>;
                } catch (e: any) {
                    errors.push(e.message);
                }
            }
            throw new Error(`No matching schema for union: ${errors.join("; ")}`);
        }
    );
}

const unionCache = new Map<string, WeakRef<any>>();
const cleanupUnionCache = (key: string) => unionCache.delete(key);
const unionCacheRegistry = new FinalizationRegistry<string>(cleanupUnionCache);

/**
 * Returns a schema representing the union of several schemas. The first schema that successfully unboxes the value wins.
 * @param members Schemas that form the union
 * @returns Schema representing the union of the given schemas
 * @example A schema defined like this:
 * ```ts
 * unionS(intS.notNull, stringS.notNull)
 * ```
 * ...represents an object defined as
 * ```ts
 * number | string | null
 * ```
 */
export const unionS = <T extends Schema[]>(...members: T): UnionS<T> => {
    const signature = members.map(getSchemaSignature).join("|");
    if (signature.indexOf(".DEF") > 0) {
        return createUnionSchema(members);
    }
    const existing = unionCache.get(signature);
    if (existing) {
        const cached = existing.deref();
        if (cached) return cached;
        cleanupUnionCache(signature);
    }
    const schema = createUnionSchema(members);
    unionCache.set(signature, new WeakRef(schema));
    unionCacheRegistry.register(schema, signature);
    return schema;
}
