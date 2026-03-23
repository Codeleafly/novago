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
exports.createFSModule = createFSModule;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const values_1 = require("../values");
function createFSModule() {
    const fsProps = new Map();
    // Basic Read/Write
    fsProps.set("read", (0, values_1.MK_NATIVE_FN)((args) => {
        const p = args[0].value;
        if (!fs.existsSync(p))
            return (0, values_1.MK_NULL)();
        return (0, values_1.MK_STRING)(fs.readFileSync(p, "utf-8"));
    }));
    fsProps.set("write", (0, values_1.MK_NATIVE_FN)((args) => {
        fs.writeFileSync(args[0].value, args[1].value);
        return (0, values_1.MK_BOOL)(true);
    }));
    fsProps.set("append", (0, values_1.MK_NATIVE_FN)((args) => {
        fs.appendFileSync(args[0].value, args[1].value);
        return (0, values_1.MK_BOOL)(true);
    }));
    // Advanced Operations
    fsProps.set("copy", (0, values_1.MK_NATIVE_FN)((args) => {
        const src = args[0].value;
        const dest = args[1].value;
        const recursive = args[2]?.value ?? true;
        fs.cpSync(src, dest, { recursive });
        return (0, values_1.MK_BOOL)(true);
    }));
    fsProps.set("move", (0, values_1.MK_NATIVE_FN)((args) => {
        const src = args[0].value;
        const dest = args[1].value;
        fs.renameSync(src, dest);
        return (0, values_1.MK_BOOL)(true);
    }));
    fsProps.set("rename", (0, values_1.MK_NATIVE_FN)((args) => {
        const oldPath = args[0].value;
        const newPath = args[1].value;
        fs.renameSync(oldPath, newPath);
        return (0, values_1.MK_BOOL)(true);
    }));
    fsProps.set("delete", (0, values_1.MK_NATIVE_FN)((args) => {
        const p = args[0].value;
        const recursive = args[1]?.value ?? true;
        fs.rmSync(p, { recursive, force: true });
        return (0, values_1.MK_BOOL)(true);
    }));
    fsProps.set("exists", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_BOOL)(fs.existsSync(args[0].value))));
    fsProps.set("mkdir", (0, values_1.MK_NATIVE_FN)((args) => {
        const p = args[0].value;
        fs.mkdirSync(p, { recursive: true });
        return (0, values_1.MK_BOOL)(true);
    }));
    fsProps.set("rmdir", (0, values_1.MK_NATIVE_FN)((args) => {
        const p = args[0].value;
        fs.rmSync(p, { recursive: true, force: true });
        return (0, values_1.MK_BOOL)(true);
    }));
    fsProps.set("isFile", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_BOOL)(fs.statSync(args[0].value).isFile())));
    fsProps.set("isDir", (0, values_1.MK_NATIVE_FN)((args) => (0, values_1.MK_BOOL)(fs.statSync(args[0].value).isDirectory())));
    // List and Search
    fsProps.set("list", (0, values_1.MK_NATIVE_FN)((args) => {
        const dir = args[0].value;
        const files = fs.readdirSync(dir);
        return (0, values_1.MK_ARRAY)(files.map(f => (0, values_1.MK_STRING)(f)));
    }));
    fsProps.set("search", (0, values_1.MK_NATIVE_FN)((args) => {
        const pattern = args[0].value;
        const startDir = args[1]?.value || ".";
        const recursive = args[2]?.value ?? true;
        const results = [];
        const walk = (dir) => {
            const list = fs.readdirSync(dir);
            for (const file of list) {
                const fullPath = path.join(dir, file);
                if (file.includes(pattern))
                    results.push(fullPath);
                if (recursive && fs.statSync(fullPath).isDirectory()) {
                    walk(fullPath);
                }
            }
        };
        walk(startDir);
        return (0, values_1.MK_ARRAY)(results.map(r => (0, values_1.MK_STRING)(r)));
    }));
    return (0, values_1.MK_OBJECT)(fsProps);
}
