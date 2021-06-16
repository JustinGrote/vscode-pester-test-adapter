Describe "Various Test Styles" {
    # TODO: Handle this scenario. Today it currently just accepts the first result
    It "Multiple TestCases Array <Name>" {
        $Name | Should -BeOfType [int]
    } -TestCases @(
        @{Name = 1}
        @{Name = 'Should Fail'}
        @{Name = 2}
    )
}
