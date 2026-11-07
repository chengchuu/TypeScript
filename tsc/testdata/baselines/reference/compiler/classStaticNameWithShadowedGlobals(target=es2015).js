//// [tests/cases/compiler/classStaticNameWithShadowedGlobals.ts] ////

//// [classStaticNameWithShadowedGlobals.ts]
export const Object = null;
export let Reflect: number | null = null;
export { Reflect as reflectAlias };
export const globalThis = null;
export const self = undefined;
export const global = undefined;
const bindings = { Reflect };
if (bindings.Reflect !== Reflect || Reflect !== null) throw new Error("Lost local binding");

export function evaluate(source: string) { return eval(source); }
if (eval("Reflect") !== null) throw new Error("Lost eval binding");
evaluate("Reflect = 17");
if (Reflect !== 17 || evaluate("Reflect") !== 17) throw new Error("Lost live eval binding");
Reflect = null;

let coercions = 0;
const key: any = { [Symbol.toPrimitive]() { coercions++; return "name"; } };
const C = class {
    static get [key]() { return 42; }
    static {}
};
if (coercions !== 1 || C.name as unknown !== 42) throw new Error("Lost static getter");

const D = class {
    static [Symbol.iterator]() { return 7; }
    static {}
};
if (D.name !== "D" || D[Symbol.iterator]() !== 7) throw new Error("Lost inferred name");

function checkComputedName(member: string, holder: string | symbol, expectedName: unknown) {
    let outerCoercions = 0;
    let memberCoercions = 0;
    let getterCalls = 0;
    const outerKey = { [Symbol.toPrimitive]() { outerCoercions++; return holder; } };
    const memberKey = { [Symbol.toPrimitive]() { memberCoercions++; return member; } };
    const classes: Record<PropertyKey, Function> = {
        [outerKey as unknown as string | symbol]: class {
            static get [memberKey as unknown as string]() { getterCalls++; return 42; }
            static {}
        },
    };
    if (getterCalls !== 0) throw new Error("Getter ran during class definition");
    if (classes[holder].name !== expectedName) throw new Error("Lost class name or getter");
    if ((classes[holder] as unknown as Record<string, unknown>)[member] !== 42) throw new Error("Lost computed getter");
    if (outerCoercions !== 1 || memberCoercions !== 1) throw new Error("Repeated key coercion");
}
checkComputedName("method", "holder", "holder");
checkComputedName("name", "holder", 42);
checkComputedName("method", Symbol("holder"), "[holder]");
checkComputedName("method", Symbol(""), "");
checkComputedName("method", Symbol(), "");

export const Extra = class { static {} };
if (Extra.name !== "Extra") throw new Error("Lost ordinary inferred name");

export const Derived = class extends Array { static {} };
if (Derived.name !== "Derived") throw new Error("Lost derived inferred name");


//// [classStaticNameWithShadowedGlobals.js]
var _classPropertyKeyNative = new Proxy({}, { get: (_, key) => key });
var _a, _b, _c, _d;
export const Object = null;
export let Reflect = null;
export { Reflect as reflectAlias };
export const globalThis = null;
export const self = undefined;
export const global = undefined;
const bindings = { Reflect };
if (bindings.Reflect !== Reflect || Reflect !== null)
    throw new Error("Lost local binding");
export function evaluate(source) { return eval(source); }
if (eval("Reflect") !== null)
    throw new Error("Lost eval binding");
evaluate("Reflect = 17");
if (Reflect !== 17 || evaluate("Reflect") !== 17)
    throw new Error("Lost live eval binding");
Reflect = null;
let coercions = 0;
const key = { [Symbol.toPrimitive]() { coercions++; return "name"; } };
const C = (_a = { "C": class {
        static get [key]() { return 42; }
    } }["C"],
    (() => {
    })(),
    _a);
if (coercions !== 1 || C.name !== 42)
    throw new Error("Lost static getter");
const D = (_b = { "D": class {
        static [Symbol.iterator]() { return 7; }
    } }["D"],
    (() => {
    })(),
    _b);
if (D.name !== "D" || D[Symbol.iterator]() !== 7)
    throw new Error("Lost inferred name");
function checkComputedName(member, holder, expectedName) {
    var _e, _f, _g, _h;
    let outerCoercions = 0;
    let memberCoercions = 0;
    let getterCalls = 0;
    const outerKey = { [Symbol.toPrimitive]() { outerCoercions++; return holder; } };
    const memberKey = { [Symbol.toPrimitive]() { memberCoercions++; return member; } };
    const classes = {
        [_e = _classPropertyKeyNative[outerKey]]: (_f = (_g = _classPropertyKeyNative[memberKey], _g === "name" ? class {
            static get [_g]() { getterCalls++; return 42; }
        } : { [_h = typeof _e === "symbol" ? _e.description ? "[".concat(_e.description, "]") : "" : _e]: class {
                static get [_g]() { getterCalls++; return 42; }
            } }[_h]),
            (() => {
            })(),
            _f),
    };
    if (getterCalls !== 0)
        throw new Error("Getter ran during class definition");
    if (classes[holder].name !== expectedName)
        throw new Error("Lost class name or getter");
    if (classes[holder][member] !== 42)
        throw new Error("Lost computed getter");
    if (outerCoercions !== 1 || memberCoercions !== 1)
        throw new Error("Repeated key coercion");
}
checkComputedName("method", "holder", "holder");
checkComputedName("name", "holder", 42);
checkComputedName("method", Symbol("holder"), "[holder]");
checkComputedName("method", Symbol(""), "");
checkComputedName("method", Symbol(), "");
export const Extra = (_c = { "Extra": class {
    } }["Extra"],
    (() => {
    })(),
    _c);
if (Extra.name !== "Extra")
    throw new Error("Lost ordinary inferred name");
export const Derived = (_d = { "Derived": class extends Array {
    } }["Derived"],
    (() => {
    })(),
    _d);
if (Derived.name !== "Derived")
    throw new Error("Lost derived inferred name");
