import { bigintS, intS, objectS, stringS } from "../src/index"
import { tabularInput } from "../src/tabular-input"

describe("Testing tabular input objects", () => {
    const tabS = objectS({
        id: bigintS,
        name: stringS,
        d1: intS.optional,
        d2: stringS.optional
    })

    test("Should throw an exception if there is nothing interesting in the table", () => {
        expect(() => tabularInput(tabS,
            ``
        )).toThrow()
    })

    test("Should return empty array on header only", () => {
        expect(tabularInput(tabS,
            `name           id
             "good will"    42
             any            0`
        )).toEqual([{ name: "good will", id: 42n }, { name: "any", id: 0n }])
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
})