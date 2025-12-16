import { signs, type Sign } from "./common";
/**
 * トークンの型
 */
export type Token = string
export type SignToken = string
export type NumberToken = string
export default function tokenize(code:string):Token[]{
	let tokens=code.split(/\s/g).map(x=>"?"+x)
	tokens=signs.reduce((tokens,sign)=>
		tokens.flatMap(token=>token[0]=="?"?token.slice(1).split(sign).flatMap(p=>["*"+sign,"?"+p]).slice(1).filter(p=>p!=="?"):token)
	,tokens)
	let tokens_old=tokens;tokens=[]
	for(let i = 0;i<tokens_old.length;i++){
		if(i<tokens_old.length-2&&/^\?(([1-9]\d*|0)(\.\d*)?|\.\d+)[eE]$/.test(tokens_old[i]!)&&/^\*[+-]$/.test(tokens_old[i+1]!)&&/^\?(0|[1-9]\d*)$/.test(tokens_old[i+2]!)){
			tokens.push("#"+tokens_old.slice(i,i+3).map(x=>x.slice(1)).join(""))
			i+=2
			continue;
		}
		const token=tokens_old[i]!
		if (token[0]=="?"){
			tokens.push("#"+token.slice(1))
			continue;
		}
		tokens.push(token)
	}
	return tokens
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