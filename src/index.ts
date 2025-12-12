import tokenize from "./tokenizer"
process.stdin.setEncoding("utf8");
import * as readline from "node:readline/promises";
var reader = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

async function main(){
	reader.on("SIGINT", ()=>{
		process.exit()
	})
	while(true){
		console.log(tokenize(await reader.question("> ")))
	}
}

main()