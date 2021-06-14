import * as vscode from 'vscode';
import { PesterTestController } from './pesterTestController';

export type TestData = WorkspaceTestRoot | TestItem

/** An "implementation" of TestItem that represents the test hierachy in a workspace */
export class WorkspaceTestRoot {
    // A static method is used instead of a constructor so that we
    public static create(workspaceFolder: vscode.WorkspaceFolder, token: vscode.CancellationToken, controller: PesterTestController) : vscode.TestItem<WorkspaceTestRoot,TestData> {
        // item is meant to represent "this new item we are building"
        const item = vscode.test.createTestItem<WorkspaceTestRoot, TestData>({
            id   : `pester ${workspaceFolder.uri}`,
            label: 'Pester',
            uri  : workspaceFolder.uri
        })

        item.resolveHandler = token => {
            token.onCancellationRequested(() => {
                item.status = vscode.TestItemStatus.Pending
            })
            item.status = vscode.TestItemStatus.Pending

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