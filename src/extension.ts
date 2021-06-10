import * as vscode from 'vscode';
import { PesterTestController } from './pesterTestController';
import { TestController } from './testController';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.test.registerTestController(new TestController()),
    vscode.test.registerTestController(new PesterTestController()),

    vscode.commands.registerCommand('test-provider-sample.runTests', async tests => {
      await vscode.test.runTests({ tests: tests instanceof Array ? tests : [tests], debug: false });
      vscode.window.showInformationMessage('Test run complete');
    }),
  );
}
