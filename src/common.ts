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
	limit?: PriID
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
	id: string,
	/**
	 * 前置/右結合演算子にするかどうか。
	 * 同じ優先順位の中で、前置/右結合演算子と後置/左結合演算子を同居させることはできない。
	 */
	is_right: boolean
}

/**
 * 優先順位の配列。
 * 前に来るほど優先順位が高く、この配列における添字がその優先順位の値になる。
 */
export const operator_proiorities = [
	{
		id: "atom",
		operators:[
			{
				id: "pri",
				type: "value",
				pattern:[{
					type: "sign",
					sign: "("
				},{
					type: "exp"
				},{
					type: "sign",
					sign: ")"
				}]
			},
			{
				id: "lst",
				type: "value",
				pattern:[{
					type: "sign",
					sign: "["
				},{
					type: "exp"
				},{
					type: "sign",
					sign: "]"
				}]
			},
			{
				id: "blk",
				type: "value",
				pattern:[{
					type: "sign",
					sign: "{"
				},{
					type: "exp"
				},{
					type: "sign",
					sign: "}"
				}]
			},
			{
				id: "glb",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "#"
				}]
			},
			{
				id: "loc",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "$"
				}]
			},
		],
		is_right: true
	},
	{
		id: "pri",
		operators:[
			{
				id: "dot",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "."
				},{
					type: "exp",
				}]
			},
			{
				id: "cal",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "("
				},{
					type: "exp"
				},{
					type: "sign",
					sign: ")"
				}]
			},
			{
				id: "ind",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "["
				},{
					type: "exp"
				},{
					type: "sign",
					sign: "]"
				}]
			},
			{
				id: "bcl",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "{"
				},{
					type: "exp"
				},{
					type: "sign",
					sign: "}"
				}]
			},
			{
				id: "hsh",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "#"
				},{
					type: "exp",
				}]
			}
		],
		is_right: false
	},
	{
		id: "ari_pref",
		operators:[
			{
				id: "pos",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "+"
				}]
			},
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
		id: "term",
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
		id: "ari",
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
	{
		id: "cmp",
		operators:[
			{
				id: "eq",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "=="
				},{
					type: "exp",
				}]
			},
			{
				id: "neq",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "!="
				},{
					type: "exp",
				}]
			},
			{
				id: "lt",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "<"
				},{
					type: "exp",
				}]
			},
			{
				id: "gt",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: ">"
				},{
					type: "exp",
				}]
			},
			{
				id: "leq",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: "<="
				},{
					type: "exp",
				}]
			},
			{
				id: "geq",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: ">="
				},{
					type: "exp",
				}]
			},
		],
		is_right: false
	},{
		id: "asg",
		operators:[
			{
				id: "asg",
				type: "chain",
				pattern:[{
					type: "exp",
				},{
					type: "sign",
					sign: "="
				}]
			},
			{
				id: "cas",
				type: "chain",
				pattern:[{
					type: "exp",
				},{
					type: "sign",
					sign: "$="
				}]
			}
		],
		is_right: true
	},{
		id: "sep",
		operators:[
			{
				id: "tup",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: ","
				},{
					type: "exp",
				}]
			},{
				id: "tup_lst",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: ","
				}]
			}
		],
		is_right: false
	},{
		id: "stm",
		operators:[
			{
				id: "stm",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: ";"
				},{
					type: "exp",
				}]
			},{
				id: "stm_lst",
				type: "chain",
				pattern:[{
					type: "sign",
					sign: ";"
				}]
			}
		],
		is_right: false
	}
] as const satisfies OperatorProiority[]
/**
 * 演算子として用いられる記号の配列。
 */
export const signs = [...new Set([
	...operator_proiorities.flatMap(pri=>pri.operators.flatMap(oper=>oper.pattern.filter(x=>x.type=="sign").flatMap(x=>x.sign))),
])]
/**
 * 演算子として用いられる記号の型。
 */
export type Sign=NonNullable<(typeof signs)[0]>

/**
 * 優先順位のIDの配列。添字nに優先順位nのIDが入っている。
 */
