
Describe 'Empty Describe' {}
Describe 'Duplicate Describe' {}
Describe 'Duplicate Describe' {}
Describe 'Duplicate DescribeWithContext' {
    Context 'DupeContext' {
        It 'DupeContext' {$true}
    }
}
Describe 'Duplicate DescribeWithContext' {
    Context 'DupeContext' {
        It 'DupeContext' {$true}
    }
}

Describe 'Basic' {
    Context 'Succeeds' {
        It 'True' {$true}
        It 'False' {$false}
        It 'ShouldBeTrue' {$true | Should -Be $true}
    }
    Context 'Fails' {
        It 'Throws' {throw 'Kaboom'}
        It 'ShouldThrow' {{$true} | Should -Throw}
        It 'ShouldBeTrue' {$false | Should -Be $true}
        It 'ShouldBeGreaterThan' {1 | Should -BeGreaterThan 2}
    }
}

Describe 'Failures' {

}