import { parse } from "./parser";
import tokenize from "./tokenizer"
process.stdin.setEncoding("utf8");
import * as readline from "node:readline/promises";
var reader = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

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

function main(){
    // test_tokenizer()
    test_parser()
}

main()