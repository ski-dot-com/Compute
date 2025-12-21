import { type AST } from "./parser"


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

export type InnerValue=number|string
class Scope {
    constructor(private values: Map<string, InnerValue>, public parent:Scope|null){
        
    }
    get(name:string):InnerValue{
        if(this.values.has(name)){
            return this.values.get(name)!
        }else if(this.parent!==null){
            return this.parent.get(name)
        }else{
            throw new RuntimeError(`名前が見つかりませんでした: ${name}`)
        }
    }
    set(name:string, value:InnerValue):void{
        this.values.set(name, value)
    }
}
const global_scope=new Scope(new Map([
    ["pi", 3.141592653589793],
    ["e", 2.718281828459045]
]), null)
let current_scope=global_scope

function with_type_check<T>(value:InnerValue, type:"number",f: (value: number) => T): T;
function with_type_check<T>(value:InnerValue, type:"string",f: (value: string) => T): T;

function with_type_check<T>(value:InnerValue, type:"number"|"string",f: (value: any) => T): T{
    if(typeof value!==type){
        throw new TypeError(`型エラー: 期待された型は${type}ですが、実際の型は${typeof value}です。`)
    }
    return f(value)
}

export function evaluate(ast:AST):InnerValue{
    switch(ast.type){
        case "literal":
            return ast.value
        case "oper":
            switch(ast.id){
                case "pri":
                    return evaluate(ast.args[0])
                case "neg":
                    return with_type_check(evaluate(ast.args[0]), "number", value => -value)
                case "mul":
                    return with_type_check(evaluate(ast.args[0]), "number", value1 =>
                        with_type_check(evaluate(ast.args[1]), "number", value2 =>
                            value1 * value2
                        )
                    )
                case "div":
                    return with_type_check(evaluate(ast.args[0]), "number", value1 =>
                        with_type_check(evaluate(ast.args[1]), "number", value2 =>
                            value1 / value2
                        )
                    )
                case "add":
                    return with_type_check(evaluate(ast.args[0]), "number", value1 =>
                        with_type_check(evaluate(ast.args[1]), "number", value2 =>
                            value1 + value2
                        )
                    )
                case "sub":
                    return with_type_check(evaluate(ast.args[0]), "number", value1 =>
                        with_type_check(evaluate(ast.args[1]), "number", value2 =>
                            value1 - value2
                        )
                    )
                case "glb":
                    return with_type_check(evaluate(ast.args[0]), "string", name=>
                        global_scope.get(name)
                    )
                case "loc":
                    return with_type_check(evaluate(ast.args[0]), "string", name=>
                        current_scope.get(name)
                    )
            };  
    }
}