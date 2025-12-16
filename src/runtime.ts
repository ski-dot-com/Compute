import { type AST } from "./parser"
export type InnerValue=number
export function evaluate(ast:AST):InnerValue{
    switch(ast.type){
        case "number":
            return ast.value
        case "oper":
            switch(ast.id){
                case "pri":
                    return evaluate(ast.args[0])
                case "neg":
                    return -evaluate(ast.args[0])
                case "mul":
                    return evaluate(ast.args[0])*evaluate(ast.args[1])
                case "div":
                    return evaluate(ast.args[0])/evaluate(ast.args[1])
                case "add":
                    return evaluate(ast.args[0])+evaluate(ast.args[1])
                case "sub":
                    return evaluate(ast.args[0])-evaluate(ast.args[1])
            };
    }
}