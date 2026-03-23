"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStringModule = createStringModule;
const values_1 = require("../values");
function createStringModule() {
    const stringProps = new Map();
    stringProps.set("split", (0, values_1.MK_NATIVE_FN)((args) => {
        const str = args[0].value;
        const sep = args[1] ? args[1].value : "";
        return (0, values_1.MK_ARRAY)(str.split(sep).map((s) => (0, values_1.MK_STRING)(s)));
    }));
    stringProps.set("replace", (0, values_1.MK_NATIVE_FN)((args) => {
        const str = args[0].value;
        const target = args[1].value;
        const replacement = args[2].value;
        return (0, values_1.MK_STRING)(str.replace(target, replacement));
    }));
    stringProps.set("replaceAll", (0, values_1.MK_NATIVE_FN)((args) => {
        const str = args[0].value;
        const target = args[1].value;
        const replacement = args[2].value;
        return (0, values_1.MK_STRING)(str.split(target).join(replacement));
    }));
    stringProps.set("upper", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(args[0].value.toUpperCase())));
    stringProps.set("lower", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(args[0].value.toLowerCase())));
    stringProps.set("trim", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(args[0].value.trim())));
    stringProps.set("includes", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_BOOL)(args[0].value.includes(args[1].value))));
    stringProps.set("slice", (0, values_1.MK_NATIVE_FN)((args) => {
        const str = args[0].value;
        const start = args[1].value;
        const end = args[2] ? args[2].value : undefined;
        return (0, values_1.MK_STRING)(str.slice(start, end));
    }));
    stringProps.set("indexOf", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(args[0].value.indexOf(args[1].value))));
    stringProps.set("startsWith", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_BOOL)(args[0].value.startsWith(args[1].value))));
    stringProps.set("endsWith", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_BOOL)(args[0].value.endsWith(args[1].value))));
    stringProps.set("padStart", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(args[0].value.padStart(args[1].value, args[2] ? args[2].value : " "))));
    stringProps.set("padEnd", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(args[0].value.padEnd(args[1].value, args[2] ? args[2].value : " "))));
    stringProps.set("repeat", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(args[0].value.repeat(args[1].value))));
    stringProps.set("charAt", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(args[0].value.charAt(args[1].value))));
    return (0, values_1.MK_OBJECT)(stringProps);
}
