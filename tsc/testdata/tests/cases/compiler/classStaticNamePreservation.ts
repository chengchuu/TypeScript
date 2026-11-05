// @target: es2015, es2022
// @module: commonjs
// @useDefineForClassFields: true
// @noTypesAndSymbols: true

const names: (string | undefined)[] = [];
function dec(_value: any, context: ClassDecoratorContext) {
    names.push(context.name);
}

function check(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`${actual} !== ${expected}`);
}

export function undecorated() {
    const C = class {
        static get name() { return 123; }
        static {}
    };
    check(C.name, 123);
    check(typeof Object.getOwnPropertyDescriptor(C, "name")!.get, "function");
}

export function declared() {
    let reads = 0;
    @dec class C {
        static #value = 123;
        static get name() { reads++; return this.#value; }
    }
    check(names.pop(), "C");
    check(reads, 0);
    check(C.name, 123);
    check(reads, 1);
}

export function inferred() {
    let reads = 0;
    const C = @dec class {
        static #value = 123;
        static get name() { reads++; return this.#value; }
    };
    check(names.pop(), "C");
    check(reads, 0);
    check(C.name, 123);
}

export function methodAndSetter() {
    const C = @dec class {
        static name() { return 123; }
    };
    check(names.pop(), "C");
    check(C.name(), 123);
    check(Object.getOwnPropertyDescriptor(C, "name")!.writable, true);
    let value = 0;
    const D = @dec class {
        static set name(next: number) { value = next; }
    };
    check(names.pop(), "D");
    D.name = 123;
    check(value, 123);
}

export function computed() {
    let keys = 0;
    let coercions = 0;
    const key = { toString() { coercions++; return "item"; } };
    const object = {
        [key as unknown as string]: @dec class {
            static get [(keys++, "name")]() { return 123; }
        },
    };
    check(names.pop(), "item");
    check(object.item.name, 123);
    check(keys, 1);
    check(coercions, 1);
}

export function symbolFromComputedKey() {
    const token = Symbol("member");
    let coercions = 0;
    const key = { [Symbol.toPrimitive](hint: string) {
        check(hint, "string");
        coercions++;
        return token;
    } };
    const C = class {
        static [key as unknown as symbol]() { return 42; }
        static {}
    };
    check(Reflect.get(C, token)(), 42);
    check(coercions, 1);
    check(C.name, "C");
}

export function boxedSymbolComputedKey() {
    const key = Object(Symbol.iterator);
    const C = class {
        static [key]() { return 42; }
        static {}
    };
    check(Reflect.get(C, Symbol.iterator)(), 42);
    check(C.name, "C");
}

export function multipleComputedMembers() {
    const events: string[] = [];
    const key = { toString() { events.push("name"); return "name"; } };
    const C = @dec class {
        static [(events.push("method"), "method")]() { return 456; }
        static get [key as unknown as string]() { return 123; }
        static { events.push("block"); }
    };
    check(names.pop(), "C");
    check(C.name, 123);
    check(Object.getOwnPropertyDescriptor(C, "method")!.value(), 456);
    check(events.join(","), "method,name,block");
}

export function memberDecorator() {
    function method(value: any) { return value; }
    const C = class {
        static get name() { return 123; }
        @method static method() { return 456; }
    };
    check(C.name, 123);
    check(C.method(), 456);
    let keys = 0;
    const D = @dec class {
        @method static [(keys++, "name")]() { return 789; }
    };
    check(names.pop(), "D");
    check(Object.getOwnPropertyDescriptor(D, "name")!.value(), 789);
    check(keys, 1);
}

export function symbols() {
    const key = Symbol("item");
    const object = { [key]: @dec class { static get name() { return 123; } } };
    check(names.pop(), "[item]");
    check(object[key].name, 123);
    const anonymous = Symbol();
    const other = { [anonymous]: @dec class { static name() { return 456; } } };
    check(names.pop(), "");
    check(other[anonymous].name(), 456);
}

export function fieldsAndAccessors() {
    const C = @dec class {
        static accessor name = 123;
    };
    check(names.pop(), "C");
    check(C.name, 123);
    const key = "name";
    const computed = @dec class {
        static accessor [key] = 456;
    };
    check(names.pop(), "computed");
    check(computed.name, 456);
    const D = @dec class {
        static before = Object.getOwnPropertyDescriptor(this, "name")!.value;
        static name = "custom";
        static after = this.name;
    };
    check(names.pop(), "D");
    check(D.before, "D");
    check(D.after, "custom");
}

export function ordinaryNames() {
    const C = @dec class {};
    check(names.pop(), "C");
    check(C.name, "C");
    const object = { [42]: @dec class {} };
    check(names.pop(), "42");
    check(object[42].name, "42");
    (@dec class { static get name() { return 123; } });
    check(names.pop(), "");
}

export function shadowedObject() {
    function create(Object: unknown, key: string) {
        const C = class {
            static get [key]() { return 123; }
            static {}
        };
        return C;
    }
    const C = create(null, "name");
    check(C.name, 123);
    const D = create(null, "other");
    check(D.other, 123);
    check(D.name, "C");
}

@dec
export default class {
    static get name() { return 123; }
}

export function defaultName() {
    check(names[0], "default");
}
