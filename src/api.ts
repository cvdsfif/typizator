import { Schema } from "./schemas"
import { InferTargetFromSchema } from "./type-conversions"

/**
 * Defines the run-time function call schema. To be used by facades, serializers, etc...
 */
export type FunctionCallDefinition = {
    /**
     * List of arguments types schemas
     */
    args: [Schema?, ...Schema[]],
    /**
     * Return value type schema
     */
    retVal?: Schema
}
/**
 * Information 
 */
export type NamedMetadata = {
    /**
     * Name of the function or of the child API
     */
    name: string,
    /**
     * Full path from the root of the API, separated by slashes
     */
    path: string
}
/**
 * Metadata for an API member function
 */
export type FunctionMetadata = {
    /**
     * Allows to make the difference between functions and sub-apis
     */
    dataType: "function",
    /**
     * List of arguments types schemas
     */
    args: Schema[],
    /**
     * Return value type schema
     */
    retVal: Schema
} & NamedMetadata
/**
 * List of function definitions and sub-apis
 * 
 * The field name can be any valid typescript identifier except **name**, **path** and **metadata**
 */
export type ApiDefinition = {
    [K: string]: FunctionCallDefinition | ApiDefinition
} & { metadata?: never }
/**
 * Reproduces the API tree but with additional information like names and paths
 */
export type MetadataMembersImplementation<T extends ApiDefinition> = {
    [K in keyof T]:
    T[K] extends ApiDefinition ?
    MetadataMembersImplementation<T[K]> & { metadata: ApiMetadata<T[K]> } :
    T[K] & { metadata: FunctionMetadata }
}
/**
 * Metadata for the API endpoint
 */
export type ApiMetadata<T extends ApiDefinition> = {
    /**
     * Allows to make the difference between functions and sub-apis
     */
    dataType: "api",
    /**
     * Objects metadata tree reproducing the API structure
     */
    implementation: MetadataMembersImplementation<T>
} & NamedMetadata

/**
 * Run-time metadata giving the run-time access to the API structure and data types
 */
export interface ApiSchema<T extends ApiDefinition> {
    get metadata(): ApiMetadata<T>
}
class ApiS<T extends ApiDefinition> implements ApiSchema<T> {
    private readonly _metadata: ApiMetadata<T>;
    public get metadata() { return this._metadata; }
    private extractMetadata = <D extends ApiDefinition>(definition: D, metadataName = "", parentPath = ""): ApiMetadata<D> => {
        const impl = {} as MetadataMembersImplementation<D>;
        Object.keys(definition).forEach(key => {
            const field = definition[key];
            if (typeof field.args === "object") {
                (impl as any)[key] = {
                    ...definition[key],
                    name: key,
                    path: `${parentPath}${metadataName}/${key}`,
                    metadata: {
                        dataType: "function",
                        args: field.args,
                        retVal: field.retVal,
                        name: key,
                        path: `${parentPath}${metadataName}/${key}`
                    }
                }
            } else {
                const child = this.extractMetadata(field as ApiDefinition, key, `${parentPath}${metadataName}/`);
                (impl as any)[key] = {
                    ...child.implementation,
                    name: key,
                    path: `${parentPath}${metadataName}/${key}`,
                    metadata: child
                }
            }
        });
        return ({
            dataType: "api",
            implementation: impl,
            name: metadataName,
            path: `${parentPath}${metadataName}`
        })
    }
    constructor(definition: T) { this._metadata = this.extractMetadata(definition); }
}
/**
 * Creates a new API schema
 * @param definition Object containing function definitions matching `FunctionCallDefinition` and sub-apis allowing to build a tree API structure
 * @returns API schema available at fun time
 */
export const apiS = <T extends ApiDefinition>(definition: T) => new ApiS(definition) as ApiSchema<T>;

/**
 * Extracts argument types from a list of schemas.
 * 
 * @example
 * This:
 * ```ts
 * [intS, stringS]
 * ```
 * ...becomes this:
 * ```ts
 * [number,string]
 * ```
 */
export type InferArguments<T extends [...any]> =
    T extends [...infer P] ? { [K in keyof P]: P[K] extends Schema ? InferTargetFromSchema<P[K]> : never } : never

/**
 * Extracts the type from the API schema
 * 
 * @example
 * This:
 * ```ts
 * apiS({
 *      helloWorld: { args: [stringS, intS], retVal: bigintS }
 *      cruel: {
 *          world: { args:[] }
 *      }
 * })
 * ```
 * ...becomes this:
 * ```ts
 * {
 *      helloWorld: (arg0:string, arg1:number) => Promise<bigint>
 *      cruel: {
 *          world: () => Promise<void>
 *      }
 * }
 * ```
 */
export type ApiImplementation<T> = T extends ApiSchema<infer S> ? ApiImplementation<S> : {
    [K in keyof T]:
    T[K] extends ApiDefinition ? ApiImplementation<T[K]> :
    T[K] extends FunctionCallDefinition ?
    (...args: InferArguments<T[K]["args"]>) => Promise<InferTargetFromSchema<T[K]["retVal"]>>
    : never
}