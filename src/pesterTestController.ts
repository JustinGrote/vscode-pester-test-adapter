import * as Path from 'path'
import * as vscode from 'vscode'
import { TestData, WorkspaceTestRoot } from './pesterTest'
import { PowerShellExtensionClient } from './powershellExtension'
import { PowerShellRunner } from './powershellRunner'

/** Represents a test result returned from pester, serialized into JSON */
export interface TestResult extends vscode.TestItemOptions {
    result: vscode.TestResultState
    duration: number
    message: string
    expected: string
    actual: string
}

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
        return WorkspaceTestRoot.create(workspace, token, this)
    }

    createDocumentTestRoot(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.TestItem<TestData, TestData> | undefined{
        // TODO: Implement for on-the-fly pester tests in an unsaved document
        // WARNING: If this is not present, createworkspacetestroot will get called twice until https://github.com/microsoft/vscode/issues/126290 is fixed
        return
    }



    /** Fetch the Pester Test json information for a particular path(s) */
    async getPesterTests(path: string[], discoveryOnly?: boolean, testsOnly?: boolean) {
        const scriptFolderPath = Path.join(this.context.extension.extensionPath, 'Scripts')
        const scriptPath = Path.join(scriptFolderPath, 'DoPesterTests.ps1')
        let scriptArgs = Array<string>()
        if (testsOnly) {
            scriptArgs.push('-TestsOnly')
        }
        // Add remaining search paths as arguments, these will be rolled up into the path parameter of the script
        scriptArgs.push(...path)

        const testResultJson = await this.powerShellRunner.ExecPwshScriptFile(scriptPath,scriptArgs)
        const result: vscode.TestItemOptions[] = JSON.parse(testResultJson)
        return result
    }
    /** Retrieve Pester Test information without actually running them */
    async discoverPesterTests(path: string[], testsOnly?: boolean) {
        return this.getPesterTests(path, true, testsOnly)
    }
    /** Run Pester Tests and retrieve the results */
    async runPesterTests(path: string[], testsOnly?: boolean) {
        return this.getPesterTests(path, false, testsOnly)
    }

    async runTests(
        request: vscode.TestRunRequest<TestData>,
        cancellation: vscode.CancellationToken
    ) {
        const run = vscode.test.createTestRun(request)
        // TODO: Maybe? Determine if a child of a summary block is excluded
        // TODO: Check if a child of a describe/context can be excluded, for now add warning that child hidden tests may still run
        // TODO: De-Duplicate children that can be consolidated into a higher line, this is probably not necessary.
        if (request.exclude?.length) {
            vscode.window.showWarningMessage("Pester: Hiding tests is currently not supported. The tests will still be run but their status will be suppressed")
        }

        const testsToRun = request.tests.map(testItem => testItem.id)
        const pesterTestRunResult = await this.runPesterTests(testsToRun, true)

        // Loop through the requested tests, correlate them to the results, and then set the appropriate status
        // TODO: There is probably a faster way to do this
        // for (const testItem in request.tests) {


        // }

        run.end()
        // testsToRun.filter(testItem =>
        //     !request.exclude?.includes(testItem)
        // )


        // TODO: Replace this RunTests Stub with actually running the tests
        console.log(testsToRun)
    }
}
