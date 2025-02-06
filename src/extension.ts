import * as vscode from 'vscode';
import fs = require("node:fs");
import path = require("node:path");

export async function activate(context: vscode.ExtensionContext) {

const workspaceRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

const filesByPackageManager: { [key in "npm" | "yarn" | "pnpm" | "bun"]: string } = {
	npm: 'package-lock.json',
	yarn: 'yarn.lock',
	pnpm: 'pnpm-lock.yaml',
	bun: 'bun.lock'
};

const isQwik = await isQwikProject(`${workspaceRoot}/package.json`);
const packageManagerUsed = getPackageManager(workspaceRoot as string, filesByPackageManager)?.command;
const canProceed = Boolean(workspaceRoot && isQwik && packageManagerUsed);

// still need to register the command so that the errors appear and don't crash the extension
 const addTsxRouteCommand = vscode.commands.registerCommand('qwik-shortcuts.addTsxRoute', async () => {

	if(canProceed) {
		await addTsxRoute(packageManagerUsed as string);
	}

	// error handling
		// if these are not here, the extension will crash, and won't show the error messages
		// this is because context.subscriptions.push(addTsxRouteCommand); will not be called
	errorHandling(workspaceRoot, isQwik, packageManagerUsed, filesByPackageManager);

});
	context.subscriptions.push(addTsxRouteCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}

interface PackageManager {
	command: string;
}



function getPackageManager(workspaceRoot: string, filesByPackageManager:object ): PackageManager | undefined {

    for (const packageManager in filesByPackageManager) {
		const filePath = path.join(workspaceRoot, filesByPackageManager[packageManager as keyof typeof filesByPackageManager]);
        if (fs.existsSync(filePath)) {
            return { command: packageManager };
        }
    }
    return undefined;
}

async function addTsxRoute(packageManager: string) {

	const input = await vscode.window.showInputBox({
		prompt: 'What is the name of the route',
		placeHolder: 'testing'
	});
	if (input) {
		const transformedInput = transformInput(input);
		const terminal = vscode.window.createTerminal("Qwik Shortcuts");
		terminal.sendText(`${packageManager} run qwik new /${transformedInput}`);
		terminal.show();
	} else {
		vscode.window.showErrorMessage('No Route Details Entered.');
	}
}


async function isQwikProject(packageJsonPath: string): Promise<boolean> {
    try {
        const packageJson = await fs.promises.readFile(packageJsonPath, 'utf-8');
        const data = JSON.parse(packageJson);

        if (
            data?.devDependencies?.["@qwik.dev/router"] ||
            data?.devDependencies?.["@builder.io/qwik-city"]
        ) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error reading package.json:', error);
        return false;
    }
}


/**
 * Transforms the input string by trimming, converting to lowercase, and replacing spaces with hyphens.
 * The regex is to find all occurrences of text within parentheses and wraps them in double quotes.
 * The reason for this is that () causes an error in the terminal, and will not work without the quotes.
 *
 * @param {string} input - The input string to be transformed.
 * @returns {string} - The transformed string.
 *
 * Example:
 * transformInput((admin)/profile))
 * // returns "(admin)"/profile
 *
 * Example Command to give an idea of why:
 * pnpm run qwik new /"(admin)"/profile
 */

function transformInput(input: string): string {

	let updatedInput = input.trim().toLowerCase().replace(/ /g, '-');
	// adds support for grouped layouts
	// e.g. (admin) -> "(admin)"
	//
	const regex = /\([a-zA-Z]+\)/g;
	const matches = input.match(regex);
	if (!matches) {
		return updatedInput;
	}
	for (let index = 0; index < matches.length; index++) {
		const element = matches[index];
		updatedInput = updatedInput.replace(element, `"${element}"`);
	}

	return updatedInput;
}



function errorHandling(workspaceRoot: string | undefined, isQwik: boolean, packageManagerUsed: string | undefined, filesByPackageManager: { [key: string]: string }): boolean|undefined {
    if (!workspaceRoot) {
        vscode.window.showErrorMessage("Workspace not found.");
        return false;
    }
    if (!isQwik) {
        vscode.window.showErrorMessage("Not a Qwik Project");
        return false;
    }
    if (!packageManagerUsed) {
        const packageManagersSearchedFor = `${Object.values(filesByPackageManager)}`;
        vscode.window.showErrorMessage(`Package manager was not found, ${packageManagersSearchedFor}`);
        return false;
    }
    return;
}