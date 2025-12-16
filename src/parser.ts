import { type Token, is_sign, get_sign, is_number, get_number } from "./tokenizer";
import { type OpersItemType, type OperType, type OperID, type ArgTypeOf, type PatternItem, operator_proiorities, signs, opers, popArgs, raise, InternalError, pri_ids, Sign, apply_to_each_pattern } from "./common";


type AST = ({
    [K in OperID]: {
        id: K,
        args: ArgTypeOf<K, AST>
    }
}[OperID]) & {
    type: "oper",
} | {
    type: "number",
    value: number
}

type Oper2Parse = {
    id: OperID,
    rest_items: PatternItem[],
    priority: number | null
}
function is_exp_start(v: OpersItemType) {
    return v.type == "chain" && ((!v.is_right) || v.pattern[0]?.type == "exp")
}
function is_exp_end(v: OpersItemType) {
    return v.type == "chain" && ((v.is_right) || v.pattern.at(-1)?.type == "exp")
}
function get_first_sign(v: OperType) {
    return v.pattern.filter(v => v.type == "sign")[0]?.sign ?? raise(new InternalError("記号を一切含まない演算子が見つかりました。"))
}
function get_oper2parse(v: OpersItemType): Oper2Parse {
    let has_priority = is_exp_end(v), pattern_last = v.pattern.at(-1)
    let priority: number | null

    if (!has_priority) {
        priority = null
    } else if (v.is_right) {
        priority = v.priority
    } else if (!(pattern_last?.type == "exp")) {
        throw new InternalError("想定外のことが起きました。")
    } else {
        let limit = pattern_last.limit
        if (limit == undefined) {
            priority = v.priority - 1
        } else {
            priority = (pri_ids).indexOf(limit)
        }
    }
    return {
        id: v.id as OperID,
        priority,
        rest_items: v.pattern.slice(+(v.pattern[0]?.type == "exp") + 1, -(v.pattern.at(-1)?.type == "exp") || undefined)
    }
}
function group_with_sign(opers: OperType[]) {
    let res = new Map<Sign, OperType[]>()
    for (let oper of opers) {
        const sign = get_first_sign(oper)
        let target: OperType[]
        if (!res.has(sign)) {
            res.set(sign, target = [])
        } else {
            target = res.get(sign)!
        }
        target.push(oper)
    }
    for (let sign of res.keys()) {
        res.get(sign)!.sort((l, r) => r.pattern.length - l.pattern.length)
    }
    return res
}
const sign_start_opers = group_with_sign(opers.filter(v => !is_exp_start(v)))
const exp_start_opers = group_with_sign(opers.filter(v => is_exp_start(v)))
console.log(JSON.stringify({
    value_start_opers: Object.fromEntries(sign_start_opers.entries()),
    exp_start_opers: Object.fromEntries(exp_start_opers.entries())
}, undefined, 4))
type ParseState = {
    head: number,
    exps: AST[],
    opers: Oper2Parse[],
    /**
     * 0: 式の前
     * 1: 式の後ろ一般
     * 2: 次に記号が来ないと詰むやつ
     */
    state: 0 | 1 | 2
}
function push_exp(opers: Oper2Parse[], exps: AST[]){
    const id = opers.pop()!.id;
    exps.push({
        type: "oper",
        id: id,
        args: popArgs(id, exps) as any
    })
}
function check_oper(opers: Oper2Parse[], exps: AST[]){
    const oper = opers.at(-1)!, rest_items=oper.rest_items
    if (rest_items.length) {
        const head_item=rest_items[0]!
        if (head_item?.type === "sign") {
            return 2;
        }
        rest_items.shift()
        return 0;
    } else {
        if(oper.priority!==null){
            return 0;
        }
        push_exp(opers, exps)
        return 1;
    }
}
export function parse(tokens: Token[]) {
    console.log(tokens)
    let cur_state: ParseState = {
        head: 0,
        exps: [],
        opers: [],
        state: 0,
    };
    let alt_states: ParseState[] = []
    let cur_error: Error | undefined, cur_at = -1, cur_priority = 0;
    function backtrack(error: Error, at: number, priority: number = 0) {
        if ((cur_at - at || cur_priority - priority) < 0) {
            error.message=`@${at}: ${error.message}`
            cur_error = error;
            cur_at = at;
            cur_priority = priority;
        }
        cur_state = alt_states.shift() ?? raise(cur_error)
    }
    const len_tokens = tokens.length
    let head: number
    while ((head = cur_state.head) !== len_tokens || (
        [()=>(backtrack(new SyntaxError("最後に式が必要です。"), len_tokens), true),()=>false, ()=>(backtrack(new SyntaxError(`最後に"${(cur_state.opers.at(-1)!.rest_items[0]as PatternItem&{type:"sign"}).sign}"が必要です。`), len_tokens), true)][cur_state.state]!()
    )) {
        const token = tokens[head]!;
        console.log(JSON.stringify({
            cur_state,
            alt_states,
            token,
        },undefined,4))
        switch (cur_state.state) {
            case 0:
                {
                    if (is_sign(token)) {
                        const sign = get_sign(token)
                        const opers = sign_start_opers.get(sign)
                        if (opers === undefined) {
                            if (exp_start_opers.has(sign)) {
                                backtrack(new SyntaxError(`"${sign}"の前には式が必要です。`), head)
                            } else {
                                backtrack(new SyntaxError(`"${sign}"が想定外の位置で現れました。`), head, -5)
                            }
                            continue
                        }
                        {
                            let tmp: ParseState | undefined, tmp_: ParseState[]
                            [tmp, ...tmp_] = opers.map(get_oper2parse).map<ParseState>(v =>  {
                                const is_0 = v.rest_items.at(0)?.type !== "sign"
                                if(is_0)v.rest_items.shift()
                                return {
                                    head: head + 1,
                                    exps: [...cur_state.exps],
                                    opers: [...cur_state.opers, v],
                                    state: is_0 ? 0 : 2
                                }
                            })
                            cur_state = tmp!
                            alt_states.unshift(...tmp_)
                        }
                        continue
                    }
                    if (is_number(token)) {
                        cur_state.exps.push({
                            type: "number",
                            value: get_number(token)
                        })
                        cur_state.state=1
                    }
                }
                break;
            case 1:
                {
                    if (!is_sign(token)) {
                        backtrack(new SyntaxError(`式をただ単に2個続けることはできません。`), head)
                        continue
                    }
                    const sign = get_sign(token)
                    const req_oper_id = cur_state.opers.findLastIndex(v => v.rest_items.length)
                    let oper:Oper2Parse|undefined=(()=>{
                        if (req_oper_id !== -1) {
                            const req_oper = cur_state.opers[req_oper_id]!, req_sign = req_oper.rest_items[0]!
                            if (req_sign.type == "exp") {
                                throw new InternalError("式が2個連続する演算子が見つかりました。")
                            }
                            if (sign == req_sign.sign) {
                                const times = cur_state.opers.length - req_oper_id - 1
                                
                                for (let i = 0; i < times; i++) {
                                    push_exp(cur_state.opers, cur_state.exps)
                                }
                                let res = req_oper
                                res.rest_items.shift()
                                cur_state.head++;
                                return res
                            }
                        }
                        return;
                    })()
                    if(!oper){
                        const sign = get_sign(token)
                        const opers = exp_start_opers.get(sign)
                        if (opers === undefined) {
                            if (sign_start_opers.has(sign)) {
                                backtrack(new SyntaxError(`式をただ単に2個続けることはできません。`), head)
                            } else {
                                backtrack(new SyntaxError(`"${sign}"が想定外の位置では現れました。`), head, -5)
                            }
                            continue
                        }
                        {
                            let tmp: ParseState | undefined, tmp_: ParseState[]
                            [tmp, ...tmp_] = opers.map<ParseState>(i =>  {
                                const v = get_oper2parse(i)
                                const is_0 = v.rest_items.at(0)?.type !== "sign"
                                if(is_0)v.rest_items.shift()
                                const opers = [...cur_state.opers]
                                const exps = [...cur_state.exps]
                                let oper: Oper2Parse|undefined, pri:number|null|undefined
                                while ((pri=(oper = opers.at(-1))?.priority)!=undefined&&pri<i.priority) {
                                    push_exp(opers, exps)
                                }
                                opers.push(v)
                                return {
                                    head: head + 1,
                                    exps: exps,
                                    opers: opers,
                                    state: is_0 ? 0 : 2
                                }
                            })
                            cur_state = tmp!
                            alt_states.unshift(...tmp_)
                            oper=cur_state.opers.at(-1)!
                        }
                    }
                    cur_state.state=check_oper(cur_state.opers, cur_state.exps)
                    continue
                }
            case 2:
                {
                    let sign:Sign
                    const req_oper = cur_state.opers.at(-1)!, req_sign = (req_oper.rest_items[0] as PatternItem & {type: "sign"}).sign
                    if (!is_sign(token)||(sign=get_sign(token))!==req_sign) {
                        backtrack(new SyntaxError(`${req_sign}が必要です`), head);
                        continue
                    }
                    cur_state.state=check_oper(cur_state.opers, cur_state.exps)
                }
        }
        cur_state.head++;
    }
    console.log(JSON.stringify({
        cur_state,
        alt_states,
    },undefined,4))
    {
        const exps = cur_state.exps;
        while(cur_state.opers.length){
            const oper = cur_state.opers.pop()!
            const id = oper.id;
            exps.push({
                type: "oper",
                id: id,
                args: popArgs(id, exps) as any
            })
        }
        return exps.at(-1)!
    }
}
