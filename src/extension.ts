import * as vscode from 'vscode';
import { PesterTestController } from './pesterTestController';
import { TestController } from './testController';

/** Looks for the powershell extension and if it is not present, wait for it to be installed */
async function testPowershellExtensionInstalled(context: vscode.ExtensionContext) {
  const powershellExtension = vscode.extensions.getExtension("ms-vscode.PowerShell-Preview") || vscode.extensions.getExtension("ms-vscode.PowerShell");
	if(!powershellExtension) {
		await vscode.window.showErrorMessage('Pester Test Explorer: Requires either the PowerShell or PowerShell Preview extension. Please install and reload the window.');
		const activatedEvent = vscode.extensions.onDidChange(() => {
			if (vscode.extensions.getExtension('ms-vscode.PowerShell') || vscode.extensions.getExtension('ms-vscode.PowerShell-Preview')) {
				activate(context);
				activatedEvent.dispose();
			}
		});
    return false
	}
  return true
}

export async function activate(context: vscode.ExtensionContext) {

  if (! await testPowershellExtensionInstalled(context)) {
    return
  }

  context.subscriptions.push(
    vscode.test.registerTestController(new TestController()),
    vscode.test.registerTestController(new PesterTestController(context)),

    // vscode.commands.registerCommand('test-provider-sample.runTests', async tests => {
    //   await vscode.test.runTests({ tests: tests instanceof Array ? tests : [tests], debug: false });
    //   vscode.window.showInformationMessage('Test run complete');
    // }),
  );
}