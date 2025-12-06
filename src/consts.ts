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
     * パターンの種類。子要素パターンであることを表す。
     */
    type: "child",
    /**
     * 取る子要素の種類。
     * * "exp": 式
     * * ""
     */
}

export type Operator = {
    /**
     * 演算子の種類
     * * "bin": 両側演算子(前と後ろに項が現れるやつ。どっちの方に結合するかはOperatorPriorityで決める。例) 四則演算子)
     * * "uni": 片側演算子(前と後ろに項が現れるやつ。どっちかはOperatorPriorityで決める。例) 単項-、インデクサ(i[1]みたいなやつ)、関数呼び出し、メンバアクセス("a.i"の"i"は式ではないため))
     * * "value": 無側演算子(前にも後ろにも項が現れないやつ。例) (...), [...])
     */
    type: "bin"|"uni"|"value",
    /**
     * この演算子が取る形式を表す配列で、前置/右結合演算子の場合は最後の、後置/左結合演算子。式を表したいときは"#exp"、""
     * 例: ["(", null, ")"]、["-"]
     */
    pattern: PatternItem[]
}
export type OperatorProiority 