"use strict";
// src/runtime/values.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnException = void 0;
exports.MK_PROMISE = MK_PROMISE;
exports.MK_NUMBER = MK_NUMBER;
exports.MK_NULL = MK_NULL;
exports.MK_BOOL = MK_BOOL;
exports.MK_STRING = MK_STRING;
exports.MK_NATIVE_FN = MK_NATIVE_FN;
exports.MK_OBJECT = MK_OBJECT;
exports.MK_ARRAY = MK_ARRAY;
exports.runtimeToJsVal = runtimeToJsVal;
exports.jsToRuntimeVal = jsToRuntimeVal;
exports.plainStringify = plainStringify;
class ReturnException extends Error {
    constructor(value) {
        super("Return");
        this.value = value;
    }
}
exports.ReturnException = ReturnException;
function MK_PROMISE(p) {
    return { type: "promise", promise: p };
}
function MK_NUMBER(n = 0) {
    return { type: "number", value: n };
}
function MK_NULL() {
    return { type: "null", value: null };
}
function MK_BOOL(b = true) {
    return { type: "boolean", value: b };
}
function MK_STRING(s) {
    return { type: "string", value: s };
}
function MK_NATIVE_FN(call) {
    return { type: "native-fn", call, properties: new Map() };
}
function MK_OBJECT(properties) {
    return { type: "object", properties };
}
function MK_ARRAY(elements) {
    return { type: "array", elements };
}
/**
 * Converts a NovaScript RuntimeVal back into a native JavaScript value.
 * This is used when passing NovaScript data to native functions or modules.
 */
function runtimeToJsVal(val, fnWrapper) {
    if (val.underlyingValue !== undefined)
        return val.underlyingValue;
    switch (val.type) {
        case "number":
        case "string":
        case "boolean":
            return val.value;
        case "null":
            return null;
        case "array":
            return val.elements.map(e => runtimeToJsVal(e, fnWrapper));
        case "object":
            const out = {};
            val.properties.forEach((v, k) => {
                out[k] = runtimeToJsVal(v, fnWrapper);
            });
            return out;
        case "promise":
            return val.promise;
        case "function":
            return fnWrapper ? fnWrapper(val) : val;
        default:
            return val;
    }
}
/**
 * Converts a native JavaScript object/value into a NovaScript RuntimeVal.
 * This is crucial for bridging NPM modules into NovaScript.
 */
function jsToRuntimeVal(jsObj, seen = new Set()) {
    if (jsObj === null || jsObj === undefined)
        return MK_NULL();
    // Handle circular references
    if (typeof jsObj === "object" || typeof jsObj === "function") {
        if (seen.has(jsObj))
            return MK_NULL();
        seen.add(jsObj);
    }
    if (typeof jsObj === "number")
        return MK_NUMBER(jsObj);
    if (typeof jsObj === "string")
        return MK_STRING(jsObj);
    if (typeof jsObj === "boolean")
        return MK_BOOL(jsObj);
    if (Array.isArray(jsObj)) {
        const arr = MK_ARRAY(jsObj.map(item => jsToRuntimeVal(item, seen)));
        arr.underlyingValue = jsObj;
        return arr;
    }
    const props = new Map();
    const collectProperties = (obj) => {
        if (!obj || obj === Object.prototype || obj === Function.prototype)
            return;
        // Scan current level
        for (const key of Object.getOwnPropertyNames(obj)) {
            if (key === "prototype" || key === "length" || key === "name" ||
                key === "caller" || key === "arguments" || key === "constructor")
                continue;
            if (props.has(key))
                continue;
            try {
                props.set(key, jsToRuntimeVal(obj[key], seen));
            }
            catch (e) { }
        }
        // Limit recursion depth for performance or rely on lazy resolution for prototype chain
    };
    if (typeof jsObj === "function") {
        const fn = MK_NATIVE_FN((args) => {
            const jsArgs = args.map(arg => runtimeToJsVal(arg));
            const result = jsObj(...jsArgs);
            return jsToRuntimeVal(result);
        });
        fn.underlyingValue = jsObj; // Store original for lazy resolution
        collectProperties(jsObj);
        fn.properties = props;
        return fn;
    }
    if (typeof jsObj === "object") {
        const obj = MK_OBJECT(props);
        obj.underlyingValue = jsObj; // Store original for lazy resolution
        collectProperties(jsObj);
        return obj;
    }
    return MK_NULL();
}
/**
 * Returns a plain string representation of a RuntimeVal without colors.
 */
function plainStringify(val) {
    switch (val.type) {
        case "string": return val.value;
        case "number": return val.value.toString();
        case "boolean": return val.value.toString();
        case "null": return "null";
        case "promise": return "[Promise]";
        case "array":
            return "[" + val.elements.map((e) => plainStringify(e)).join(", ") + "]";
        case "object":
            const props = Array.from(val.properties.entries())
                .map((entry) => {
                const [k, v] = entry;
                return `${k}: ${plainStringify(v)}`;
            })
                .join(", ");
            return "{ " + props + " }";
        case "function": return "[Function]";
        case "native-fn": return "[Native Function]";
        default: return JSON.stringify(val);
    }
}
