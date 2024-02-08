import { FieldMissingError, JSONArrayNotFoundError, NullNotAllowedError } from "./errors";
import { InferSourceFromSchema, InferTargetFromSchema, SchemaSource, SchemaTarget } from "./type-conversions";
import JSONBig from "json-bigint";

export type DefaultBehaviour = { allowNull: boolean, optional: boolean }
interface NotNull extends DefaultBehaviour { allowNull: false }
interface Optional extends DefaultBehaviour { optional: true, allowNull: true }
type AllowNull<T, B extends DefaultBehaviour> = B extends NotNull ? T : B extends Optional ? T | null | undefined : T | null;

export type PrimitiveSchemaTypes = "string" | "int" | "float" | "bigint" | "bool" | "date";
export type MetadataTypes = PrimitiveSchemaTypes | "object" | "array";
export interface TypedMetadata {
    dataType: MetadataTypes,
    notNull: boolean,
    optional: boolean
}
export interface ObjectMetadata extends TypedMetadata {
    dataType: "object",
    fields: Map<String, Schema>
}
export interface ArrayMetadata extends TypedMetadata {
    dataType: "array",
    elements: Schema
}

export type MetadataForSchema<T> =
    T extends ObjectS<any> ? ObjectMetadata :
    T extends ArrayS<any> ? ArrayMetadata :
    TypedMetadata

export interface Schema<
    Target = any,
    Sources = any,
    B extends DefaultBehaviour = DefaultBehaviour,
    Original extends Schema = any
> {
    get metadata(): MetadataForSchema<Original>,
    unbox: (source: AllowNull<Sources, B>) => AllowNull<Target, B>;
}
export interface ExtendedSchema<
    Target = any,
    Sources = any,
    B extends DefaultBehaviour = DefaultBehaviour>
    extends Schema<Target, Sources, B> {
    notNull: NotNullFacade<Target, Sources, B, this>;
    optional: OptionalFacade<Target, Sources, B, this>;
    byDefault: (
        target: Target | Error | ((s: Sources) => Target),
        condition?: (source: Sources) => boolean) =>
        ByDefaultFacade<Target, Sources, B, this>;
}

export abstract class TypeSchema<Target = any, Sources = any, B extends DefaultBehaviour = { allowNull: true, optional: false }>
    implements ExtendedSchema<Target, Sources, B> {
    abstract get metadata(): TypedMetadata;
    protected abstract convert: (source: Sources) => Target
    unbox = (source: AllowNull<Sources, B>): AllowNull<Target, B> => {
        if (source === null) return null as any;
        if (source === undefined) throw new FieldMissingError();
        return this.convert(source) as AllowNull<Target, B>;
    }
    notNull = new NotNullFacade<Target, Sources, B, this>(this);
    optional = new OptionalFacade<Target, Sources, B, this>(this);
    byDefault = (
        target: Target | Error | ((s: Sources) => Target),
        condition = (source => source === null) as (source: Sources) => boolean) =>
        new ByDefaultFacadeImpl(this as any, target, condition) as unknown as ByDefaultFacade<Target, Sources, B, this>
}

export type SchemaDefinition = {
    [K: string]: Schema
}

export class NotNullFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    implements Schema<Target, Sources, NotNull, Original>{
    get metadata() {
        return {
            ...this.internal.metadata as MetadataForSchema<Original>,
            notNull: true,
            optional: false
        }
    }

    constructor(private internal: Original) { }
    unbox = (source: Sources): Target => {
        if (source === null) throw new NullNotAllowedError();
        return this.internal.unbox(source as AllowNull<Sources, B>)!;
    }
}

export class OptionalFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    implements Schema<Target, Sources, Optional, Original>{
    get metadata() {
        return {
            ...this.internal.metadata as MetadataForSchema<Original>,
            notNull: false,
            optional: true
        }
    }
    constructor(private internal: Original) { }
    unbox = (source: Sources | null | undefined): Target | null | undefined => {
        if (source === undefined) return undefined;
        return this.internal.unbox(source as any);
    }
}

