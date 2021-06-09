import * as vscode from 'vscode';
import { PowerShellExtensionClient } from './powershellExtension';
import { spawn } from 'child_process';

export async function getPesterStatus() {
	var powershellExtensionClient = new PowerShellExtensionClient();
	powershellExtensionClient.RegisterExtension('TylerLeonhardt.vscode-pester-test-adapter');

	const pwshExePath: string = (await (powershellExtensionClient.GetVersionDetails())).exePath;
	var process = spawn(pwshExePath, [
		'-NonInteractive',
		'-NoLogo',
		'-NoProfile',
		'-Command', 'Get-InstalledModule Pester | ConvertTo-Json'
	]);

	return new Promise<boolean>((resolve, reject) => {
		let status: boolean = false;

		process.stdout.on('data', (data) => {
			status = true;

			let major = '';
			let minor = '';
			let patch = '';

			let pesterInfo = JSON.parse(data);
			if (pesterInfo.Version) {
				[major, minor, patch] = pesterInfo.Version.split('.');

				if ((parseInt(major) == 5 && parseInt(minor) < 2) || parseInt(major) < 5) {
					vscode.window.showWarningMessage('Pester version 5.2.0+ is recommended and will be required in a future release of the Pester Test Explorer extension.');
				}
			}
		});

		process.stderr.on('data', (data) => {
			vscode.window.showErrorMessage('The Pester PowerShell module is not installed.  Click the Help button to learn how to get started with Pester.', 'Help')
				.then(selection => {
					if (selection === 'Help') {
						vscode.env.openExternal(vscode.Uri.parse(
							'https://pester-docs.netlify.app/docs/quick-start'));
					};
				});
		});

		process.on('close', (code) => {
			// Unregistering the PowerShell Extension Client to not conflict with PesterTestRunner
			powershellExtensionClient.UnregisterExtension();
			resolve(status);
		});
	});
}
