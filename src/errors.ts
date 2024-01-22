export const NOT_IMPLEMENTED = "Not implemented";
export class NotImplementedError extends Error { constructor() { super(NOT_IMPLEMENTED); } }

export const NULL_NOT_ALLOWED = "Null not allowed";
export class NullNotAllowedError extends Error { constructor() { super(NULL_NOT_ALLOWED); } }

export const INT_OUT_OF_BOUNDS = "Integer out of bounds";
export class IntOutOfBoundsError extends Error { constructor() { super(INT_OUT_OF_BOUNDS); } }

export const INVALID_NUMBER = "Invalid number";
export class InvalidNumberError extends Error { constructor() { super(INVALID_NUMBER); } }

export const INVALID_DATE = "Invalid date";
export class InvalidDateError extends Error { constructor() { super(INVALID_DATE); } }

export const INVALID_BOOLEAN = "Invalid boolean";
export class InvalidBooleanError extends Error { constructor() { super(INVALID_BOOLEAN); } }

export const FIELD_MISSING = "Field missing";
export class FieldMissingError extends Error { constructor() { super(FIELD_MISSING); } }

export const JSON_ARRAY_NOT_FOUND = "JSON Array not found";
export class JSONArrayNotFoundError extends Error { constructor() { super(JSON_ARRAY_NOT_FOUND); } }
