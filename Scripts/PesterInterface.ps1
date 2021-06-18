#Requires -Modules @{ ModuleName="Pester";ModuleVersion="5.2.0" }
using namespace System.Collections
using namespace System.Collections.Generic
using namespace Pester

[CmdletBinding()]
param(
    #Path(s) to search for tests. Paths can also contain line numbers (e.g. /path/to/file:25)
    [Parameter(Mandatory,ValueFromRemainingArguments)][String[]]$Path,
    #Only return "It" Test Results and not the resulting hierarcy
    [Switch]$TestsOnly,
    #Only return the test information, don't actually run them
    [Switch]$Discovery,
    #Only load the functions but don't execute anything. Used for testing.
    [Parameter(DontShow)][Switch]$LoadFunctionsOnly
)

$VerbosePreference = 'Ignore'
$WarningPreference = 'Ignore'
$DebugPreference = 'Ignore'

#region Functions
# Maps pester result status to vscode result status
enum ResultStatus {
    Unset
    Queued
    Running
    Passed
    Failed
    Skipped
    Errored
    NotRun #Pester Specific, this should be ignored
}

function New-SuiteObject ([Block]$Block) {
    [PSCustomObject]@{
        type = 'suite'
        id = $Block.ScriptBlock.File + ':' + $Block.StartLine
        file = $Block.ScriptBlock.File
        line = $Block.StartLine - 1
        label = $Block.Name
        children = [List[Object]]@()
    }
}

function Expand-TestCaseName {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory,ValueFromPipeline)]
        [ValidateScript({
            [bool]($_.PSTypeNames -match '^(Pester\.)?Test$')
        })]$Test
    )
    process {
        [String]$Name = $Test.Name.ToString()

        $Data = $Test.Data
        if ($Data -is [IDictionary]) {
            $Data.keys | Foreach-Object {
                $Name = $Name -replace ('<{0}>' -f $PSItem),$Data[$PSItem]
            }
        } elseif ($Data) {
            $Name = $Name -replace '<_>',"$Data"
        }

        return $Name
    }
}


function New-TestItemId {
    <#
    .SYNOPSIS
    Create a string that uniquely identifies a test or test suite
    .NOTES
    Can be replaced with expandedpath if https://github.com/pester/Pester/issues/2005 is fixed
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory,ValueFromPipeline)]
        [ValidateScript({
            $null -ne ($_.PSTypeNames -match '^(Pester\.)?Test$')
        })]$Test,
        $TestIdDelimiter = '>>'
    )
    process {
        if ($Test.Path -match $TestIdDelimiter) {
            throw [NotSupportedException]"The pipe character '|' is not supported in test names with this adapter. Please remove all pipes from test/context/describe names"
        }

        #TODO: Edge cases
        #Non-String Object
        #Non-String Hashtable
        #Other dictionaries
        #Nested Hashtables
        #Fancy TestCases, maybe just iterate them as TestCaseN or exclude
        $Data = $Test.Data
        if ($Data) {
            if ($Data -is [IDictionary]) {
                $Test.Data.GetEnumerator() | Sort-Object Name | Foreach-Object {
                    $Test.Path += [String]([String]$PSItem.Name + '=' + [String]$PSItem.Value)
                }
            } else {
                $Test.Path += [string]$Data
            }
        }
        #Prepend the filename to the path
        $Test.Path = ,$Test.ScriptBlock.File + $Test.Path
        $Test.Path.where{$_} -join $TestIdDelimiter
    }
}

function New-TestObject ([Test]$Test) {
    if ($Test.ErrorRecord) {
        #TODO: Better handling once pester adds support
        #Reference: https://github.com/pester/Pester/issues/1993
        $Message = [string]$Test.ErrorRecord
        if ([string]$Test.ErrorRecord -match 'Expected (?<Expected>.+?), but (got )?(?<actual>.+?)\.$') {
            $Expected = $matches['Expected']
            $Actual = $matches['Actual']
        }
    }
    # TypeScript does not validate these data types, so numbers must be expressly stated so they don't get converted to strings
    [PSCustomObject]@{
        type = 'test'
        id = New-TestItemId $Test
        file = $Test.ScriptBlock.File
        startLine = [int]($Test.StartLine - 1) #Lines are zero-based in vscode
        endLine = [int]($Test.ScriptBlock.StartPosition.EndLine - 1) #Lines are zero-based in vscode
        label = Expand-TestCaseName $Test
        result = [ResultStatus]$Test.Result
        duration = $Test.duration.Milliseconds #I don't think anyone is doing sub-millisecond code performance testing in Powershell :)
        message = $Message
        expected = $Expected
        actual = $Actual
        targetFile = $Test.ErrorRecord.TargetObject.File
        targetLine = [int]$Test.ErrorRecord.TargetObject.Line -1
        #TODO: Severity. Failed = Error Skipped = Warning
    }
}

