import * as path from 'path';
import * as vscode from 'vscode';
import { TestData, TestItem, WorkspaceTestRoot } from './pesterTest';
import { PowershellRunner } from './powershellRunner';

export class PesterTestController implements vscode.TestController<TestData> {
    private readonly context
    private readonly ps
    /**
     * @inheritdoc
     */
    public createWorkspaceTestRoot(workspaceFolder: vscode.WorkspaceFolder) {

        // Create the root level object
        const workspaceTestRoot = WorkspaceTestRoot.create(workspaceFolder);
        // Setting a itemstatus to "Pending" tells vscode to run the resolveHandler to get its children
        workspaceTestRoot.status = vscode.TestItemStatus.Pending;
        workspaceTestRoot.resolveHandler = token => {
            token.onCancellationRequested(() => {
                workspaceTestRoot.status = vscode.TestItemStatus.Pending;
            });
            // I think we can run Pester at this point
            const scriptFolderPath = path.join(this.context.extension.extensionPath, 'Scripts')
            const scriptPath = path.join(scriptFolderPath, 'DiscoverTests.ps1')
            const scriptRun = this.ps.ExecPwshScriptFile(scriptPath, undefined, undefined, workspaceFolder.uri.fsPath)
            scriptRun.then(
                (json) => {
                    // TODO: Parse to testItems
                    console.log(json)
                },
                (err) => {console.log(err)}
            )
            workspaceTestRoot.addChild(TestItem.create())
            workspaceTestRoot.status = vscode.TestItemStatus.Resolved
        }

        return workspaceTestRoot
    }

    runTests(
        request: vscode.TestRunRequest<TestData>,
        cancellation: vscode.CancellationToken
    ) {

    }

    constructor(context: vscode.ExtensionContext) {
        this.context = context
        this.ps = new PowershellRunner(context)
    }
}
