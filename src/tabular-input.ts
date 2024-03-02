import { ObjectOrFacadeS, SchemaDefinition } from "./schemas"
import { SchemaSource, SchemaTarget } from "./type-conversions"

const splitLine = (s: string) => s.match(/(?:[^\s"']+|['"][^'"]*["'])+/g)!

/**
 * Transforms a string to an array of objects containing a string for each column
 * @param source Source multiline string, first line is a list of field names, the following ones, list of records
 * @param defaults Default values to add to each record if there are no corresponding values in the input string
 * @returns Array of objects
 */
export const transformToArray = <T extends SchemaDefinition>
    (
        source: string,
        defaults?: Partial<SchemaTarget<T>>
    ) => {
    const lines = source.split(/[\r\n]+/)
    while (lines.length > 0 && lines[0].trim().length === 0) lines.shift()
    if (lines.length === 0) throw new Error("Table must have at least a header")
    const header = splitLine(lines[0])
    lines.shift()
    return lines
        .filter(line => line.trim() !== "")
        .map((line, lineIdx) => {
            const values = splitLine(line)
            return header.reduce((accumulator: Object, current: string, idx: number) => {
                if (!values[idx]) {
                    console.table(values)
                    throw new Error(`Table column ${idx + 1} missing in row ${lineIdx + 1}`)
                }
                (accumulator as any)[current] =
                    values[idx] === "null" ? null :
                        values[idx] === "undefined" ? undefined :
                            values[idx].replace(/(^")|("$)/g, '')
                return accumulator
            }, (structuredClone(defaults) ?? {}))
        })
}

/**
 * Transforms a multiline input string to a well-typed object
 * @param schema Schema defining the object's types
 * @param source Source string
 * @param defaults Default values to add to each record if there are no corresponding values in the input string
 * @returns Array of well-typed objects
 */
export const tabularInput =
    <T extends SchemaDefinition>
        (
            schema: ObjectOrFacadeS<T>,
            source: string,
            defaults?: Partial<SchemaTarget<T>>
        ): SchemaTarget<T>[] =>
        transformToArray(source, defaults)
            .map(line => schema.unbox(line as SchemaSource<T>, { keepNullString: true, keepUndefinedString: true }) as SchemaTarget<T>)

