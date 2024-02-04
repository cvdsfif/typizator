import { JSONArrayNotFoundError } from "./errors";
import { ArrayMetadata, ByDefaultFacade, ExtendedSchema, NotNullFacade, ObjectMetadata, OptionalFacade, Schema, SchemaDefinition, TypeSchema } from "./schemas";
import { InferSourceFromSchema, InferTargetFromSchema, SchemaSource, SchemaTarget } from "./type-conversions";
import JSONBig from "json-bigint";

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
