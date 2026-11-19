export const NOT_IMPLEMENTED = "Not implemented";

export type NotImplementedError = Error & { readonly name: "NotImplementedError" }
type ErrorConstructor<T extends Error> = { new(): T; (): T }

const createErrorConstructor = <T extends Error>(message: string, name: string): ErrorConstructor<T> => {
    const Constructor = function (this: any) {
        if (!(this instanceof Constructor)) {
            return new (Constructor as any)();
        }
        const err = new Error(message);
        Object.setPrototypeOf(err, Constructor.prototype);
        err.name = name;
        return err;
    } as any;
    Constructor.prototype = Object.create(Error.prototype, {
        constructor: { value: Constructor, writable: true, configurable: true }
    });
    return Constructor;
};

export const NotImplementedError: ErrorConstructor<NotImplementedError> = createErrorConstructor(NOT_IMPLEMENTED, "NotImplementedError");

export const NULL_NOT_ALLOWED = "Null not allowed";
export type NullNotAllowedError = Error & { readonly name: "NullNotAllowedError" }
export const NullNotAllowedError: ErrorConstructor<NullNotAllowedError> = createErrorConstructor(NULL_NOT_ALLOWED, "NullNotAllowedError");

export const INT_OUT_OF_BOUNDS = "Integer out of bounds";
export type IntOutOfBoundsError = Error & { readonly name: "IntOutOfBoundsError" }
export const IntOutOfBoundsError: ErrorConstructor<IntOutOfBoundsError> = createErrorConstructor(INT_OUT_OF_BOUNDS, "IntOutOfBoundsError");

export const INVALID_NUMBER = "Invalid number";
export type InvalidNumberError = Error & { readonly name: "InvalidNumberError" }
export const InvalidNumberError: ErrorConstructor<InvalidNumberError> = createErrorConstructor(INVALID_NUMBER, "InvalidNumberError");

export const INVALID_DATE = "Invalid date";
export type InvalidDateError = Error & { readonly name: "InvalidDateError" }
export const InvalidDateError: ErrorConstructor<InvalidDateError> = createErrorConstructor(INVALID_DATE, "InvalidDateError");

export const INVALID_BOOLEAN = "Invalid boolean";
export type InvalidBooleanError = Error & { readonly name: "InvalidBooleanError" }
export const InvalidBooleanError: ErrorConstructor<InvalidBooleanError> = createErrorConstructor(INVALID_BOOLEAN, "InvalidBooleanError");

export const FIELD_MISSING = "Field missing";
export type FieldMissingError = Error & { readonly name: "FieldMissingError" }
export const FieldMissingError: ErrorConstructor<FieldMissingError> = createErrorConstructor(FIELD_MISSING, "FieldMissingError");

export const JSON_ARRAY_NOT_FOUND = "JSON Array not found";
export type JSONArrayNotFoundError = Error & { readonly name: "JSONArrayNotFoundError" }
export const JSONArrayNotFoundError: ErrorConstructor<JSONArrayNotFoundError> = createErrorConstructor(JSON_ARRAY_NOT_FOUND, "JSONArrayNotFoundError");

export const SOURCE_IS_NOT_OBJECT = "The source is not an object";
export type SourceNotObjectError = Error & { readonly name: "SourceNotObjectError" }
export const SourceNotObjectError: ErrorConstructor<SourceNotObjectError> = createErrorConstructor(SOURCE_IS_NOT_OBJECT, "SourceNotObjectError");
