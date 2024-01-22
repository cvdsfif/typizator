import { ByDefaultFacade, NotNullFacade, OptionalFacade, Schema, TypeSchema } from "./schemas"
import { InferTargetFromSchema } from "./type-conversions"

export type FunctionCallDefinition = {
    args: [Schema<any, any, any>?, ...Schema<any, any, any>[]],
    retVal?: Schema<any, any, any>
}
export type FunctionMetadata = {
    dataType: "function",
    args: Schema<any, any, any>[],
    retVal: Schema<any, any, any>
}
export type ApiDefinition = {
    [K: string]: FunctionCallDefinition | ApiDefinition
}
export type ApiMetadata = {
    dataType: "api",
    members: Map<String, FunctionMetadata | ApiMetadata>
}

class ApiS<T extends ApiDefinition> {
    private readonly _metadata: ApiMetadata;
    public get metadata() { return this._metadata; }
    private extractMetadata = <D extends ApiDefinition>(definition: D): ApiMetadata => {
        const result = new Map<String, FunctionMetadata | ApiMetadata>();
        Object.keys(definition).forEach(key => {
            const field = definition[key];
            result.set(
                key,
                typeof field.args === "object" && typeof field.retVal === "object" ?
                    {
                        dataType: "function",
                        args: field.args,
                        retVal: field.retVal
                    } as FunctionMetadata :
                    this.extractMetadata(field as ApiDefinition)
            );
        });
        return ({
            dataType: "api",
            members: result
        });
    }
    constructor(private definition: T) { this._metadata = this.extractMetadata(definition); }
}
export const apiS = <T extends ApiDefinition>(definition: T) => new ApiS(definition);

type InferArguments<T extends [...any]> =
    T extends [...infer P] ? { [K in keyof P]: P[K] extends Schema<any, any, any> ? InferTargetFromSchema<P[K]> : never } : never;
export type InferTargetFromSchema0<T> =
    T extends NotNullFacade<infer Target, any> ? Target :
    T extends OptionalFacade<infer Target, any> ? Target | undefined | null :
    T extends TypeSchema<infer Target, any> | ByDefaultFacade<infer Target, any, any> ? Target | null :
    undefined;
export type ApiImplementation<T> = T extends ApiS<infer S> ? ApiImplementation<S> : {
    [K in keyof T]:
    T[K] extends ApiDefinition ? ApiImplementation<T[K]> :
    T[K] extends FunctionCallDefinition ?
    (...args: InferArguments<T[K]["args"]>) => Promise<InferTargetFromSchema<T[K]["retVal"]>>
    : never
}