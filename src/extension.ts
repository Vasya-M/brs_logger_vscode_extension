// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fetch from 'node-fetch';


export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.LogFunc', async () => {
			runLogFunc();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('extension.LogFuncUp', async () => {
		runLogFunc({
			SearchInUp: true
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('extension.LogFuncAll', async () => {
		runLogFunc({
			LogAll: true
		});
	});
	context.subscriptions.push(disposable);
	
	disposable = vscode.commands.registerCommand('extension.InserLogFuncCode', () => {
		console.log("InserLogFuncCode")
		insertFuncLogSourceCode();
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}

let functionStartRegx = /^ *(?:sub|function) +(.*?) *\(.*\).*$/i;
let logFuncRegx = /^.*logfunc\((?: *"(.*?)" *?\)|.*).*$/i; // logFunc("a"), logFunc( "a"), logFunc("a" ), logFunc(foo), logFunc(foo + "a")

async function runLogFunc(options: any = {}) {
	let needSearchInUp = options.SearchInUp == true;
	let needLogAll = options.LogAll == true;

	let editor = vscode.window.activeTextEditor;
	if (editor == undefined) {return}
	
	const document = editor.document;
	const selection = editor.selection;

	let currentLinePos = needLogAll? document.lineCount -1  : selection.active.line;
	let endIndex = needSearchInUp || needLogAll? 0 : currentLinePos;

	let index = currentLinePos;
	let changes: (string | vscode.Range)[][] = [];
	let ignoreFunctionsList = new Map<string, boolean>();
	let skipNextFucntion = false;

	while (index >= endIndex) {

		let line = document.lineAt(index)
		let text = line.text;

		let match = text.match(logFuncRegx)
		if (match){
			// if (match[1] !== undefined) {
			// 	ignoreFunctionsList.set(match[1], true);
			// }
			skipNextFucntion = true
		} else {
			match = text.match(functionStartRegx)
			if (match && !skipNextFucntion && ignoreFunctionsList.get(match[1]) !== true){
				let newtext = `${match[0]}\n    _ = logfunc(\"${match[1]}\")`;
				changes.push([line.range, newtext]);
				if (! needLogAll) {break;}
			}
			if (match) {skipNextFucntion = false}
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

async function insertFuncLogSourceCode() {
	console.log("insertFuncLogSourceCode")

	let url = "https://raw.githubusercontent.com/Vasya-M/brs_logger/master/source/utilities/FuncLogger.brs";
	let sourceCode = await (await fetch(url)).text()

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