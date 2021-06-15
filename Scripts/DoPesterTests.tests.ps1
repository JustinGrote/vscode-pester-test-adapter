Describe 'DoPesterTests' {
    BeforeAll{
        $testScript = Resolve-Path "$PSScriptRoot/DoPesterTests.ps1"
        $testDataPath = Resolve-Path "$PSScriptRoot/../sample"
    }

    Context 'VerifyResults' {
        BeforeAll {
            function shouldReturnTestCount($ShouldHaveCount,$Paths) {
                $result = & $testScript -TestsOnly -Discovery $Paths
                $result | ConvertFrom-Json | Should -HaveCount $ShouldHaveCount
            }
        }
        It 'Sample1 Single File' {
            shouldReturnTestCount 7 @(
                'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample.tests.ps1'
            )
        }
        It 'Sample1 Individual Test' {
            shouldReturnTestCount 1 @(
                'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample.tests.ps1:10'
            )
        }
        # It 'Sample1 Describe' {
        #     shouldReturnTestCount 7 @(
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample.tests.ps1:1'
        #     )
        # }
        # It 'Sample1 Context' {
        #     shouldReturnTestCount 4 @(
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample.tests.ps1:2'
        #     )
        # }
        # It 'Sample1 Context + Individual Test' {
        #     shouldReturnTestCount 5 @(
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample.tests.ps1:2'
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample.tests.ps1:10'
        #     )
        # }

        # It 'Sample1 + Sample2' {
        #     shouldReturnTestCount 13 @(
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample.tests.ps1'
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample2.tests.ps1'
        #     )
        # }
        # It 'Sample1 + Sample2 + Sample 3 two individual tests' {
        #     shouldReturnTestCount 15 @(
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample.tests.ps1'
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample2.tests.ps1'
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample3.tests.ps1:4'
        #         'C:\Users\JGrote\Projects\vscode-pester-test-adapter\sample\Tests\Sample3.tests.ps1:8'
        #     )
        # }

    }
}