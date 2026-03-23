"use strict";
// src/runtime/environment.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalEnv = createGlobalEnv;
const values_1 = require("./values");
class Environment {
    constructor(parentENV, scopeType = "block") {
        this.parent = parentENV;
        this.variables = new Map();
        this.constants = new Set();
        this.scopeType = scopeType;
    }
    // Traverse up to find the global (root) environment
    getGlobalEnv() {
        let env = this;
        while (env.parent) {
            env = env.parent;
        }
        return env;
    }
    // Declare a local (block/function-scoped) variable
    declareVar(varname, value, constant) {
        if (this.variables.has(varname)) {
            throw new Error(`Cannot declare variable '${varname}'. It is already defined in this scope.`);
        }
        this.variables.set(varname, value);
        if (constant) {
            this.constants.add(varname);
        }
        return value;
    }
    // Declare a global variable — always goes on the root environment
    declareGlobal(varname, value, constant) {
        const global = this.getGlobalEnv();
        // Allow re-assignment of non-const globals from inner scopes
        if (global.variables.has(varname) && global.constants.has(varname)) {
            throw new Error(`Cannot redeclare constant global '${varname}'.`);
        }
        global.variables.set(varname, value);
        if (constant) {
            global.constants.add(varname);
        }
        return value;
    }
    assignVar(varname, value) {
        const env = this.resolve(varname);
        if (env.constants.has(varname)) {
            throw new Error(`Cannot reassign to constant '${varname}'.`);
        }
        env.variables.set(varname, value);
        return value;
    }
    lookupVar(varname) {
        const env = this.resolve(varname);
        return env.variables.get(varname);
    }
    resolve(varname) {
        if (this.variables.has(varname)) {
            return this;
        }
        if (this.parent == undefined) {
            throw new Error(`Cannot resolve '${varname}' as it does not exist.`);
        }
        return this.parent.resolve(varname);
    }
    hasOwn(varname) {
        return this.variables.has(varname);
    }
}
exports.default = Environment;
function createGlobalEnv() {
    const env = new Environment(undefined, "global");
    env.declareVar("true", (0, values_1.MK_BOOL)(true), true);
    env.declareVar("false", (0, values_1.MK_BOOL)(false), true);
    env.declareVar("null", (0, values_1.MK_NULL)(), true);
    return env;
}
