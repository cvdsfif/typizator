import { IntOutOfBoundsError, InvalidBooleanError, InvalidDateError, InvalidNumberError } from "./errors";
import { Schema, createPrimitiveSchema } from "./schemas";

const integrifyString = (s: string) => s.replace(/[\.|,][0-9]*$/, "")

/**
 * Type for the bigint schema.
 */
export type BigintS = Schema<bigint, bigint | number | string>
/**
 * Primitive type schema representing a bigint
 */
export const bigintS = createPrimitiveSchema<bigint, bigint | number | string>("bigint", source =>
    typeof source === "bigint" ? source :
        typeof source === "string" ? BigInt(integrifyString(source)) :
            typeof source === "number" ? BigInt(Math.floor(source)) : BigInt(integrifyString(`${source}`))
)

/**
 * Type for the string schema.
 */
export type StringS = Schema<string, string | bigint | number>
/**
 * Primitive type schema representing a string
 */
export const stringS = createPrimitiveSchema<string, string | bigint | number>("string", source =>
    typeof source === "string" ? source : `${source}`
)

export type LiteralS<T extends keyof any> = Schema<T, T>
/**
 * Primitive type schema representing a literal type
 */
export const literalS = <T extends keyof any>(...values: T[]): LiteralS<T> =>
    createPrimitiveSchema<T, T>(`literal(${values.map(String).join("|")})`, source => {
        if (!values.includes(source)) throw new Error(`Invalid value for literal type: ${String(source)}, must be one of ${values.map(String).join("|")}`)
        return source;
    })

/**
 * Type for the int schema.
 */
export type IntS = Schema<number, bigint | number | string>
/**
 * Primitive type schema representing an integer number
 *
 * When unboxing, drops the part of the number after the decimal point.
 * If the source of unboxing cannot be converted into a number, throws an error.
 * If the converted number is out of the simple number's bounds, throw an error
 */
export const intS = createPrimitiveSchema<number, bigint | number | string>("int", source => {
    const converted = Number(source);
    if (Number.isNaN(converted)) throw new InvalidNumberError();
    const returned = Number.isInteger(converted) ? converted : Math.floor(converted);
    if (!Number.isSafeInteger(returned)) throw new IntOutOfBoundsError();
    return returned;
})

/**
 * Type for the float schema.
 */
export type FloatS = Schema<number, bigint | number | string>
/**
 * Primitive type schema representing a floating point number
 *
 * If the source of unboxing cannot be converted into a number, throws an error.
 */
export const floatS = createPrimitiveSchema<number, bigint | number | string>("float", source => {
    const converted = Number(source);
    if (Number.isNaN(converted)) throw new InvalidNumberError();
    return converted;
})

/**
 * Type for the date schema.
 */
export type DateS = Schema<Date, Date | string>
/**
 * Primitive type representing a Javascript/typescript date
 *
 * If the source is the "now" string, unboxes to the actual date/time
 */
export const dateS = createPrimitiveSchema<Date, Date | string>("date", source => {
    if (typeof source === "string") {
        const timestamp = source === "" ? Date.now() : Date.parse(source);
        if (Number.isNaN(timestamp)) throw new InvalidDateError();
        return new Date(timestamp);
    }
    return source;
})

/**
 * Type for the boolean schema.
 */
export type BoolS = Schema<boolean, boolean | string | number>
/**
 * Primitive type representing a boolean
 *
 * Source 0 or "false" is unboxed, to false, source 1 or "true" to true
 * Illegal values throw an error
 */
export const boolS = createPrimitiveSchema<boolean, boolean | string | number>("bool", source => {
    if (typeof source === "string") {
        if (source === "true" || source === "1") return true;
        if (source === "false" || source === "0") return false;
        throw new InvalidBooleanError();
    }
    if (typeof source === "number") {
        if (source === 1) return true;
        if (source === 0) return false;
        throw new InvalidBooleanError();
    }
    return source;
})
