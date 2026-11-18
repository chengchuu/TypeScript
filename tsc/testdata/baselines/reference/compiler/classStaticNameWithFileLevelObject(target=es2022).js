//// [tests/cases/compiler/classStaticNameWithFileLevelObject.ts] ////

//// [classStaticNameWithFileLevelObject.ts]
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


//// [classStaticNameWithFileLevelObject.js]
export const Object = null;
const key = "name";
const C = class {
    static get [key]() { return 42; }
    static { }
};
if (C[key] !== 42)
    throw new Error("Lost static getter");
const D = class {
    static [Symbol.iterator]() { return 7; }
    static { }
};
if (D.name !== "D" || D[Symbol.iterator]() !== 7)
    throw new Error("Lost inferred name");
