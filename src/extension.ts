import * as vscode from "vscode";
import fs = require("node:fs");
import path = require("node:path");

export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;

  const filesByPackageManager: {
    [key in "npm" | "yarn" | "pnpm" | "bun"]: string;
  } = {
    npm: "package-lock.json",
    yarn: "yarn.lock",
    pnpm: "pnpm-lock.yaml",
    bun: "bun.lock",
  };

  const isQwik = await isQwikProject(`${workspaceRoot}/package.json`);
  const packageManagerUsed = getPackageManager(
    workspaceRoot as string,
    filesByPackageManager
  )?.command;
  const canProceed = Boolean(workspaceRoot && isQwik && packageManagerUsed);

  // still need to register the command so that the errors appear and don't crash the extension
  const addTsxRouteCommand = vscode.commands.registerCommand(
    "qwik-shortcuts.addTsxRoute",
    async () => {
      // error handling
      // if these are not here, the extension will crash, and won't show the error messages
      // this is because context.subscriptions.push(addTsxRouteCommand); will not be called
      canProceed
        ? await addRoute(packageManagerUsed as string)
        : errorHandling(
            workspaceRoot,
            isQwik,
            packageManagerUsed,
            filesByPackageManager
          );
    }
  );
  context.subscriptions.push(addTsxRouteCommand);

  const addMDXRouteCommand = vscode.commands.registerCommand(
    "qwik-shortcuts.addMDXRoute",
    async () => {
      canProceed
        ? await addRoute(packageManagerUsed as string, ".mdx")
        : errorHandling(
            workspaceRoot,
            isQwik,
            packageManagerUsed,
            filesByPackageManager
          );
    }
  );
  context.subscriptions.push(addMDXRouteCommand);

  const addMDRouteCommand = vscode.commands.registerCommand(
    "qwik-shortcuts.addMDRoute",
    async () => {
      canProceed
        ? await addRoute(packageManagerUsed as string, ".md")
        : errorHandling(
            workspaceRoot,
            isQwik,
            packageManagerUsed,
            filesByPackageManager
          );
    }
  );
  context.subscriptions.push(addMDRouteCommand);

  const addCreateComponentCommand = vscode.commands.registerCommand(
    "qwik-shortcuts.createComponent",
    async () => {
      canProceed
        ? await addComponent(packageManagerUsed as string)
        : errorHandling(
            workspaceRoot,
            isQwik,
            packageManagerUsed,
            filesByPackageManager
          );
    }
  );
  context.subscriptions.push(addCreateComponentCommand);

  const addCreateQwikAstroJSXComponentCommand = vscode.commands.registerCommand(
    "qwik-shortcuts.addCreateQwikAstroJSXComponentCommand",
    async () => {
      const isQwikAstro = await isQwikAstroProject(
        `${workspaceRoot}/package.json`
      );
      const qwikAstroCanProceed = Boolean(
        workspaceRoot && isQwikAstro && packageManagerUsed
      );
      qwikAstroCanProceed
        ? await addQwikAstroComponent(context, "jsx")
        : errorHandling(
            workspaceRoot,
            isQwikAstro,
            packageManagerUsed,
            filesByPackageManager
          );
    }
  );

  context.subscriptions.push(addCreateQwikAstroJSXComponentCommand);

  const addCreateQwikAstroTSXComponentCommand = vscode.commands.registerCommand(
    "qwik-shortcuts.addCreateQwikAstroTSXComponentCommand",
    async () => {
      const isQwikAstro = await isQwikAstroProject(
        `${workspaceRoot}/package.json`
      );
      const qwikAstroCanProceed = Boolean(
        workspaceRoot && isQwikAstro && packageManagerUsed
      );
      qwikAstroCanProceed
        ? await addQwikAstroComponent(context, "tsx")
        : errorHandling(
            workspaceRoot,
            isQwikAstro,
            packageManagerUsed,
            filesByPackageManager
          );
    }
  );

  context.subscriptions.push(addCreateQwikAstroTSXComponentCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}

