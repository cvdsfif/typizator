import { ApiImplementation, ApiMetadata, ArrayMetadata, FieldMissingError, FunctionMetadata, IntOutOfBoundsError, InvalidBooleanError, InvalidDateError, InvalidNumberError, JSONArrayNotFoundError, NOT_IMPLEMENTED, NotImplementedError, NullNotAllowedError, ObjectMetadata, always, apiS, arrayS, bigintS, boolS, dateS, floatS, intS, objectS, stringS } from "../src";

describe("Testing type unboxing", () => {

    test("NotImplemented error is thrown correctly", () => {
        expect(() => { throw new NotImplementedError(); }).toThrow(NOT_IMPLEMENTED);
    });

    test("Unboxing a structured type", () => {
        const simpleRecordS = objectS({
            id: bigintS.notNull,
            name: stringS
        });
        expect(simpleRecordS.unbox({ id: "12345678901234567890", name: "Any name" }))
            .toEqual({ id: 12345678901234567890n, name: "Any name" });
        expect(simpleRecordS.unbox({ id: 1234567890, name: 42 }))
            .toEqual({ id: 1234567890n, name: "42" });
        expect(simpleRecordS.unbox({ id: 12345678901234567890n, name: 12345678901234567890n }))
            .toEqual({ id: 12345678901234567890n, name: "12345678901234567890" });
        expect(simpleRecordS.unbox({ id: 12345678901234567890n, name: null }))
            .toEqual({ id: 12345678901234567890n, name: null });
        expect(simpleRecordS.unbox(null)).toEqual(null);
    });

    test("Unboxing a structured type with an optional field", () => {
        const simpleRecordS = objectS({
            id: bigintS.notNull,
            name: stringS.optional
        });
        expect(simpleRecordS.unbox({ id: "12345678901234567890", name: "Any name" }))
            .toEqual({ id: 12345678901234567890n, name: "Any name" });
        expect(simpleRecordS.unbox({ id: 12345678901234567890n }))
            .toEqual({ id: 12345678901234567890n, name: undefined });
        expect(simpleRecordS.unbox({ id: 12345678901234567890n, name: undefined }))
            .toEqual({ id: 12345678901234567890n });
    });

    test("Unboxing a structured type from a JSON string", () => {
        const simpleRecordS = objectS({
            id: bigintS.notNull,
            name: stringS
        });
        expect(simpleRecordS.unbox(`{ "id": "12345678901234567890", "name": "Any name" }`))
            .toEqual({ id: 12345678901234567890n, name: "Any name" });
        expect(simpleRecordS.unbox(`{ "id": 12345678901234567890, "name": 12345678901234567890 }`))
            .toEqual({ id: 12345678901234567890n, name: "12345678901234567890" });
        expect(() => simpleRecordS.unbox(`{ "id": null, "name": 12345678901234567890 }`))
            .toThrow(NullNotAllowedError);
        expect(() => simpleRecordS.unbox(`{ "id": 12345678901234567890 }`))
            .toThrow(FieldMissingError);
        expect(simpleRecordS.unbox(`null`)).toBeNull();
    });

    test("Giving default values or throwing exceptions based on source data", () => {
        const validatedRecordS = objectS({
            zeroIfNull: bigintS.byDefault(0n).optional,
            stringIfNull: stringS.byDefault("def").optional,
            errorIfNull: bigintS.byDefault(Error()).optional,
            specificErrorIfNull: bigintS.byDefault(Error("NULL")).optional,
            errorIfNegative: bigintS.byDefault(Error(), source => BigInt(source) < 0).optional,
            stringWithPrefix: stringS.byDefault((source: any) => `prefix-${source}`, always).optional
        });
        expect(validatedRecordS.unbox({ zeroIfNull: null })).toEqual({ zeroIfNull: 0n });
        expect(validatedRecordS.unbox({ stringIfNull: null })).toEqual({ stringIfNull: "def" });
        expect(() => validatedRecordS.unbox({ errorIfNull: null })).toThrow(Error);
        expect(() => validatedRecordS.unbox({ specificErrorIfNull: null })).toThrow("NULL");
        expect(() => validatedRecordS.unbox({ errorIfNegative: -1 })).toThrow(Error);
        expect(validatedRecordS.unbox({ errorIfNegative: 1 })).toEqual({ errorIfNegative: 1n });
        expect(validatedRecordS.unbox({ stringWithPrefix: "str" })).toEqual({ stringWithPrefix: "prefix-str" });
    });

    test("Unboxing integers", () => {
        const primitivesRecordS = objectS({
            intFromInt: intS,
            intFromString: intS,
            intFromBigint: intS,
            intFromFloat: intS,
            intCustomRound: intS.byDefault((source: any) => Math.floor(source), always),
            intFromFloatString: intS
        });
        expect(primitivesRecordS.unbox({
            intFromInt: 1,
            intFromString: "2",
            intFromBigint: 3n,
            intFromFloat: 3.9,
            intCustomRound: 5.9,
            intFromFloatString: "6.1"
        })).toEqual({
            intFromInt: 1,
            intFromString: 2,
            intFromBigint: 3,
            intFromFloat: 4,
            intCustomRound: 5,
            intFromFloatString: 6
        });
    });

    test("Integer conversion errors", () => {
        const errorRecordS = objectS({
            hugeInt: intS.optional,
            badInt: intS.optional,
            nanAllowed: intS.byDefault(NaN, (source: any) => isNaN(Number(source))).optional
        });
        expect(() => errorRecordS.unbox({ hugeInt: 12345678901234567890n })).toThrow(IntOutOfBoundsError);
        expect(() => errorRecordS.unbox({ hugeInt: "wrong" })).toThrow(InvalidNumberError);
        expect(() => intS.unbox("wrong")).toThrow(InvalidNumberError);
        expect(errorRecordS.unbox({ nanAllowed: "too bad" })?.nanAllowed).toBeNaN();
    });

    test("Unboxing floats", () => {
        const primitivesRecordS = objectS({
            floatFromInt: floatS,
            floatFromString: floatS,
            floatFromBigint: floatS,
            floatFromFloat: floatS,
        });
        expect(primitivesRecordS.unbox({
            floatFromInt: 1,
            floatFromString: "2.1",
            floatFromBigint: 3n,
            floatFromFloat: 3.9
        })).toEqual({
            floatFromInt: 1.0,
            floatFromString: 2.1,
            floatFromBigint: 3.0,
            floatFromFloat: 3.9
        });
    });

    test("Float conversion errors", () => {
        const errorRecordS = objectS({
            badFloat: floatS
        });
        expect(() => errorRecordS.unbox({ badFloat: "wrong" })).toThrow(InvalidNumberError);
    });

    test("Unboxing dates", () => {
        const primitivesRecordS = objectS({
            dateFromString: dateS,
            dateFromDate: dateS
        });
        expect(primitivesRecordS.unbox({
            dateFromString: "2024-01-02 00:00Z",
            dateFromDate: new Date("2024-01-03 00:00Z")
        })).toEqual({
            dateFromString: new Date("2024-01-02 00:00Z"),
            dateFromDate: new Date("2024-01-03 00:00Z")
        });
        expect(dateS.unbox("")!.getTime()).toBeGreaterThan(new Date().getTime() - 10000);
    });

    test("Date conversion errors", () => {
        expect(() => dateS.unbox("wrong")).toThrow(InvalidDateError);
    });

    test("Unboxing booleans", () => {
        const primitivesRecordS = objectS({
            boolFromTrue: boolS,
            boolFromFalse: boolS,
            boolFromTrueString: boolS,
            boolFromFalseString: boolS,
            boolFromOne: boolS,
            boolFromZero: boolS,
            boolFromOneString: boolS,
            boolFromZeroString: boolS,
            boolFromNull: boolS
        });
        expect(primitivesRecordS.unbox({
            boolFromTrue: true,
            boolFromFalse: false,
            boolFromTrueString: "true",
            boolFromFalseString: "false",
            boolFromOne: 1,
            boolFromZero: 0,
            boolFromOneString: "1",
            boolFromZeroString: "0",
            boolFromNull: null
        })).toEqual({
            boolFromTrue: true,
            boolFromFalse: false,
            boolFromTrueString: true,
            boolFromFalseString: false,
            boolFromOne: true,
            boolFromZero: false,
            boolFromOneString: true,
            boolFromZeroString: false,
            boolFromNull: null
        });
    });

    test("Boolean conversion errors", () => {
        expect(() => boolS.unbox("wrong")).toThrow(InvalidBooleanError);
        expect(() => boolS.unbox(42)).toThrow(InvalidBooleanError);
    });

    test("Array of primitives unboxing", () => {
        const arrayOfStrings = arrayS(stringS).notNull;
        const unboxed = arrayOfStrings.unbox(["one", null, "fourty-two"]);
        expect(unboxed[2]).toEqual("fourty-two");
        expect(unboxed[1]).toBeNull();
    });

    test("Array of not null primitives unboxing", () => {
        const arrayOfStrings = arrayS(stringS.notNull);
        const unboxed = arrayOfStrings.unbox(["one", "two", 42]);
        expect(unboxed![2]).toEqual("42");
    });

    test("Null array unboxing", () => {
        const arrayOfStrings = arrayS(stringS.notNull);
        const unboxed = arrayOfStrings.unbox(null);
        expect(unboxed).toBeNull();
        const unboxedFromNullLiteral = arrayOfStrings.unbox("null");
        expect(unboxedFromNullLiteral).toBeNull();
    });

    test("Array unboxing from JSON", () => {
        const arrayOfStrings = arrayS(stringS.notNull);
        const unboxed = arrayOfStrings.unbox(`["one", "two", "fourty-two"]`);
        expect(unboxed![2]).toEqual("fourty-two");
    });

    test("Array unboxing error from JSON", () => {
        const arrayOfStrings = arrayS(stringS.notNull);
        expect(() => arrayOfStrings.unbox(`{"one":1, "two":2, "fourty-two":42}`)).toThrow(JSONArrayNotFoundError);
    });

    test("Extract the schema metadata", () => {
        const simpleRecordS = objectS({
            id: bigintS.notNull,
            name: stringS,
            opt: intS.optional,
            dateField: dateS.byDefault(new Date("1984-01-01")),
            boolField: boolS,
            floatField: floatS
        });
        console.log(simpleRecordS.metadata);
        expect(simpleRecordS.metadata.dataType).toEqual("object");
        const fieldsMetadata = simpleRecordS.metadata as ObjectMetadata;
        expect(fieldsMetadata.fields.size).toEqual(6);
        expect(fieldsMetadata.fields.get("id")?.metadata.dataType).toEqual("bigint");
        expect(fieldsMetadata.fields.get("id")?.metadata.notNull).toBeTruthy();
        expect(fieldsMetadata.fields.get("name")?.metadata.notNull).toBeFalsy();
        expect(fieldsMetadata.fields.get("opt")?.metadata.optional).toBeTruthy();
        expect(fieldsMetadata.fields.get("dateField")?.metadata.dataType).toEqual("date");
        expect(fieldsMetadata.fields.get("boolField")?.metadata.dataType).toEqual("bool");
        expect(fieldsMetadata.fields.get("floatField")?.metadata.dataType).toEqual("float");
        const simpleArrayS = arrayS(simpleRecordS);
        expect(simpleArrayS.metadata.dataType).toEqual("array");
        expect((simpleArrayS.metadata as ArrayMetadata).elements.metadata.dataType).toEqual("object");
    });

    test("Implement and call API", async () => {
        const cruelApi = {
            world: { args: [stringS.notNull], retVal: stringS.notNull }
        };
        const simpleApiS = apiS({
            meow: { args: [], retVal: stringS.notNull },
            noMeow: { args: [] },
            helloWorld: { args: [stringS.notNull, bigintS.notNull], retVal: stringS.notNull },
            cruel: cruelApi
        });

        let isMeow = true;
        const implementation = {
            meow: async () => Promise.resolve("Miaou!"),
            noMeow: async () => { isMeow = false; Promise.resolve(); },
            helloWorld: async (name: string, id: bigint) => Promise.resolve(`Hello ${name}, your id is ${id + 1n}`),
            cruel: {
                world: async (val: string) => Promise.resolve(`${val}, this world is cruel`)
            }
        };
        const caller: ApiImplementation<typeof simpleApiS> = implementation;

        expect(await caller.meow()).toEqual("Miaou!");
        await caller.noMeow();
        expect(isMeow).toBeFalsy();
        expect(await caller.helloWorld("test", 12345678901234567890n))
            .toEqual("Hello test, your id is 12345678901234567891");
        expect(await caller.cruel.world("Oyvey")).toEqual("Oyvey, this world is cruel");

        expect(simpleApiS.metadata.dataType).toEqual("api");
        const helloWorld = simpleApiS.metadata.members.get("helloWorld") as FunctionMetadata;
        expect(helloWorld.dataType).toEqual("function");
        expect(helloWorld.args[0].metadata.dataType).toEqual("string");
        expect(helloWorld.args[1].metadata.dataType).toEqual("bigint");
        expect(helloWorld.args[1].unbox("42")).toEqual(42n);
        expect(helloWorld.retVal.metadata.dataType).toEqual("string");
        expect(simpleApiS.metadata.members.get("cruel")?.dataType).toEqual("api");
        const subApiData = simpleApiS.metadata.members.get("cruel") as ApiMetadata<typeof cruelApi>;
        expect(subApiData.members.get("world")?.dataType).toEqual("function");
        expect((simpleApiS.metadata.members.get("noMeow") as FunctionMetadata).dataType).toEqual("function");
    });
});