function fold ($children, $Block) {
    foreach ($b in $Block.Blocks) {
        $o = (New-SuiteObject $b)
        $children.Add($o)
        fold $o.children $b
    }

    $hashset = [HashSet[string]]::new()
    foreach ($t in $Block.Tests) {
        $key = "$($t.ExpandedPath):$($t.StartLine)"
        if ($hashset.Contains($key)) {
            continue
        }
        $children.Add((New-TestObject $t))
        $hashset.Add($key) | Out-Null
    }
    $hashset.Clear() | Out-Null
}

#endregion Functions
if ($LoadFunctionsOnly) {return}

# These should be unique which is why we use a hashset
$paths = [HashSet[string]]::new()
$lines = [HashSet[string]]::new()

# Including both the path and the line speeds up the script by limiting the discovery surface
$Path.foreach{
    if ($PSItem -match '(?<Path>.+?):(?<Line>\d+)$') {
        [void]$paths.Add($matches['Path'])
        [void]$lines.Add($PSItem)
    } else {
        [void]$paths.Add($PSItem)
    }
}

$config = New-PesterConfiguration @{
    Run = @{
        SkipRun = [bool]$Discovery
        PassThru = $true
    }
    Output = @{
        Verbosity = 'None'
    }
}
if ($paths.Count) {
    $config.Run.Path = [string[]]$paths #Cast to string array is required or it will error
}
if ($lines.Count) {
    $config.Filter.Line = [string[]]$lines #Cast to string array is required or it will error
}

$runResult = Invoke-Pester -Configuration $config

if ($TestsOnly) {
    $testResult = $runResult.Tests

    $testFilteredResult = if (-not $Discovery) {
        #If discovery was not run, its easy to filter the results
        $testResult | Where-Object Executed
    } elseif ($lines.count) {
        #A more esoteric filter is required because
        #BUG: Pester still returns all test discovery results in the file even if you only specify a particular line filter
        #TODO: File an issue on this
        #Returns true if the id matches. The ID is not a native property in pester, we have to construct it.
        $testResult | Where-Object {
            $Test = $PSItem
            $location = $Test.ScriptBlock.File + ':' + $Test.StartLine
            $location -in $lines
        }
    } else {
        $testResult
    }

    [Array]$testObjects = $testFilteredResult | ForEach-Object {
        New-TestObject $PSItem
    }

    # DO NOT USE THE PIPELINE, it will unwrap the array and cause a problem with single-item results
    return ConvertTo-Json $testObjects -Depth 100
}

# TODO: Hierarchical return
# if ($lines) {
#     #Only return the tests that were filtered
#     $lines.foreach{
#         if ($PSItem -match '(?<Path>.+?):(?<Line>\d+)$') { #Should always be true for lines
#             $runResult.tests
#         } else {
#             throw "An incorrect line specification was provided: $PSItem"
#         }
#     }
# }

# $testSuiteInfo = [PSCustomObject]@{
#     type = 'suite'
#     id = 'root'
#     label = 'Pester'
#     children = [Collections.Generic.List[Object]]@()
# }

# foreach ($file in $runResult.Containers.Blocks) {
#     $fileSuite = [PSCustomObject]@{
#         type = 'suite'
#         id = $file.BlockContainer.Item.FullName
#         file = $file.BlockContainer.Item.FullName
#         label = $file.BlockContainer.Item.Name
#         children = [Collections.Generic.List[Object]]@()
#     }
#     $testSuiteInfo.children.Add($fileSuite)
#     fold $fileSuite.children $file
# }

# $testSuiteInfo | ConvertTo-Json -Depth 100