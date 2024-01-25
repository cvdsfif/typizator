import { JSONArrayNotFoundError } from "./errors";
import { ArrayMetadata, ByDefaultFacade, ExtendedSchema, NotNullFacade, ObjectMetadata, OptionalFacade, Schema, SchemaDefinition, TypeSchema } from "./schemas";
import { InferSourceFromSchema, InferTargetFromSchema, SchemaSource, SchemaTarget } from "./type-conversions";
import JSONBig from "json-bigint";

class ObjectS<T extends SchemaDefinition> extends TypeSchema<SchemaTarget<T>, SchemaSource<T>>{
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
            (convertedObject as any)[key as string] = schema.unbox(sourceConverted[key as string]);
        }
        return convertedObject;
    }
}
export const objectS = <T extends SchemaDefinition>(definition: T) =>
    new ObjectS(definition) as ExtendedSchema<SchemaTarget<T>, SchemaSource<T>>;

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

        return sourceConverted.map((element: InferSourceFromSchema<S>) => this.elements.unbox(element));
    }
}
export const arrayS =
    <S extends TypeSchema | NotNullFacade | OptionalFacade | ByDefaultFacade>
        (elements: S) => new ArrayS<S>(elements) as ExtendedSchema<InferTargetFromSchema<S>[], InferSourceFromSchema<S>[] | string>;
