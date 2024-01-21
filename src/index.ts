import JSONBig from "json-bigint";

export const NOT_IMPLEMENTED = "Not implemented";
export class NotImplementedError extends Error { constructor() { super(NOT_IMPLEMENTED); } }

export const NULL_NOT_ALLOWED = "Null not allowed";
export class NullNotAllowedError extends Error { constructor() { super(NULL_NOT_ALLOWED); } }

export const INT_OUT_OF_BOUNDS = "Integer out of bounds";
export class IntOutOfBoundsError extends Error { constructor() { super(INT_OUT_OF_BOUNDS); } }

export const INVALID_NUMBER = "Invalid number";
export class InvalidNumberError extends Error { constructor() { super(INVALID_NUMBER); } }

export const INVALID_DATE = "Invalid date";
export class InvalidDateError extends Error { constructor() { super(INVALID_DATE); } }

export const INVALID_BOOLEAN = "Invalid boolean";
export class InvalidBooleanError extends Error { constructor() { super(INVALID_BOOLEAN); } }

export const FIELD_MISSING = "Field missing";
export class FieldMissingError extends Error { constructor() { super(FIELD_MISSING); } }

export const JSON_ARRAY_NOT_FOUND = "JSON Array not found";
export class JSONArrayNotFoundError extends Error { constructor() { super(JSON_ARRAY_NOT_FOUND); } }

type DefaultBehaviour = { allowNull: boolean, optional: boolean }
interface NotNull extends DefaultBehaviour { allowNull: false }
interface Optional extends DefaultBehaviour { optional: true, allowNull: true }

type AllowNull<T, B extends DefaultBehaviour> = B extends NotNull ? T : B extends Optional ? T | null | undefined : T | null;

type SchemaTypes = "string" | "int" | "float" | "bigint" | "bool" | "date" | "object" | "array";
class SchemaMetadata {
    constructor(
        public schemaType: SchemaTypes,
        public schemaFields: UsedSchema[] = [],
        public notNull: boolean = false,
        public optional: boolean = false
    ) { }
}
type Schema<Target, Sources, B extends DefaultBehaviour> = {
    metadata: () => SchemaMetadata,
    unbox: (source: AllowNull<Sources, B>) => AllowNull<Target, B>;
}

