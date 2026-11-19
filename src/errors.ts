export const NOT_IMPLEMENTED = "Not implemented";
export interface NotImplementedError extends Error { }
export const NotImplementedError: { new(): NotImplementedError; (): NotImplementedError } = createErrorConstructor(NOT_IMPLEMENTED, "NotImplementedError");

export const NULL_NOT_ALLOWED = "Null not allowed";
export interface NullNotAllowedError extends Error { }
export const NullNotAllowedError: { new(): NullNotAllowedError; (): NullNotAllowedError } = createErrorConstructor(NULL_NOT_ALLOWED, "NullNotAllowedError");

export const INT_OUT_OF_BOUNDS = "Integer out of bounds";
export interface IntOutOfBoundsError extends Error { }
export const IntOutOfBoundsError: { new(): IntOutOfBoundsError; (): IntOutOfBoundsError } = createErrorConstructor(INT_OUT_OF_BOUNDS, "IntOutOfBoundsError");

export const INVALID_NUMBER = "Invalid number";
export interface InvalidNumberError extends Error { }
export const InvalidNumberError: { new(): InvalidNumberError; (): InvalidNumberError } = createErrorConstructor(INVALID_NUMBER, "InvalidNumberError");

export const INVALID_DATE = "Invalid date";
export interface InvalidDateError extends Error { }
export const InvalidDateError: { new(): InvalidDateError; (): InvalidDateError } = createErrorConstructor(INVALID_DATE, "InvalidDateError");

export const INVALID_BOOLEAN = "Invalid boolean";
export interface InvalidBooleanError extends Error { }
export const InvalidBooleanError: { new(): InvalidBooleanError; (): InvalidBooleanError } = createErrorConstructor(INVALID_BOOLEAN, "InvalidBooleanError");

export const FIELD_MISSING = "Field missing";
export interface FieldMissingError extends Error { }
export const FieldMissingError: { new(): FieldMissingError; (): FieldMissingError } = createErrorConstructor(FIELD_MISSING, "FieldMissingError");

export const JSON_ARRAY_NOT_FOUND = "JSON Array not found";
export interface JSONArrayNotFoundError extends Error { }
export const JSONArrayNotFoundError: { new(): JSONArrayNotFoundError; (): JSONArrayNotFoundError } = createErrorConstructor(JSON_ARRAY_NOT_FOUND, "JSONArrayNotFoundError");

export const SOURCE_IS_NOT_OBJECT = "The source is not an object";
export interface SourceNotObjectError extends Error { }
export const SourceNotObjectError: { new(): SourceNotObjectError; (): SourceNotObjectError } = createErrorConstructor(SOURCE_IS_NOT_OBJECT, "SourceNotObjectError");

function createErrorConstructor(message: string, name: string): any {
    const Constructor = function (this: any) {
        if (!(this instanceof Constructor)) {
            return new (Constructor as any)();
        }
        const err = new Error(message);
        Object.setPrototypeOf(err, Constructor.prototype);
        err.name = name;
        return err;
    } as any;
    Object.defineProperty(Constructor, "name", { value: name });
    Constructor.prototype = Object.create(Error.prototype, {
        constructor: { value: Constructor, writable: true, configurable: true }
    });
    return Constructor;
}
