Describe 'Sample Tests4' {
    Context 'Context4' {
        It 'S4 Context True' { $true | Should -Be $true }
        It 'Context False' { $true | Should -Be $false }
        It 'Duplicate' { $true | Should -Be $true }
    }

    It 'Describe True' { $true | Should -Be $true }
    It 'Decribe False' { $true | Should -Be $false }
    It 'Duplicate' { $true | Should -Be $true }
}