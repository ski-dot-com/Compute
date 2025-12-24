import { AST } from "./parser"
import { evaluate } from "./runtime"

/**
 * 実行時エラー。計算中に発生するエラー。
 */
export class RuntimeError extends Error{
	constructor(...args:ConstructorParameters<ErrorConstructor>){
		super(...args)
		this.name="RuntimeError"
	}
}
/** 
 * 型エラー。値の型が期待された型と異なる場合に発生するエラー。
 */
export class TypeError extends RuntimeError {
	constructor(...args:ConstructorParameters<ErrorConstructor>){
		super(...args)
        this.name="TypeError"
    }
}

export class Ref {
    constructor(public readonly name:string, private value: InnerValue|null=null){
    }
    get():InnerValue{
        if(this.value===null){
            throw new RuntimeError(`初期化されていない変数: ${this.name}`)
        }
        return this.value
    }
    set(value:InnerValue):void{
        this.value=value
    }
}
export class DynamicRef {

    constructor(public readonly name:string, private get_?: ()=>Promise<InnerValue>|InnerValue, private set_?:(value:InnerValue)=>Promise<void>|void){
    }
    async get():Promise<InnerValue>{
        if(this.get_){
            return await this.get_()
        }
        throw new RuntimeError(`動的参照「${this.name}」には取得用関数が定義されていません`)
    }
    async set(value:InnerValue):Promise<void>{
        if(this.set_){
            await this.set_(value)
            return
        }
        throw new RuntimeError(`動的参照「${this.name}」には設定用関数が定義されていません`)
    }
}
export class Lazy {
    constructor(private get_value: ()=>Promise<InnerValue>|InnerValue){
    }
    async evaluate():Promise<InnerValue>{
        return this.get_value()
    }
}


/**
 * 内部オブジェクト。オブジェクト型の値を表す。
 * 中身はスコープと同じ。
 */
export class UserObject {
    private special_values: Map<string, InnerValue>
    constructor(private values: Map<string, InnerValue>, public parent:UserObject|null=null, special_values?: Map<string, InnerValue>){
        this.special_values=special_values??new Map<string, InnerValue>()
    }
    get(name:string):InnerValue{
        if(this.values.has(name)){
            return this.values.get(name)!
        }else if(this.parent!==null){
            return this.parent.get(name)
        }else{
            throw new RuntimeError(`「${name}」というプロパティが見つかりませんでした`)
        }
    }
    get_special(name:string):InnerValue{
        if(this.special_values.has(name)){
            return this.special_values.get(name)!
        }else if(this.parent!==null){
            return this.parent.get_special(name)
        }else{
            throw new RuntimeError(`「${name}」という特異プロパティが見つかりませんでした`)
        }
    }
    make_child_object():UserObject{
        return new UserObject(new Map<string, InnerValue>(), this)
    }
}
/**
 * スコープ。変数の名前と値の対応を管理する。
 */
export class Scope {
    private special_values: Map<string, InnerValue>
    constructor(private values: Map<string, InnerValue>, public parent:Scope|null=null, special_values?: Map<string, InnerValue>){
        this.special_values=special_values??new Map<string, InnerValue>()
    }
    get(name:string):InnerValue{
        if(this.values.has(name)){
            return this.values.get(name)!
        }else if(this.parent!==null){
            return this.parent.get(name)
        }else{
            throw new RuntimeError(`「${name}」という名前が見つかりませんでした`)
        }
    }
    set(name:string, value:InnerValue):void{
        this.values.set(name, value)
    }
    get_special(name:string):InnerValue{
        if(this.special_values.has(name)){
            return this.special_values.get(name)!
        }else if(this.parent!==null){
            return this.parent.get_special(name)
        }else{
            throw new RuntimeError(`「${name}」という特異名が見つかりませんでした`)
        }
    }
    set_special(name:string, value:InnerValue):void{
        this.special_values.set(name, value)
    }
    to_object():UserObject{
        return new UserObject(new Map(this.values), undefined, new Map(this.special_values))
    }
    make_child_scope():Scope{
        return new Scope(new Map<string, InnerValue>(), this)
    }
}

