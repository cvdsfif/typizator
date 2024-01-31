import { FieldMissingError, NullNotAllowedError } from "./errors";

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

export interface Schema<Target = any, Sources = any, B extends DefaultBehaviour = DefaultBehaviour> {
    get metadata(): TypedMetadata,
    unbox: (source: AllowNull<Sources, B>) => AllowNull<Target, B>;
}
export interface ExtendedSchema<Target = any, Sources = any, B extends DefaultBehaviour = DefaultBehaviour>
    extends Schema<Target, Sources, B> {
    notNull: NotNullFacade<Target, Sources>;
    optional: OptionalFacade<Target, Sources>;
    byDefault: (
        target: Target | Error | ((s: Sources) => Target),
        condition?: (source: Sources) => boolean) =>
        ByDefaultFacade<Target, Sources, B>;
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
    notNull = new NotNullFacade<Target, Sources>(this as any);
    optional = new OptionalFacade<Target, Sources>(this as any);
    byDefault = (
        target: Target | Error | ((s: Sources) => Target),
        condition = (source => source === null) as (source: Sources) => boolean) =>
        new ByDefaultFacadeImpl(this as any, target, condition) as ByDefaultFacade<Target, Sources, B>
}

export type SchemaDefinition = {
    [K: string]: Schema
}

export class NotNullFacade<Target = any, Sources = any> implements Schema<Target, Sources, NotNull>{
    get metadata() {
        return {
            ...this.internal.metadata,
            notNull: true,
            optional: false
        }
    }

    constructor(private internal: Schema<Target, Sources>) { }
    unbox = (source: Sources): Target => {
        if (source === null) throw new NullNotAllowedError();
        return this.internal.unbox(source)!;
    }
}

export class OptionalFacade<Target = any, Sources = any> implements Schema<Target, Sources, Optional>{
    get metadata() {
        return {
            ...this.internal.metadata,
            notNull: false,
            optional: true
        }
    }
    constructor(private internal: Schema<Target, Sources>) { }
    unbox = (source: Sources | null | undefined): Target | null | undefined => {
        if (source === undefined) return undefined;
        return this.internal.unbox(source as any);
    }
}

export interface ByDefaultFacade<Target = any, Sources = any, B extends DefaultBehaviour = DefaultBehaviour> extends Schema<Target, Sources, B> {
    optional: OptionalFacade<Target, Sources>;
}
class ByDefaultFacadeImpl<Target = any, Sources = any, B extends DefaultBehaviour = DefaultBehaviour>
    implements ByDefaultFacade<Target, Sources, B>
{
    get metadata() { return this.internal.metadata; }
    private targetCheck: (s: Sources) => Target;
    constructor(
        private internal: Schema<Target, Sources, B>,
        target: Target | Error | ((s: Sources) => Target),
        private condition: (source: Sources) => boolean) {
        this.targetCheck =
            typeof target === "function" ? this.targetCheck = target as any :
                target instanceof Error ? this.targetCheck = s => { throw target } :
                    source => target
    }
    optional = new OptionalFacade<Target, Sources>(this as any);
    unbox = (source: AllowNull<Sources, B>): AllowNull<Target, B> => {
        if (this.condition(source!)) return this.targetCheck(source!) as AllowNull<Target, B>;
        return this.internal.unbox(source);
    }
}
