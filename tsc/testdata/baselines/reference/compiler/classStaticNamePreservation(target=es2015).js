//// [tests/cases/compiler/classStaticNamePreservation.ts] ////

//// [classStaticNamePreservation.ts]
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

export function modifiedObjectConstructor() {
    const original = Object.prototype.constructor;
    try {
        (Object.prototype as any).constructor = undefined;
        const C = class {
            static [Symbol.iterator]() { return 42; }
            static {}
        };
        check(C[Symbol.iterator](), 42);
        check(C.name, "C");
    } finally {
        Object.prototype.constructor = original;
    }
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


//// [classStaticNamePreservation.js]
"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
function _classPropertyKey(value) { var key = { [value]: 0 }; return Object.getOwnPropertyNames(key).concat(Object.getOwnPropertySymbols(key))[0]; }
function _hasDefaultClassName(cls) { return Object.getOwnPropertyDescriptor(cls, "name").writable === false; }
var __propKey = (this && this.__propKey) || function (x) {
    return typeof x === "symbol" ? x : "".concat(x);
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.undecorated = undecorated;
exports.declared = declared;
exports.inferred = inferred;
exports.methodAndSetter = methodAndSetter;
exports.computed = computed;
exports.symbolFromComputedKey = symbolFromComputedKey;
exports.boxedSymbolComputedKey = boxedSymbolComputedKey;
exports.multipleComputedMembers = multipleComputedMembers;
exports.memberDecorator = memberDecorator;
exports.symbols = symbols;
exports.fieldsAndAccessors = fieldsAndAccessors;
exports.ordinaryNames = ordinaryNames;
exports.modifiedObjectConstructor = modifiedObjectConstructor;
exports.shadowedObject = shadowedObject;
exports.defaultName = defaultName;
const names = [];
function dec(_value, context) {
    names.push(context.name);
}
function check(actual, expected) {
    if (actual !== expected)
        throw new Error(`${actual} !== ${expected}`);
}
function undecorated() {
    var _a;
    const C = (_a = class {
            static get name() { return 123; }
        },
        false && __setFunctionName(_a, "C"),
        (() => {
        })(),
        _a);
    check(C.name, 123);
    check(typeof Object.getOwnPropertyDescriptor(C, "name").get, "function");
}
function declared() {
    let reads = 0;
    let C = (() => {
        var _C_value;
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var C = _classThis = class {
            static get name() { reads++; return __classPrivateFieldGet(this, _classThis, "f", _C_value); }
        };
        false && __setFunctionName(_classThis, "C");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "C", metadata: _metadata }, null, _classExtraInitializers);
            C = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })();
        _C_value = { value: 123 };
        (() => {
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return C = _classThis;
    })();
    check(names.pop(), "C");
    check(reads, 0);
    check(C.name, 123);
    check(reads, 1);
}
function inferred() {
    let reads = 0;
    const C = (() => {
        var _value_1;
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var class_1 = _classThis = class {
            static get name() { reads++; return __classPrivateFieldGet(this, _classThis, "f", _value_1); }
        };
        false && __setFunctionName(_classThis, "C");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "C", metadata: _metadata }, null, _classExtraInitializers);
            class_1 = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })();
        _value_1 = { value: 123 };
        (() => {
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return class_1 = _classThis;
    })();
    check(names.pop(), "C");
    check(reads, 0);
    check(C.name, 123);
}
function methodAndSetter() {
    const C = (() => {
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var class_2 = _classThis = class {
            static name() { return 123; }
        };
        false && __setFunctionName(_classThis, "C");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "C", metadata: _metadata }, null, _classExtraInitializers);
            class_2 = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return class_2 = _classThis;
    })();
    check(names.pop(), "C");
    check(C.name(), 123);
    check(Object.getOwnPropertyDescriptor(C, "name").writable, true);
    let value = 0;
    const D = (() => {
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var class_3 = _classThis = class {
            static set name(next) { value = next; }
        };
        false && __setFunctionName(_classThis, "D");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "D", metadata: _metadata }, null, _classExtraInitializers);
            class_3 = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return class_3 = _classThis;
    })();
    check(names.pop(), "D");
    D.name = 123;
    check(value, 123);
}
function computed() {
    var _a;
    let keys = 0;
    let coercions = 0;
    const key = { toString() { coercions++; return "item"; } };
    const object = {
        [_a = _classPropertyKey(key)]: (() => {
            let _classDecorators = [dec];
            let _classDescriptor;
            let _classExtraInitializers = [];
            let _classThis;
            var class_4 = _classThis = class {
                static get [(keys++, "name")]() { return 123; }
            };
            _hasDefaultClassName(_classThis) && __setFunctionName(_classThis, _a);
            (() => {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: typeof _a === "symbol" ? _a.description ? "[".concat(_a.description, "]") : "" : _a, metadata: _metadata }, null, _classExtraInitializers);
                class_4 = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            })();
            return class_4 = _classThis;
        })(),
    };
    check(names.pop(), "item");
    check(object.item.name, 123);
    check(keys, 1);
    check(coercions, 1);
}
function symbolFromComputedKey() {
    var _a;
    const token = Symbol("member");
    let coercions = 0;
    const key = { [Symbol.toPrimitive](hint) {
            check(hint, "string");
            coercions++;
            return token;
        } };
    const C = (_a = { "C": class {
            static [key]() { return 42; }
        } }["C"],
        (() => {
        })(),
        _a);
    check(Reflect.get(C, token)(), 42);
    check(coercions, 1);
    check(C.name, "C");
}
function boxedSymbolComputedKey() {
    var _a;
    const key = Object(Symbol.iterator);
    const C = (_a = { "C": class {
            static [key]() { return 42; }
        } }["C"],
        (() => {
        })(),
        _a);
    check(Reflect.get(C, Symbol.iterator)(), 42);
    check(C.name, "C");
}
function multipleComputedMembers() {
    const events = [];
    const key = { toString() { events.push("name"); return "name"; } };
    const C = (() => {
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var class_5 = _classThis = { "C": class {
                static [(events.push("method"), "method")]() { return 456; }
                static get [key]() { return 123; }
            } }["C"];
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "C", metadata: _metadata }, null, _classExtraInitializers);
            class_5 = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })();
        (() => {
            events.push("block");
        })();
        (() => {
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return class_5 = _classThis;
    })();
    check(names.pop(), "C");
    check(C.name, 123);
    check(Object.getOwnPropertyDescriptor(C, "method").value(), 456);
    check(events.join(","), "method,name,block");
}
function memberDecorator() {
    function method(value) { return value; }
    const C = (() => {
        var _a;
        let _staticExtraInitializers = [];
        let _static_method_decorators;
        return _a = class {
                static get name() { return 123; }
                static method() { return 456; }
            },
            false && __setFunctionName(_a, "C"),
            (() => {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                _static_method_decorators = [method];
                __esDecorate(_a, null, _static_method_decorators, { kind: "method", name: "method", static: true, private: false, access: { has: obj => "method" in obj, get: obj => obj.method }, metadata: _metadata }, null, _staticExtraInitializers);
                if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_a, _staticExtraInitializers);
            })(),
            _a;
    })();
    check(C.name, 123);
    check(C.method(), 456);
    let keys = 0;
    const D = (() => {
        var _a;
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        let _staticExtraInitializers = [];
        let _static_member_decorators;
        var class_6 = _classThis = { "D": class {
                static [(_static_member_decorators = [method], _a = __propKey((keys++, "name")))]() { return 789; }
            } }["D"];
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(_classThis, null, _static_member_decorators, { kind: "method", name: _a, static: true, private: false, access: { has: obj => _a in obj, get: obj => obj[_a] }, metadata: _metadata }, null, _staticExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "D", metadata: _metadata }, null, _classExtraInitializers);
            class_6 = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _staticExtraInitializers);
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return class_6 = _classThis;
    })();
    check(names.pop(), "D");
    check(Object.getOwnPropertyDescriptor(D, "name").value(), 789);
    check(keys, 1);
}
function symbols() {
    var _a, _b;
    const key = Symbol("item");
    const object = { [_a = __propKey(key)]: (() => {
            let _classDecorators = [dec];
            let _classDescriptor;
            let _classExtraInitializers = [];
            let _classThis;
            var class_7 = _classThis = class {
                static get name() { return 123; }
            };
            false && __setFunctionName(_classThis, _a);
            (() => {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: typeof _a === "symbol" ? _a.description ? "[".concat(_a.description, "]") : "" : _a, metadata: _metadata }, null, _classExtraInitializers);
                class_7 = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            })();
            return class_7 = _classThis;
        })() };
    check(names.pop(), "[item]");
    check(object[key].name, 123);
    const anonymous = Symbol();
    const other = { [_b = __propKey(anonymous)]: (() => {
            let _classDecorators = [dec];
            let _classDescriptor;
            let _classExtraInitializers = [];
            let _classThis;
            var class_8 = _classThis = class {
                static name() { return 456; }
            };
            false && __setFunctionName(_classThis, _b);
            (() => {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: typeof _b === "symbol" ? _b.description ? "[".concat(_b.description, "]") : "" : _b, metadata: _metadata }, null, _classExtraInitializers);
                class_8 = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            })();
            return class_8 = _classThis;
        })() };
    check(names.pop(), "");
    check(other[anonymous].name(), 456);
}
function fieldsAndAccessors() {
    const C = (() => {
        var _name_accessor_storage;
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis_1;
        var class_9 = _classThis_1 = class {
            static get name() { return __classPrivateFieldGet(_classThis_1, _classThis_1, "f", _name_accessor_storage); }
            static set name(value) { __classPrivateFieldSet(_classThis_1, _classThis_1, value, "f", _name_accessor_storage); }
        };
        false && __setFunctionName(_classThis_1, "C");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis_1 }, _classDecorators, { kind: "class", name: "C", metadata: _metadata }, null, _classExtraInitializers);
            class_9 = _classThis_1 = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis_1, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })();
        _name_accessor_storage = { value: 123 };
        (() => {
            __runInitializers(_classThis_1, _classExtraInitializers);
        })();
        return class_9 = _classThis_1;
    })();
    check(names.pop(), "C");
    check(C.name, 123);
    const key = "name";
    const computed = (() => {
        var __a_accessor_storage, _a;
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis_1;
        var class_10 = _classThis_1 = { "computed": class {
                static get [_a = key]() { return __classPrivateFieldGet(_classThis_1, _classThis_1, "f", __a_accessor_storage); }
                static set [_a](value) { __classPrivateFieldSet(_classThis_1, _classThis_1, value, "f", __a_accessor_storage); }
            } }["computed"];
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis_1 }, _classDecorators, { kind: "class", name: "computed", metadata: _metadata }, null, _classExtraInitializers);
            class_10 = _classThis_1 = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis_1, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })();
        __a_accessor_storage = { value: 456 };
        (() => {
            __runInitializers(_classThis_1, _classExtraInitializers);
        })();
        return class_10 = _classThis_1;
    })();
    check(names.pop(), "computed");
    check(computed.name, 456);
    const D = (() => {
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var class_11 = _classThis = class {
        };
        __setFunctionName(_classThis, "D");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "D", metadata: _metadata }, null, _classExtraInitializers);
            class_11 = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })();
        Object.defineProperty(_classThis, "before", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Object.getOwnPropertyDescriptor(_classThis, "name").value
        });
        Object.defineProperty(_classThis, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "custom"
        });
        Object.defineProperty(_classThis, "after", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: _classThis.name
        });
        (() => {
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return class_11 = _classThis;
    })();
    check(names.pop(), "D");
    check(D.before, "D");
    check(D.after, "custom");
}
function ordinaryNames() {
    const C = (() => {
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var class_12 = _classThis = class {
        };
        __setFunctionName(_classThis, "C");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "C", metadata: _metadata }, null, _classExtraInitializers);
            class_12 = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return class_12 = _classThis;
    })();
    check(names.pop(), "C");
    check(C.name, "C");
    const object = { [42]: (() => {
            let _classDecorators = [dec];
            let _classDescriptor;
            let _classExtraInitializers = [];
            let _classThis;
            var class_13 = _classThis = class {
            };
            __setFunctionName(_classThis, "42");
            (() => {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "42", metadata: _metadata }, null, _classExtraInitializers);
                class_13 = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            })();
            return class_13 = _classThis;
        })() };
    check(names.pop(), "42");
    check(object[42].name, "42");
    ((() => {
        let _classDecorators = [dec];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var class_14 = _classThis = class {
            static get name() { return 123; }
        };
        false && __setFunctionName(_classThis, "");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "", metadata: _metadata }, null, _classExtraInitializers);
            class_14 = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return class_14 = _classThis;
    })());
    check(names.pop(), "");
}
function modifiedObjectConstructor() {
    var _a;
    const original = Object.prototype.constructor;
    try {
        Object.prototype.constructor = undefined;
        const C = (_a = { "C": class {
                static [Symbol.iterator]() { return 42; }
            } }["C"],
            (() => {
            })(),
            _a);
        check(C[Symbol.iterator](), 42);
        check(C.name, "C");
    }
    finally {
        Object.prototype.constructor = original;
    }
}
function shadowedObject() {
    function create(Object, key) {
        var _a;
        const C = (_a = { "C": class {
                static get [key]() { return 123; }
            } }["C"],
            (() => {
            })(),
            _a);
        return C;
    }
    const C = create(null, "name");
    check(C.name, 123);
    const D = create(null, "other");
    check(D.other, 123);
    check(D.name, "C");
}
exports.default = (() => {
    let _classDecorators = [dec];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var default_1 = _classThis = class {
        static get name() { return 123; }
    };
    false && __setFunctionName(_classThis, "default");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: "default", metadata: _metadata }, null, _classExtraInitializers);
        default_1 = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return default_1 = _classThis;
})();
function defaultName() {
    check(names[0], "default");
}
