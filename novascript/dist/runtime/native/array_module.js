"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createArrayModule = createArrayModule;
const values_1 = require("../values");
const interpreter = __importStar(require("../interpreter"));
const environment_1 = __importDefault(require("../environment"));
async function callRuntimeFn(fn, args, env) {
    if (fn.type === "native-fn") {
        return await fn.call(args, env);
    }
    else if (fn.type === "function") {
        const func = fn;
        const scope = new environment_1.default(func.declarationEnv, "function");
        for (let i = 0; i < func.parameters.length; i++) {
            scope.declareVar(func.parameters[i], args[i] || (0, values_1.MK_NULL)(), false);
        }
        let result = (0, values_1.MK_NULL)();
        try {
            for (const stmt of func.body) {
                result = await interpreter.evaluate(stmt, scope);
            }
        }
        catch (e) {
            if (e instanceof values_1.ReturnException)
                result = e.value;
            else
                throw e;
        }
        return result;
    }
    return (0, values_1.MK_NULL)();
}
function createArrayModule() {
    const arrayProps = new Map();
    arrayProps.set("push", (0, values_1.MK_NATIVE_FN)((args) => {
        const arr = args[0].elements;
        arr.push(args[1]);
        return (0, values_1.MK_NUMBER)(arr.length);
    }));
    arrayProps.set("pop", (0, values_1.MK_NATIVE_FN)((args) => {
        const arr = args[0].elements;
        return arr.pop() || (0, values_1.MK_NULL)();
    }));
    arrayProps.set("join", (0, values_1.MK_NATIVE_FN)((args) => {
        const arr = args[0].elements;
        const sep = args[1] ? args[1].value : ",";
        return (0, values_1.MK_STRING)(arr.map((e) => (0, values_1.plainStringify)(e)).join(sep));
    }));
    arrayProps.set("slice", (0, values_1.MK_NATIVE_FN)((args) => {
        const arr = args[0].elements;
        const start = args[1].value;
        const end = args[2] ? args[2].value : undefined;
        return (0, values_1.MK_ARRAY)(arr.slice(start, end));
    }));
    arrayProps.set("reverse", (0, values_1.MK_NATIVE_FN)((args) => {
        const arr = args[0].elements.slice();
        return (0, values_1.MK_ARRAY)(arr.reverse());
    }));
    arrayProps.set("includes", (0, values_1.MK_NATIVE_FN)((args) => {
        const arr = args[0].elements;
        const search = args[1].value;
        return (0, values_1.MK_BOOL)(arr.some((e) => e.value === search));
    }));
    arrayProps.set("indexOf", (0, values_1.MK_NATIVE_FN)((args) => {
        const arr = args[0].elements;
        const search = args[1].value;
        return (0, values_1.MK_NUMBER)(arr.findIndex((e) => e.value === search));
    }));
    // Higher-order functions
    arrayProps.set("forEach", (0, values_1.MK_NATIVE_FN)(async (args, env) => {
        const arr = args[0].elements;
        const callback = args[1];
        for (let i = 0; i < arr.length; i++) {
            await callRuntimeFn(callback, [arr[i], (0, values_1.MK_NUMBER)(i), args[0]], env);
        }
        return (0, values_1.MK_NULL)();
    }));
    arrayProps.set("map", (0, values_1.MK_NATIVE_FN)(async (args, env) => {
        const arr = args[0].elements;
        const callback = args[1];
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            result.push(await callRuntimeFn(callback, [arr[i], (0, values_1.MK_NUMBER)(i), args[0]], env));
        }
        return (0, values_1.MK_ARRAY)(result);
    }));
    arrayProps.set("filter", (0, values_1.MK_NATIVE_FN)(async (args, env) => {
        const arr = args[0].elements;
        const callback = args[1];
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            const res = await callRuntimeFn(callback, [arr[i], (0, values_1.MK_NUMBER)(i), args[0]], env);
            if (res.type === "boolean" && res.value) {
                result.push(arr[i]);
            }
        }
        return (0, values_1.MK_ARRAY)(result);
    }));
    arrayProps.set("find", (0, values_1.MK_NATIVE_FN)(async (args, env) => {
        const arr = args[0].elements;
        const callback = args[1];
        for (let i = 0; i < arr.length; i++) {
            const res = await callRuntimeFn(callback, [arr[i], (0, values_1.MK_NUMBER)(i), args[0]], env);
            if (res.type === "boolean" && res.value) {
                return arr[i];
            }
        }
        return (0, values_1.MK_NULL)();
    }));
    arrayProps.set("reduce", (0, values_1.MK_NATIVE_FN)(async (args, env) => {
        const arr = args[0].elements;
        const callback = args[1];
        let accumulator = args.length > 2 ? args[2] : arr[0];
        let startIndex = args.length > 2 ? 0 : 1;
        for (let i = startIndex; i < arr.length; i++) {
            accumulator = await callRuntimeFn(callback, [accumulator, arr[i], (0, values_1.MK_NUMBER)(i), args[0]], env);
        }
        return accumulator;
    }));
    return (0, values_1.MK_OBJECT)(arrayProps);
}
