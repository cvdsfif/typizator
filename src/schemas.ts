import { FieldMissingError, NullNotAllowedError } from "./errors";

type DefaultBehaviour = { allowNull: boolean, optional: boolean }
interface NotNull extends DefaultBehaviour { allowNull: false }
interface Optional extends DefaultBehaviour { optional: true, allowNull: true }
type AllowNull<T, B extends DefaultBehaviour> = B extends NotNull ? T : B extends Optional ? T | null | undefined : T | null;

export interface TypedMetadata {
    dataType: string,
    notNull: boolean,
    optional: boolean
}

export type Schema<Target, Sources, B extends DefaultBehaviour> = {
    get metadata(): TypedMetadata,
    unbox: (source: AllowNull<Sources, B>) => AllowNull<Target, B>;
}

export abstract class TypeSchema<Target, Sources, B extends DefaultBehaviour = { allowNull: true, optional: false }>
    implements Schema<Target, Sources, B> {
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
        new ByDefaultFacade(this as any, target, condition)
}

export type SchemaDefinition = {
    [K: string]: Schema<any, any, any>
}

export class NotNullFacade<Target, Sources> implements Schema<Target, Sources, NotNull>{
    get metadata() { return { dataType: this.internal.metadata.dataType, notNull: true, optional: false } };

    constructor(private internal: Schema<Target, Sources, any>) { }
    unbox = (source: Sources): Target => {
        if (source === null) throw new NullNotAllowedError();
        return this.internal.unbox(source)!;
    }
}

export class OptionalFacade<Target, Sources> implements Schema<Target, Sources, Optional>{
    get metadata() { return { dataType: this.internal.metadata.dataType, notNull: false, optional: true } }
    constructor(private internal: Schema<Target, Sources, any>) { }
    unbox = (source: Sources | null | undefined): Target | null | undefined => {
        if (source === undefined) return undefined;
        return this.internal.unbox(source as any);
    }
}

export class ByDefaultFacade<Target, Sources, B extends DefaultBehaviour> implements Schema<Target, Sources, B>{
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
