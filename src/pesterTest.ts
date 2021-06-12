import * as vscode from 'vscode';

export type TestData = WorkspaceTestRoot | TestItem

export class WorkspaceTestRoot {
    public static create(workspaceFolder: vscode.WorkspaceFolder) {
        return vscode.test.createTestItem<WorkspaceTestRoot>({
            id   : `pestertests ${workspaceFolder.uri}`,
            label: 'Pester',
            uri  : workspaceFolder.uri
        })
    }
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

export class TestHierarchy implements TestItem {
    public static create() {}
}