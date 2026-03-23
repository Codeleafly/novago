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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSysModule = createSysModule;
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const values_1 = require("../values");
function createSysModule(version) {
    const sysProps = new Map();
    sysProps.set("platform", (0, values_1.MK_STRING)(os.platform()));
    sysProps.set("arch", (0, values_1.MK_STRING)(os.arch()));
    sysProps.set("version", (0, values_1.MK_STRING)(version));
    sysProps.set("env", (0, values_1.MK_NATIVE_FN)((args) => {
        const key = args[0].value;
        const val = process.env[key];
        return val !== undefined ? (0, values_1.MK_STRING)(val) : (0, values_1.MK_NULL)();
    }));
    sysProps.set("uptime", (0, values_1.MK_NATIVE_FN)(() => (0, values_1.MK_NUMBER)(os.uptime())));
    sysProps.set("hostname", (0, values_1.MK_NATIVE_FN)(() => (0, values_1.MK_STRING)(os.hostname())));
    sysProps.set("totalmem", (0, values_1.MK_NATIVE_FN)(() => (0, values_1.MK_NUMBER)(os.totalmem())));
    sysProps.set("freemem", (0, values_1.MK_NATIVE_FN)(() => (0, values_1.MK_NUMBER)(os.freemem())));
    sysProps.set("exec", (0, values_1.MK_NATIVE_FN)((args) => {
        try {
            const output = (0, child_process_1.execSync)(args[0].value).toString();
            return (0, values_1.MK_STRING)(output);
        }
        catch (e) {
            return (0, values_1.MK_STRING)(e.message);
        }
    }));
    sysProps.set("exit", (0, values_1.MK_NATIVE_FN)((args) => {
        process.exit(args[0]?.value || 0);
    }));
    sysProps.set("time", (0, values_1.MK_NATIVE_FN)(() => (0, values_1.MK_NUMBER)(Date.now())));
    return (0, values_1.MK_OBJECT)(sysProps);
}