interface PackageManager {
  command: string;
}

function getPackageManager(
  workspaceRoot: string,
  filesByPackageManager: object
): PackageManager | undefined {
  for (const packageManager in filesByPackageManager) {
    const filePath = path.join(
      workspaceRoot,
      filesByPackageManager[
        packageManager as keyof typeof filesByPackageManager
      ]
    );
    if (fs.existsSync(filePath)) {
      return { command: packageManager };
    }
  }
  return undefined;
}

async function addRoute(packageManager: string, fileExtension?: string) {
  const input = await vscode.window.showInputBox({
    prompt: "What is the name of the route?",
    placeHolder: "product/[id]",
    validateInput: (value: string): string | null => {
      if (!value) {
        return "Route name cannot be empty";
      }
      // return empty string for valid input
      return "";
    },
  });
  if (input) {
    const transformedInput = transformInput(input);
    const terminal = vscode.window.createTerminal("Qwik Shortcuts");
    terminal.sendText(
      `${packageManager} run qwik new /${transformedInput}${
        fileExtension ? `${fileExtension}` : ""
      }`
    );
    terminal.show();
  } else {
    vscode.window.showErrorMessage("No Route Details Entered.");
  }
}

async function addComponent(packageManager: string) {
  const input = await vscode.window.showInputBox({
    prompt: "What is the name of the component?",
    placeHolder: "my-component",
    validateInput: (value: string): string | null => {
      if (!value) {
        return "Component name cannot be empty";
      }
      if (value.includes("/")) {
        return "Component name cannot contain '/'";
      }
      // return empty string for valid input
      return "";
    },
  });
  if (input) {
    const transformedInput = transformInput(input);
    const terminal = vscode.window.createTerminal("Qwik Shortcuts");

    terminal.sendText(`${packageManager} run qwik new ${transformedInput}`);
    terminal.show();
  } else {
    vscode.window.showErrorMessage("No Component Details Entered.");
  }
}

