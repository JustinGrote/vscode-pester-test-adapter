import * as vscode from 'vscode';
import { TestData, WorkspaceTestRoot } from './pesterTest';
import { PowerShellExtensionClient } from './powershellExtension';
import { PowerShellRunner } from './powershellRunner';


export class PesterTestController implements vscode.TestController<TestData> {

    /** Initializes a Pester Test controller to use a particular ps extension. The controller will spawn a shared pwsh runner to be used for all test activities */
    static async create(context: vscode.ExtensionContext, psextension: vscode.Extension<any>) {
        const pseClient = await PowerShellExtensionClient.create(context, psextension)
        const pseDetails = await pseClient.GetVersionDetails();
        // Node-Powershell will auto-append the .exe for some reason so we have to strip it first.
        const psExePath = pseDetails.exePath.replace(new RegExp('\.exe$'), '')
        const powerShellRunner = await PowerShellRunner.create(psExePath)
        return new PesterTestController(powerShellRunner,context)
    }

    constructor(private readonly powerShellRunner : PowerShellRunner, private readonly context : vscode.ExtensionContext) {}

    /**
     * @inheritdoc
     */
    createWorkspaceTestRoot(workspace: vscode.WorkspaceFolder, token: vscode.CancellationToken) {
        return WorkspaceTestRoot.create(workspace, token, this.powerShellRunner, this.context.extensionPath)
    }

    // async discoverTests(workspaceFolder: vscode.WorkspaceFolder, token: vscode.CancellationToken) {
    //     // I think we can run Pester at this point
    //     const scriptFolderPath = path.join(this.context.extension.extensionPath, 'Scripts')
    //     const scriptPath = path.join(scriptFolderPath, 'DiscoverTests.ps1')
    //     // const scriptResult = await this.ps.ExecPwshScriptFile(scriptPath, undefined, undefined, workspaceFolder.uri.fsPath)
    //     return scriptResult
    // }

    runTests(
        request: vscode.TestRunRequest<TestData>,
        cancellation: vscode.CancellationToken
    ) {}
}
