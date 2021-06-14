import NodePowershell = require('node-powershell');

export class PowerShellRunner {

    /**
     * Initializes a new Powershell Runner that uses NodePowershell on the backend to run requests to a shared powershell instance
     * We do this to save memory on spawning a new pwsh process on every command, this should be faster
     *
     * @param psExePath - Path to the Powershell Executable to use for the runner. This is typically supplied from the PowerShellExtensionClient
     */
    static async create(psExePath:string) {
        // Will inherit from the NPS environment variable hopefully
        process.env.NPS = psExePath
        const item = new PowerShellRunner()
        return item
    }

    constructor(
        private readonly shell: NodePowershell = new NodePowershell()
    ){}

    // /** Executes a Powershell Script and returns the script output as a string */
    // public async ExecPwshScriptFile(
    //     scriptFilePath: string,
    //     args?: string[],
    //     exePath?: string,
    //     workingDirectory?: string
    // ) {
    //     exePath ??= await this.fetchPowerShellExePath()

    //     const exeArgs = [
    //         '-NonInteractive',
    //         '-NoLogo',
    //         '-NoProfile',
    //         '-File',
    //         scriptFilePath
    //     ]
    //     if (args != undefined) {
    //         exeArgs.push(...args)
    //     }

    //     const execFileAsync = promisify(execFile)
    //     let options: ExecFileOptionsWithStringEncoding = { encoding: 'utf8'}
    //     if (workingDirectory) {options.cwd = workingDirectory}
    //     const psResult = await execFileAsync(exePath,exeArgs,options)

    //     return psResult.stdout
    // }

    // /** Executes a Powershell Script and streams the result. This is different from {@link PowershellRunner.ExecPwshScriptFile} as it allows results to be processed in real time */
    // public async InvokePwshScript(scriptPath: string = "$PWD", exePath?: string) : Promise<String> {
    //     if (!exePath) {
    //         exePath = await this.fetchPowerShellExePath();
    //     }
    //     const pwshExeArgs = [
    //         '-NonInteractive',
    //         '-NoLogo',
    //         '-NoProfile',
    //         '-Command', scriptPath
    //     ]
    //     const pwshRun = spawn(exePath, pwshExeArgs, {});

    //     let stdOutData: string = ""

    //     pwshRun.on('data', (data: Buffer) => {
    //         // this.log.debug(`stdout: ${data}`);
    //         stdOutData += data;
    //     });

    //     pwshRun.stderr.on('data', (data) => {
    //         const err: string = data.toString();
    //         // this.log.error(`stderr: ${err}`);
    //         if (err.includes("no valid module file")) {
    //             vscode.window.showErrorMessage("Pester version '5.0.0' or higher was not found in any module directory. Make sure you have Pester v5+ installed: Install-Module Pester -MinimumVersion 5.0")
    //         }
    //     });

    //     pwshRun.on('close', (code: number) => {
    //         console.log(`Exit code ${code}`)
    //         return stdOutData
    //     })

    //     return stdOutData
    // }
}
