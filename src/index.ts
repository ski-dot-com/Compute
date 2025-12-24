import { parse } from "./parser";
import { evaluate } from "./runtime";
import tokenize from "./tokenizer"
import reader from "./reader";
import { Environment, Scope } from "./environment";

async function test_tokenizer(){
	reader.on("SIGINT", ()=>{
		process.exit()
	})
	while(true){
		console.log(tokenize(await reader.question("> ")))
	}
}

async function test_parser(){
	reader.on("SIGINT", ()=>{
		process.exit()
	})
	while(true){
		try{
			console.log(JSON.stringify(parse(tokenize(await reader.question("> "))), undefined, 4))
		}catch(e){
			console.error(e)
		}
	}
}

async function main(){
    // test_tokenizer()
    // test_parser()
	reader.on("SIGINT", ()=>{
		process.exit()
	})
	const environment = new Environment(new Scope())
	while(true){
		try{
			console.log(evaluate(parse(tokenize(await reader.question("> ")))))
		}catch(e){
			console.error(e)
		}
	}
}

main()