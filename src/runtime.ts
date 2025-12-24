import { request } from "http"
import { raise } from "./common"
import { type AST } from "./parser"
import reader from "./reader"
import { type InnerValue, with_type_check, List, RuntimeError, Environment } from "./environment"

export async function evaluate(ast:AST, environment: Environment):Promise<InnerValue>{
    switch(ast.type){
        case "literal":
            return ast.value
        case "oper":
            switch(ast.id){
                case "pri":
                    return evaluate(ast.args[0],environment)
                case "neg":
                    return with_type_check(await evaluate(ast.args[0], environment), "number", value => -value)
                case "mul":
                    return await with_type_check(await evaluate(ast.args[0], environment), "number", async value1 =>
                        with_type_check(await evaluate(ast.args[1], environment), "number", value2 =>
                            value1 * value2
                        )
                    )
                case "div":
                    return await with_type_check(await evaluate(ast.args[0], environment), "number", async value1 =>
                        with_type_check(await evaluate(ast.args[1], environment), "number", value2 =>
                            value1 / value2
                        )
                    )
                case "add":
                    return await with_type_check(await evaluate(ast.args[0], environment), "number", async value1 =>
                        with_type_check(await evaluate(ast.args[1], environment), "number", value2 =>
                            value1 + value2
                        )
                    )
                case "sub":
                    return await with_type_check(await evaluate(ast.args[0], environment), "number", async value1 =>
                        with_type_check(await evaluate(ast.args[1], environment), "number", value2 =>
                            value1 - value2
                        )
                    )
                case "glb":
                    return with_type_check(await evaluate(ast.args[0], environment), "string", name => environment.global_scope.get(name)
                    )
                case "loc":
                    return await with_type_check<InnerValue|Promise<InnerValue>>(await evaluate(ast.args[0], environment), "string", name=>
                        environment.current_scope.get(name),
                        (v)=>with_type_check<InnerValue|Promise<InnerValue>>(v, "lazy", ref=>ref.evaluate(),v=>with_type_check(v, "number", i=>(environment.auguments ?? raise(new RuntimeError(`引数が存在しません: 引数参照は関数の中でしか使用できません。`)))[i]??raise(new RuntimeError(`引数が存在しません: インデックス ${i} は関数の引数リストに存在しません。`))))
                    )
                case "asg":
                    return await with_type_check(await evaluate(ast.args[0], environment), "ref", async ref=>{
                        const value=await evaluate(ast.args[1], environment)
                        ref.set(value)
                        return value
                    });
                case "lst":
                    return with_type_check(await evaluate(ast.args[0], environment), "tuple", t=>new List(t), v=>new List([v]))
                case "blk":
                    {
                        return await evaluate(ast.args[0], environment.make_child_environment())
                    }
                case "dot":
                    return await with_type_check(await evaluate(ast.args[0], environment), "object", async obj=>
                        with_type_check(await evaluate(ast.args[1], environment), "string", name=>
                            obj.get(name)
                        ),(v)=>with_type_check(v, "list", async list=>with_type_check(await evaluate(ast.args[1], environment), "number", index=>
                            list.get(index)
                        ))
                    )
                case "cal":
                    return await with_type_check(await evaluate(ast.args[0], environment), "function", async func=>func.call(...await evaluate_for_parameter_list(ast.args[1], environment)))
                case "ind":
                    return with_type_check(await evaluate(ast.args[0], environment), "tuple", async tuple=>
                        with_type_check<InnerValue|Promise<InnerValue>>(await evaluate(ast.args[1], environment), "number", index=>
                            tuple[index!] ?? raise(new RuntimeError(`タプルの範囲外アクセス: インデックス ${index} は長さ ${tuple.length} のタプルには存在しません。`)
                        ),
                        v=>with_type_check(v, "list", async list=>
                            with_type_check(await evaluate(ast.args[1], environment), "number", index=>
                                list.get(index)
                            )
                        )
                    ))
                case "bcl":
                    let ast_:AST
                    if(ast.args[0].type=="oper" && ast.args[0].id=="cal"){
                        ast_={
                            type: "oper",
                            id: "cal",
                            args: [ast.args[0].args[0]!, {
                                type: "oper",
                                id: "tup",
                                args: [ast.args[0].args[1]!, {
                                    type: "oper",
                                    id: "blk",
                                    args: [ast.args[1]!]
                                }]
                            }]
                        }
                    }else{
                        ast_={
                            type: "oper",
                            id: "cal",
                            args: [ast.args[0]!, {
                                type: "oper",
                                id: "blk",
                                args: [ast.args[1]!]
                            }]
                        }
                    }
                    return await evaluate(ast_, environment)
                case "hsh":
                    return await with_type_check(await evaluate(ast.args[0], environment), "object", async obj=>
                        with_type_check(await evaluate(ast.args[1], environment), "string", name=>
                            obj.get_special(name)
                        )
                    )
                case "pos":
                    return with_type_check(await evaluate(ast.args[0], environment), "number", value => value,
                        v=>with_type_check(v, "string", value => +value))
                case "eq":
                    return await evaluate(ast.args[0], environment) === await evaluate(ast.args[1], environment)
                case "neq":
                    return await evaluate(ast.args[0], environment) !== await evaluate(ast.args[1], environment)
                case "lt":
                    return with_type_check(await evaluate(ast.args[0], environment), "number", async value1 =>
                        with_type_check(await evaluate(ast.args[1], environment), "number", value2 =>
                            value1 < value2
                        )
                    )
                case "gt":
                    return with_type_check(await evaluate(ast.args[0], environment), "number", async value1 =>
                        with_type_check(await evaluate(ast.args[1], environment), "number", value2 =>
                            value1 > value2
                        )
                    )
                case "leq":
                    return with_type_check(await evaluate(ast.args[0], environment), "number", async value1 =>
                        with_type_check(await evaluate(ast.args[1], environment), "number", value2 =>
                            value1 <= value2
                        )
                    )
                case "geq":
                    return with_type_check(await evaluate(ast.args[0], environment), "number", async value1 =>
                        with_type_check(await evaluate(ast.args[1], environment), "number", value2 =>
                            value1 >= value2
                        )
                    )
                case "cas":
                    return with_type_check(await evaluate(ast.args[1], environment), "function", async func=>
                        with_type_check(await evaluate(ast.args[0], environment), "ref", async ref=>{
                            const value=ref.get()
                            const result=await func.call([()=>value, ast.args[0]])
                            ref.set(result)
                            return result
                        })
                    )
                case "tup":
                    const l = with_type_check(await evaluate(ast.args[0], environment), "tuple", t=>t,(v)=>[v]), 
                        r = with_type_check(await evaluate(ast.args[1], environment), "tuple", t=>t,(v)=>[v]);
                    return l.concat(r);
                case "tup_lst":
                    return with_type_check(await evaluate(ast.args[0], environment), "tuple", t=>t,(v)=>[v]);
                case "stm":
                    await evaluate(ast.args[0], environment);
                    return await evaluate(ast.args[1], environment);
                case "stm_lst":
                    await evaluate(ast.args[0], environment);
                    return 0
            };  
    }
    throw new RuntimeError(`未実装のASTノードの評価: ${JSON.stringify(ast)}`)
}
export async function evaluate_for_parameter_list(ast:AST, environment: Environment):Promise<[() => Promise<InnerValue>,AST][]>{
    switch(ast.type){
        case "oper":
            switch(ast.id){
                case "tup":
                    {
                        const left=await evaluate_for_parameter_list(ast.args[0]!, environment)
                        const right=await evaluate_for_parameter_list(ast.args[1]!, environment)
                        return left.concat(right);
                    }
                case "tup_lst":
                    {
                        const value=await evaluate_for_parameter_list(ast.args[0]!, environment)
                        return value;
                    }
            }
    }
    return [[()=>evaluate(ast, environment), ast]]
}