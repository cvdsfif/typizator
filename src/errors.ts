export const NOT_IMPLEMENTED = "Not implemented";

const createErrorConstructor = (message: string): { new(): Error; (): Error } => {
    const Constructor = function (this: any) {
        if (!(this instanceof Constructor)) {
            return new (Constructor as any)();
        }
        const err = new Error(message);
        Object.setPrototypeOf(err, Constructor.prototype);
        return err;
    } as any;
    Constructor.prototype = Object.create(Error.prototype, {
        constructor: { value: Constructor, writable: true, configurable: true }
    });
    return Constructor;
};

export const NotImplementedError = createErrorConstructor(NOT_IMPLEMENTED);

export const NULL_NOT_ALLOWED = "Null not allowed";
export const NullNotAllowedError = createErrorConstructor(NULL_NOT_ALLOWED);

export const INT_OUT_OF_BOUNDS = "Integer out of bounds";
export const IntOutOfBoundsError = createErrorConstructor(INT_OUT_OF_BOUNDS);

export const INVALID_NUMBER = "Invalid number";
export const InvalidNumberError = createErrorConstructor(INVALID_NUMBER);

export const INVALID_DATE = "Invalid date";
export const InvalidDateError = createErrorConstructor(INVALID_DATE);

export const INVALID_BOOLEAN = "Invalid boolean";
export const InvalidBooleanError = createErrorConstructor(INVALID_BOOLEAN);

export const FIELD_MISSING = "Field missing";
export const FieldMissingError = createErrorConstructor(FIELD_MISSING);

export const JSON_ARRAY_NOT_FOUND = "JSON Array not found";
export const JSONArrayNotFoundError = createErrorConstructor(JSON_ARRAY_NOT_FOUND);

export const SOURCE_IS_NOT_OBJECT = "The source is not an object";
export const SourceNotObjectError = createErrorConstructor(SOURCE_IS_NOT_OBJECT);
