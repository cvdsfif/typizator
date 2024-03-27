import { IntOutOfBoundsError, InvalidBooleanError, InvalidDateError, InvalidNumberError } from "./errors";
import { ExtendedSchema, PrimitiveSchemaTypes, TypeSchema } from "./schemas";

const integrifyString = (s: string) => s.replace(/[\.|,][0-9]*$/, "")
const defaultMetadata = (dataType: PrimitiveSchemaTypes) => ({ dataType, notNull: false, optional: false });
/**
 * Type for the bigint schema.
 */
export type BigintS = ExtendedSchema<bigint, bigint | number | string>
class BigintSImpl extends TypeSchema<bigint, bigint | number | string>{
    private _metadata = defaultMetadata("bigint");
    get metadata() { return this._metadata; }
    protected convert = (source: bigint | number | string): bigint =>
        typeof source === "bigint" ? source :
            typeof source === "string" ? BigInt(integrifyString(source)) :
                typeof source === "number" ? BigInt(Math.floor(source)) : BigInt(integrifyString(`${source}`));
}
/**
 * Primitive type schema representing a bigint
 */
export const bigintS = new BigintSImpl() as BigintS

/**
 * Type for the string schema.
 */
export type StringS = ExtendedSchema<string, string | bigint | number>
class StringSImpl extends TypeSchema<string, string | bigint | number>{
    private _metadata = defaultMetadata("string");
    get metadata() { return this._metadata; }
    protected convert = (source: string | bigint | number): string => typeof source === "string" ? source : `${source}`
}
/**
 * Primitive type schema representing a string
 */
export const stringS = new StringSImpl() as StringS

/**
 * Type for the int schema.
 */
export type IntS = ExtendedSchema<number, bigint | number | string>
class IntSImpl extends TypeSchema<number, bigint | number | string>{
    private _metadata = defaultMetadata("int");
    get metadata() { return this._metadata; }
    protected convert = (source: number | bigint | string): number => {
        const converted = Number(source);
        if (Number.isNaN(converted)) throw new InvalidNumberError();
        const returned = Number.isInteger(converted) ? converted : Math.floor(converted);
        if (!Number.isSafeInteger(returned)) throw new IntOutOfBoundsError();
        return returned;
    }
}
/**
 * Primitive type schema representing an integer number
 * 
 * When unboxing, drops the part of the number after the decimal point.
 * If the source of unboxing cannot be converted into a number, throws an error. 
 * If the converted number is out of the simple number's bounds, throw an error
 */
export const intS = new IntSImpl() as IntS

/**
 * Type for the float schema.
 */
export type FloatS = ExtendedSchema<number, bigint | number | string>
class FloatSImpl extends TypeSchema<number, bigint | number | string>{
    private _metadata = defaultMetadata("float");
    get metadata() { return this._metadata; }
    protected convert = (source: number | bigint | string): number => {
        const converted = Number(source);
        if (Number.isNaN(converted)) throw new InvalidNumberError();
        return converted;
    }
}
/**
 * Primitive type schema representing a floating point number
 * 
 * If the source of unboxing cannot be converted into a number, throws an error. 
 */
export const floatS = new FloatSImpl() as FloatS

/**
 * Type for the date schema.
 */
export type DateS = ExtendedSchema<Date, Date | string>
class DateSImpl extends TypeSchema<Date, Date | string>{
    private _metadata = defaultMetadata("date");
    get metadata() { return this._metadata; }
    protected convert = (source: Date | string): Date => {
        if (typeof source === "string") {
            const timestamp = source === "" ? Date.now() : Date.parse(source);
            if (Number.isNaN(timestamp)) throw new InvalidDateError();
            return new Date(timestamp);
        }
        return source;
    }
}
/**
 * Primitive type representing a Javascript/typescript date
 * 
 * If the source is the "now" string, unboxes to the actual date/time
 */
export const dateS = new DateSImpl() as DateS

/**
 * Type for the boolean schema.
 */
export type BoolS = ExtendedSchema<boolean, boolean | string | number>
class BoolSImpl extends TypeSchema<boolean, boolean | string | number>{
    private _metadata = defaultMetadata("bool");
    get metadata() { return this._metadata; }
    protected convert = (source: boolean | string | number): boolean => {
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
    }
}
/**
 * Primitive type representing a boolean
 * 
 * Source 0 or "false" is unboxed, to false, source 1 or "true" to true
 * Illegal values throw an error
 */
export const boolS = new BoolSImpl() as BoolS
