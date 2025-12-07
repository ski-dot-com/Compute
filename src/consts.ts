/**
 * パターンを構成する要素。
 */
export type PatternItem = {
    /**
     * パターンの種類。記号パターンであることを表す。
     */
    type: "sign",
    /**
     * 記号。
     */
    sign: string
}|{
    /**
     * パターンの種類。式パターンであることを表す。
     */
    type: "exp",
    /**
     * 取る式の中で許容する演算子の最低の優先順位のID。
     * 両側演算子(前と後ろに式が現れる演算子)の端の項でしか意味がなく、しかも、無結合演算子には効かない上、右結合の場合は後置単項演算子、左結合演算子の場合は前置単項演算子にも効かない。
     * 省略した場合は、自分の一つ上の優先順位。
     */
    limit?: string
}

/**
 * 演算子の定義。
 */
export type Operator = {
    /**
     * 演算子の種類
     * * `"chain"`: 結合演算子(前か後ろに自分と同じ種類の項が現れるやつ。大体の単項演算子と二項演算子はこれ)
     * * `"value"`: 無結合演算子(前にも後ろにも自分と同じ種類の項が現れないやつ。例) (...), [...])
     */
    type: "chain"|"value",
    /**
     * この演算子が取る形式を表す配列で、前置/右結合演算子の場合は最後の、後置/左結合演算子の場合は最初の項を除いて記述する。
     */
    pattern: PatternItem[],
    /**
     * この演算子のID
     */
    id: string
}

/**
 * 優先順位の定義。
 */
export type OperatorProiority = {
    /**
     * この優先順位に所属する演算子の定義の配列。
     */
    operators: Operator[],
    /**
     * この優先順位のID。省略した場合はなし。
     */
    id?: string,
    /**
     * 前置/右結合演算子にするかどうか。
     * 同じ優先順位の中で、前置/右結合演算子と後置/左結合演算子を同居させることはできない。
     */
    is_right: boolean
}

export const operator_proiorities = [
    {
        operators:[
            {
                id: "neg",
                type: "chain",
                pattern:[{
                    type: "sign",
                    sign: "-"
                }]
            },
        ],
        is_right: true
    },
    {
        operators:[
            {
                id: "mul",
                type: "chain",
                pattern:[{
                    type: "sign",
                    sign: "*"
                },{
                    type: "exp",
                }]
            },
            {
                id: "div",
                type: "chain",
                pattern:[{
                    type: "sign",
                    sign: "/"
                },{
                    type: "exp",
                }]
            },
        ],
        is_right: false
    },
    {
        operators:[
            {
                id: "add",
                type: "chain",
                pattern:[{
                    type: "sign",
                    sign: "+"
                },{
                    type: "exp",
                }]
            },
            {
                id: "sub",
                type: "chain",
                pattern:[{
                    type: "sign",
                    sign: "-"
                },{
                    type: "exp",
                }]
            },
        ],
        is_right: false
    },
] as const satisfies OperatorProiority[]
export const signs = operator_proiorities.flatMap(pri=>pri.operators.flatMap(oper=>oper.pattern.flatMap()))