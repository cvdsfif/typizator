import {
    DateS,
    ExtractFromFacade,
    IntS,
    NotImplementedError,
    NOT_IMPLEMENTED,
    NULL_NOT_ALLOWED,
    NullNotAllowedError,
    INT_OUT_OF_BOUNDS,
    IntOutOfBoundsError,
    INVALID_NUMBER,
    InvalidNumberError,
    INVALID_DATE,
    InvalidDateError,
    INVALID_BOOLEAN,
    InvalidBooleanError,
    FIELD_MISSING,
    FieldMissingError,
    JSON_ARRAY_NOT_FOUND,
    JSONArrayNotFoundError,
    SOURCE_IS_NOT_OBJECT,
    SourceNotObjectError,
    StringS,
    TypeSchema,
    TypedMetadata,
    dateS,
    intS,
    objectS,
    stringS
} from "../src";

type Assert<T extends true> = T;

type _ExtractDateNotNull = Assert<ExtractFromFacade<typeof dateS.notNull> extends DateS ? true : false>;
type _ExtractStringOptional = Assert<ExtractFromFacade<typeof stringS.optional> extends StringS ? true : false>;
type _ExtractIntNotNull = Assert<ExtractFromFacade<typeof intS.notNull> extends IntS ? true : false>;

class CustomSchema extends TypeSchema<string, string> {
    get metadata(): TypedMetadata {
        return { dataType: "custom", notNull: false, optional: false };
    }
    protected convert = (source: string): string => source;
}

describe("v4 compatibility", () => {
    test("facades expose the v4 flags and nullable source", () => {
        expect(intS.notNull.notNullFlag).toBe(true);
        expect(stringS.optional.optionalFlag).toBe(true);
        expect(intS.notNull.nullable).toBe(intS);
        expect(objectS({ value: stringS }).notNull.nullable.metadata.dataType).toBe("object");
    });

    test("built-in schemas are TypeSchema instances while facades are not", () => {
        expect(intS).toBeInstanceOf(TypeSchema);
        expect(objectS({ value: stringS })).toBeInstanceOf(TypeSchema);
        expect(intS.notNull).not.toBeInstanceOf(TypeSchema);
        expect(stringS.optional).not.toBeInstanceOf(TypeSchema);
    });

    test("error constructors match v4 names and messages with or without new", () => {
        const cases: [any, string, string][] = [
            [NotImplementedError, NOT_IMPLEMENTED, "NotImplementedError"],
            [NullNotAllowedError, NULL_NOT_ALLOWED, "NullNotAllowedError"],
            [IntOutOfBoundsError, INT_OUT_OF_BOUNDS, "IntOutOfBoundsError"],
            [InvalidNumberError, INVALID_NUMBER, "InvalidNumberError"],
            [InvalidDateError, INVALID_DATE, "InvalidDateError"],
            [InvalidBooleanError, INVALID_BOOLEAN, "InvalidBooleanError"],
            [FieldMissingError, FIELD_MISSING, "FieldMissingError"],
            [JSONArrayNotFoundError, JSON_ARRAY_NOT_FOUND, "JSONArrayNotFoundError"],
            [SourceNotObjectError, SOURCE_IS_NOT_OBJECT, "SourceNotObjectError"]
        ];
        for (const [constructor, message, name] of cases) {
            for (const error of [new constructor(), constructor()]) {
                expect(error).toBeInstanceOf(Error);
                expect(error).toBeInstanceOf(constructor);
                expect(error.message).toBe(message);
                expect(error.name).toBe(name);
            }
        }
    });

    test("TypeSchema can be subclassed like in v4", () => {
        const schema = new CustomSchema();
        expect(schema.metadata.dataType).toBe("custom");
        expect(schema.unbox("value")).toBe("value");
        expect(schema.unbox(null)).toBeNull();
        expect(schema.notNull.unbox("value")).toBe("value");
        expect(() => schema.notNull.unbox(null as any)).toThrow(NullNotAllowedError);
        expect(schema.optional.unbox(undefined)).toBeUndefined();
        expect(schema.byDefault("fallback").unbox(null)).toBe("fallback");
    });
});
