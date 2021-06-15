import * as Path from 'path'
import * as vscode from 'vscode'
import { TestData, WorkspaceTestRoot } from './pesterTest'
import { PowerShellExtensionClient } from './powershellExtension'
import { PowerShellRunner } from './powershellRunner'


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
        // return WorkspaceTestRoot.create(workspace, token, this.powerShellRunner, this.context.extensionPath)
        return WorkspaceTestRoot.create(workspace, token)
    }

    createDocumentTestRoot(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.TestItem<TestData, TestData> | undefined{
        // TODO: Implement for on-the-fly pester tests in an unsaved document
        // WARNING: If this is not present, createworkspacetestroot will get called twice until https://github.com/microsoft/vscode/issues/126290 is fixed
        return
    }

    /** Fetch the Pester Test json information for a particular path(s) */
    async discoverTests(path: string, testsOnly?: boolean) {
        const scriptFolderPath = Path.join(this.context.extension.extensionPath, 'Scripts')
        const scriptPath = Path.join(scriptFolderPath, 'DiscoverTests.ps1')
        const scriptArgs = [path]
        if (testsOnly) {scriptArgs + '$true'}
        const testResultJson = await this.powerShellRunner.ExecPwshScriptFile(scriptPath,scriptArgs)
        JSON.parse(testResultJson)
        return result
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