/**
 * ネイティブ関数。Computeの外部で定義された関数を表す。
 */
export class NativeFunction {
    constructor(public readonly name:string, public readonly func:(...args:[() => Promise<InnerValue>|InnerValue, AST][])=>Promise<InnerValue>|InnerValue){
    }
    static wrap_macro(name:string, func:(...args:[() => Promise<InnerValue>|InnerValue, AST][])=>Promise<InnerValue>|InnerValue):NativeFunction{
        return new NativeFunction(name, (...args:[() => Promise<InnerValue>|InnerValue, AST][])=>
            func(...args)
        )
    }
    static wrap_normal(name:string, func:(...args:(() => Promise<InnerValue>|InnerValue)[])=>Promise<InnerValue>|InnerValue):NativeFunction{
        return new NativeFunction(name, (...args:[() => Promise<InnerValue>|InnerValue, AST][])=>
            func(...args.map(([f,])=>f))
        )
    }
    static wrap_simple(name:string, func:(...args:InnerValue[])=>Promise<InnerValue>|InnerValue):NativeFunction{
        return new NativeFunction(name, async (...args:[() => Promise<InnerValue>|InnerValue, AST][])=>
            func(...await Promise.all(args.map(([f,])=>f())))
        )
    }
    async call(...args:[() => Promise<InnerValue>|InnerValue, AST][]):Promise<InnerValue>{
        return this.func(...args)
    }
}
export class NativeObject {
    constructor(public readonly object:any, public readonly get: (name:string)=>InnerValue, public readonly set: (name:string, value:InnerValue)=>void, public readonly get_special: (name:string)=>InnerValue, public readonly set_special: (name:string, value:InnerValue)=>void){
    }
}
export class List {
    constructor(public readonly elements:InnerValue[]){
    }
    get(index:number):InnerValue{
        if(index<0 || index>=this.elements.length){
            throw new RuntimeError(`リストの範囲外アクセス: インデックス ${index} は長さ ${this.elements.length} のリストには存在しません。`)
        }
        return this.elements[index]!
    }
}

export class UserFunctionParam {
    constructor(public readonly name:string, public readonly param_type: "normal"|"ref"|"lazy"|"macro", public readonly is_variadic:boolean=false, public readonly default_value?:AST){
    }
    async process_argument(args: [() => Promise<InnerValue>|InnerValue, AST][], at:number): Promise<InnerValue> {
        if(this.is_variadic){
            const values:InnerValue[]=[]
            for(let i = at;i<args.length;i++){
                switch(this.param_type){
                    case "normal":
                        values.push(await with_type_check(await args[i]![0](), "ref",  v=> v.get(), v=>v))
                        break;
                    case "ref":
                        values.push(await args[i]![0]())
                        break;
                    case "lazy":
                        values.push(new Lazy(args[i]![0]))
                        break;
                    case "macro":
                        values.push(new NativeObject(args[i]![1], ()=>{throw new RuntimeError(`ASTからのプロパティ取得は未実装です`)}, (name:string, value:InnerValue)=>{throw new RuntimeError(`ASTへのプロパティ設定は未実装です`)}, (name:string)=>{throw new RuntimeError(`ASTからの特異プロパティ取得は未実装です`)}, (name:string, value:InnerValue)=>{throw new RuntimeError(`ASTへの特異プロパティ設定は未実装です`)}))
                        break;
                }
            }
            return new List(values)
        } else {
            switch(this.param_type){
                case "normal":
                    return with_type_check(await args[at]![0](), "ref", v=>v.get(), v=>v)
                case "ref":
                    return await args[at]![0]()
                case "lazy":
                    return new Lazy(args[at]![0])
                case "macro":
                    return new NativeObject(args[at]![1], ()=>{throw new RuntimeError(`ASTからのプロパティ取得は未実装です`)}, (name:string, value:InnerValue)=>{throw new RuntimeError(`ASTへのプロパティ設定は未実装です`)}, (name:string)=>{throw new RuntimeError(`ASTからの特異プロパティ取得は未実装です`)}, (name:string, value:InnerValue)=>{throw new RuntimeError(`ASTへの特異プロパティ設定は未実装です`)})
            }
        }
    }
}

