import * as vscode from 'vscode';
import fs = require("node:fs");
import path = require("node:path");

export async function activate(context: vscode.ExtensionContext) {

const workspaceRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
let isQwik: boolean | undefined;
let packageManagerUsed: string | undefined;

const filesByPackageManager: { [key in "npm" | "yarn" | "pnpm" | "bun"]: string } = {
	npm: 'package-lock.json',
	yarn: 'yarn.lock',
	pnpm: 'pnpm-lock.yaml',
	bun: 'bun.lock'
};

if (workspaceRoot) {
	isQwik = await isQwikProject(`${workspaceRoot}/package.json`);
	packageManagerUsed = getPackageManager(workspaceRoot,filesByPackageManager)?.command;
}

// still need to register the command so that the errors appear and don't crash the extension
 const addTsxRouteCommand = vscode.commands.registerCommand('qwik-shortcuts.addTsxRoute', async () => {
	if(!workspaceRoot) {
		vscode.window.showErrorMessage("Workspace not found.");
		return;
	}
	if(!isQwik) {
		vscode.window.showErrorMessage("Not a Qwik Project");
		return;
	}
	if (!packageManagerUsed) {
		const packageManagersSearchedFor = `${Object.values(filesByPackageManager)}`;
		vscode.window.showErrorMessage(`Package manager was not found, ${packageManagersSearchedFor}`);
		return;
	}
	await addTsxRoute(packageManagerUsed);
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
		const terminal = vscode.window.createTerminal("Qwik Shortcuts");
		terminal.sendText(`${packageManager} run qwik new /${input.toLowerCase().trim().replace(/ /g, '-')}`);
		terminal.show();
	} else {
		vscode.window.showErrorMessage('Route Details Entered.');
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