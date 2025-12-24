process.stdin.setEncoding("utf8");
import * as readline from "node:readline/promises";
export default readline.createInterface({
	input: process.stdin,
	output: process.stdout
});