import * as vscode from 'vscode';

type TestData = WorkspaceTestRoot | TestItem

class WorkspaceTestRoot {
    public static create(workspaceFolder: vscode.WorkspaceFolder) {
        return vscode.test.createTestItem<WorkspaceTestRoot>({
            id   : `pestertests ${workspaceFolder.uri}`,
            label: 'Pester Tests',
            uri  : workspaceFolder.uri
        })
    }
}

class TestItem {
    public static create() {
        const item = vscode.test.createTestItem<TestItem>({
            id: 'test 1',
            label: 'Pester Test 1',
            uri: vscode.workspace.workspaceFile
        })
        item.debuggable = true
        item.runnable = true
        return item
    }
}

export class PesterTestController implements vscode.TestController<TestData> {
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

}