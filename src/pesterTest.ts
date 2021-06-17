import * as vscode from 'vscode'
import { PesterTestController, TestInfo } from './pesterTestController'

/** A union that represents all types of TestItems related to Pester */
export type TestData = WorkspaceTestRoot | TestFile | TestInfo

/**
 * An "implementation" of TestItem that represents the test hierachy in a workspace.
 * For Pester, the resolveHandler will find Pester test files and instantiate them as TestFile objects, which will in turn discover the tests in each file
*/
export class WorkspaceTestRoot {
    // A static method is used instead of a constructor so that this can be used async
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
        item.resolveHandler = async token => {
            // TODO: Make this a setting
            const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.[tT]ests.[pP][sS]1')
            const watcher = vscode.workspace.createFileSystemWatcher(pattern)
            // const contentChange = new vscode.EventEmitter<vscode.Uri>()
            const files = await vscode.workspace.findFiles(pattern)

            for (const uri of files) {
                item.addChild(TestFile.create(uri, pesterTestController))
            }
            item.status = vscode.TestItemStatus.Resolved

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

/**
 * Represents a Pester Test file, typically named .tests.ps1.
 * Its resolveHandler will run the DiscoverTests.ps1 script on the file it represents to discover the Context/Describe/It blocks within.
 * */
export class TestFile {
    public static create(testFilePath: vscode.Uri, ps: PesterTestController) {
        const item = vscode.test.createTestItem<TestFile>({
            id: testFilePath.fsPath,
            label: testFilePath.path.split('/').pop()!,
            uri: testFilePath
        })
        item.resolveHandler = async token => {
            token.onCancellationRequested(() => {
                item.status = vscode.TestItemStatus.Pending
            })
            const fsPath = testFilePath.fsPath
            const fileTests = await ps.discoverPesterTests([fsPath], true)
            for (const testItem of fileTests) {
                item.addChild(
                    TestIt.create(testItem)
                )
            }
            item.status = vscode.TestItemStatus.Resolved
        }
        item.debuggable = false
        item.runnable = false
        item.status = vscode.TestItemStatus.Pending
        return item
    }
}

/** Represents an "It" statement block in Pester which roughly correlates to a Test Case or set of Cases */
export class TestIt {
    public static create(
        info: TestInfo
    ) {
        info.uri = vscode.Uri.file(info.file)
        const item = vscode.test.createTestItem<TestIt>(info)
        item.debuggable = true
        item.runnable = true
        item.status = vscode.TestItemStatus.Resolved
        item.range = new vscode.Range(info.startLine, 0, info.endLine, 0)
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