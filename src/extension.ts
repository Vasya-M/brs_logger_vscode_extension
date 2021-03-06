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


function runLogFunc(options: any = {}) {
	let needSearchInUp = options.SearchInUp == true;
	let needLogAll = options.LogAll == true;

	let editor = vscode.window.activeTextEditor;
	if (editor == undefined) {return}
	
	const document = editor.document;
	const selection = editor.selection;

	let regexp = /^ *(?:sub|function) +(.*)\(.*\).*$/i;
	let currentLinePos = needLogAll? document.lineCount -1  : selection.active.line;
	let endIndex = needSearchInUp || needLogAll? 0 : currentLinePos;

	let index = currentLinePos;
	let changes: (string | vscode.Range)[][] = [];
	while (index >= endIndex) {

		let line = document.lineAt(index)
		let text = line.text;

		let match = text.match(regexp)
		if (match){
			let newtext = `${match[0]}\n    _ = logfunc(\"${match[1]}\")\n`;
			
			if( needSearchInUp ){
				vscode.window.showQuickPick(
					["yes", "no"].map(label => ({label})),
					{
						placeHolder: `do you want log <${match[1]}> funciton ?`,
					}).then( value => {
						if (value && value.label == "yes"){
							if (!editor) {return}
							editor.edit(editBuilder => {
								editBuilder.replace(line.range, newtext);
							});
						}
				});
			} else {
				changes.push([line.range, newtext]);
			}
			if (! needLogAll) {break;}
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

function insertFuncLogSourceCode() {
	console.log("insertFuncLogSourceCode")

	let url = "https://raw.githubusercontent.com/Vasya-M/brs_logger/master/source/utilities/FuncLogger.brs";
	fetch(url)
	.then(function(response) {
			response.text().then(function(text) {
				let editor = vscode.window.activeTextEditor;
				if (editor == undefined) {return}
				
				const document = editor.document;
				const selection = editor.selection;
				editor.edit(editBuilder => {
					if (editor == undefined) {return}
					let lastLine = editor.document.lineAt(editor.document.lineCount - 1);
					editBuilder.insert(lastLine.range.end, "\n\n" + text)
				});
			});
	});
}