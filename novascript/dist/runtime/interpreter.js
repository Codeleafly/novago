"use strict";
// src/runtime/interpreter.ts
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
exports.ContinueException = exports.BreakException = void 0;
exports.evaluate = evaluate;
const values_1 = require("./values");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = __importDefault(require("../frontend/parser"));
const environment_1 = __importDefault(require("./environment"));
const errors_1 = require("./errors");
const library_manager_1 = require("./library_manager");
// Module cache to avoid re-evaluating the same module multiple times
const moduleCache = new Map();
class BreakException extends Error {
    constructor() {
        super("Break");
    }
}
exports.BreakException = BreakException;
class ContinueException extends Error {
    constructor() {
        super("Continue");
    }
}
exports.ContinueException = ContinueException;
function getLocation(node) {
    return {
        file: node.file || "unknown",
        line: node.line || 0,
        column: node.column || 0
    };
}
async function evaluate(astNode, env) {
    switch (astNode.kind) {
        case "NumericLiteral":
            return {
                value: (astNode.value),
                type: "number",
            };
        case "StringLiteral":
            return {
                value: (astNode.value),
                type: "string",
            };
        case "Identifier":
            return eval_identifier(astNode, env);
        case "ObjectLiteral":
            return await eval_object_expr(astNode, env);
        case "ArrayLiteral":
            return await eval_array_expr(astNode, env);
        case "MemberExpr":
            return await eval_member_expr(astNode, env);
        case "CallExpr":
            return await eval_call_expr(astNode, env);
        case "AssignmentExpr":
            return await eval_assignment(astNode, env);
        case "BinaryExpr":
            return await eval_binary_expr(astNode, env);
        case "Program":
            return await eval_program(astNode, env);
        case "VarDeclaration":
            return await eval_var_declaration(astNode, env);
        case "GlobalDeclaration":
            return await eval_global_declaration(astNode, env);
        case "FunctionDeclaration":
            return eval_function_declaration(astNode, env);
        case "IfStatement":
            return await eval_if_statement(astNode, env);
        case "WhileStatement":
            return await eval_while_statement(astNode, env);
        case "ForStatement":
            return await eval_for_statement(astNode, env);
        case "SwitchStatement":
            return await eval_switch_statement(astNode, env);
        case "TryCatchStatement":
            return await eval_try_catch_statement(astNode, env);
        case "ReturnStatement":
            const returnVal = astNode.value
                ? await evaluate(astNode.value, env)
                : (0, values_1.MK_NULL)();
            throw new values_1.ReturnException(returnVal);
        case "ThrowStatement":
            const throwVal = await evaluate(astNode.argument, env);
            throw throwVal; // Throwing the RuntimeVal directly for catch to handle
        case "BreakStatement":
            throw new BreakException();
        case "ContinueStatement":
            throw new ContinueException();
        case "AwaitExpr":
            const valToAwait = await evaluate(astNode.argument, env);
            // If it's a native Promise (from async fn or native), await it.
            // For simplicity, we assume the environment might contain promises if they come from JS interop,
            // but for Nova async fns, they will return a "promise-wrapped" RuntimeVal.
            if (valToAwait && valToAwait.promise) {
                return await valToAwait.promise;
            }
            return valToAwait;
        case "ImportStatement":
            return await eval_import_statement(astNode, env);
        case "NamedImportStatement":
            return await eval_named_import_statement(astNode, env);
        case "ImportExpr":
            return await eval_import_expr(astNode, env);
        case "ArrowFnExpr":
            const arrowFn = astNode;
            return {
                type: "function",
                name: "anonymous",
                parameters: arrowFn.parameters,
                declarationEnv: env,
                body: Array.isArray(arrowFn.body) ? arrowFn.body : [{ kind: "ReturnStatement", value: arrowFn.body }],
                async: arrowFn.async,
            };
        case "ExportDeclaration":
            return await eval_export_declaration(astNode, env);
        default:
            throw new errors_1.NovaRuntimeError(`This AST Node has not yet been setup for interpretation: ${astNode.kind}`, getLocation(astNode));
    }
}
async function eval_program(program, env) {
    let lastEvaluated = (0, values_1.MK_NULL)();
    for (const statement of program.body) {
        lastEvaluated = await evaluate(statement, env);
    }
    return lastEvaluated;
}
async function eval_var_declaration(declaration, env) {
    const value = declaration.value
        ? await evaluate(declaration.value, env)
        : (0, values_1.MK_NULL)();
    try {
        return env.declareVar(declaration.identifier, value, declaration.constant);
    }
    catch (e) {
        throw new errors_1.NovaRuntimeError(e.message, getLocation(declaration));
    }
}
async function eval_global_declaration(declaration, env) {
    const value = declaration.value
        ? await evaluate(declaration.value, env)
        : (0, values_1.MK_NULL)();
    try {
        return env.declareGlobal(declaration.identifier, value, declaration.constant);
    }
    catch (e) {
        throw new errors_1.NovaRuntimeError(e.message, getLocation(declaration));
    }
}
function eval_function_declaration(declaration, env) {
    const fn = {
        type: "function",
        name: declaration.name,
        parameters: declaration.parameters,
        declarationEnv: env,
        body: declaration.body,
        async: declaration.async,
    };
    if (declaration.name === "anonymous") {
        return fn;
    }
    return env.declareVar(declaration.name, fn, true);
}
function eval_identifier(ident, env) {
    try {
        return env.lookupVar(ident.symbol);
    }
    catch (e) {
        throw new errors_1.NovaReferenceError(e.message, getLocation(ident));
    }
}
async function eval_assignment(node, env) {
    if (node.assignee.kind === "Identifier") {
        const varname = node.assignee.symbol;
        const value = await evaluate(node.value, env);
        try {
            return env.assignVar(varname, value);
        }
        catch (e) {
            throw new errors_1.NovaRuntimeError(e.message, getLocation(node));
        }
    }
    else if (node.assignee.kind === "MemberExpr") {
        const memberExpr = node.assignee;
        const object = await evaluate(memberExpr.object, env);
        if (object.type !== "object") {
            throw new errors_1.NovaTypeError("Cannot assign to property of non-object.", getLocation(memberExpr));
        }
        let property = "";
        if (memberExpr.computed) {
            const propVal = await evaluate(memberExpr.property, env);
            if (propVal.type !== "string") {
                throw new errors_1.NovaTypeError("Computed property key must be a string", getLocation(memberExpr));
            }
            property = propVal.value;
        }
        else {
            if (memberExpr.property.kind !== "Identifier") {
                throw new errors_1.NovaTypeError("Dot notation requires identifier", getLocation(memberExpr));
            }
            property = memberExpr.property.symbol;
        }
        const value = await evaluate(node.value, env);
        object.properties.set(property, value);
        return value;
    }
    else {
        throw new errors_1.NovaTypeError(`Invalid LHS inside assignment expr ${node.assignee.kind}`, getLocation(node));
    }
}
async function eval_object_expr(obj, env) {
    const object = { type: "object", properties: new Map() };
    for (const { key, value } of obj.properties) {
        const runtimeVal = (value == undefined)
            ? env.lookupVar(key)
            : await evaluate(value, env);
        object.properties.set(key, runtimeVal);
    }
    return object;
}
async function eval_array_expr(arr, env) {
    const elements = [];
    for (const element of arr.elements) {
        elements.push(await evaluate(element, env));
    }
    return (0, values_1.MK_ARRAY)(elements);
}
async function eval_member_expr(expr, env) {
    const object = await evaluate(expr.object, env);
    let property = "";
    let numericIndex = -1;
    if (expr.computed) {
        const propVal = await evaluate(expr.property, env);
        if (propVal.type === "number") {
            numericIndex = propVal.value;
        }
        else if (propVal.type === "string") {
            property = propVal.value;
        }
        else {
            throw new errors_1.NovaTypeError("Computed property key must be a string or number", getLocation(expr));
        }
    }
    else {
        if (expr.property.kind !== "Identifier") {
            throw new errors_1.NovaTypeError("Dot notation requires identifier", getLocation(expr));
        }
        property = expr.property.symbol;
    }
    if (object.type === "null") {
        if (expr.optional)
            return (0, values_1.MK_NULL)();
        throw new errors_1.NovaRuntimeError(`Cannot read property '${property}' of null`, getLocation(expr));
    }
    if (object.type === "array") {
        const arr = object.elements;
        if (numericIndex >= 0) {
            return arr[numericIndex] || (0, values_1.MK_NULL)();
        }
        if (property === "length")
            return (0, values_1.MK_NUMBER)(arr.length);
        throw new errors_1.NovaTypeError(`Array does not have property ${property}`, getLocation(expr));
    }
    if (object.type === "string") {
        if (property === "length")
            return (0, values_1.MK_NUMBER)(object.value.length);
        throw new errors_1.NovaTypeError(`String does not have property ${property}`, getLocation(expr));
    }
    if (object.type !== "object" && object.type !== "native-fn") {
        if (expr.optional)
            return (0, values_1.MK_NULL)();
        throw new errors_1.NovaTypeError("Cannot access property of non-object. Found: " + object.type, getLocation(expr));
    }
    const key = numericIndex >= 0 ? String(numericIndex) : property;
    let val = object.properties.get(key);
    if (val === undefined) {
        // Lazy resolution fallback for native bridging (e.g., Proxies like chalk)
        if (object.underlyingValue && object.underlyingValue[key] !== undefined) {
            val = (0, values_1.jsToRuntimeVal)(object.underlyingValue[key]);
            object.properties.set(key, val); // Cache it
        }
        else {
            return (0, values_1.MK_NULL)();
        }
    }
    return val;
}
async function eval_call_expr(expr, env) {
    const args = [];
    for (const arg of expr.args) {
        args.push(await evaluate(arg, env));
    }
    const fn = await evaluate(expr.caller, env);
    // Handle optional chaining for calls: obj?.method()
    if (fn.type === "null" && expr.caller.kind === "MemberExpr" && expr.caller.optional) {
        return (0, values_1.MK_NULL)();
    }
    if (fn.type == "native-fn") {
        const fnVal = fn;
        // Map Nova values to JS values, wrapping Nova functions so JS can call them
        const jsArgs = args.map(arg => (0, values_1.runtimeToJsVal)(arg, (f) => wrapNovaFn(f, env)));
        // If it's a direct wrap of a JS function, call it with JS args
        if (fnVal.underlyingValue && typeof fnVal.underlyingValue === "function") {
            try {
                const result = fnVal.underlyingValue(...jsArgs);
                return (0, values_1.jsToRuntimeVal)(result);
            }
            catch (e) {
                throw new errors_1.NovaRuntimeError(`Native call error: ${e.message}`, getLocation(expr));
            }
        }
        return await fnVal.call(args, env);
    }
    if (fn.type == "function") {
        const func = fn;
        // Internal execution function to handle both sync and async
        const executeBody = async () => {
            const scope = new environment_1.default(func.declarationEnv, "function");
            for (let i = 0; i < func.parameters.length; i++) {
                const varname = func.parameters[i];
                scope.declareVar(varname, args[i] || (0, values_1.MK_NULL)(), false);
            }
            let result = (0, values_1.MK_NULL)();
            try {
                for (const stmt of func.body) {
                    result = await evaluate(stmt, scope);
                }
            }
            catch (e) {
                if (e instanceof values_1.ReturnException) {
                    result = e.value;
                }
                else {
                    throw e;
                }
            }
            return result;
        };
        if (func.async) {
            return (0, values_1.MK_PROMISE)(executeBody());
        }
        else {
            return await executeBody();
        }
    }
    throw new errors_1.NovaTypeError(`Cannot call value that is not a function: ${fn.type}`, getLocation(expr));
}
async function eval_binary_expr(binop, env) {
    if (binop.operator.startsWith("unary_")) {
        const arg = await evaluate(binop.left, env);
        const op = binop.operator.split("_")[1].toLowerCase();
        if (op === "not" || op === "!") {
            // Flexible truthiness for !
            if (arg.type === "boolean")
                return (0, values_1.MK_BOOL)(!arg.value);
            if (arg.type === "null")
                return (0, values_1.MK_BOOL)(true);
            if (arg.type === "number")
                return (0, values_1.MK_BOOL)(arg.value === 0);
            return (0, values_1.MK_BOOL)(false);
        }
        if (op === "-") {
            if (arg.type !== "number")
                throw new errors_1.NovaTypeError("- requires number", getLocation(binop));
            return (0, values_1.MK_NUMBER)(-arg.value);
        }
    }
    // Short-circuiting for logical operators
    const op = binop.operator.toLowerCase();
    if (op === "and" || op === "&&") {
        const lhs = await evaluate(binop.left, env);
        if (lhs.type !== "boolean")
            throw new errors_1.NovaTypeError("&& requires boolean", getLocation(binop));
        if (!lhs.value)
            return (0, values_1.MK_BOOL)(false);
        const rhs = await evaluate(binop.right, env);
        if (rhs.type !== "boolean")
            throw new errors_1.NovaTypeError("&& requires boolean", getLocation(binop));
        return (0, values_1.MK_BOOL)(rhs.value);
    }
    if (op === "or" || op === "||") {
        const lhs = await evaluate(binop.left, env);
        if (lhs.type !== "boolean")
            throw new errors_1.NovaTypeError("|| requires boolean", getLocation(binop));
        if (lhs.value)
            return (0, values_1.MK_BOOL)(true);
        const rhs = await evaluate(binop.right, env);
        if (rhs.type !== "boolean")
            throw new errors_1.NovaTypeError("|| requires boolean", getLocation(binop));
        return (0, values_1.MK_BOOL)(rhs.value);
    }
    const lhs = await evaluate(binop.left, env);
    const rhs = await evaluate(binop.right, env);
    if (op === "is" || op === "==") {
        return (0, values_1.MK_BOOL)(lhs.type === rhs.type && lhs.value === rhs.value);
    }
    if (op === "isnt" || op === "!=") {
        return (0, values_1.MK_BOOL)(lhs.type !== rhs.type || lhs.value !== rhs.value);
    }
    if (lhs.type == "number" && rhs.type == "number") {
        return eval_numeric_binary_expr(lhs, rhs, op, binop);
    }
    if (op === "+") {
        if (lhs.type === "string" || rhs.type === "string") {
            const lStr = lhs.type === "string" ? lhs.value : (0, values_1.plainStringify)(lhs);
            const rStr = rhs.type === "string" ? rhs.value : (0, values_1.plainStringify)(rhs);
            return (0, values_1.MK_STRING)(lStr + rStr);
        }
    }
    // Null Coalescing Operator ??
    if (op === "??") {
        return (lhs.type !== "null") ? lhs : rhs;
    }
    return (0, values_1.MK_NULL)();
}
function eval_numeric_binary_expr(lhs, rhs, operator, node) {
    const l = lhs.value;
    const r = rhs.value;
    switch (operator) {
        case "+": return (0, values_1.MK_NUMBER)(l + r);
        case "-": return (0, values_1.MK_NUMBER)(l - r);
        case "*": return (0, values_1.MK_NUMBER)(l * r);
        case "/":
            if (r === 0)
                throw new errors_1.NovaZeroDivisionError("Division by zero", getLocation(node));
            return (0, values_1.MK_NUMBER)(l / r);
        case "%": return (0, values_1.MK_NUMBER)(l % r);
        case "**": return (0, values_1.MK_NUMBER)(Math.pow(l, r));
        case ">": return (0, values_1.MK_BOOL)(l > r);
        case "<": return (0, values_1.MK_BOOL)(l < r);
        case ">=": return (0, values_1.MK_BOOL)(l >= r);
        case "<=": return (0, values_1.MK_BOOL)(l <= r);
        // Bitwise
        case "&": return (0, values_1.MK_NUMBER)(l & r);
        case "|": return (0, values_1.MK_NUMBER)(l | r);
        case "^": return (0, values_1.MK_NUMBER)(l ^ r);
        case "<<": return (0, values_1.MK_NUMBER)(l << r);
        case ">>": return (0, values_1.MK_NUMBER)(l >> r);
        default: return (0, values_1.MK_NULL)();
    }
}
async function eval_if_statement(stmt, env) {
    const condition = await evaluate(stmt.condition, env);
    if (condition.value === true) {
        const scope = new environment_1.default(env, "block");
        let lastVal = (0, values_1.MK_NULL)();
        for (const s of stmt.thenBranch) {
            lastVal = await evaluate(s, scope);
        }
        return lastVal;
    }
    else if (stmt.elseBranch) {
        const scope = new environment_1.default(env, "block");
        let lastVal = (0, values_1.MK_NULL)();
        for (const s of stmt.elseBranch) {
            lastVal = await evaluate(s, scope);
        }
        return lastVal;
    }
    return (0, values_1.MK_NULL)();
}
async function eval_while_statement(stmt, env) {
    let lastVal = (0, values_1.MK_NULL)();
    while (true) {
        const condition = await evaluate(stmt.condition, env);
        if (condition.type !== "boolean" || condition.value !== true) {
            break;
        }
        const scope = new environment_1.default(env, "block");
        try {
            for (const s of stmt.body) {
                lastVal = await evaluate(s, scope);
            }
        }
        catch (e) {
            if (e instanceof BreakException)
                break;
            if (e instanceof ContinueException)
                continue;
            throw e;
        }
    }
    return lastVal;
}
async function eval_for_statement(stmt, env) {
    if (stmt.init || stmt.condition || stmt.update) {
        // JS-style loop: for (init; condition; update)
        const scope = new environment_1.default(env, "block");
        if (stmt.init)
            await evaluate(stmt.init, scope);
        let lastVal = (0, values_1.MK_NULL)();
        while (true) {
            if (stmt.condition) {
                const condition = await evaluate(stmt.condition, scope);
                if (condition.value !== true)
                    break;
            }
            const iterationScope = new environment_1.default(scope, "block");
            try {
                for (const s of stmt.body) {
                    lastVal = await evaluate(s, iterationScope);
                }
            }
            catch (e) {
                if (e instanceof BreakException)
                    break;
                if (e instanceof ContinueException) {
                    if (stmt.update)
                        await evaluate(stmt.update, scope);
                    continue;
                }
                throw e;
            }
            if (stmt.update)
                await evaluate(stmt.update, scope);
        }
        return lastVal;
    }
    // Nova-style: for i from start to end
    const startVal = await evaluate(stmt.start, env);
    const endVal = await evaluate(stmt.end, env);
    if (startVal.type !== "number" || endVal.type !== "number") {
        throw new errors_1.NovaTypeError("Repeat loop range must be numbers", getLocation(stmt));
    }
    let lastVal = (0, values_1.MK_NULL)();
    const scope = new environment_1.default(env);
    scope.declareVar(stmt.counter, startVal, false);
    let current = startVal.value;
    const end = endVal.value;
    while (current <= end) {
        const iterationScope = new environment_1.default(scope, "block");
        try {
            for (const s of stmt.body) {
                lastVal = await evaluate(s, iterationScope);
            }
        }
        catch (e) {
            if (e instanceof BreakException)
                break;
            if (e instanceof ContinueException) {
                current++;
                scope.assignVar(stmt.counter, (0, values_1.MK_NUMBER)(current));
                continue;
            }
            throw e;
        }
        current++;
        scope.assignVar(stmt.counter, (0, values_1.MK_NUMBER)(current));
    }
    return lastVal;
}
async function eval_module(modulePath, parentEnv, callerFile) {
    let absolutePath;
    let isNative = false;
    // 1. Resolve Global/Multi-source imports (v6.0.0)
    if (modulePath.includes(":")) {
        const resolved = await library_manager_1.LibraryManager.resolve(modulePath);
        absolutePath = resolved.path;
        isNative = resolved.isNative;
    }
    else {
        // Resolve bare module specifiers (e.g., 'chalk') vs relative paths
        const isBareModule = !modulePath.startsWith(".") &&
            !path.isAbsolute(modulePath) &&
            !modulePath.endsWith(".nv") &&
            !modulePath.endsWith(".nova");
        if (isBareModule && !fs.existsSync(path.resolve(modulePath))) {
            absolutePath = modulePath;
            isNative = true;
        }
        else if (callerFile && callerFile !== "repl" && !path.isAbsolute(modulePath)) {
            absolutePath = path.resolve(path.dirname(callerFile), modulePath);
        }
        else {
            absolutePath = path.resolve(modulePath);
        }
    }
    if (moduleCache.has(absolutePath)) {
        return moduleCache.get(absolutePath);
    }
    const ext = path.extname(absolutePath);
    const isJS = ext === ".js" || ext === ".mjs" || ext === ".cjs" || isNative;
    // 2. Handle Native Node.js/NPM Modules (ESM + CJS support)
    if (isJS) {
        try {
            let nativeModule;
            try {
                // Try CommonJS first
                nativeModule = require(absolutePath);
            }
            catch (e) {
                // If it's an ESM package or core node: module that needs import()
                if (e.code === 'ERR_REQUIRE_ESM' || absolutePath.startsWith('node:') || ext === ".mjs") {
                    const esm = await Promise.resolve(`${absolutePath}`).then(s => __importStar(require(s)));
                    // ESM imports return a default if it's the only export, or a namespace
                    nativeModule = esm.default || esm;
                }
                else {
                    throw e;
                }
            }
            const result = (0, values_1.jsToRuntimeVal)(nativeModule);
            moduleCache.set(absolutePath, result);
            return result;
        }
        catch (e) {
            throw new Error(`Failed to load native module ${modulePath}: ${e.message}`);
        }
    }
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Cannot find module: ${modulePath} (resolved to: ${absolutePath})`);
    }
    const source = fs.readFileSync(absolutePath, "utf-8");
    const parser = new parser_1.default();
    const program = parser.produceAST(source, absolutePath);
    let globalEnv = parentEnv;
    while (globalEnv.parent) {
        globalEnv = globalEnv.parent;
    }
    const moduleEnv = new environment_1.default(globalEnv);
    const exports = (0, values_1.MK_OBJECT)(new Map());
    moduleEnv.declareVar("exports", exports, false);
    try {
        await evaluate(program, moduleEnv);
    }
    catch (e) {
        throw e;
    }
    const result = moduleEnv.lookupVar("exports");
    moduleCache.set(absolutePath, result);
    return result;
}
async function eval_switch_statement(stmt, env) {
    const discriminant = await evaluate(stmt.discriminant, env);
    const discValue = discriminant.value;
    let matched = false;
    let result = (0, values_1.MK_NULL)();
    for (const caseStmt of stmt.cases) {
        const test = await evaluate(caseStmt.test, env);
        if (test.value === discValue) {
            matched = true;
            const scope = new environment_1.default(env, "block");
            try {
                for (const s of caseStmt.consequent) {
                    result = await evaluate(s, scope);
                }
            }
            catch (e) {
                if (e instanceof BreakException)
                    return (0, values_1.MK_NULL)();
                throw e;
            }
            break;
        }
    }
    if (!matched && stmt.default) {
        const scope = new environment_1.default(env, "block");
        try {
            for (const s of stmt.default) {
                result = await evaluate(s, scope);
            }
        }
        catch (e) {
            if (e instanceof BreakException)
                return (0, values_1.MK_NULL)();
            throw e;
        }
    }
    return result;
}
async function eval_try_catch_statement(stmt, env) {
    const scope = new environment_1.default(env, "block");
    let result = (0, values_1.MK_NULL)();
    try {
        for (const s of stmt.body) {
            result = await evaluate(s, scope);
        }
    }
    catch (e) {
        if (e instanceof values_1.ReturnException || e instanceof BreakException || e instanceof ContinueException) {
            throw e; // Control flow should bypass catch
        }
        // Nova throws RuntimeVals. Wrapped JS errors might also occur.
        const errorVal = (e instanceof Error) ? (0, values_1.MK_STRING)(e.message) : e;
        if (stmt.catchBlock.length > 0) {
            const catchScope = new environment_1.default(env, "block");
            if (stmt.catchParameter) {
                catchScope.declareVar(stmt.catchParameter, errorVal, true);
            }
            for (const s of stmt.catchBlock) {
                result = await evaluate(s, catchScope);
            }
        }
        else {
            // Rethrow if no catch
            throw e;
        }
    }
    finally {
        if (stmt.finallyBlock) {
            const finallyScope = new environment_1.default(env, "block");
            for (const s of stmt.finallyBlock) {
                await evaluate(s, finallyScope);
            }
        }
    }
    return result;
}
async function eval_import_statement(stmt, env) {
    try {
        await eval_module(stmt.moduleName, env, stmt.file);
        return (0, values_1.MK_NULL)();
    }
    catch (e) {
        throw new errors_1.NovaImportError(e.message, getLocation(stmt));
    }
}
async function eval_named_import_statement(stmt, env) {
    try {
        const moduleVal = await eval_module(stmt.moduleName, env, stmt.file);
        if (moduleVal.type !== "object") {
            throw new errors_1.NovaImportError(`Module '${stmt.moduleName}' did not export an object`, getLocation(stmt));
        }
        const exportsMap = moduleVal.properties;
        for (const name of stmt.imports) {
            if (exportsMap.has(name)) {
                env.declareVar(name, exportsMap.get(name), true);
            }
            else {
                throw new errors_1.NovaImportError(`Module '${stmt.moduleName}' has no export named '${name}'`, getLocation(stmt));
            }
        }
        return (0, values_1.MK_NULL)();
    }
    catch (e) {
        throw new errors_1.NovaImportError(e.message, getLocation(stmt));
    }
}
async function eval_export_declaration(decl, env) {
    const value = await evaluate(decl.declaration, env);
    // Exports are collected in an 'exports' object.
    // Ensure 'exports' is available in the current environment
    try {
        const exportsObj = env.lookupVar("exports");
        if (exportsObj.type === "object") {
            let name = "";
            if (decl.declaration.kind === "VarDeclaration")
                name = decl.declaration.identifier;
            else if (decl.declaration.kind === "FunctionDeclaration")
                name = decl.declaration.name;
            if (name) {
                exportsObj.properties.set(name, value);
            }
        }
    }
    catch (e) {
        // If 'exports' wasn't declared, we're likely in REPL or not a module, ignore it silently.
    }
    return value;
}
async function eval_import_expr(expr, env) {
    try {
        const modNameVal = await evaluate(expr.moduleName, env);
        if (modNameVal.type !== "string") {
            throw new errors_1.NovaImportError("Module name in include() must evaluate to a string.", getLocation(expr));
        }
        return await eval_module(modNameVal.value, env, expr.file);
    }
    catch (e) {
        throw new errors_1.NovaImportError(e.message, getLocation(expr));
    }
}
/**
 * Wraps a NovaScript function as a native JavaScript function.
 * This allows passing Nova functions as callbacks to Node.js modules.
 */
function wrapNovaFn(func, env) {
    return (...jsArgs) => {
        const args = jsArgs.map(arg => (0, values_1.jsToRuntimeVal)(arg));
        const executeBody = async () => {
            const scope = new environment_1.default(func.declarationEnv, "function");
            for (let i = 0; i < func.parameters.length; i++) {
                scope.declareVar(func.parameters[i], args[i] || (0, values_1.MK_NULL)(), false);
            }
            let result = (0, values_1.MK_NULL)();
            try {
                for (const stmt of func.body) {
                    result = await evaluate(stmt, scope);
                }
            }
            catch (e) {
                if (e instanceof values_1.ReturnException) {
                    result = e.value;
                }
                else {
                    throw e;
                }
            }
            return (0, values_1.runtimeToJsVal)(result);
        };
        return executeBody(); // Returns a promise to the JS caller
    };
}
