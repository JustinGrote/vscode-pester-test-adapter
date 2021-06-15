import * as vscode from 'vscode'
import { PesterTestController } from './pesterTestController'

export type TestData = WorkspaceTestRoot | TestFile

/** An "implementation" of TestItem that represents the test hierachy in a workspace */
export class WorkspaceTestRoot {
    // A static method is used instead of a constructor so that we
    static create(
        workspaceFolder: vscode.WorkspaceFolder,
        token: vscode.CancellationToken,
        pesterTestController: PesterTestController,
    ): vscode.TestItem<WorkspaceTestRoot, TestData> {
        // item is meant to represent "this new item we are building"
        const item = vscode.test.createTestItem<WorkspaceTestRoot, TestData>({
            id: `pester ${workspaceFolder.uri}`,
            label: 'Pester',
            uri: workspaceFolder.uri
        })

        item.status = vscode.TestItemStatus.Pending
        item.resolveHandler = (token) => {
            // TODO: Make this a setting
            const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.[tT]ests.[pP][sS]1')
            const watcher = vscode.workspace.createFileSystemWatcher(pattern)
            // const contentChange = new vscode.EventEmitter<vscode.Uri>()
            vscode.workspace.findFiles(pattern).then(files => {
                for (const uri of files) {
                    item.addChild(TestFile.create(uri, pesterTestController))
                }
                item.status = vscode.TestItemStatus.Resolved
            })

            watcher.onDidCreate(uri =>
                item.addChild(TestFile.create(uri, pesterTestController))
            )
            // TODO: Run pester scanner on change
            // watcher.onDidChange(uri =>
            //     contentChange.fire(uri))
            watcher.onDidDelete(uri =>
                item.children.get(uri.toString())?.dispose()
            )

            token.onCancellationRequested(() => {
                // This will trigger the resolveHandler again
                item.status = vscode.TestItemStatus.Pending
                watcher.dispose()
            })
        }

        return item
    }

    constructor(public readonly workspaceFolder: vscode.WorkspaceFolder) { }
}

export class TestFile {
    public static create(testFilePath: vscode.Uri, ps: PesterTestController) {
        const item = vscode.test.createTestItem<TestFile>({
            id: testFilePath.path,
            label: testFilePath.path.split('/').pop()!,
            uri: testFilePath
        })

        item.resolveHandler = token => {
            // TODO: Replace this mock with doing it for real
            // const pesterResult = String.raw`
            // {
            //     "type": "test",
            //     "id": "C:\\Users\\JGrote\\Projects\\vscode-pester-test-adapter\\sample\\Tests\\Sample.tests.ps1;8",
            //     "file": "C:\\Users\\JGrote\\Projects\\vscode-pester-test-adapter\\sample\\Tests\\Sample.tests.ps1",
            //     "line": 7,
            //     "label": "Describe True"
            // }
            // `

            // const result: vscode.TestItemOptions = JSON.parse(pesterResult)
            // item.addChild(vscode.test.createTestItem<TestIt>(result))
            // result.id = 'test2'
            // item.addChild(vscode.test.createTestItem<TestIt>(result))
            // result.label = 'New Describe True'
            const fsPath = testFilePath.fsPath
            ps.discoverTests(fsPath, true).then(fileTests => {
                    for (const testItem of fileTests) {
                        item.addChild(TestIt.create(testItem))
                    }
                }
            )
            item.status = vscode.TestItemStatus.Resolved
        }
        item.debuggable = true
        item.runnable = true
        item.status = vscode.TestItemStatus.Pending
        return item
    }
}

/** Represents an "It" statement block in Pester */
export class TestIt {
    public static create(
        options: vscode.TestItemOptions
    ) {
        const item = vscode.test.createTestItem<TestIt>(options)
        item.debuggable = true
        item.runnable = true
        item.status = vscode.TestItemStatus.Resolved
        return item
    }
}

// class TestCase {
//     public static create(
//         a: number,
//         operator: Operator,
//         b: number,
//         expected: number,
//         range: vscode.Range,
//         generation: number,
//         parent: vscode.TestItem<TestHeading | TestFile>,
//     ) {
//         const label = `${a} ${operator} ${b} = ${expected}`
//         const item = vscode.test.createTestItem<TestCase, never>({
//             id: `mktests/${parent.uri!.toString()}/${label}`,
//             label,
//             uri: parent.uri,
//         })

//         item.data = new TestCase(a, operator, b, expected, item, generation)
//         item.range = range
//         return item
//     }

//     protected constructor(
//         private readonly a: number,
//         private readonly operator: Operator,
//         private readonly b: number,
//         private readonly expected: number,
//         private readonly item: vscode.TestItem<TestCase>,
//         public generation: number,
//     ) { }

//     async run(options: vscode.TestRun<TestData>): Promise<void> {
//         const start = Date.now()
//         await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
//         const actual = this.evaluate()
//         const duration = Date.now() - start

//         console.log('run', this.item.label)

//         if (actual === this.expected) {
//             options.setState(this.item, vscode.TestResultState.Passed, duration)
//         } else {
//             const message = vscode.TestMessage.diff(`Expected ${this.item.label}`, String(this.expected), String(actual))
//             message.location = new vscode.Location(this.item.uri!, this.item.range!)
//             options.appendMessage(this.item, message)
//             options.setState(this.item, vscode.TestResultState.Failed, duration)
//         }
//     }

//     private evaluate() {
//         switch (this.operator) {
//             case '-':
//                 return this.a - this.b
//             case '+':
//                 return this.a + this.b
//             case '/':
//                 return Math.floor(this.a / this.b)
//             case '*':
//                 return this.a * this.b
//         }
//     }
// }