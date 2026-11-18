// @target: es2015, es2022
// @module: esnext
// @noTypesAndSymbols: true

export const Object = null;
const key: string = "name";
const C = class {
    static get [key]() { return 42; }
    static {}
};
if (C[key] !== 42) throw new Error("Lost static getter");

const D = class {
    static [Symbol.iterator]() { return 7; }
    static {}
};
if (D.name !== "D" || D[Symbol.iterator]() !== 7) throw new Error("Lost inferred name");
