import { spawn } from 'child_process';
import { PowerShellExtensionClient } from './powershellExtension';

export class PowershellScriptRunner {
    powershellExtensionClient = new PowerShellExtensionClient()

    constructor () {

    }

    async getPesterStatus() {
        const pwshExePath: string = (await (this.powershellExtensionClient.GetVersionDetails())).exePath;
        var process = spawn(pwshExePath, [
            '-NonInteractive',
            '-NoLogo',
            '-NoProfile',
            '-Command', 'Get-InstalledModule Pester | ConvertTo-Json'
        ]);
    }
}