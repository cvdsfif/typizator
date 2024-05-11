import { objectS, arrayS, dictionaryS } from "../src/schemas"
import { bigintS, boolS, dateS, intS, stringS } from "../src/primitive-types"
import { tabularInput } from "../src/tabular-input"

describe("Testing tabular input objects", () => {
    const tabS = objectS({
        id: bigintS,
        name: stringS,
        d1: intS.optional,
        d2: stringS.optional,
        arr: arrayS(stringS).optional
    })

    test("Should throw an exception if there is nothing interesting in the table", () => {
        expect(() => tabularInput(tabS,
            ``
        )).toThrow()
    })

    test("Should correctly return array of objects", () => {
        expect(tabularInput(tabS,
            `name           id
             "good will"    42
             any            0`
        )).toEqual([{ name: "good will", id: 42n }, { name: "any", id: 0n }])
    })

    test("Should return empty array on header only", () => {
        expect(tabularInput(tabS,
            `name           id`
        )).toEqual([])
    })

    test("Should add defaults to every row", () => {
        expect(tabularInput(tabS, `
            name           id
            "good will"    42
            any            0
            `, { d1: 1, d2: "q" }
        )).toEqual(tabularInput(tabS, `
            name           id  d1  d2
            "good will"     42  1   q
             any            0   1   q
            `
        ))
    })

    test("Should throw exception on missing columns", () => {
        expect(() => tabularInput(tabS, `
            name           id
            "good will"    
            any            0
            `, { d1: 1, d2: "q" }
        )).toThrow("Table column 2 missing in row 1")
    })

    test("Should correctly treat array fields", () => {
        expect(tabularInput(tabS, `
            name           id  arr
            "good will"    42  ["a","b"]
            any            0   ["c"]
             `
        )).toEqual([{ name: "good will", id: 42n, arr: ["a", "b"] }, { name: "any", id: 0n, arr: ["c"] }])
    })

    test("Should allow null and undefined values", () => {
        expect(tabularInput(tabS, `
            name           id  arr
            null           42  ["a","b"]
            any            0   undefined
             `
        )).toEqual([{ name: null, id: 42n, arr: ["a", "b"] }, { name: "any", id: 0n, arr: undefined }])
    })

    test("Should pass 'null' and 'undefined' as strings", () => {
        expect(tabularInput(tabS, `
            name           id  arr          d2
            "null"         42  ["a","b"]    bulbul
            any            0   []           undefined
             `
        )).toEqual([{ name: "null", id: 42n, arr: ["a", "b"], d2: "bulbul" }, { name: "any", id: 0n, arr: [] }])
    })

    test("Should set an absent field's default value if present", () => {
        // GIVEN a schema with a field having a default value
        const defS = objectS({
            normal: intS,
            preset: intS.byDefault(42).optional
        })

        // WHEN getting the tabular input for the schema
        const result = tabularInput(defS, `
            normal
            0
        `)

        // THEN the default field is filled
        expect(result).toEqual([{ normal: 0, preset: 42 }])
    })
})