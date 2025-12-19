import { type Token, is_sign, get_sign, is_number, get_number } from "./tokenizer";
import { type OpersItemType, type OperType, type OperID, type ArgTypeOf, type PatternItem, operator_proiorities, signs, opers, popArgs, raise, InternalError, pri_ids, Sign } from "./common";

/**
 * 抽象構文木（AST）の型。
 */
export type AST = ({
    [K in OperID]: {
        /**
         * 演算子のID。
         */
        id: K,
        /**
         * 演算子の引数の配列。
         */
        args: ArgTypeOf<K, AST>
    }
}[OperID]) & {
    /**
     * ノードの種類を示すタグ。このノードが演算子が作る式を表すことを示す。
     */
    type: "oper",
} | {
    /**
     * ノードの種類を示すタグ。このノードが数値を表すことを示す。
     */
    type: "number",
    /**
     * 実際の値。
     */
    value: number
}

/**
 * パース中に使用する演算子の情報。
 * 演算子のID、残りのパターン項目、優先順位を保持する。
 */
type Oper2Parse = {
    /**
     * この演算子のID。
     */
    id: OperID,
    /**
     * この後くるべき要素の配列。先頭の式は除く。
     */
    rest_items: PatternItem[],
    /**
     * 子の式がとして許容する演算子の最低の優先順位。値が小さい方が優先順位が大きいので気をつけること。
     */
    priority: number | null
}

/**
 * この演算子が作る式が式から始まるかを返す。
 * @param v 調べる演算子
 * @returns この演算子が作る式が式から始まるか。
 */
function is_exp_start(v: OpersItemType) {
    return v.type == "chain" && ((!v.is_right) || v.pattern[0]?.type == "exp")
}

/**
 * この演算子が作る式が式で終わるかを返す。
 * @param v 調べる演算子
 * @returns この演算子が作る式が式で終わるか。
 */
function is_exp_end(v: OpersItemType) {
    return v.type == "chain" && ((v.is_right) || v.pattern.at(-1)?.type == "exp")
}
// 演算子の最初の記号を取得する
function get_first_sign(v: OperType) {
    return v.pattern.filter(v => v.type == "sign")[0]?.sign ?? raise(new InternalError("記号を一切含まない演算子が見つかりました。"))
}
/**
 * 演算子の優先順位と残りのパターンを計算する。
 * @param v 変換する演算子項目
 * @returns 生成されたOper2Parseオブジェクト
 */
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
/**
 * 同じ記号で始まる演算子をグループ化し、長さの降順でソートする。
 * @param opers グループ化する演算子の配列
 * @returns 記号をキーとしたMap
 */
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
// 記号から始まる演算子をグループ化したもの
const sign_start_opers = group_with_sign(opers.filter(v => !is_exp_start(v)))
// 式から始まる演算子をグループ化したもの
const exp_start_opers = group_with_sign(opers.filter(v => is_exp_start(v)))
// console.log(JSON.stringify({
//     value_start_opers: Object.fromEntries(sign_start_opers.entries()),
//     exp_start_opers: Object.fromEntries(exp_start_opers.entries())
// }, undefined, 4))
type ParseEnvironment = {
    /**
     * 現在パース中のトークンのトークン列上の位置。
     */
    head: number,
    /**
     * 現在の環境の式スタック。
     */
    exps: AST[],
    /**
     * 現在の環境の演算子スタック。
     */
    opers: Oper2Parse[],
    /**
     * 0: 式の前
     * 1: 式の後ろ一般
     * 2: 次に記号が来ないと詰むやつ
     */
    state: 0 | 1 | 2
}
/**
 * 末尾の演算子を取り出し、それが作る式を式スタックに入れる。
 * @param opers 現在の環境の演算子スタック
 * @param exps 現在の環境の式スタック
 */
function push_exp(opers: Oper2Parse[], exps: AST[]){
    const id = opers.pop()!.id;
    exps.push({
        type: "oper",
        id: id,
        args: popArgs(id, exps) as any
    })
}
/**
 * 演算子が記号を受け取り、rest_itemsから記号が取り除かれた後に演算子に対して行うべき操作を行う。
 * @param opers 現在の環境の演算子スタック
 * @param exps 現在の環境の式スタック
 * @returns 移行するべき状態
 */
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
/**
 * トークンのリストをパースしてASTを構築するメイン関数。
 * バックトラッキングを使用して構文解析を行います。
 * @param tokens パースするトークンの配列
 * @returns 構築されたAST
 */
