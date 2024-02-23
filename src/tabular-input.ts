import { ObjectOrFacadeS, SchemaDefinition } from "./schemas"
import { SchemaSource, SchemaTarget } from "./type-conversions"

const splitLine = (s: string) => s.match(/(?:[^\s"']+|['"][^'"]*["'])+/g)!

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
                    throw new Error(`Table column ${idx + 1} missing in row ${lineIdx + 1}`);

                }
                (accumulator as any)[current] = values[idx].replace(/(^")|("$)/g, '')
                return accumulator
            }, (structuredClone(defaults) ?? {}))
        })
}

export const tabularInput =
    <T extends SchemaDefinition>
        (
            schema: ObjectOrFacadeS<T>,
            source: string,
            defaults?: Partial<SchemaTarget<T>>
        ): SchemaTarget<T>[] =>
        transformToArray(source, defaults)
            .map(line => schema.unbox(line as SchemaSource<T>) as SchemaTarget<T>)

