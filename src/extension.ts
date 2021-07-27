// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fetch from 'node-fetch';



export async function activate(context: vscode.ExtensionContext) {
	LoggerSourceCode() // load before use

	let disposable = vscode.commands.registerCommand('extension.LogFuncUp', async () => {
		runLogFunc({
			SearchInUp: true,
			tillFirstMatchOrFaild: true
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('extension.LogFuncAll', async () => {
		runLogFunc({
			LogAll: true
		});
	});
	context.subscriptions.push(disposable);
	
	disposable = vscode.commands.registerCommand('extension.InserLogFuncCode', async () => {
		insertFuncLogSourceCode();
	});
	context.subscriptions.push(disposable);
	
	disposable = vscode.commands.registerCommand('extension.LogCallers', async () => {
		runLogFunc({
			logCallers: true
		});
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}

let functionStartRegx = /^([ \t\s]*(?:sub|function) +(\w+) *\(.*\)(?:\s*as\s+\w+)?)(.*$)/i;
let logFuncRegx = /^.*logfunc\((?: *"(.*?)" *?\)|.*).*$/i; // logFunc("a"), logFunc( "a"), logFunc("a" ), logFunc(foo), logFunc(foo + "a")

let functionEndRegx = /^ *end +(?:sub|function).*$/i;
let anonymousFunctionStartRegx = /^.*(?:sub|function) *\(.*\).*$/i;

async function runLogFunc(options: any = {}) {
	let needSearchInUp = options.SearchInUp == true;
	let needLogAll = options.LogAll == true;
	let needLogCallers = options.logCallers == true;
	let curFuncName = "";

	let editor = vscode.window.activeTextEditor;
	if (editor == undefined) {return}
	
	const document = editor.document;
	const selection = editor.selection;

	let currentLinePos = needLogAll? document.lineCount -1  : selection.active.line;
	let endIndex = 0

	let index = currentLinePos;
	let changes: (string | vscode.Range)[][] = [];
	let fileName = document.fileName.split("/").pop();
	let skipNextFucntion = false;
	let needLogFunc = true;

	while (index >= endIndex) {

		let line = document.lineAt(index)
		let text = line.text;

		let match = text.match(logFuncRegx) 
		if (match){
			// will skip logging next function definition.
			skipNextFucntion = true
		} else if (curFuncName.length > 0 &&  !needLogFunc && isFunctionCalled(curFuncName, text) && !text.match(functionStartRegx)) {
			// says that current function has call of curFuncName
			needLogFunc = true
		} else {
			match = text.match(functionStartRegx)
			if (match && !skipNextFucntion && needLogFunc){
				let newtext = `${match[1]}\n    _ = logfunc(\"${match[2]}\") \n    ${match[3]}`;
				changes.push([line.range, newtext]);
			}

			if (match) {				
				if (needLogCallers && curFuncName === "") {
					// start looking for function callers and logging them.
					curFuncName = match[2]
					index = document.lineCount -1 
				}
				
				
				if (needLogCallers) {needLogFunc = false} // need reset state to find next function call. 
				skipNextFucntion = false
			}
			if (match && options.tillFirstMatchOrFaild) {break;}
		}
		index--;
	}	

	editor.edit(editBuilder => {
		changes.forEach(element => {
			if (element[0] instanceof vscode.Range && typeof element[1] === 'string' ) {
				editBuilder.replace(element[0], element[1]);
			}
		});
	})
}

function isFunctionCalled(funcName: string, line: string) {
	let functionCallRegex = new RegExp('^[^\']*'+funcName+'\\(.*$', 'i');
	return line.match(functionCallRegex)
}
let funcLoggerSourceCode: string = "";
async function LoggerSourceCode() {
	if (funcLoggerSourceCode == "") {
		console.log("downloading LOGGER")
		let url = "https://raw.githubusercontent.com/Vasya-M/brs_logger/master/source/utilities/FuncLogger.brs";
		funcLoggerSourceCode = await (await fetch(url)).text()
	}
	return funcLoggerSourceCode // return coppy
}

async function insertFuncLogSourceCode() {
	console.log("insertFuncLogSourceCode")

	let sourceCode = await LoggerSourceCode()

	let editor = vscode.window.activeTextEditor;
	if (editor == undefined) {return}

	const document = editor.document;
	const selection = editor.selection;
	editor.edit(editBuilder => {
		if (editor == undefined) {return}
		let lastLine = editor.document.lineAt(editor.document.lineCount - 1);
		editBuilder.insert(lastLine.range.end, "\n\n" + sourceCode)
	});
}