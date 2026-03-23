"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMathModule = createMathModule;
const values_1 = require("../values");
function createMathModule() {
    const mathProps = new Map();
    mathProps.set("sqrt", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.sqrt(args[0].value))));
    mathProps.set("abs", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.abs(args[0].value))));
    mathProps.set("random", (0, values_1.MK_NATIVE_FN)(() => (0, values_1.MK_NUMBER)(Math.random())));
    mathProps.set("pi", (0, values_1.MK_NUMBER)(Math.PI));
    mathProps.set("e", (0, values_1.MK_NUMBER)(Math.E));
    mathProps.set("sin", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.sin(args[0].value))));
    mathProps.set("cos", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.cos(args[0].value))));
    mathProps.set("tan", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.tan(args[0].value))));
    mathProps.set("floor", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.floor(args[0].value))));
    mathProps.set("ceil", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.ceil(args[0].value))));
    mathProps.set("round", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.round(args[0].value))));
    mathProps.set("pow", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.pow(args[0].value, args[1].value))));
    mathProps.set("min", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.min(...args.map(a => a.value)))));
    mathProps.set("max", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.max(...args.map(a => a.value)))));
    mathProps.set("log", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.log(args[0].value))));
    mathProps.set("log10", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.log10(args[0].value))));
    mathProps.set("inf", (0, values_1.MK_NUMBER)(Infinity));
    mathProps.set("nan", (0, values_1.MK_NUMBER)(NaN));
    mathProps.set("trunc", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.trunc(args[0].value))));
    mathProps.set("sign", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Math.sign(args[0].value))));
    return (0, values_1.MK_OBJECT)(mathProps);
}
