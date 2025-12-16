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
		],
		is_right: false
	},
	{
		id: "ari_pref",
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
] as const satisfies OperatorProiority[]
export const signs = [...new Set([
	...operator_proiorities.flatMap(pri=>pri.operators.flatMap(oper=>oper.pattern.filter(x=>x.type=="sign").flatMap(x=>x.sign))),
])]
export const pri_ids = operator_proiorities.map(x=>x.id)
export type PriID=typeof pri_ids[number]
// type OperType=(typeof operator_proiorities)[number]["operators"][number]
export const opers = operator_proiorities.flatMap((x,priority)=>x.operators.map(y=>({...y, priority, is_right:x.is_right}))) 
export type OperType = NonNullable<typeof opers[number]>
export type OpersItemType = Operator&{priority:number, is_right:boolean}
// const a_:OpersItemType=opers[0]!
export const oper_ids = opers.map(x=>x.id)
export type OperID = OperType["id"]
type OperTypeOf<ID extends OperID> = (OperType&{id: ID})
type OperTypeTypeOf<ID extends OperID> = OperTypeOf<ID>["type"]
type ArgTypeMain<Pattern extends PatternItem[], Exp> = Pattern extends [infer Head, ...infer Tail]?(
	Head extends PatternItem?(
		Tail extends PatternItem[]?(
			Head["type"] extends "exp"?[Exp, ...ArgTypeMain<Tail,Exp>]:ArgTypeMain<Tail,Exp>
		):never
	):never
):[];
export type ChainPartOf<ID extends OperID, Exp = {}> = OperTypeTypeOf<ID> extends "chain"?[Exp]:[]
export type ArgTypeOf<ID extends OperID, Exp = {}> = [...(ChainPartOf<ID, Exp>), ...ArgTypeMain<OperTypeOf<ID>["pattern"], Exp>]
// declare const a :ArgTypeOf<"add",number>

export function raise(err?:Error):never{
	throw err;
}

export class SyntaxError extends Error {
	constructor(...args:ConstructorParameters<ErrorConstructor>){
		super(...args)
		this.name="SyntaxError"
	}
}

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
export function popArgs<ID extends OperID, Exp>(id:ID, exps:Exp[]):ArgTypeOf<ID, Exp>{
	const target_oper:OperTypeOf<ID>=opers.filter<OperTypeOf<ID>>((x=>x.id==id) as (value:OperType)=>value is OperTypeOf<ID>)[0] ?? raise(new InternalError("IDがみつかりませんでした。"))
	return [...(target_oper.type=="chain"?[exps.pop()??raise(new InternalError("式が足りませんでした。"))]:[]), ...target_oper.pattern.filter(v=>v.type=="exp").map(_=>exps.pop()??raise(new InternalError("式が足りませんでした。")))].reverse() as ArgTypeOf<ID, Exp>
}
export type Sign=NonNullable<(typeof signs)[0]>

// type ReturnTypeWith<T extends (..._:Args)=>any, Args extends any[]> = T extends (..._:Args)=> infer R?R:never

// declare const a:ReturnTypeWith<typeof popArgs, ["pri",{}[]]>

export function apply_to_each_pattern<A extends string | number | symbol, M extends {[K in A]: any}>(){
	return function res<F extends <K extends A>(k:K)=>M[K]>(f:F){
		return f as ({[K in A]: (f:(k:K)=>M[K])=>void}[A] extends ((k: infer I)=> void)?I:never)
	}
}
// apply_to_each_pattern<"a"|"b",{"a":["a","c"], "b": ["b", "d"]}>()(0 as any)("a")
