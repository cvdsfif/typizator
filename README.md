# Runtime types and metadata schemas for Typescript 

![Coverage](./badges/coverage.svg) [![npm version](https://badge.fury.io/js/typizator.svg)](https://badge.fury.io/js/typizator) [![Node version](https://img.shields.io/node/v/typizator.svg?style=flat)](https://nodejs.org/)

## Purpose

Typescript doesn't have runtime types, all the type information is erased at the transpile stage. And since the version 5 there is no more _Reflect_ support neither. Here is a simple schemas definition library that lets you keep types metadata at run time, infer Typescript types from those schemas and convert raw JSON/object data to predefined structured types

## Installing

```Bash
npm i typizator
```

## Documentation and tests

Nothing better than tests to show how the library works. Simply read [these tests](https://github.com/cvdsfif/typizator/blob/main/tests/index.test.ts) and you'll know how to use this.

## Some examples

Examples with few comments is still better than just code...

### Simple type conversions

Every primitive or complex schema has the `.unbox` method to transform something that can be a string or some non-exact type to the strict type defined by the schema.

Primitive types used in this library are actually:
- `intS` representing integer `number` (if the source is a floating-point type, it's rounded to an integer, if it's too big, an error is thrown)
- `bigintS` representing a `bigint`
- `floatS` representing a floating-point `number`
- `stringS` representing a `string`
- `dateS` representing a `date`
- `boolS` representing a `boolean`

By default, the type of the resulting transformation is nullable, it means that for example the type of `intS.unbox(<something>)` will be `number | null`. To make it strictly a `number` you name to mark it as `intS.notNull`.

You can combine primitive (and combined) fields to create objects' schemas using the `objectS` schema factory. Let's take tests as an example:

```ts
// We define the type schema
const simpleRecordS = objectS({
    id: bigintS.notNull,
    name: stringS
})
// In the source type the primitives can be transformed to match the types of the schema:
expect(
    simpleRecordS.unbox({
        id: "12345678901234567890", 
        name: "Any name" 
    }))
    .toEqual({ 
        id: 12345678901234567890n, 
        name: "Any name" 
    })
// Because you market the id field as .not null, the compiler will display an error if you try to make it null
// The name field is not marked, so it's perfectly fine
expect(simpleRecordS.unbox({ 
        id: 12345678901234567890n, 
        name: null 
    }))
    .toEqual({ 
        id: 12345678901234567890n, 
        name: null 
    })
// The whole simpleRecordS is not marked as .notNull neither, so it can be transformed from null too
expect(simpleRecordS.unbox(null))
    .toEqual(null)
```

Some fields can be market as `.optional`, then they are not required during the transformation and can be unboxed from `undefined`:

```ts
const simpleRecordS = objectS({
    id: bigintS.notNull,
    name: stringS.optional
})
expect(simpleRecordS.unbox({ 
    id: 12345678901234567890n 
}))
.toEqual({ 
    id: 12345678901234567890n, 
    name: undefined 
});
expect(simpleRecordS.unbox({ 
    id: 12345678901234567890n 
}))
.toEqual({ 
    id: 12345678901234567890n 
})
```

### Infer types from schemas

When you write a schema, you don't need to repeat it in the type definition, Typescript transforms it for you:

```ts
const simpleRecordS = objectS({
    id: bigintS.notNull,
    name: stringS
})
type SimpleRecord = InferTargetFromSchema<typeof simpleRecordS>
```

...then the `SimpleRecord` type becomes

```ts
{
    id: bigint,
    name: string | null
}
```

### Transforming JSON strings

You can unbox an entire object from a JSON string:

```ts
const simpleRecordS = objectS({
    id: bigintS.notNull,
    name: stringS
})
// The source loosely-typed JSON is correctly transformed to a well-typed object
expect(
    simpleRecordS.unbox(`{ "id": "12345678901234567890", "name": "Any name" }`)
)
.toEqual({ 
    id: 12345678901234567890n, 
    name: "Any name" 
})
// If you try to pass an unexpected null value, the `unbox` method throws an exception
expect(
    () => simpleRecordS.unbox(`{ "id": null, "name": 12345678901234567890 }`)
)
.toThrow("Unboxing id, value: null: Null not allowed");
// An exception is also thrown if a non-`.optional` field is missing
expect(
    () => simpleRecordS.unbox(`{ "id": 12345678901234567890 }`)
)
.toThrow("Unboxing name, value: undefined: Field missing")
// ...but nulls are perfectly accepted if the schema allows them
expect(
    simpleRecordS.unbox(`null`)
).toBeNull()
```

### Default values and validations

```ts
const validatedRecordS = objectS({
    zeroIfNull: bigintS.byDefault(0n).optional,
    errorIfNull: bigintS.byDefault(Error()).optional,
    specificErrorIfNull: bigintS.byDefault(Error("NULL")).optional,
    errorIfNegative: bigintS.byDefault(Error(), source => BigInt(source) < 0).optional,
    stringWithPrefix: stringS.byDefault((source: any) => `prefix-${source}`, always).optional
})
// Null is replaced by zero if required
expect(
    validatedRecordS.unbox({ zeroIfNull: null })
).toEqual({ 
    zeroIfNull: 0n 
})
// If needed, a null value can throw an exception on unboxing
expect(
    () => validatedRecordS.unbox({ errorIfNull: null })
).toThrow(Error)
// You can define a specific error if needed
expect(() => validatedRecordS.unbox({ 
    specificErrorIfNull: null 
})).toThrow("NULL")
// You can make more complex validity checks
expect(() => validatedRecordS.unbox({ 
    errorIfNegative: -1 
})).toThrow(Error)
// You can use defaults as value transformers
expect(validatedRecordS.unbox({ 
    stringWithPrefix: "str" 
})).toEqual({ 
    stringWithPrefix: "prefix-str" 
})
```

### Transforming arrays

You can transform arrays of values (primitives or complex) using the `arrayS` schema:

```ts
const arrayOfStrings = arrayS(stringS).notNull
const unboxed = arrayOfStrings.unbox(["one", null, "fourty-two"])
expect(unboxed[2]).toEqual("fourty-two")
expect(unboxed[1]).toBeNull()
```

...and the transformation from JSON also works:

```ts
const arrayOfStrings = arrayS(stringS.notNull)
const unboxed = arrayOfStrings.unbox(`["one", "two", "fourty-two"]`)
expect(unboxed![2]).toEqual("fourty-two")
```

### Schema metadata

If you need to know at runtime the exact type of your schema's component (for serialization for example), you can use the schema's metadata:

```ts
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
expect((simpleArrayS.metadata as ArrayMetadata).elements.metadata.dataType).toEqual("object")
```

You can also get the schema structure data as one string by calling `getSchemaSignature`. For example the following schema:

```ts
const objectToSignS = objectS({
    str: stringS.notNull,
    num: intS.optional,
    dat: dateS,
    def: bigintS.byDefault(0n),
    defOpt: stringS.byDefault("0").optional,
    arr: arrayS(boolS).notNull
})
```

will have `{str:string.NN,num:int.OPT,dat:date,def:bigint.DEF,defOpt:string.OPT.DEF,arr:bool[].NN}` as a signature

### API definition

Sometimes, you need to define a well-typed API that is usable both on the client and on the server side. Schemas and type transformations allow you to do that:

```ts
// The API can be organised in "folders" to build hierarchies
const cruelApi = {
    world: { args: [stringS.notNull], retVal: stringS.notNull }
}
// You can then add a sub-apis to your API
const simpleApiS = apiS({
    meow: { args: [], retVal: stringS.notNull },
    noMeow: { args: [] },
    helloWorld: { args: [stringS.notNull, bigintS.notNull], retVal: stringS.notNull },
    cruel: cruelApi
})

// The implementation is well-typed and doesn't let you violate your type schema
let isMeow = true;
const implementation = {
    meow: async () => Promise.resolve("Miaou!"),
    noMeow: async () => { isMeow = false; Promise.resolve(); },
    helloWorld: async (name: string, id: bigint) => Promise.resolve(`Hello ${name}, your id is ${id + 1n}`),
    cruel: {
        world: async (val: string) => Promise.resolve(`${val}, this world is cruel`)
    }
}
const caller: ApiImplementation<typeof simpleApiS> = implementation

expect(await caller.meow()).toEqual("Miaou!")
await caller.noMeow()
expect(isMeow).toBeFalsy()
expect(await caller.helloWorld("test", 12345678901234567890n))
    .toEqual("Hello test, your id is 12345678901234567891")
expect(await caller.cruel.world("Oyvey")).toEqual("Oyvey, this world is cruel")

expect(simpleApiS.metadata.dataType).toEqual("api")
expect(helloWorld.dataType).toEqual("function")
expect(helloWorld.args[0].metadata.dataType).toEqual("string")
expect(helloWorld.args[1].metadata.dataType).toEqual("bigint")
expect(helloWorld.args[1].unbox("42")).toEqual(42n)
expect(helloWorld.retVal.metadata.dataType).toEqual("string")
expect(simpleApiS.metadata.implementation.meow.retVal.metadata.dataType).toEqual("string")
```

## A little bonus: string tables as well-typed data sources

In some cases, especially when writing tests, it's prettier to represent your data as a table with fields separated by tabs or spaces.

Let's define a type schema:

```ts
const tabS = objectS({
    id: bigintS,
    name: stringS,
    d1: intS.optional,
    d2: stringS.optional,
    arr: arrayS(stringS).optional
})
```

We can then create arrays of well-typed objects from this schema as follows:

```ts
// If a string contains spaces, it has to be quoted
expect(tabularInput(tabS,`
    name           id
    "good will"    42
    any            0
`)).toEqual(
    [
        { name: "good will", id: 42n }, 
        { name: "any", id: 0n }
    ]
)
```

We often need to fill some fields with default values for each row:

```ts
expect(tabularInput(tabS, `
    name           id
    "good will"    42
    any            0
    `, { d1: 1, d2: "q" }
)).toEqual(tabularInput(tabS, `
    name           id  d1  d2
    "good will"    42  1   q
    any            0   1   q
    `
))
```

Nobody prevents us from using complex types as object fields:

```ts
expect(tabularInput(tabS, `
    name           id  arr
    "good will"    42  ["a","b"]
    any            0   ["c"]
        `
)).toEqual(
    [
        { name: "good will", id: 42n, arr: ["a", "b"] }, 
        { name: "any", id: 0n, arr: ["c"] }
    ]
)
```

`null` and `undefined` values will be transformed to corresponding types

```ts
expect(tabularInput(tabS, `
    name           id  arr
    null           42  ["a","b"]
    any            0   undefined
        `
)).toEqual(
    [
        { name: null, id: 42n, arr: ["a", "b"] }, 
        { name: "any", id: 0n, arr: undefined }
    ]
)
```

...but if they are quoted, they are interpreted as strings:

```ts
expect(tabularInput(tabS, `
    name           id  arr          d2
    "null"         42  ["a","b"]    bulbul
    any            0   []           undefined
        `
)).toEqual(
    [
        { name: "null", id: 42n, arr: ["a", "b"], d2: "bulbul" }, 
        { name: "any", id: 0n, arr: [] }
    ]
)
```

## Further reading

If you want to know how I wrote this library, refer to [this article](https://medium.com/@cvds.eu/runtime-types-serialization-and-validation-the-magic-of-typescript-type-model-869579ba1bbf).