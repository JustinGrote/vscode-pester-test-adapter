import * as Path from 'path'
import * as vscode from 'vscode'
import { TestData, WorkspaceTestRoot } from './pesterTest'
import { PowerShellRunner } from './powershellRunner'

/** Represents a test result returned from pester, serialized into JSON */

export type TestResult = vscode.TestItemOptions | TestRunResult | TestInfo

/** The type used to represent a test run from the Pester runner, with additional status data */
export interface TestRunResult extends vscode.TestItemOptions {
    result: vscode.TestResultState
    duration: number
    message: string
    expected: string
    actual: string
    targetFile: string
    targetLine: number
}

export interface TestInfo extends vscode.TestItemOptions {
    startLine: number
    endLine: number
    file: string
}

/**
 * @inheritdoc
 */
export class PesterTestController implements vscode.TestController<TestData> {

    /** Initializes a Pester Test controller to use a particular ps extension. The controller will spawn a shared pwsh runner to be used for all test activities */
    static async create(context: vscode.ExtensionContext, psextension: vscode.Extension<any>) {
        // TODO: Figure out how to lazy load this later
        // const pseClient = await PowerShellExtensionClient.create(context, psextension)
        // const pseDetails = await pseClient.GetVersionDetails();
        // // Node-Powershell will auto-append the .exe for some reason so we have to strip it first.
        // const psExePath = pseDetails.exePath.replace(new RegExp('\.exe$'), '')
        const psExePath = 'pwsh'

        // This returns a promise so that the runner can be lazy initialized later when Pester Tests actually need to be run
        const powerShellRunner = PowerShellRunner.create(psExePath)
        return new PesterTestController(powerShellRunner,context)
    }

    constructor(private readonly powerShellRunner : Promise<PowerShellRunner>, private readonly context : vscode.ExtensionContext) {}

    /**
     * @inheritdoc
     */
    createWorkspaceTestRoot(workspace: vscode.WorkspaceFolder, token: vscode.CancellationToken) {
        // return WorkspaceTestRoot.create(workspace, token, this.powerShellRunner, this.context.extensionPath)
        return WorkspaceTestRoot.create(workspace, token, this)
    }

    /**
     * @inheritdoc
     */
    createDocumentTestRoot(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.TestItem<TestData, TestData> | undefined{
        // TODO: Implement for on-the-fly pester tests in an unsaved document
        // WARNING: If this is not present, createworkspacetestroot will get called twice until https://github.com/microsoft/vscode/issues/126290 is fixed
        return
    }

    /** Fetch the Pester Test json information for a particular path(s) */
    async getPesterTests<T extends TestResult>(path: string[], discoveryOnly?: boolean, testsOnly?: boolean) {
        const scriptFolderPath = Path.join(this.context.extension.extensionPath, 'Scripts')
        const scriptPath = Path.join(scriptFolderPath, 'DoPesterTests.ps1')
        let scriptArgs = Array<string>()
        if (testsOnly) {scriptArgs.push('-TestsOnly')}
        if (discoveryOnly) {scriptArgs.push('-Discovery')}
        // Add remaining search paths as arguments, these will be rolled up into the path parameter of the script
        scriptArgs.push(...path)

        // Lazy initialize the powershell runner so the filewatcher-based test finder works quickly
        const runner = await this.powerShellRunner
        const testResultJson = await runner.ExecPwshScriptFile(scriptPath,scriptArgs)
        console.log(`JSON Result from Pester for ${scriptPath} ${scriptArgs}`,testResultJson)
        const result:T[] = JSON.parse(testResultJson)
        // BUG: ConvertTo-Json in PS5.1 doesn't have a "-AsArray" and can return single objects which typescript doesn't catch.
        if (!Array.isArray(result)) {throw 'Powershell script returned a single object that is not an array. This is a bug. Make sure you did not pipe to Convert-Json!'}
        return result
    }
    /** Retrieve Pester Test information without actually running them */
    async discoverPesterTests(path: string[], testsOnly?: boolean) {
        return this.getPesterTests<TestInfo>(path, true, testsOnly)
    }
    /** Run Pester Tests and retrieve the results */
    async runPesterTests(path: string[], testsOnly?: boolean) {
        return this.getPesterTests<TestRunResult>(path, false, testsOnly)
    }

    /**
     * @inheritdoc
     */
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

        for (const testItem of request.tests) {
            run.setState(testItem,vscode.TestResultState.Queued)
        }
        const testsToRun = request.tests.map(testItem => testItem.id)

        // TODO: Use a queue instead to line these up like the test example
        for (const testItem of request.tests) {
            run.setState(testItem,vscode.TestResultState.Running)
        }
        const pesterTestRunResult = await this.runPesterTests(testsToRun, true)


        // Make this easier to query by putting the IDs in a map so we dont have to iterate an array constantly.
        // TODO: Make this part of getPesterTests?
        const pesterTestRunResultLookup = new Map<string,TestRunResult>()
        pesterTestRunResult.map(testResultItem =>
            pesterTestRunResultLookup.set(testResultItem.id, testResultItem)
        )

        for (const testRequestItem of request.tests) {
            const testResult = pesterTestRunResultLookup.get(testRequestItem.id)
            if (!testResult) {
                throw 'No Test Results were found in the test request. This should not happen and is probably a bug.'
            }
            // TODO: Test for blank or invalid result
            if (!testResult.result) {
                throw `No test result found for ${testResult.id}. This is probably a bug in the DoPesterTests script`
            }

            run.setState(testRequestItem, testResult.result, testResult.duration)

            // TODO: This is clumsy and should be a constructor/method on the TestData type perhaps
            const message = testResult.message && testResult.expected && testResult.actual
                ? vscode.TestMessage.diff(
                        testResult.message,
                        testResult.expected,
                        testResult.actual
                    )
                : new vscode.TestMessage(testResult.message)
            if (testResult.targetFile != undefined && testResult.targetLine != undefined) {
                message.location = new vscode.Location(
                    vscode.Uri.file(testResult.targetFile),
                    new vscode.Position(testResult.targetLine, 0)
                )
            }
            if (message.message) {
                run.appendMessage(testRequestItem, message)
            }

            // TODO: Add error metadata
        }

        // Loop through the requested tests, correlate them to the results, and then set the appropriate status
        // TODO: There is probably a faster way to do this
        // for (const testItem in request.tests) {


        // }

        run.end()
        // testsToRun.filter(testItem =>
        //     !request.exclude?.includes(testItem)
        // )
    }
}