export const pri_ids = operator_proiorities.map(x=>x.id)
/**
 * 優先順位のIDの型。実際の値を元に決まる。
 */
export type PriID=typeof pri_ids[number]
// type OperType=(typeof operator_proiorities)[number]["operators"][number]
/**
 * 優先順位の情報も含んだ演算子の配列。
 */
export const opers = operator_proiorities.flatMap((x,priority)=>x.operators.map(y=>({...y, priority, is_right:x.is_right}))) 
/**
 * 優先順位の情報も含んだ演算子の厳密な型。実際の値を元に決定される。
 */
export type OperType = NonNullable<typeof opers[number]>
/**
 * 優先順位の情報も含んだ演算子のゆるい型。ありえる値全てを含む型であるが、idの型がstringなので気をつけること。
 */
export type OpersItemType = Operator&{priority:number, is_right:boolean}
// const a_:OpersItemType=opers[0]!
/**
 * 演算子のIDの配列。
 */
export const oper_ids = opers.map(x=>x.id)
/**
 * 演算子のIDの型。実際の値を元に決まる。
 */
export type OperID = OperType["id"]
/**
 * idがIDである優先順位の情報も含んだ演算子の厳密な型。実際の値を元に決まる。
 */
type OperTypeOf<ID extends OperID> = (OperType&{id: ID})
/**
 * idがIDである優先順位の情報も含んだ演算子のtypeプロパティの厳密な型。実際の値を元に決まる。
 */
type OperTypeTypeOf<ID extends OperID> = OperTypeOf<ID>["type"]
type ArgTypeMain<Pattern extends PatternItem[], Exp> = Pattern extends [infer Head, ...infer Tail]?(
	Head extends PatternItem?(
		Tail extends PatternItem[]?(
			Head["type"] extends "exp"?[Exp, ...ArgTypeMain<Tail,Exp>]:ArgTypeMain<Tail,Exp>
		):never
	):never
):[];
export type ChainPartOf<ID extends OperID, Exp = {}> = OperTypeTypeOf<ID> extends "chain"?[Exp]:[]
/**
 * ある演算子の引数の配列の厳密な型。
 */
export type ArgTypeOf<ID extends OperID, Exp = {}> = [...(ChainPartOf<ID, Exp>), ...ArgTypeMain<OperTypeOf<ID>["pattern"], Exp>]
// declare const a :ArgTypeOf<"add",number>

/**
 * エラーを投げるだけの関数。throwの式版。
 * @param err 投げるエラー
 */
export function raise(err?:Error):never{
	throw err;
}
/**
 * 文法関係のエラー
 */
export class SyntaxError extends Error {
	constructor(...args:ConstructorParameters<ErrorConstructor>){
		super(...args)
		this.name="SyntaxError"
	}
}
/**
 * 内部エラー。あり得ないことが起こった時用。
 */
export class InternalError extends Error {
	constructor(...args:ConstructorParameters<ErrorConstructor>){
		super(...args)
		this.name="InternalError"
	}
}
// function check<S,T extends S>(l:S,r:T):l is T{
// 	return l===r
// }
// function getTypeOf<ID extends OperID>(v:OperTypeOf<ID>):OperTypeTypeOf<ID>{
// 	return v.type
// }
/**
 * 各演算子に必要な引数を式スタックから取り出して、それを配列にして返す関数。
 * @param id 演算子のID
 * @param exps 引数を取り出す式スタック
 * @returns 取り出した引数配列
 */
export function popArgs<ID extends OperID, Exp>(id:ID, exps:Exp[]):ArgTypeOf<ID, Exp>{
	const target_oper:OperTypeOf<ID>=opers.filter<OperTypeOf<ID>>((x=>x.id==id) as (value:OperType)=>value is OperTypeOf<ID>)[0] ?? raise(new InternalError("IDがみつかりませんでした。"))
	return [...(target_oper.type=="chain"?[exps.pop()??raise(new InternalError("式が足りませんでした。"))]:[]), ...target_oper.pattern.filter(v=>v.type=="exp").map(_=>exps.pop()??raise(new InternalError("式が足りませんでした。")))].reverse() as ArgTypeOf<ID, Exp>
}

