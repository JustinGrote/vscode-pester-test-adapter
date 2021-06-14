import * as vscode from 'vscode';
import * as path from 'path';
import { PowerShellRunner } from './powershellRunner';

export type TestData = WorkspaceTestRoot | TestItem

/** An "implementation" of TestItem that represents the test hierachy in a workspace */
export class WorkspaceTestRoot {
    // A static method is used instead of a constructor so that we
    static create(
        workspaceFolder: vscode.WorkspaceFolder,
        token: vscode.CancellationToken,
        powerShellRunner: PowerShellRunner,
        scriptPath: string
    ) : vscode.TestItem<WorkspaceTestRoot,TestData> {
        // item is meant to represent "this new item we are building"
        const item = vscode.test.createTestItem<WorkspaceTestRoot, TestData>({
            id   : `pester ${workspaceFolder.uri}`,
            label: 'Pester',
            uri  : workspaceFolder.uri
        })

        item.resolveHandler = (token) => {
            token.onCancellationRequested(() => {
                item.status = vscode.TestItemStatus.Pending
            })
            const discoveryScriptPath = path.join(scriptPath, 'DiscoverTests.ps1')
            const discoveryResult = powerShellRunner.ExecPwshScriptFile(discoveryScriptPath, [workspaceFolder.uri.fsPath])
                .then((result)=>{return result})
            // TODO: Add Children from discovery via .Tests.ps1 discovery
            // TODO: Filesystem watcher to refresh
            item.status = vscode.TestItemStatus.Resolved
        }

        return item
    }

    constructor(public readonly workspaceFolder: vscode.WorkspaceFolder) {}
}

export class TestItem {
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