/**
 * ユーザー定義関数。Computeのコード内で定義された関数を表す。
 */
export class UserFunction {
    constructor(public readonly name:string, public readonly params:UserFunctionParam[], public readonly body:AST, public readonly closure:Environment){
        if(this.params.slice(0,-1).some(p=>p.is_variadic)){
            throw new RuntimeError(`関数「${name}」の仮引数定義が不正です。可変長引数は最後の引数でなければなりません。`)
        }else if(this.params.at(-1)?.is_variadic && this.params.at(-1)?.default_value){
            throw new RuntimeError(`関数「${name}」の仮引数定義が不正です。可変長引数にデフォルト値を設定することはできません。`)
        }
    }
    async call(...args:[() => Promise<InnerValue>|InnerValue, AST][]): Promise<InnerValue> {
        const call_environment=this.closure.make_child_environment([])
        let arg_index=0
        for(let i = 0;i<this.params.length;i++){
            const param=await this.params[i]!.process_argument(args, arg_index)
            call_environment.current_scope.set(this.params[i]!.name, param)
            this.closure.auguments!.push(param)
        }
        return evaluate(this.body, call_environment)
    }
}
export type InnerValue=number|string|Ref|DynamicRef|Lazy|InnerValue[]|NativeFunction|UserFunction|NativeObject|UserObject|List|boolean

export function with_type_check<T>(value:InnerValue, type:"number", then: (value: number) => T, _else?: (value: InnerValue) => T): T;
export function with_type_check<T>(value:InnerValue, type:"boolean", then: (value: boolean) => T, _else?: (value: InnerValue) => T): T;
export function with_type_check<T>(value:InnerValue, type:"string", then: (value: string) => T, _else?: (value: InnerValue) => T): T;
export function with_type_check<T>(value:InnerValue, type:"ref", then: (value: Ref|DynamicRef) => T, _else?: (value: InnerValue) => T): T;
export function with_type_check<T>(value:InnerValue, type:"tuple", then: (value: InnerValue[]) => T, _else?: (value: InnerValue) => T): T;
export function with_type_check<T>(value:InnerValue, type:"function", then: (value: UserFunction|NativeFunction) => T, _else?: (value: InnerValue) => T): T;
export function with_type_check<T>(value:InnerValue, type:"lazy", then: (value: Lazy) => T, _else?: (value: InnerValue) => T): T;
export function with_type_check<T>(value:InnerValue, type:"object", then: (value: UserObject|NativeObject) => T, _else?: (value: InnerValue) => T): T;
export function with_type_check<T>(value:InnerValue, type:"list", then: (value: List) => T, _else?: (value: InnerValue) => T): T;

