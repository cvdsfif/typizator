import { Optional, RecursiveS, Schema, SchemaDefinition } from "./schemas";

/**
 * Transform a schema to its source type making the `.optional` fields optional
 * 
 * @example
 * Given this:
 * ```ts
 * const recordS = objectS({
 *      id: intS.notNull
 *      name: stringS.optional
 * })
 * ```
 * When you do:
 * ```ts
 * type Record = InferSourceFromSchema<typeof recordS>
 * ```
 * Then it transforms `Record` to:
 * ```ts
 * {
 *      id: number | bigint | string,
 *      name?: string | bigint | number | null
 * }
 * ```
 */
export type InferSourceFromSchema<T> =
    T extends Schema<any, infer Source, infer B, any> ?
    B extends { allowNull: false, optional: false } ? Source :
    B extends Optional ? Source | undefined | null :
    Source | null :
    never;


/**
 * Extracts source type from the `objectS` schema's argument
 */
export type SchemaSource<T extends SchemaDefinition> =
    {
        [K in keyof T as T[K] extends RecursiveS ? never : T[K] extends Schema<any, any, Optional, any> ? never : K]:
        InferSourceFromSchema<T[K]>
    } & {
        [K in keyof T as T[K] extends RecursiveS ? K : T[K] extends Schema<any, any, Optional, any> ? K : never]?:
        T[K] extends RecursiveS ? SchemaSource<T> : InferSourceFromSchema<T[K]>
    } | string;

/**
 * Transform a schema to its target type making the `.optional` fields optional
 * 
 * @example
 * Given this:
 * ```ts
 * const recordS = objectS({
 *      id: intS.notNull
 *      name: stringS.optional
 * })
 * ```
 * When you do:
 * ```ts
 * type Record = InferTargetFromSchema<typeof recordS>
 * ```
 * Then it transforms `Record` to:
 * ```ts
 * {
 *      id: number,
 *      name?: string | null
 * }
 * ```
 */
export type InferTargetFromSchema<T> =
    T extends Schema<infer Target, any, infer B, any> ?
    B extends { allowNull: false, optional: false } ? Target :
    B extends Optional ? Target | undefined | null :
    Target | null :
    void

/**
 * Transforms a string-to-object schema into its target dictionary type
 * 
 * * @example
 * Given this:
 * ```ts
 * const recordS = dictionaryS(intS).notNull
 * ```
 * When you do:
 * ```ts
 * type Record = InferTargetFromDictionary<typeof recordS>
 * ```
 * Then it transforms `Record` to:
 * ```ts
 * {
 *      [K:string]: number | null
 * }
 * ```
 */
export type InferTargetForDictionary<V extends Schema> = {
    [K: string]: InferTargetFromSchema<V>
}

/**
 * Transforms a string-to-object schema into its source dictionary type
 * 
 * * @example
 * Given this:
 * ```ts
 * const recordS = dictionaryS(intS).notNull
 * ```
 * When you do:
 * ```ts
 * type Record = InferTargetFromDictionary<typeof recordS>
 * ```
 * Then it transforms `Record` to:
 * ```ts
 * {
 *      [K:string]: bigint | number | string | null
 * }
 * ```
 */
export type InferSourceForDictionary<V extends Schema> = {
    [Key: string]: InferSourceFromSchema<V>
}


/**
 * Extracts target type from the `objectS` schema's argument
 */
export type SchemaTarget<T extends SchemaDefinition> =
    {
        [K in keyof T as T[K] extends RecursiveS ? never : T[K] extends Schema<any, any, Optional, any> ? never : K]: InferTargetFromSchema<T[K]>
    } & {
        [K in keyof T as T[K] extends RecursiveS ? K : T[K] extends Schema<any, any, Optional, any> ? K : never]?: InferTargetFromSchema<T[K]>
    }