async function isQwikProject(packageJsonPath: string): Promise<boolean> {
  try {
    const packageJson = await fs.promises.readFile(packageJsonPath, "utf-8");
    const data = JSON.parse(packageJson);

    if (
      data?.devDependencies?.["@qwik.dev/router"] ||
      data?.devDependencies?.["@builder.io/qwik-city"]
    ) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error reading package.json:", error);
    return false;
  }
}
async function isQwikAstroProject(packageJsonPath: string): Promise<boolean> {
  try {
    const packageJson = await fs.promises.readFile(packageJsonPath, "utf-8");
    const data = JSON.parse(packageJson);

    if (data?.dependencies?.["@qwikdev/astro"] && data?.dependencies?.astro) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error reading package.json:", error);
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
  let updatedInput = input.trim().toLowerCase().replace(/ /g, "-");

  // adds support for grouped layouts
  // e.g. (admin) -> "(admin)"
  //
  const regex = /\([a-zA-Z]+\)/g;
  const matches = input.match(regex);
  // replace all file extensions
  const extensions = [".mdx", ".md", ".tsx", ".ts", ".js", ".jsx", "index"];
  for (let index = 0; index < extensions.length; index++) {
    const element = extensions[index];
    updatedInput = updatedInput.replaceAll(element, "");
  }

  if (!matches) {
    return updatedInput;
  }
  for (let index = 0; index < matches.length; index++) {
    const element = matches[index];
    updatedInput = updatedInput.replace(element, `"${element}"`);
  }

  return updatedInput;
}

function errorHandling(
  workspaceRoot: string | undefined,
  isQwik: boolean,
  packageManagerUsed: string | undefined,
  filesByPackageManager: { [key: string]: string }
): boolean | undefined {
  if (!workspaceRoot) {
    vscode.window.showErrorMessage("Workspace not found.");
    return false;
  }
  if (!isQwik) {
    vscode.window.showErrorMessage("Not a Qwik Project");
    return false;
  }
  if (!packageManagerUsed) {
    const packageManagersSearchedFor = `${Object.values(
      filesByPackageManager
    )}`;
    vscode.window.showErrorMessage(
      `Package manager was not found, ${packageManagersSearchedFor}`
    );
    return false;
  }
  return;
}

async function addQwikAstroComponent(
  context: vscode.ExtensionContext,
  type: "tsx" | "jsx" = "tsx"
) {
  const input = await vscode.window.showInputBox({
    prompt: "What is the name of the component?",
    placeHolder: "my-component",
    validateInput: (value: string): string | null => {
      if (!value) {
        return "Component name cannot be empty";
      }
      if (value.includes("/")) {
        return "Component name cannot contain '/'";
      }
      // return empty string for valid input
      return "";
    },
  });
  if (input) {
    const name = input.trim();
    const path = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
    const fileDir = `${path}/src/components/${name}/${name}.${type}`;
    if (fs.existsSync(fileDir)) {
      vscode.window.showErrorMessage("Component Already Exists");
      return;
    }
    const contents = await getTemplate(
      context,
      type,
      `${path}/package.json`,
      name
    );
    const componentDir = `${path}/src/components/${name}`;
    fs.mkdirSync(componentDir, { recursive: true });
    fs.writeFileSync(
      `${path}/src/components/${name}/${name}.${type}`,
      contents
    );
  } else {
    vscode.window.showErrorMessage("No Component Details Entered.");
  }
}

async function getTemplate(
  context: vscode.ExtensionContext,
  type: "tsx" | "jsx",
  packageJsonPath: string,
  componentName: string
): Promise<string> {
  const extensionPath = context.extensionPath;

  const templateName = `${type.toUpperCase()}Component.txt`;
  let templatePath = path.resolve(extensionPath, `src/templates/${templateName}`);

  if (!fs.existsSync(templatePath)) {
    templatePath = path.resolve(__dirname, `templates/${templateName}`);
    if (!fs.existsSync(templatePath)) {
      let updatedPath = await searchFile(__dirname, templateName);
      if (updatedPath) {
        templatePath = path.resolve(updatedPath);
      } else {
         updatedPath = await searchFile(extensionPath, templateName);
        if (updatedPath) {
          templatePath = path.resolve(updatedPath);
        } else {
          vscode.window.showErrorMessage("Template not found");
          return "";
        }
      }
    }
  }


  let content = await fs.promises.readFile(templatePath, "utf-8");
  const packageJson = await fs.promises.readFile(packageJsonPath, "utf-8");
  const data = JSON.parse(packageJson);
  const isV1 = data?.dependencies?.["@builder.io/qwik"];
  content = content.replaceAll("interface[name]Props", "interface [name]Props");
  content = content.replaceAll("[name]", componentName);

  if (isV1) {
    const updatedImports = content.replace(
      "@qwik.dev/core",
      "@builder.io/qwik"
    );
    content = updatedImports;
  }
  return content;
}

interface FileStats {
  isDirectory(): boolean;
}

interface FileSystem {
  readdirSync(path: string): string[];
  statSync(path: string): FileStats;
}

interface Path {
  join(...paths: string[]): string;
}

function searchFile(dir: string, fileName: string): string | undefined {
  // read the contents of the directory
  const files: string[] = fs.readdirSync(dir);

  // search through the files
  for (const file of files) {
    if (file[0].includes(".") || file[0].includes("_")) {
      continue;
    }

    // build the full path of the file
    const filePath: string = path.join(dir, file);

    // get the file stats
    const fileStat: FileStats = fs.statSync(filePath);

    // if the file is a directory, recursively search the directory
    if (fileStat.isDirectory()) {
      const result: string | undefined = searchFile(filePath, fileName);
      if (result) {
        return result;
      }
    } else if (file.endsWith(fileName)) {
      const generatedPath: string = filePath;
      return `${generatedPath}`;
    }
  }
  return undefined;
}