abstract class TypeSchema<Target, Sources, B extends DefaultBehaviour = { allowNull: true, optional: false }>
    implements Schema<Target, Sources, B> {
    abstract readonly metadata: () => SchemaMetadata;
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

export const always = <Sources>(source: Sources) => true;

export class NotNullFacade<Target, Sources> implements Schema<Target, Sources, NotNull>{
    readonly metadata = () => new SchemaMetadata(this.internal.metadata().schemaType, this.internal.metadata().schemaFields, true);
    constructor(private internal: Schema<Target, Sources, any>) { }
    unbox = (source: Sources): Target => {
        if (source === null) throw new NullNotAllowedError();
        return this.internal.unbox(source)!;
    }
}

export class OptionalFacade<Target, Sources> implements Schema<Target, Sources, Optional>{
    readonly metadata = () => new SchemaMetadata(this.internal.metadata().schemaType, this.internal.metadata().schemaFields, false, true);
    constructor(private internal: Schema<Target, Sources, any>) { }
    unbox = (source: Sources | null | undefined): Target | null | undefined => {
        if (source === undefined) return undefined;
        return this.internal.unbox(source as any);
    }
}

export class ByDefaultFacade<Target, Sources, B extends DefaultBehaviour> implements Schema<Target, Sources, B>{
    readonly metadata = () => new SchemaMetadata(
        this.internal.metadata().schemaType,
        this.internal.metadata().schemaFields,
        this.internal.metadata().notNull,
        this.internal.metadata().optional
    );
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

class BigintS extends TypeSchema<bigint, bigint | number | string>{
    readonly metadata = () => new SchemaMetadata("bigint");
    protected convert = (source: bigint | number | string): bigint => BigInt(source);
}
export const bigintS = new BigintS();

class StringS extends TypeSchema<string, string | bigint | number>{
    readonly metadata = () => new SchemaMetadata("string");
    protected convert = (source: string | bigint | number): string => `${source}`
}
export const stringS = new StringS();

class IntS extends TypeSchema<number, bigint | number | string>{
    readonly metadata = () => new SchemaMetadata("int");
    protected convert = (source: number | bigint | string): number => {
        const converted = Number(source);
        if (Number.isNaN(converted)) throw new InvalidNumberError();
        const returned = Number.isInteger(converted) ? converted : Math.round(converted);
        if (!Number.isSafeInteger(returned)) throw new IntOutOfBoundsError();
        return returned;
    }
}
export const intS = new IntS();

class FloatS extends TypeSchema<number, bigint | number | string>{
    readonly metadata = () => new SchemaMetadata("float");
    protected convert = (source: number | bigint | string): number => {
        const converted = Number(source);
        if (Number.isNaN(converted)) throw new InvalidNumberError();
        return converted;
    }
}
export const floatS = new FloatS();

class DateS extends TypeSchema<Date, Date | string>{
    readonly metadata = () => new SchemaMetadata("date");
    protected convert = (source: Date | string): Date => {
        if (typeof source === "string") {
            const timestamp = source === "" ? Date.now() : Date.parse(source);
            if (Number.isNaN(timestamp)) throw new InvalidDateError();
            return new Date(timestamp);
        }
        return source;
    }
}
export const dateS = new DateS();

class BoolS extends TypeSchema<boolean, boolean | string | number>{
    readonly metadata = () => new SchemaMetadata("bool");
    protected convert = (source: boolean | string | number): boolean => {
        if (typeof source === "string") {
            if (source === "true" || source === "1") return true;
            if (source === "false" || source === "0") return false;
            throw new InvalidBooleanError();
        }
        if (typeof source === "number") {
            if (source === 1) return true;
            if (source === 0) return false;
            throw new InvalidBooleanError();
        }
        return source;
    }
}
export const boolS = new BoolS();

export type SchemaDefinition = {
    [K: string]: Schema<any, any, any>
}

export type InferSourceFromSchema<T> =
    T extends NotNullFacade<any, infer Source> ? Source :
    T extends OptionalFacade<any, infer Source> ? Source | undefined | null :
    T extends TypeSchema<any, infer Source> | ByDefaultFacade<any, infer Source, any> ? Source | null :
    never;
export type SchemaSource<T extends SchemaDefinition> =
    {
        [K in keyof T as T[K] extends OptionalFacade<any, any> ? never : K]: InferSourceFromSchema<T[K]>;
    } & {
        [K in keyof T as T[K] extends OptionalFacade<any, any> ? K : never]?: InferSourceFromSchema<T[K]>;
    } | string;
export type InferTargetFromSchema<T> =
    T extends NotNullFacade<infer Target, any> ? Target :
    T extends OptionalFacade<infer Target, any> ? Target | undefined | null :
    T extends TypeSchema<infer Target, any> | ByDefaultFacade<infer Target, any, any> ? Target | null :
    never;
export type SchemaTarget<T extends SchemaDefinition> =
    {
        [K in keyof T as T[K] extends OptionalFacade<any, any> ? never : K]: InferTargetFromSchema<T[K]>;
    } & {
        [K in keyof T as T[K] extends OptionalFacade<any, any> ? K : never]?: InferTargetFromSchema<T[K]>;
    }

type UsedSchema = {
    key: string,
    schema: Schema<any, any, any>
}
class ObjectS<T extends SchemaDefinition> extends TypeSchema<SchemaTarget<T>, SchemaSource<T>>{
    readonly metadata = () => new SchemaMetadata("object", this.usedSchemas);
    private readonly usedSchemas = new Array<UsedSchema>;

    constructor(definition: T) {
        super();
        Object.keys(definition).forEach(key => this.usedSchemas.push({ key, schema: definition[key] }));
    }
    protected convert = (source: SchemaSource<T>): SchemaTarget<T> => {
        const sourceConverted =
            typeof source === "string" ? JSONBig.parse(source) : source;
        if (sourceConverted === null) return null as any;
        const convertedObject = {} as SchemaTarget<T>;
        this.usedSchemas.forEach(item => (convertedObject as any)[item.key] = item.schema.unbox(sourceConverted[item.key]));
        return convertedObject;
    }
}
export const objectS = <T extends SchemaDefinition>(definition: T) => new ObjectS(definition);

class ArrayS<S extends TypeSchema<any, any, any> | NotNullFacade<any, any> | OptionalFacade<any, any> | ByDefaultFacade<any, any, any>>
    extends TypeSchema<InferTargetFromSchema<S>[], InferSourceFromSchema<S>[] | string>
{
    readonly metadata = () => new SchemaMetadata(
        "array",
        [{ key: "[]", schema: this.elements } as UsedSchema]
    );
    constructor(private elements: S) {
        super();
    }
    protected convert = (source: InferSourceFromSchema<S>[] | string): InferTargetFromSchema<S>[] => {
        const sourceConverted =
            typeof source === "string" ? JSONBig.parse(source) : source;
        if (sourceConverted === null) return null as any;
        if (!Array.isArray(sourceConverted)) throw new JSONArrayNotFoundError();

        return sourceConverted.map((element: InferSourceFromSchema<S>) => this.elements.unbox(element));
    }
}
export const arrayS =
    <S extends TypeSchema<any, any, any> | NotNullFacade<any, any> | OptionalFacade<any, any> | ByDefaultFacade<any, any, any>>
        (elements: S) => new ArrayS<S>(elements);
