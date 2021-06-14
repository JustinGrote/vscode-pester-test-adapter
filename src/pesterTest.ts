import * as vscode from 'vscode'
import { PowerShellRunner } from './powershellRunner'

export type TestData = WorkspaceTestRoot | TestFile

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

        item.status = vscode.TestItemStatus.Pending
        item.resolveHandler = (token) => {
            // TODO: Make this a setting
            const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.[tT]ests.[pP][sS]1');
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            const contentChange = new vscode.EventEmitter<vscode.Uri>();

            watcher.onDidCreate(uri =>
              item.addChild(TestFile.create(uri))
            );
            watcher.onDidChange(uri => contentChange.fire(uri));
            watcher.onDidDelete(uri => item.children.get(uri.toString())?.dispose());

            token.onCancellationRequested(() => {
              item.status = vscode.TestItemStatus.Pending;
              watcher.dispose();
            });

            vscode.workspace.findFiles(pattern).then(files => {
              for (const uri of files) {
                item.addChild(TestFile.create(uri));
              }
              item.status = vscode.TestItemStatus.Resolved;
            });

            token.onCancellationRequested(() => {
                item.status = vscode.TestItemStatus.Pending
            })
            // const discoveryScriptPath = path.join(scriptPath, 'DiscoverTests.ps1')
            // const discoveryResult = powerShellRunner.ExecPwshScriptFile(discoveryScriptPath, [workspaceFolder.uri.fsPath])
            //     .then((result)=>{return result})
            // // TODO: Add Children from discovery via .Tests.ps1 discovery
            // // TODO: Filesystem watcher to refresh
            item.status = vscode.TestItemStatus.Resolved
        }

        return item
    }

    constructor(public readonly workspaceFolder: vscode.WorkspaceFolder) {}
}

export class TestFile {
    public static create(uri: vscode.Uri) {
        const item = vscode.test.createTestItem<TestFile>({
            id: uri.path,
            label: uri.path.split('/').pop()!,
            uri: uri
        })
        item.debuggable = true
        item.runnable = true
        return item
    }
}