export function parse(tokens: Token[]) {
    // console.log(tokens)
    /**
     * 現在のパース環境。
     */
    let cur_environment: ParseEnvironment = {
        head: 0,
        exps: [],
        opers: [],
        state: 0,
    };
    /**
     * 代替のパース環境の配列。
     */
    let alt_environments: ParseEnvironment[] = []
    /**
     * 現在の最も深いエラー情報。
     */
    let cur_error: Error | undefined, cur_at = -1, cur_priority = 0;
    // バックトラック関数：エラーが発生したときに以前の状態に戻る
    function backtrack(error: Error, at: number, priority: number = 0) {
        if ((cur_at - at || cur_priority - priority) < 0) {
            error.message=`@${at}: ${error.message}`
            cur_error = error;
            cur_at = at;
            cur_priority = priority;
        }
        cur_environment = alt_environments.shift() ?? raise(cur_error)
    }
    const len_tokens = tokens.length
    let head: number
    // トークンを順に処理するメインループ
    while ((head = cur_environment.head) !== len_tokens || (
        [()=>(backtrack(new SyntaxError("最後に式が必要です。"), len_tokens), true),()=>false, ()=>(backtrack(new SyntaxError(`最後に"${(cur_environment.opers.at(-1)!.rest_items[0]as PatternItem&{type:"sign"}).sign}"が必要です。`), len_tokens), true)][cur_environment.state]!()
    )) {
        const token = tokens[head]!;
        // console.log(JSON.stringify({
        //     cur_state,
        //     alt_states,
        //     token,
        // },undefined,4))
        switch (cur_environment.state) {
            case 0: // 式の前の状態
                {
                    if (is_sign(token)) {
                        const sign = get_sign(token)
                        const opers = sign_start_opers.get(sign)
                        if (opers === undefined) {
                            if (exp_start_opers.has(sign) || (()=>{
                                const req_sign = cur_environment.opers.findLast(v => v.rest_items.length)?.rest_items[0];
                                return req_sign?.type=="sign"&&req_sign.sign==sign
                            })()) {
                                backtrack(new SyntaxError(`"${sign}"の前には式が必要です。`), head)
                            } else {
                                backtrack(new SyntaxError(`"${sign}"が想定外の位置で現れました。`), head, -5)
                            }
                            continue
                        }
                        {
                            let tmp: ParseEnvironment | undefined, tmp_: ParseEnvironment[]
                            [tmp, ...tmp_] = opers.map(get_oper2parse).map<ParseEnvironment>(v =>  {
                                const is_0 = v.rest_items.at(0)?.type !== "sign"
                                if(is_0)v.rest_items.shift()
                                return {
                                    head: head + 1,
                                    exps: [...cur_environment.exps],
                                    opers: [...cur_environment.opers, v],
                                    state: is_0 ? 0 : 2
                                }
                            })
                            cur_environment = tmp!
                            alt_environments.unshift(...tmp_)
                        }
                        continue
                    }
                    if (is_number(token)) {
                        cur_environment.exps.push({
                            type: "number",
                            value: get_number(token)
                        })
                        cur_environment.state=1
                    }
                }
                break;
            case 1: // 式の後の状態
                {
                    if (!is_sign(token)) {
                        backtrack(new SyntaxError(`式をただ単に2個続けることはできません。`), head)
                        continue
                    }
                    const sign = get_sign(token)
                    const req_oper_id = cur_environment.opers.findLastIndex(v => v.rest_items.length)
                    let oper:Oper2Parse|undefined=(()=>{
                        if (req_oper_id !== -1) {
                            const req_oper = cur_environment.opers[req_oper_id]!, req_sign = req_oper.rest_items[0]!
                            if (req_sign.type == "exp") {
                                throw new InternalError("式が2個連続する演算子が見つかりました。")
                            }
                            if (sign == req_sign.sign) {
                                const times = cur_environment.opers.length - req_oper_id - 1
                                
                                for (let i = 0; i < times; i++) {
                                    push_exp(cur_environment.opers, cur_environment.exps)
                                }
                                let res = req_oper
                                res.rest_items.shift()
                                cur_environment.head++;
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
                            let tmp: ParseEnvironment | undefined, tmp_: ParseEnvironment[]
                            [tmp, ...tmp_] = opers.map<ParseEnvironment>(i =>  {
                                const v = get_oper2parse(i)
                                const is_0 = v.rest_items.at(0)?.type !== "sign"
                                if(is_0)v.rest_items.shift()
                                const opers = [...cur_environment.opers]
                                const exps = [...cur_environment.exps]
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
                            cur_environment = tmp!
                            alt_environments.unshift(...tmp_)
                            oper=cur_environment.opers.at(-1)!
                        }
                    }
                    cur_environment.state=check_oper(cur_environment.opers, cur_environment.exps)
                    continue
                }
            case 2: // 次に記号が必要な状態
                {
                    let sign:Sign
                    const req_oper = cur_environment.opers.at(-1)!, req_sign = (req_oper.rest_items[0] as PatternItem & {type: "sign"}).sign
                    if (!is_sign(token)||(sign=get_sign(token))!==req_sign) {
                        backtrack(new SyntaxError(`${req_sign}が必要です`), head);
                        continue
                    }
                    cur_environment.state=check_oper(cur_environment.opers, cur_environment.exps)
                }
        }
        cur_environment.head++;
    }
    // console.log(JSON.stringify({
    //     cur_state,
    //     alt_states,
    // },undefined,4))
    // 残りの演算子を処理して最終的なASTを構築
    {
        const exps = cur_environment.exps;
        while(cur_environment.opers.length){
            const oper = cur_environment.opers.pop()!
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
