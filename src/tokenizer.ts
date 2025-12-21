import { signs, type Sign, SyntaxError } from "./common";


export type SignToken = string
export type IdentifierToken = string
export type NumberToken = string
/**
 * トークンの型
 */
export type Token = SignToken|IdentifierToken|NumberToken
/**
 * コードをトークンに分割する。
 * @param code 分割するコード
 * @returns 分割されたトークンの配列
 */
export default function tokenize(code:string):Token[]{
	let tokens=code.split(/\s+/g).flatMap(x=>[" ","?"+x]).slice(1)
	tokens=signs.reduce((tokens,sign)=>
		tokens.flatMap(token=>token[0]=="?"?token.slice(1).split(sign).flatMap(p=>["*"+sign,"?"+p]).slice(1).filter(p=>p!=="?"):token)
	,tokens)
	let res:Token[]=[]
	for(let i = 0;i<tokens.length;i++){
		let token=tokens[i]!;
		if(i<tokens.length-1&&/^\?\d/.test(token) && tokens[i+1]==="*."){
			token+="."
			i++;
		}
		if(i<tokens.length-1&&/^(\?\d.*|\*)\.$/.test(token) && /^\?\d/.test(tokens[i+1]!)){
			token+=tokens[i+1]!.slice(1)
			i++;
		}
		if(i<tokens.length-2&&/^\?(([1-9]\d*|0)(\.\d*)?|\.\d+)[eE]$/.test(tokens[i]!)&&/^\*[+-]$/.test(tokens[i+1]!)&&/^\?(0|[1-9]\d*)$/.test(tokens[i+2]!)){
			res.push("#"+(tokens.slice(i,i+3).map(x=>x.slice(1)).join("")))
			i+=2
			continue;
		}
		if (token[0]=="?"){
			let tmp = token.slice(1);
			if(/^\d/.test(tmp)) {
				if(isNaN(+tmp)){
					throw new SyntaxError(`不正な数値リテラル: ${tmp}`)
				}
				res.push("#"+tmp)
				continue;
			}
			res.push("$"+tmp)
			continue;
		}
		if(token!=" "){
			res.push(token)
		}
	}
	return res
}
export function is_sign(token:Token): token is SignToken {
	return token[0]=="*"
}
export function get_sign(token:SignToken): Sign {
	return token.slice(1,) as Sign
}
export function is_number(token:Token): token is NumberToken {
	return token[0]=="#"
}
export function get_number(token:NumberToken): number {
	return +token.slice(1,)
}
export function is_identifier(token:Token): token is IdentifierToken {
	return token[0]=="$"
}
export function get_identifier(token:IdentifierToken): string {
	return token.slice(1,)
}