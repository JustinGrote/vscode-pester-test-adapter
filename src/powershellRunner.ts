import { execFile, ExecFileOptionsWithStringEncoding, spawn } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { PowerShellExtensionClient } from "./powershellExtension";

export class PowershellRunner {
    private readonly powershellExtensionClient = new PowerShellExtensionClient();
    private readonly context : vscode.ExtensionContext

    public constructor(context: vscode.ExtensionContext) {
        this.powershellExtensionClient.RegisterExtension(context.extension.id);
        this.context = context
	}

    async fetchPowerShellExePath(): Promise<string> {
        const details = await this.powershellExtensionClient.GetVersionDetails();
        // this.log.debug(`Using ${details.displayName} at: ${details.exePath}`);
        // TODO: Verify this is an absolute path
        return details.exePath;
    }

    /** Main Implementation: Executes a Powershell Script and returns the output as a string */
    public async ExecPwshScriptFile(
        scriptFilePath: string,
        args?: string[],
        exePath?: string,
        workingDirectory?: string
    ) {
        exePath ??= await this.fetchPowerShellExePath()

        const exeArgs = [
            '-NonInteractive',
            '-NoLogo',
            '-NoProfile',
            '-File',
            scriptFilePath
        ]
        if (args != undefined) {
            exeArgs.push(...args)
        }

        const execFileAsync = promisify(execFile)
        let options: ExecFileOptionsWithStringEncoding = { encoding: 'utf8'}
        if (workingDirectory) {options.cwd = workingDirectory}
        const psResult = await execFileAsync(exePath,exeArgs,options)

        return psResult.stdout
    }

    public async InvokePwshScript(scriptPath: string = "$PWD", exePath?: string) : Promise<String> {
        if (!exePath) {
            exePath = await this.fetchPowerShellExePath();
        }
        const pwshExeArgs = [
            '-NonInteractive',
            '-NoLogo',
            '-NoProfile',
            '-Command', scriptPath
        ]
        const pwshRun = spawn(exePath, pwshExeArgs, {});

        let stdOutData: string = ""

        pwshRun.on('data', (data: Buffer) => {
            // this.log.debug(`stdout: ${data}`);
            stdOutData += data;
        });

        pwshRun.stderr.on('data', (data) => {
            const err: string = data.toString();
            // this.log.error(`stderr: ${err}`);
            if (err.includes("no valid module file")) {
                vscode.window.showErrorMessage("Pester version '5.0.0' or higher was not found in any module directory. Make sure you have Pester v5+ installed: Install-Module Pester -MinimumVersion 5.0")
            }
        });

        pwshRun.on('close', (code: number) => {
            console.log(`Exit code ${code}`)
            return stdOutData
        })

        return stdOutData
    }
}
