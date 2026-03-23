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
exports.createUtilModules = createUtilModules;
const values_1 = require("../values");
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
function createUtilModules() {
    const modules = {};
    // Date Module
    const dateProps = new Map();
    dateProps.set("now", (0, values_1.MK_NATIVE_FN)(() => (0, values_1.MK_NUMBER)(Date.now())));
    dateProps.set("parse", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_NUMBER)(Date.parse(args[0].value))));
    dateProps.set("toISO", (0, values_1.MK_NATIVE_FN)((args) => {
        const ms = args[0] ? args[0].value : Date.now();
        return (0, values_1.MK_STRING)(new Date(ms).toISOString());
    }));
    dateProps.set("toUTC", (0, values_1.MK_NATIVE_FN)((args) => {
        const ms = args[0] ? args[0].value : Date.now();
        return (0, values_1.MK_STRING)(new Date(ms).toUTCString());
    }));
    dateProps.set("format", (0, values_1.MK_NATIVE_FN)((args) => {
        const ms = args[0] ? args[0].value : Date.now();
        const fmt = args[1] ? args[1].value : "YYYY-MM-DD HH:mm:ss";
        const date = new Date(ms);
        const pad = (n) => n.toString().padStart(2, '0');
        const map = {
            "YYYY": date.getFullYear().toString(),
            "MM": pad(date.getMonth() + 1),
            "DD": pad(date.getDate()),
            "HH": pad(date.getHours()),
            "mm": pad(date.getMinutes()),
            "ss": pad(date.getSeconds()),
        };
        let result = fmt;
        for (const [k, v] of Object.entries(map)) {
            result = result.replace(k, v);
        }
        return (0, values_1.MK_STRING)(result);
    }));
    dateProps.set("diff", (0, values_1.MK_NATIVE_FN)((args) => {
        const ms1 = args[0].value;
        const ms2 = args[1].value;
        return (0, values_1.MK_NUMBER)(ms1 - ms2);
    }));
    modules["Date"] = (0, values_1.MK_OBJECT)(dateProps);
    // Regex Module
    const regexProps = new Map();
    regexProps.set("test", (0, values_1.MK_NATIVE_FN)((args) => {
        const pattern = args[0].value;
        const str = args[1].value;
        const flags = args[2] ? args[2].value : "";
        return (0, values_1.MK_BOOL)(new RegExp(pattern, flags).test(str));
    }));
    regexProps.set("match", (0, values_1.MK_NATIVE_FN)((args) => {
        const pattern = args[0].value;
        const str = args[1].value;
        const flags = args[2] ? args[2].value : "";
        const matches = str.match(new RegExp(pattern, flags));
        if (!matches)
            return (0, values_1.MK_NULL)();
        return (0, values_1.MK_ARRAY)(matches.map((m) => (0, values_1.MK_STRING)(m)));
    }));
    regexProps.set("replace", (0, values_1.MK_NATIVE_FN)((args) => {
        const pattern = args[0].value;
        const str = args[1].value;
        const replacement = args[2].value;
        const flags = args[3] ? args[3].value : "";
        return (0, values_1.MK_STRING)(str.replace(new RegExp(pattern, flags), replacement));
    }));
    modules["Regex"] = (0, values_1.MK_OBJECT)(regexProps);
    // Base64 Module
    const b64Props = new Map();
    b64Props.set("encode", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(Buffer.from(args[0].value).toString('base64'))));
    b64Props.set("decode", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(Buffer.from(args[0].value, 'base64').toString('ascii'))));
    modules["Base64"] = (0, values_1.MK_OBJECT)(b64Props);
    // Console Module
    const consoleProps = new Map();
    consoleProps.set("clear", (0, values_1.MK_NATIVE_FN)(() => { console.clear(); return (0, values_1.MK_NULL)(); }));
    consoleProps.set("error", (0, values_1.MK_NATIVE_FN)((args) => { console.error(chalk_1.default.red((0, values_1.plainStringify)(args[0]))); return (0, values_1.MK_NULL)(); }));
    consoleProps.set("warn", (0, values_1.MK_NATIVE_FN)((args) => { console.warn(chalk_1.default.yellow((0, values_1.plainStringify)(args[0]))); return (0, values_1.MK_NULL)(); }));
    modules["Console"] = (0, values_1.MK_OBJECT)(consoleProps);
    // Path Module
    const pathProps = new Map();
    pathProps.set("join", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(path.join(...args.map(a => a.value)))));
    pathProps.set("resolve", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(path.resolve(...args.map(a => a.value)))));
    pathProps.set("basename", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(path.basename(args[0].value))));
    pathProps.set("dirname", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(path.dirname(args[0].value))));
    pathProps.set("extname", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(path.extname(args[0].value))));
    modules["Path"] = (0, values_1.MK_OBJECT)(pathProps);
    // JSON Module
    const jsonProps = new Map();
    jsonProps.set("stringify", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_STRING)(JSON.stringify((0, values_1.runtimeToJsVal)(args[0])))));
    jsonProps.set("parse", (0, values_1.MK_NATIVE_FN)((args) => {
        try {
            const jsObj = JSON.parse(args[0].value);
            return (0, values_1.jsToRuntimeVal)(jsObj);
        }
        catch (e) {
            return (0, values_1.MK_NULL)();
        }
    }));
    modules["JSON"] = (0, values_1.MK_OBJECT)(jsonProps);
    // Net Module
    const netProps = new Map();
    netProps.set("ping", (0, values_1.MK_NATIVE_FN)((args) => {
        return (0, values_1.MK_STRING)("Reply from " + args[0].value + ": time=10ms");
    }));
    modules["Net"] = (0, values_1.MK_OBJECT)(netProps);
    return modules;
}
