Describe 'Sample Tests4' {
    Context 'Context4' {
        It 'Context True' {$true | Should -be $true}
        It 'Context False' {$true | Should -be $false}
        It 'Duplicate' {$true | Should -be $true}
    }

        It 'Describe True' {$true | Should -be $true}
        It 'Decribe False' {$true | Should -be $false}
        It 'Duplicate' {$true | Should -be $true}
}