export interface ByDefaultFacade<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B>>
    extends Schema<Target, Sources, B, Original> {
    optional: OptionalFacade<Target, Sources, B, Original>;
}
class ByDefaultFacadeImpl<Target, Sources, B extends DefaultBehaviour, Original extends Schema<Target, Sources, B, Original>>
    implements ByDefaultFacade<Target, Sources, B, Original>
{
    get metadata() { return this.internal.metadata as MetadataForSchema<Original>; }
    private targetCheck: (s: Sources) => Target;
    constructor(
        private internal: Original,
        target: Target | Error | ((s: Sources) => Target),
        private condition: (source: Sources) => boolean) {
        this.targetCheck =
            typeof target === "function" ? this.targetCheck = target as any :
                target instanceof Error ? this.targetCheck = _ => { throw target } :
                    _ => target
    }
    optional = new OptionalFacade<Target, Sources, B, Original>(this as any);
    unbox = (source: AllowNull<Sources, B>): AllowNull<Target, B> => {
        if (this.condition(source!)) return this.targetCheck(source!) as AllowNull<Target, B>;
        return this.internal.unbox(source);
    }
}

export type ExtractFromFacade<T> =
    T extends NotNullFacade<any, any, any, infer S> ? S :
    T extends OptionalFacade<any, any, any, infer S> ? S :
    T;

export interface ObjectS<T extends SchemaDefinition> extends ExtendedSchema<SchemaTarget<T>, SchemaSource<T>> {
    get metadata(): ObjectMetadata;
}
class ObjectSImpl<T extends SchemaDefinition>
    extends TypeSchema<SchemaTarget<T>, SchemaSource<T>>
    implements ObjectS<T>{
    private readonly _metadata;
    get metadata() { return this._metadata as ObjectMetadata; }

    constructor(definition: T) {
        super();
        this._metadata = {
            dataType: "object",
            fields: new Map<String, Schema>(),
            notNull: false,
            optional: false
        }
        Object.keys(definition).forEach(key => this._metadata.fields.set(key, definition[key]));
    }
    protected convert = (source: SchemaSource<T>): SchemaTarget<T> => {
        const sourceConverted =
            typeof source === "string" ? JSONBig.parse(source) : source;
        if (sourceConverted === null) return null as any;
        const convertedObject = {} as SchemaTarget<T>;
        for (const [key, schema] of this._metadata.fields.entries()) {
            try {
                (convertedObject as any)[key as string] = schema.unbox(sourceConverted[key as string]);
            } catch (e: any) {
                throw new Error(`Unboxing ${key}: ${e.message}`);
            }
        }
        return convertedObject;
    }
}
export const objectS = <T extends SchemaDefinition>(definition: T) =>
    new ObjectSImpl(definition) as ObjectS<T>;

class ArrayS<S extends Schema>
    extends TypeSchema<InferTargetFromSchema<S>[], InferSourceFromSchema<S>[] | string>
{
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
    protected convert = (source: InferSourceFromSchema<S>[] | string): InferTargetFromSchema<S>[] => {
        const sourceConverted =
            typeof source === "string" ? JSONBig.parse(source) : source;
        if (sourceConverted === null) return null as any;
        if (!Array.isArray(sourceConverted)) throw new JSONArrayNotFoundError();

        return sourceConverted.map((element: InferSourceFromSchema<S>, idx) => {
            try {
                return this.elements.unbox(element);
            } catch (e: any) {
                throw new Error(`Unboxing array element ${idx}: ${e.message}`);
            }
        });
    }
}
export const arrayS =
    <S extends Schema>
        (elements: S) => new ArrayS<S>(elements) as ExtendedSchema<InferTargetFromSchema<S>[], InferSourceFromSchema<S>[] | string>;

