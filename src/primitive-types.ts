import { IntOutOfBoundsError, InvalidBooleanError, InvalidDateError, InvalidNumberError } from "./errors";
import { ExtendedSchema, PrimitiveSchemaTypes, Schema, TypeSchema } from "./schemas";

const defaultMetadata = (dataType: PrimitiveSchemaTypes) => ({ dataType, notNull: false, optional: false });
class BigintS extends TypeSchema<bigint, bigint | number | string>{
    private _metadata = defaultMetadata("bigint");
    get metadata() { return this._metadata; }
    protected convert = (source: bigint | number | string): bigint => typeof source === "bigint" ? source : BigInt(source);
}
export const bigintS = new BigintS() as ExtendedSchema<bigint, bigint | number | string>;

class StringS extends TypeSchema<string, string | bigint | number>{
    private _metadata = defaultMetadata("string");
    get metadata() { return this._metadata; }
    protected convert = (source: string | bigint | number): string => typeof source === "string" ? source : `${source}`
}
export const stringS = new StringS() as ExtendedSchema<string, string | bigint | number>;

class IntS extends TypeSchema<number, bigint | number | string>{
    private _metadata = defaultMetadata("int");
    get metadata() { return this._metadata; }
    protected convert = (source: number | bigint | string): number => {
        const converted = Number(source);
        if (Number.isNaN(converted)) throw new InvalidNumberError();
        const returned = Number.isInteger(converted) ? converted : Math.round(converted);
        if (!Number.isSafeInteger(returned)) throw new IntOutOfBoundsError();
        return returned;
    }
}
export const intS = new IntS() as ExtendedSchema<number, bigint | number | string>;

class FloatS extends TypeSchema<number, bigint | number | string>{
    private _metadata = defaultMetadata("float");
    get metadata() { return this._metadata; }
    protected convert = (source: number | bigint | string): number => {
        const converted = Number(source);
        if (Number.isNaN(converted)) throw new InvalidNumberError();
        return converted;
    }
}
export const floatS = new FloatS() as ExtendedSchema<number, bigint | number | string>;

class DateS extends TypeSchema<Date, Date | string>{
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
export const dateS = new DateS() as ExtendedSchema<Date, Date | string>;

class BoolS extends TypeSchema<boolean, boolean | string | number>{
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
export const boolS = new BoolS() as ExtendedSchema<boolean, boolean | string | number>;
