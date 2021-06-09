// esbuild ignores this, this is purely to avoid Typescript warnings
declare module "*.ps1" {
    const content: string
    export default content
}