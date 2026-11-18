// @target: es2015, es2022
// @module: commonjs
// @noTypesAndSymbols: true

function dec(_value: any, context: ClassDecoratorContext) {
    if (context.name !== "default") throw new Error(JSON.stringify(context.name));
}

function member(_value: any, _context: ClassMethodDecoratorContext) {}

@dec
export default class {
    @member
    m() {}
}
