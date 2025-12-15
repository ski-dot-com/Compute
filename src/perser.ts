import type { Token } from "./tokenizer";
import { operator_proiorities, signs, type OperID, type ArgTypeOf, type ArgMainType } from "./common";


type AST = ({
    [K in OperID]: {
        id: K,
        args: ArgTypeOf<K>
    }
}[OperID])&{
    type: "oper",
}|{
    type:"number",
    value: number
}