export async function with_type_check<T>(value:InnerValue, type:"number"|"string"|"ref"|"tuple"|"function"|"lazy"|"object"|"list"|"boolean",then: (value: any) => T,_else?: (value: InnerValue) => T): Promise<T>{
    if(type === "ref"){
        if(!(value instanceof Ref || value instanceof DynamicRef)){
            if(_else){
                return _else(value)
            }
            throw new TypeError(`型エラー: 期待された型は「ref」ですが、実際の型は「${typeof value}」です。`)
        }
    }else{
        if(value instanceof Ref || value instanceof DynamicRef){
            value=await value.get()
        }
        switch(type){
            case "number":
            case "string":
            case "boolean":
                if(typeof value!==type){
                    if(_else){
                        return _else(value)
                    }
                    throw new TypeError(`型エラー: 期待された型は「${type}」ですが、実際の型は「${typeof value}」です。`)
                }
                break;
            case "tuple":
                if(!Array.isArray(value)){
                    if(_else){
                        return _else(value)
                    }
                    throw new TypeError(`型エラー: 期待された型は「tuple」ですが、実際の型は「${typeof value}」です。`)
                }
                break;
            case "function":
                if(!(value instanceof UserFunction || value instanceof NativeFunction)){
                    if(_else){
                        return _else(value)
                    }
                    throw new TypeError(`型エラー: 期待された型は「function」ですが、実際の型は「${typeof value}」です。`)
                }
                break;
            case "lazy":
                if(!(value instanceof Lazy)){
                    if(_else){
                        return _else(value)
                    }
                    throw new TypeError(`型エラー: 期待された型は「lazy」ですが、実際の型は「${typeof value}」です。`)
                }
                break;
            case "object":
                if(!(value instanceof UserObject || value instanceof NativeObject)){
                    if(_else){
                        return _else(value)
                    }
                    throw new TypeError(`型エラー: 期待された型は「object」ですが、実際の型は「${typeof value}」です。`)
                }
                break;
            case "list":
                if(!(value instanceof List)){
                    if(_else){
                        return _else(value)
                    }
                    throw new TypeError(`型エラー: 期待された型は「list」ですが、実際の型は「${typeof value}」です。`)
                }
                break;
        }
    }
    return then(value)
}

export class Environment {
    public current_scope:Scope
    public auguments: InnerValue[]|undefined;
    constructor(public readonly global_scope:Scope, current_scope?:Scope, auguments?: InnerValue[]){
        if(current_scope){
            this.current_scope=current_scope
        }else{
            this.current_scope=global_scope
        }
    }
    make_child_environment(auguments?: InnerValue[]):Environment{
        const child_scope=this.current_scope.make_child_scope()
        return new Environment(this.global_scope, child_scope, auguments ?? this.auguments)
    }
    static make_global_environment():Environment{
        let env = new Environment(new Scope(new Map<string, InnerValue>([
            ["pi", 3.141592653589793],
            ["e", 2.718281828459045],
            ["print", NativeFunction.wrap_simple("print", (...args:InnerValue[])=>{
                console.log(...args)
                return 0
            })],
            ["let", NativeFunction.wrap_simple("let", (name:InnerValue)=>{
                return with_type_check(name, "string", name=>{
                    const ref=new Ref(name)
                    current_scope.set(name, ref)
                    return ref
                })
            })],
            ["input", NativeFunction.wrap_simple("input", (prompt:InnerValue)=>{
                return with_type_check(prompt, "string", async prompt=>{
                    return await reader.question(prompt)
                })
            })],
            ["if", NativeFunction.wrap_normal("if", async (cond:() => Promise<InnerValue>|InnerValue, then_branch:() => Promise<InnerValue>|InnerValue)=>{
                return await with_type_check(await cond(), "boolean", async cond=>{
                    if(cond){
                        let val = await then_branch()
                        let res:UserObject = new UserObject(new Map(), null, new Map([
                            ["else", NativeFunction.wrap_normal("else", async (else_branch:() => Promise<InnerValue>|InnerValue)=>{
                                return val
                            })],
                            ["elif", NativeFunction.wrap_normal("elif", async (elif_cond:() => Promise<InnerValue>|InnerValue, elif_then_branch:() => Promise<InnerValue>|InnerValue)=>{
                                return res
                            })]
                        ]))
                        return res
                    }
                    else{
                        return new UserObject(new Map(), null, new Map([
                            ["else", NativeFunction.wrap_normal("else", async (else_branch:() => Promise<InnerValue>|InnerValue)=>{
                                return await else_branch()
                            })]
                        ]))
                    }
                })
            })]
        ]), null))
        return env
    }
}