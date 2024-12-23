import { ApiImplementation, ApiImplementationWithVisibility, ApiMetadata, InvalidBooleanError, InvalidDateError, InvalidNumberError, JSONArrayNotFoundError, NOT_IMPLEMENTED, NotImplementedError, SourceNotObjectError, always, apiS, arrayS, bigintS, boolS, dateS, dictionaryS, floatS, getSchemaSignature, intS, literalS, objectS, stringS } from "../src";
import { BigNumber } from "bignumber.js"

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
        expect(simpleRecordS.unbox({ id: 12345678901234567890n }))
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
            .toThrow("Unboxing id, value: null: Null not allowed");
        expect(() => simpleRecordS.unbox(`{ "id": 12345678901234567890 }`))
            .toThrow("Unboxing name, value: undefined: Field missing");
        expect(simpleRecordS.unbox(`null`)).toBeNull();
    });

    test("Giving default values or throwing exceptions based on source data", () => {
        const validatedRecordS = objectS({
            zeroIfNull: bigintS.byDefault(0n, v => v === null).optional,
            stringIfNull: stringS.byDefault("def", v => v === null).optional,
            errorIfNull: bigintS.byDefault(Error()).optional,
            specificErrorIfNull: bigintS.byDefault(Error("NULL")).optional,
            errorIfNegative: bigintS.byDefault(Error(), source => BigInt(source) < 0).optional,
            stringWithPrefix: stringS.byDefault((source: any) => `prefix-${source}`, always).optional
        })
        expect(validatedRecordS.unbox({ zeroIfNull: null })).toEqual({ zeroIfNull: 0n, stringWithPrefix: "prefix-undefined" })
        expect(validatedRecordS.unbox({ stringIfNull: null })).toEqual({ stringIfNull: "def", stringWithPrefix: "prefix-undefined" })
        expect(() => validatedRecordS.unbox({ errorIfNull: null })).toThrow(Error)
        expect(() => validatedRecordS.unbox({ specificErrorIfNull: null })).toThrow("NULL")
        expect(() => validatedRecordS.unbox({ errorIfNegative: -1 })).toThrow(Error)
        expect(validatedRecordS.unbox({ errorIfNegative: 1 })).toEqual({ errorIfNegative: 1n, stringWithPrefix: "prefix-undefined" })
        expect(validatedRecordS.unbox({ stringWithPrefix: "str" })).toEqual({ stringWithPrefix: "prefix-str" })
    })

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
            intFromFloat: 3,
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
        expect(() => errorRecordS.unbox({ hugeInt: 12345678901234567890n }))
            .toThrow(expect.objectContaining({ message: expect.stringContaining("Integer out of bounds") }))
        expect(() => errorRecordS.unbox({ hugeInt: "wrong" })).toThrow("Unboxing hugeInt, value: \"wrong\": Invalid number")
        expect(() => intS.unbox("wrong")).toThrow(InvalidNumberError)
        expect(errorRecordS.unbox({ nanAllowed: "too bad" })?.nanAllowed).toBeNaN()
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
    })

    test("Float conversion errors", () => {
        const errorRecordS = objectS({
            badFloat: floatS
        });
        expect(() => errorRecordS.unbox({ badFloat: "wrong" }))
            .toThrow(expect.objectContaining({ message: expect.stringContaining("Invalid number") }))
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
        const arrayOfStrings = arrayS(stringS).notNull
        const unboxed = arrayOfStrings.unbox(["one", null, "fourty-two"])
        expect(unboxed[2]).toEqual("fourty-two")
        expect(unboxed[1]).toBeNull()
    })

    test("Dictionary of primitives unboxing", () => {
        const dictionaryOfStrings = dictionaryS(stringS).notNull
        const unboxed = dictionaryOfStrings.unbox({ "un": "one", "deux": null, trois: "fourty-two" })
        expect(unboxed["trois"]).toEqual("fourty-two")
        expect(unboxed.deux).toBeNull()
        expect(unboxed.un).toEqual("one")
    })

    test("Array of not null primitives unboxing", () => {
        const arrayOfStrings = arrayS(stringS.notNull)
        const unboxed = arrayOfStrings.unbox(["one", "two", 42])
        expect(unboxed![2]).toEqual("42")
    })

    test("Dictionary of not null primitives unboxing", () => {
        const dictionaryOfStrings = dictionaryS(stringS.notNull)
        const unboxed = dictionaryOfStrings.unbox({ un: "one", deux: "two", trois: 42 })
        expect(unboxed!.trois).toEqual("42")
    })

    test("Null array unboxing", () => {
        const arrayOfStrings = arrayS(stringS.notNull)
        const unboxed = arrayOfStrings.unbox(null)
        expect(unboxed).toBeNull()
        const unboxedFromNullLiteral = arrayOfStrings.unbox("null")
        expect(unboxedFromNullLiteral).toBeNull()
    })

    test("Null dictionary unboxing", () => {
        const dictionaryOfStrings = dictionaryS(stringS.notNull)
        const unboxed = dictionaryOfStrings.unbox(null)
        expect(unboxed).toBeNull()
        const unboxedFromNullLiteral = dictionaryOfStrings.unbox("null")
        expect(unboxedFromNullLiteral).toBeNull()
    })

    test("Array unboxing from JSON", () => {
        const arrayOfStrings = arrayS(stringS.notNull)
        const unboxed = arrayOfStrings.unbox(`["one", "two", "fourty-two"]`)
        expect(unboxed![2]).toEqual("fourty-two")
    })

    test("Dictionary unboxing from JSON", () => {
        const dictionaryOfStrings = dictionaryS(stringS.notNull)
        const unboxed = dictionaryOfStrings.unbox(`{"un":"one", "deux":"two", "trois":"fourty-two"}`)
        expect(unboxed!.trois).toEqual("fourty-two")
    })

    test("Array unboxing error from JSON", () => {
        const arrayOfStrings = arrayS(stringS.notNull)
        expect(() => arrayOfStrings.unbox(`{"one":1, "two":2, "fourty-two":42}`)).toThrow(JSONArrayNotFoundError)
    })

    test("Dictionary unboxing error from JSON", () => {
        const dictionaryOfStrings = dictionaryS(stringS.notNull)
        expect(() => dictionaryOfStrings.unbox(`[1, 2, 42]`)).toThrow(SourceNotObjectError)
    })

    test("Extract the schema metadata", () => {
        const simpleRecordS = objectS({
            id: bigintS.notNull,
            name: stringS,
            opt: intS.optional,
            dateField: dateS.byDefault(new Date("1984-01-01")),
            boolField: boolS,
            floatField: floatS
        })
        expect(simpleRecordS.metadata.dataType).toEqual("object")
        const fieldsMetadata = simpleRecordS.metadata
        expect(fieldsMetadata.fields.size).toEqual(6)
        expect(fieldsMetadata.fields.get("id")?.metadata.dataType).toEqual("bigint")
        expect(fieldsMetadata.fields.get("id")?.metadata.notNull).toBeTruthy()
        expect(fieldsMetadata.fields.get("name")?.metadata.notNull).toBeFalsy()
        expect(fieldsMetadata.fields.get("opt")?.metadata.optional).toBeTruthy()
        expect(fieldsMetadata.fields.get("dateField")?.metadata.dataType).toEqual("date")
        expect(fieldsMetadata.fields.get("boolField")?.metadata.dataType).toEqual("bool")
        expect(fieldsMetadata.fields.get("floatField")?.metadata.dataType).toEqual("float")

        const simpleArrayS = arrayS(simpleRecordS)
        expect(simpleArrayS.metadata.dataType).toEqual("array")
        expect(simpleArrayS.metadata.elements.metadata.dataType).toEqual("object")

        const simpleDictionaryS = dictionaryS(simpleRecordS)
        expect(simpleDictionaryS.metadata.dataType).toEqual("dictionary")
        expect(simpleDictionaryS.metadata.values.metadata.dataType).toEqual("object")
    })

    test("Correctly map the schema metadata", () => {
        const simpleRecordS = objectS({
            id: bigintS.notNull,
            name: stringS,
            opt: intS.optional,
            dateField: dateS.byDefault(new Date("1984-01-01")),
            boolField: boolS,
            floatField: floatS
        });
        expect(simpleRecordS.metadata.dataType).toEqual("object");
        const fieldsMetadata = simpleRecordS.metadata;
        const names = fieldsMetadata.fields.map((fieldName, _) => fieldName)
        expect(names).toEqual(["id", "name", "opt", "dateField", "boolField", "floatField"])
    })

    test("Correctly filter the schema metadata", () => {
        const simpleRecordS = objectS({
            id: bigintS.notNull,
            name: stringS,
            opt: intS.optional,
            dateField: dateS.byDefault(new Date("1984-01-01")),
            boolField: boolS,
            floatField: floatS
        });
        expect(simpleRecordS.metadata.dataType).toEqual("object");
        const fieldsMetadata = simpleRecordS.metadata;
        const names = fieldsMetadata.fields
            .filter((fieldName, _) => fieldName === "id")
            .map(({ key, schema }) => `${key}:${schema.metadata.dataType}`)
        expect(names).toEqual(["id:bigint"])
    })

    test("Should throw informative error if there is an exception unboxing an object field", () => {
        const errObjS = objectS({
            notNullableField: intS.notNull
        });
        expect(() => errObjS.unbox(`{ "notNullableField": null }`)).toThrow("Unboxing notNullableField, value: null: Null not allowed");
    });

    test("Should throw informative error if there is an exception unboxing an array field", () => {
        const errObjS = arrayS(intS.notNull)
        expect(() => errObjS.unbox(`[1,null]`)).toThrow("Unboxing array element 1, value: null: Null not allowed")
    })

    test("Should throw informative error if there is an exception unboxing a dictionary field", () => {
        const errObjS = dictionaryS(intS.notNull)
        expect(() => errObjS.unbox(`{"un":1,"deux":null}`)).toThrow("Unboxing dictionary element deux, value: null: Null not allowed")
    })

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

        let isMeow = true
        const implementation = {
            meow: async () => Promise.resolve("Miaou!"),
            noMeow: async () => { isMeow = false; Promise.resolve(); },
            helloWorld: async (name: string, id: bigint) => Promise.resolve(`Hello ${name}, your id is ${id + 1n}`),
            cruel: {
                world: async (val: string) => Promise.resolve(`${val}, this world is cruel`)
            }
        }
        const caller: ApiImplementation<typeof simpleApiS> = implementation;

        expect(await caller.meow()).toEqual("Miaou!");
        await caller.noMeow();
        expect(isMeow).toBeFalsy();
        expect(await caller.helloWorld("test", 12345678901234567890n))
            .toEqual("Hello test, your id is 12345678901234567891");
        expect(await caller.cruel.world("Oyvey")).toEqual("Oyvey, this world is cruel");

        expect(simpleApiS.metadata.dataType).toEqual("api");
        const helloWorld = simpleApiS.metadata.implementation.helloWorld;
        expect(helloWorld.metadata.dataType).toEqual("function");
        expect(helloWorld.args[0].metadata.dataType).toEqual("string");
        expect(helloWorld.args[1].metadata.dataType).toEqual("bigint");
        expect(helloWorld.args[1].unbox("42")).toEqual(42n);
        expect(helloWorld.retVal.metadata.dataType).toEqual("string");
        expect(simpleApiS.metadata.implementation.cruel.metadata.dataType).toEqual("api");
        const subApiData = simpleApiS.metadata.implementation.cruel;
        expect(subApiData.world.metadata.dataType).toEqual("function");
        expect(simpleApiS.metadata.implementation.noMeow.metadata.dataType).toEqual("function");
        expect(simpleApiS.metadata.implementation.meow.retVal.metadata.dataType).toEqual("string");
    })

    test("Implement and call API: using implementation instead of deprecated members", async () => {
        const cruelApi = {
            world: { args: [stringS.notNull], retVal: stringS.notNull }
        }
        const simpleApiS = apiS({
            meow: { args: [], retVal: stringS.notNull },
            noMeow: { args: [] },
            helloWorld: { args: [stringS.notNull, bigintS.notNull], retVal: stringS.notNull },
            cruel: cruelApi
        })

        let isMeow = true;
        const implementation = {
            meow: async () => Promise.resolve("Miaou!"),
            noMeow: async () => { isMeow = false; Promise.resolve(); },
            helloWorld: async (name: string, id: bigint) => Promise.resolve(`Hello ${name}, your id is ${id + 1n}`),
            cruel: {
                world: async (val: string) => Promise.resolve(`${val}, this world is cruel`)
            }
        }
        const caller: ApiImplementation<typeof simpleApiS> = implementation;

        expect(await caller.meow()).toEqual("Miaou!");
        await caller.noMeow();
        expect(isMeow).toBeFalsy();
        expect(await caller.helloWorld("test", 12345678901234567890n))
            .toEqual("Hello test, your id is 12345678901234567891");
        expect(await caller.cruel.world("Oyvey")).toEqual("Oyvey, this world is cruel");

        expect(simpleApiS.metadata.dataType).toEqual("api");
        const helloWorld = simpleApiS.metadata.implementation.helloWorld.metadata
        expect(helloWorld.dataType).toEqual("function");
        expect(helloWorld.args[0].metadata.dataType).toEqual("string");
        expect(helloWorld.args[1].metadata.dataType).toEqual("bigint");
        expect(helloWorld.args[1].unbox("42")).toEqual(42n);
        expect(helloWorld.retVal.metadata.dataType).toEqual("string");
        expect(simpleApiS.metadata.implementation.cruel.metadata.dataType).toEqual("api")
        const subApiData = simpleApiS.metadata.implementation.cruel.metadata
        expect(subApiData.implementation.world.metadata.dataType).toEqual("function");
        expect(simpleApiS.metadata.implementation.noMeow.metadata.dataType).toEqual("function");
        expect(simpleApiS.metadata.implementation.meow.retVal.metadata.dataType).toEqual("string");
    })

    test("API metadata should contain names and path information", () => {
        const cruelApi = {
            world: { args: [stringS.notNull], retVal: stringS.notNull }
        }
        const simpleApiS = apiS({
            meow: { args: [], retVal: stringS.notNull },
            noMeow: { args: [] },
            helloWorld: { args: [stringS.notNull, bigintS.notNull], retVal: stringS.notNull },
            cruel: cruelApi
        })
        expect(simpleApiS.metadata.name).toEqual("")
        expect(simpleApiS.metadata.implementation.cruel.metadata.name).toEqual("cruel")
        expect(simpleApiS.metadata.implementation.cruel.metadata.path).toEqual("/cruel")
        expect(simpleApiS.metadata.implementation.cruel.world.metadata.path).toEqual("/cruel/world")
        expect(simpleApiS.metadata.implementation.cruel.world.metadata.name).toEqual("world")
    })


    test("Bigint should correctly unbox float number strings and numbers", () => {
        expect(bigintS.unbox("42.00000")).toEqual(42n)
        expect(bigintS.unbox("42.")).toEqual(42n)
        expect(bigintS.unbox("42,00000")).toEqual(42n)
        expect(bigintS.unbox("42,")).toEqual(42n)
        expect(bigintS.unbox("0x42")).toEqual(66n)
        expect(bigintS.unbox(42.5)).toEqual(42n)
        expect(bigintS.unbox("42.5")).toEqual(42n)
        expect(bigintS.unbox("35603590.4756")).toEqual(35603590n)
        expect(bigintS.unbox(35603590.4756)).toEqual(35603590n)
        expect(objectS({ runningBalance: bigintS }).unbox({ runningBalance: 35603590.4756 })).toEqual({ runningBalance: 35603590n })
        expect(
            objectS({ runningBalance: bigintS, str: stringS })
                .unbox(`{ "runningBalance":35603590.4756,"str":"str" }`))
            .toEqual({ runningBalance: 35603590n, str: "str" })
        expect(
            objectS({ runningBalance: bigintS, str: stringS })
                .unbox(JSON.parse(`{ "runningBalance":35603590.4756,"str":"str" }`)))
            .toEqual({ runningBalance: 35603590n, str: "str" })
        expect(bigintS.unbox(new BigNumber("35603590.4756") as any)).toEqual(35603590n)
    })

    test("Should unbox null strings as nulls for non-string types", () => {
        expect(intS.unbox("null")).toBeNull()
        expect(bigintS.unbox("null")).toBeNull()
        expect(dateS.unbox("null")).toBeNull()
        expect(boolS.unbox("null")).toBeNull()
        expect(floatS.unbox("null")).toBeNull()
        expect(objectS({ a: stringS }).unbox("null")).toBeNull()
        expect(objectS({ a: stringS }).unbox(null)).toBeNull()
        expect(() => intS.notNull.unbox("null")).toThrow()
    })

    test("Undefined string should be unboxed as string by default and as undefined value if indicated", () => {
        expect(stringS.unbox("undefined")).toEqual("undefined")
        expect(stringS.optional.unbox("undefined", { keepUndefinedString: false })).toBeUndefined()
        expect(stringS.optional.unbox(undefined)).toBeUndefined()
        expect(() => stringS.unbox(undefined as any)).toThrow("Field missing")
        expect(() => stringS.unbox("undefined", { keepUndefinedString: false })).toThrow("Field missing")
    })

    test("Null string should be unboxed as string if indicated and as null by default", () => {
        expect(stringS.unbox("null", { keepNullString: true })).toEqual("null")
        expect(stringS.unbox("null")).toBeNull()
    })

    test("Should correctly unbox types with subtypes", () => {
        const innerTypeS = objectS({
            id: intS,
            name: stringS
        }).notNull
        const complexType = objectS({
            id: bigintS,
            child: arrayS(innerTypeS).notNull
        })

        expect(complexType.unbox({ id: 1, child: [{ id: 1, name: "a" }, { id: 2, name: "b" }] }))
            .toEqual({ id: 1n, child: [{ id: 1, name: "a" }, { id: 2, name: "b" }] })
    })

    test("Should return the schema's signature", () => {
        // GIVEN an object
        const objectToSignS = objectS({
            str: stringS.notNull,
            num: intS.optional,
            dat: dateS,
            def: bigintS.byDefault(0n),
            defOpt: stringS.byDefault("0").optional,
            arr: arrayS(boolS).notNull,
            dict: dictionaryS(intS).notNull
        })

        // WHEN asking for the signature
        const signature = getSchemaSignature(objectToSignS)

        // THEN a correct signature is returnes
        expect(signature).toEqual("{str:string.NN,num:int.OPT,dat:date,def:bigint.DEF,defOpt:string.OPT.DEF,arr:bool[].NN,dict:{[string]:int}.NN}")
    })

    test("Should not recreate identical objects", () => {
        // GIVEN the source schema
        const sourceSchema = {
            str: stringS.notNull,
            num: intS.optional,
            dat: dateS,
            arr: arrayS(boolS).notNull
        }

        // WHEN creating two objects schema from the same source
        const s1 = objectS(sourceSchema)
        const s2 = objectS(sourceSchema)

        // THEN the two schemas are effectively the same object
        expect(Object.is(s1, s2)).toBeTruthy()
    })

    test("Should recreate identical objects if there are default rules inside", () => {
        // GIVEN the source schema
        const sourceSchema = {
            str: stringS.notNull,
            num: intS.optional,
            dat: dateS,
            def: bigintS.byDefault(0n),
            arr: arrayS(boolS).notNull
        }

        // WHEN creating two objects schema from the same source
        const s1 = objectS(sourceSchema)
        const s2 = objectS(sourceSchema)

        // THEN the two schemas are not the same object
        expect(Object.is(s1, s2)).toBeFalsy()
    })

    test("Should not recreate identical arrays", () => {
        // GIVEN the source schema
        const sourceSchema = {
            str: stringS.notNull,
            num: intS.optional,
            dat: dateS,
            arr: arrayS(boolS).notNull
        }

        // WHEN creating two objects schema from the same source
        const s1 = arrayS(objectS(sourceSchema)).notNull
        const s2 = arrayS(objectS(sourceSchema)).notNull

        // THEN the two schemas are effectively the same object
        expect(Object.is(s1, s2)).toBeTruthy()
    })

    test("Should recreate identical arrays if there are default rules inside", () => {
        // GIVEN the source schema
        const sourceSchema = {
            str: stringS.notNull,
            num: intS.optional,
            dat: dateS,
            def: bigintS.byDefault(0n),
            arr: arrayS(boolS).notNull
        }

        // WHEN creating two objects schema from the same source
        const s1 = arrayS(objectS(sourceSchema)).notNull
        const s2 = arrayS(objectS(sourceSchema)).notNull

        // THEN the two schemas are not the same object
        expect(Object.is(s1, s2)).toBeFalsy()
    })

    test("Should not recreate identical dictionarys", () => {
        // GIVEN the source schema
        const sourceSchema = {
            str: stringS.notNull,
            num: intS.optional,
            dat: dateS,
            arr: arrayS(boolS).notNull
        }

        // WHEN creating two objects schema from the same source
        const s1 = dictionaryS(objectS(sourceSchema)).notNull
        const s2 = dictionaryS(objectS(sourceSchema)).notNull

        // THEN the two schemas are effectively the same object
        expect(Object.is(s1, s2)).toBeTruthy()
    })

    test("Should recreate identical dictionaries if there are default rules inside", () => {
        // GIVEN the source schema
        const sourceSchema = {
            str: stringS.notNull,
            num: intS.optional,
            dat: dateS,
            def: bigintS.byDefault(0n),
            arr: arrayS(boolS).notNull
        }

        // WHEN creating two objects schema from the same source
        const s1 = dictionaryS(objectS(sourceSchema)).notNull
        const s2 = dictionaryS(objectS(sourceSchema)).notNull

        // THEN the two schemas are not the same object
        expect(Object.is(s1, s2)).toBeFalsy()
    })

    test("Should correctly treat exceptions on complex objects", () => {
        // GIVEN an array with non nullable fields
        const arrayWithNonNullableFields = arrayS(objectS({
            name: stringS.notNull
        })).notNull

        // WHEN unboxing array from JSON with non null rule not respected
        expect(() => arrayWithNonNullableFields.unbox(`[{ "name": null }]`))

            // THEN an informative error is thrown
            .toThrow("Unboxing array element 0, value: {\"name\":null}: Unboxing name, value: null: Null not allowed")
    })

    test("Should correctly unbox extended objects", () => {
        // GIVEN an extended object
        const extendedObject = objectS({
            name: stringS.notNull,
            age: intS.notNull
        }).extend({
            dob: dateS.notNull
        })

        // WHEN unboxing the extended object
        const unboxed = extendedObject.unbox({ name: "John Doe", age: 30, dob: "1990-01-01" })

        // THEN the unboxed object is correct
        expect(unboxed).toEqual({ name: "John Doe", age: 30, dob: new Date("1990-01-01") })
    })

    test("Should correctly unbox objects extended from notNull", () => {
        // GIVEN an extended object
        const extendedObject = objectS({
            name: stringS.notNull,
            age: intS.notNull
        }).notNull.extend({
            dob: dateS.notNull
        })

        // WHEN unboxing the extended object
        const unboxed = extendedObject.unbox({ name: "John Doe", age: 30, dob: "1990-01-01" })

        // THEN the unboxed object is correct
        expect(unboxed).toEqual({ name: "John Doe", age: 30, dob: new Date("1990-01-01") })
    })

    test("Should correctly unbox objects extended from optional", () => {
        // GIVEN an extended object
        const extendedObject = objectS({
            name: stringS.notNull,
            age: intS.notNull
        }).optional.extend({
            dob: dateS.notNull
        })

        // WHEN unboxing the extended object
        const unboxed = extendedObject.unbox({ name: "John Doe", age: 30, dob: "1990-01-01" })

        // THEN the unboxed object is correct
        expect(unboxed).toEqual({ name: "John Doe", age: 30, dob: new Date("1990-01-01") })
    })

    test("Should raise an exception if extending a non-object schema", () => {
        // GIVEN the normally configured environment
        // WHEN forcing to extend a non-object schema
        // THEN an error is thrown
        expect(() => (arrayS(objectS({
            name: stringS.notNull,
            age: intS.notNull
        })).notNull as any).extend({
            dob: dateS.notNull
        })).toThrow("Cannot extend non-object schema")
    })

    test("Should raise an exception if extending a non-object schema (optional case)", () => {
        // GIVEN the normally configured environment
        // WHEN forcing to extend a non-object schema
        // THEN an error is thrown
        expect(() => (arrayS(objectS({
            name: stringS.notNull,
            age: intS.notNull
        })).optional as any).extend({
            dob: dateS.notNull
        })).toThrow("Cannot extend non-object schema")
    })

    test("Should correctly unbox literal types", () => {
        // GIVEN a literal type
        const literalType = literalS<"test" | "test2">("test", "test2")

        // WHEN unboxing the literal type
        const unboxed = literalType.unbox("test")

        // THEN the unboxed value is correct
        expect(unboxed).toEqual("test")
    })

    test("Should fail on unboxing invalid values", () => {
        // GIVEN a literal type
        const literalType = literalS<"test" | "test2">("test", "test2")

        // WHEN unboxing the literal type from an invalid value
        // THEN an error is thrown
        expect(() => literalType.unbox("test3" as any)).toThrow("Invalid value for literal type: test3, must be one of test|test2")
    })

    test("Should show correct metadata for literal types", () => {
        // GIVEN a literal type
        const literalType = literalS<"test" | "test2">("test", "test2")

        // WHEN asking for the metadata
        const metadata = literalType.metadata

        // THEN the metadata is correct
        expect(metadata.dataType).toEqual("literal(test|test2)")
    })

    test("Should correctly take into account 'hidden' property", () => {
        // GIVEN a hidden API
        // WHEN creating the API
        const api = apiS({
            meow: { args: [], retVal: stringS.notNull },
            child: {
                guau: { args: [], retVal: stringS.notNull, hidden: false }
            }
        }, { hidden: true })

        // THEN the API is hidden
        expect(api.metadata.hidden).toBeTruthy()

        // AND the API function is hidden as well
        expect(api.metadata.implementation.meow.metadata.hidden).toBeTruthy()

        // AND the child API is hidden as well
        expect(api.metadata.implementation.child.metadata.hidden).toBeTruthy()

        // AND the child API function is hidden
        expect(api.metadata.implementation.child.metadata.implementation.guau.metadata.hidden).toBeFalsy()
    })

    test("Should take into account 'hidden' property at function level", () => {
        // GIVEN a hidden API
        // WHEN creating the API
        const api = apiS({
            meow: { args: [], retVal: stringS.notNull, hidden: true },
            child: {
                guau: { args: [], retVal: stringS.notNull }
            }
        })
        type impl = ApiImplementationWithVisibility<typeof api>

        // THEN the API is hidden
        expect(api.metadata.hidden).toBeFalsy()

        // AND the API function is hidden as well
        expect(api.metadata.implementation.meow.metadata.hidden).toBeTruthy()

        // AND the child API is hidden as well
        expect(api.metadata.implementation.child.metadata.hidden).toBeFalsy()

        // AND the child API function is hidden
        expect(api.metadata.implementation.child.metadata.implementation.guau.metadata.hidden).toBeFalsy()
    })

    test("Should fail on invalid fields in function definition", () => {
        // GIVEN an API with an invalid field
        // WHEN creating the API
        // THEN an error is thrown
        expect(() => apiS({
            meow: { args: [], retVal: stringS.notNull, hidden: true },
            child: {
                guau: { args: [], retval: stringS.notNull }
            }
        })).toThrow("Invalid field retval in child/guau")

    })
})
