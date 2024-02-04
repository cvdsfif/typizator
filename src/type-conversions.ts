import { NotNullFacade, OptionalFacade, Schema, SchemaDefinition } from "./schemas";

export type InferSourceFromSchema<T> =
    T extends NotNullFacade<any, infer Source, any, any> ? Source :
    T extends OptionalFacade<any, infer Source, any, any> ? Source | undefined | null :
    T extends Schema<any, infer Source> ? Source | null :
    never;
export type SchemaSource<T extends SchemaDefinition> =
    {
        [K in keyof T as T[K] extends OptionalFacade<any, any, any, any> ? never : K]: InferSourceFromSchema<T[K]>;
    } & {
        [K in keyof T as T[K] extends OptionalFacade<any, any, any, any> ? K : never]?: InferSourceFromSchema<T[K]>;
    } | string;
export type InferTargetFromSchema<T> =
    T extends NotNullFacade<infer Target, any, any, any> ? Target :
    T extends OptionalFacade<infer Target, any, any, any> ? Target | undefined | null :
    T extends Schema<infer Target, any> ? Target | null :
    void;
export type SchemaTarget<T extends SchemaDefinition> =
    {
        [K in keyof T as T[K] extends OptionalFacade<any, any, any, any> ? never : K]: InferTargetFromSchema<T[K]>;
    } & {
        [K in keyof T as T[K] extends OptionalFacade<any, any, any, any> ? K : never]?: InferTargetFromSchema<T[K]>;
    }
