#!/usr/bin/env node
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
// src/main.ts
const parser_1 = __importDefault(require("./frontend/parser"));
const interpreter_1 = require("./runtime/interpreter");
const environment_1 = __importStar(require("./runtime/environment"));
const values_1 = require("./runtime/values");
const readline = __importStar(require("readline"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const prompt_sync_1 = __importDefault(require("prompt-sync"));
// Native Modules
const fs_module_1 = require("./runtime/native/fs_module");
const http_module_1 = require("./runtime/native/http_module");
const sys_module_1 = require("./runtime/native/sys_module");
const math_module_1 = require("./runtime/native/math_module");
const string_module_1 = require("./runtime/native/string_module");
const array_module_1 = require("./runtime/native/array_module");
const util_modules_1 = require("./runtime/native/util_modules");
const diagnostics_1 = require("./runtime/diagnostics");
const prompt = (0, prompt_sync_1.default)({ sigint: true });
const VERSION = "v6.1.1-dev";
const diagnostics = new diagnostics_1.Diagnostics(VERSION);
function stringify(val) {
    switch (val.type) {
        case "string": return chalk_1.default.green(`${val.value}`);
        case "number": return chalk_1.default.yellow(val.value.toString());
        case "boolean": return chalk_1.default.cyan(val.value.toString());
        case "null": return chalk_1.default.gray("null");
        case "promise": return chalk_1.default.blue("[Promise]");
        case "array":
            return chalk_1.default.white("[") + val.elements.map((e) => stringify(e)).join(chalk_1.default.white(", ")) + chalk_1.default.white("]");
        case "object":
            const props = Array.from(val.properties.entries())
                .map(([k, v]) => `${chalk_1.default.blue(k)}: ${stringify(v)}`)
                .join(chalk_1.default.white(", "));
            return chalk_1.default.white("{ ") + props + chalk_1.default.white(" }");
        case "function": return chalk_1.default.magenta("[Function]");
        case "native-fn": return chalk_1.default.magenta("[Native Function]");
        default: return JSON.stringify(val);
    }
}
/**
 * Global Dependency pre-fetcher (pre-requisite for v6.0.0)
 */
async function getDependency(source) {
    try {
        const LibraryManager = (await Promise.resolve().then(() => __importStar(require("./runtime/library_manager")))).LibraryManager;
        await LibraryManager.resolve(source);
    }
    catch (e) {
        throw e;
    }
}
function setupEnv() {
    const env = (0, environment_1.createGlobalEnv)();
    // Standard Print
    env.declareVar("print", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        const output = args.map(arg => (0, values_1.plainStringify)(arg)).join(" ");
        process.stdout.write(output + "\n");
        return (0, values_1.MK_NULL)();
    }), true);
    // Time
    env.declareVar("time", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        return (0, values_1.MK_NUMBER)(Date.now());
    }), true);
    // Input
    env.declareVar("input", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        const promptText = args.length > 0
            ? (0, values_1.plainStringify)(args[0])
            : "";
        const result = prompt(chalk_1.default.gray(promptText));
        return (0, values_1.MK_STRING)(result || "");
    }), true);
    // Type Conversions
    env.declareVar("num", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        if (args.length === 0)
            return (0, values_1.MK_NUMBER)(0);
        const val = args[0].value;
        return (0, values_1.MK_NUMBER)(parseFloat(val) || 0);
    }), true);
    env.declareVar("str", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        if (args.length === 0)
            return (0, values_1.MK_STRING)("");
        return (0, values_1.MK_STRING)((0, values_1.plainStringify)(args[0]));
    }), true);
    env.declareVar("bool", (0, values_1.MK_NATIVE_FN)((args, scope) => {
        if (args.length === 0)
            return (0, values_1.MK_BOOL)(false);
        const val = args[0].value;
        return (0, values_1.MK_BOOL)(!!val);
    }), true);
    // Modular Library Registry
    env.declareVar("Math", (0, math_module_1.createMathModule)(), true);
    env.declareVar("String", (0, string_module_1.createStringModule)(), true);
    env.declareVar("Array", (0, array_module_1.createArrayModule)(), true);
    // Utility Modules
    const utils = (0, util_modules_1.createUtilModules)();
    for (const [name, mod] of Object.entries(utils)) {
        env.declareVar(name, mod, true);
    }
    // FS Module (Modular)
    const fsModule = (0, fs_module_1.createFSModule)();
    env.declareVar("FS", fsModule, true);
    env.declareVar("File", fsModule, true);
    // Sys Module (Modular)
    env.declareVar("Sys", (0, sys_module_1.createSysModule)(VERSION), true);
    // HTTP Module (Modular)
    env.declareVar("HTTP", (0, http_module_1.createHTTPModule)(), true);
    // Compatibility (Optional)
    env.declareVar("toInteger", env.lookupVar("num"), true);
    env.declareVar("toNumber", env.lookupVar("num"), true);
    env.declareVar("toString", env.lookupVar("str"), true);
    // ─── v6.0.5-dev Global Helpers ───────────────────────────────────────
    env.declareVar("openUrl", (0, values_1.MK_NATIVE_FN)((args) => {
        const url = args[0].value;
        const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        try {
            (0, child_process_1.execSync)(`${cmd} ${url}`);
        }
        catch (e) { }
        return (0, values_1.MK_NULL)();
    }), true);
    env.declareVar("parseJson", (0, values_1.MK_NATIVE_FN)((args) => {
        try {
            return (0, values_1.jsToRuntimeVal)(JSON.parse(args[0].value));
        }
        catch (e) {
            return (0, values_1.MK_NULL)();
        }
    }), true);
    env.declareVar("watchFile", (0, values_1.MK_NATIVE_FN)((args, env) => {
        const filePath = args[0].value;
        const callback = args[1];
        if (callback.type !== "function")
            return (0, values_1.MK_NULL)();
        fs.watch(filePath, (event, filename) => {
            const scope = new environment_1.default(callback.declarationEnv, "function");
            scope.declareVar("event", (0, values_1.MK_STRING)(event), true);
            scope.declareVar("filename", (0, values_1.MK_STRING)(filename || ""), true);
            (0, interpreter_1.evaluate)({ kind: "Program", body: callback.body }, scope).catch(e => console.error(e));
        });
        return (0, values_1.MK_NULL)();
    }), true);
    env.declareVar("fetchText", (0, values_1.MK_NATIVE_FN)((args) => {
        const url = args[0].value;
        const httpModule = env.lookupVar("HTTP");
        const getFn = httpModule.properties.get("get");
        const res = getFn.call([(0, values_1.MK_STRING)(url)], env);
        if (res.type === "object") {
            return res.properties.get("data") || (0, values_1.MK_NULL)();
        }
        return (0, values_1.MK_NULL)();
    }), true);
    return env;
}
function reportError(err) {
    diagnostics.report(err);
}
// ─── Syntax Highlight for REPL Input Display ───────────────────────────────
function highlightSyntax(code) {
    const keywords = [
        "let", "const", "global", "fn", "if", "else", "while", "for", "from", "to",
        "return", "include", "and", "or", "not", "is", "isnt", "true", "false", "null",
        "print", "async", "await", "try", "catch", "finally", "throw", "switch",
        "case", "default", "break", "continue"
    ];
    let result = code;
    // Keywords
    const kwRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
    result = result.replace(kwRegex, (m) => chalk_1.default.magenta.bold(m));
    // Strings
    result = result.replace(/"[^"]*"/g, (m) => chalk_1.default.green(m));
    // Numbers
    result = result.replace(/\b(\d+(\.\d+)?)\b/g, (m) => chalk_1.default.yellow(m));
    // Comments
    result = result.replace(/#.*/g, (m) => chalk_1.default.gray(m));
    return result;
}
// ─── Detect if block is still open (unclosed braces) ──────────────────────
function isIncomplete(code) {
    let braces = 0;
    let inStr = false;
    for (const ch of code) {
        if (ch === '"' && !inStr) {
            inStr = true;
            continue;
        }
        if (ch === '"' && inStr) {
            inStr = false;
            continue;
        }
        if (inStr)
            continue;
        if (ch === '{')
            braces++;
        if (ch === '}')
            braces--;
    }
    return braces > 0;
}
// ─── REPL Help ──────────────────────────────────────────────────────────────
function printReplHelp() {
    console.log("");
    console.log(chalk_1.default.cyan.bold("  NovaScript REPL Commands"));
    console.log(chalk_1.default.gray("  ─────────────────────────────────────────────────────"));
    console.log(`  ${chalk_1.default.yellow(".help")}       ${chalk_1.default.white("Show this help message")}`);
    console.log(`  ${chalk_1.default.yellow(".editor")}     ${chalk_1.default.white("Enter multi-line editor mode (finish with .run)")}`);
    console.log(`  ${chalk_1.default.yellow(".clear")}      ${chalk_1.default.white("Clear the terminal screen")}`);
    console.log(`  ${chalk_1.default.yellow(".reset")}      ${chalk_1.default.white("Reset the REPL state (clears all variables)")}`);
    console.log(`  ${chalk_1.default.yellow(".exit")}       ${chalk_1.default.white("Exit the REPL")}`);
    console.log("");
    console.log(chalk_1.default.cyan.bold("  Quick Reference"));
    console.log(chalk_1.default.gray("  ─────────────────────────────────────────────────────"));
    console.log(`  ${chalk_1.default.green("let x = 10")}           ${chalk_1.default.gray("# declare variable")}`);
    console.log(`  ${chalk_1.default.green("const PI = 3.14")}      ${chalk_1.default.gray("# declare constant")}`);
    console.log(`  ${chalk_1.default.green("global counter = 0")}   ${chalk_1.default.gray("# global variable")}`);
    console.log(`  ${chalk_1.default.green("fn add(a, b) { ... }")} ${chalk_1.default.gray("# define function")}`);
    console.log(`  ${chalk_1.default.green("print(\"hello\")")}       ${chalk_1.default.gray("# print output")}`);
    console.log("");
}
// ─── CLI Help ──────────────────────────────────────────────────────────────
function printCliHelp() {
    console.log("");
    console.log(chalk_1.default.cyan.bold(`  NovaScript CLI ${VERSION} (v0.1.0)`));
    console.log(chalk_1.default.gray("  ─────────────────────────────────────────────────────────────────────"));
    console.log(`  ${chalk_1.default.yellow("nova")}                      ${chalk_1.default.white("Start the interactive REPL")}`);
    console.log(`  ${chalk_1.default.yellow("nova run")} ${chalk_1.default.green("<file.nv>")}       ${chalk_1.default.white("Run a NovaScript file")}`);
    console.log(`  ${chalk_1.default.yellow("nova <file.nv>")}            ${chalk_1.default.white("Run a NovaScript file (shorthand)")}`);
    console.log(`  ${chalk_1.default.yellow("nova get")} ${chalk_1.default.green("<source>")}        ${chalk_1.default.white("Pre-fetch a global dependency (npm:, github:, https:)")}`);
    console.log(`  ${chalk_1.default.yellow("nova clean")}                ${chalk_1.default.white("Clear the global library cache (~/.nova_libs)")}`);
    console.log(`  ${chalk_1.default.yellow("nova version")}              ${chalk_1.default.white("Print the current version")}`);
    console.log(`  ${chalk_1.default.yellow("nova help")}                 ${chalk_1.default.white("Show this help message")}`);
    console.log(`  ${chalk_1.default.yellow("nova repl")}                 ${chalk_1.default.white("Start the interactive REPL explicitly")}`);
    console.log("");
    console.log(chalk_1.default.cyan.bold("  REPL Special Commands"));
    console.log(chalk_1.default.gray("  ─────────────────────────────────────────────────────────────────────"));
    console.log(`  ${chalk_1.default.yellow(".help")}                     ${chalk_1.default.white("Show REPL help")}`);
    console.log(`  ${chalk_1.default.yellow(".editor")}                   ${chalk_1.default.white("Enter multi-line editor (type .run to execute)")}`);
    console.log(`  ${chalk_1.default.yellow(".clear")}                    ${chalk_1.default.white("Clear screen")}`);
    console.log(`  ${chalk_1.default.yellow(".reset")}                    ${chalk_1.default.white("Reset all variables")}`);
    console.log(`  ${chalk_1.default.yellow(".exit")}                     ${chalk_1.default.white("Exit the REPL")}`);
    console.log("");
}
// ─── Run File ───────────────────────────────────────────────────────────────
async function run(filename) {
    const parser = new parser_1.default();
    const env = setupEnv();
    const absolutePath = path.resolve(filename);
    if (!fs.existsSync(absolutePath)) {
        console.log(chalk_1.default.red.bold(`\nError: File not found: ${filename}`));
        process.exit(1);
        return;
    }
    const input = fs.readFileSync(absolutePath, "utf-8");
    try {
        const program = parser.produceAST(input, absolutePath);
        await (0, interpreter_1.evaluate)(program, env);
    }
    catch (e) {
        reportError(e);
        process.exit(1);
    }
}
// ─── Production REPL ─────────────────────────────────────────────────────────
function repl() {
    const parser = new parser_1.default();
    let env = setupEnv();
    // Banner
    const v = chalk_1.default.hex("#D8B4FE").bold(VERSION);
    const sep = chalk_1.default.hex("#6D28D9")("━".repeat(48));
    console.log("");
    console.log("  " + sep);
    console.log("  " + chalk_1.default.hex("#A78BFA")("✧") + "  " + chalk_1.default.hex("#C084FC").bold("Nova") + chalk_1.default.white.bold("Script") + "  " + chalk_1.default.hex("#A78BFA")("✧") + "  " + v);
    console.log("  " + sep);
    console.log("  " + chalk_1.default.hex("#9D5CF6")("▸") + " " + chalk_1.default.gray(".help") + chalk_1.default.hex("#7C3AED")("  •  ") + chalk_1.default.gray(".editor") + chalk_1.default.hex("#7C3AED")("  •  ") + chalk_1.default.gray(".reset") + chalk_1.default.hex("#7C3AED")("  •  ") + chalk_1.default.gray(".clear") + chalk_1.default.hex("#7C3AED")("  •  ") + chalk_1.default.gray(".exit"));
    console.log("");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk_1.default.hex("#C084FC").bold("nova") + chalk_1.default.white(" ❯ "),
    });
    // Multiline state
    let multiLineBuffer = "";
    let editorMode = false;
    let continuationMode = false;
    const promptNormal = () => rl.setPrompt(chalk_1.default.hex("#C084FC").bold("nova") + chalk_1.default.white(" ❯ "));
    const promptContinue = () => rl.setPrompt(chalk_1.default.gray("  ... "));
    const promptEditor = () => rl.setPrompt(chalk_1.default.yellow("  ✏  "));
    rl.prompt();
    rl.on("line", async (inputLine) => {
        const trimmed = inputLine.trim();
        // ─ Editor Mode ────────────────────────────────────────────────────
        if (editorMode) {
            if (trimmed === ".run") {
                editorMode = false;
                const code = multiLineBuffer.trim();
                multiLineBuffer = "";
                console.log(chalk_1.default.gray("\n── Running ──────────────────────────────"));
                if (code) {
                    try {
                        const program = parser.produceAST(code, "repl");
                        const result = await (0, interpreter_1.evaluate)(program, env);
                        if (result.type !== "null")
                            console.log(stringify(result));
                    }
                    catch (e) {
                        reportError(e);
                    }
                }
                console.log(chalk_1.default.gray("─────────────────────────────────────────\n"));
                promptNormal();
                rl.prompt();
                return;
            }
            if (trimmed === ".clear" || trimmed === ".cancel") {
                editorMode = false;
                multiLineBuffer = "";
                console.log(chalk_1.default.gray("  Editor cancelled.\n"));
                promptNormal();
                rl.prompt();
                return;
            }
            multiLineBuffer += inputLine + "\n";
            promptEditor();
            rl.prompt();
            return;
        }
        // ─ Continuation Mode (unclosed braces) ────────────────────────────
        if (continuationMode) {
            multiLineBuffer += "\n" + inputLine;
            if (!isIncomplete(multiLineBuffer)) {
                continuationMode = false;
                const code = multiLineBuffer.trim();
                multiLineBuffer = "";
                try {
                    const program = parser.produceAST(code, "repl");
                    const result = await (0, interpreter_1.evaluate)(program, env);
                    if (result.type !== "null")
                        console.log(stringify(result));
                }
                catch (e) {
                    reportError(e);
                }
                promptNormal();
                rl.prompt();
            }
            else {
                promptContinue();
                rl.prompt();
            }
            return;
        }
        // ─ REPL Commands ──────────────────────────────────────────────────
        if (trimmed === ".exit" || trimmed === "exit") {
            console.log(chalk_1.default.gray("\n  Bye! 👋\n"));
            process.exit(0);
        }
        if (trimmed === ".help") {
            printReplHelp();
            rl.prompt();
            return;
        }
        if (trimmed === ".clear") {
            console.clear();
            rl.prompt();
            return;
        }
        if (trimmed === ".reset") {
            env = setupEnv();
            multiLineBuffer = "";
            console.log(chalk_1.default.green("  ✔ Environment reset.\n"));
            rl.prompt();
            return;
        }
        if (trimmed === ".editor") {
            editorMode = true;
            multiLineBuffer = "";
            console.log(chalk_1.default.yellow("\n  ── Editor Mode ──────────────────────────────────────\n  Enter multiple lines of code.\n  Type .run to execute, .cancel to abort.\n"));
            promptEditor();
            rl.prompt();
            return;
        }
        if (trimmed === "") {
            rl.prompt();
            return;
        }
        // ─ Auto-continuation for unclosed blocks ──────────────────────────
        if (isIncomplete(trimmed)) {
            continuationMode = true;
            multiLineBuffer = inputLine;
            promptContinue();
            rl.prompt();
            return;
        }
        // ─ Normal evaluate ─────────────────────────────────────────────────
        try {
            const program = parser.produceAST(trimmed, "repl");
            const result = await (0, interpreter_1.evaluate)(program, env);
            if (result.type !== "null") {
                console.log("  " + chalk_1.default.gray("⟵ ") + stringify(result));
            }
        }
        catch (e) {
            reportError(e);
        }
        rl.prompt();
    });
    rl.on("close", () => {
        console.log(chalk_1.default.gray("\n  Bye! 👋\n"));
        process.exit(0);
    });
}
// ─── CLI Entry Point ─────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);
if (cliArgs.length === 0) {
    repl();
}
else {
    const cmd = cliArgs[0];
    switch (cmd) {
        case "version":
        case "--version":
        case "-v":
            console.log(`\n  ${chalk_1.default.hex("#C084FC").bold("NovaScript")} ${chalk_1.default.white(VERSION)}\n  Node.js ${process.version} on ${os.platform()} ${os.arch()}\n`);
            break;
        case "help":
        case "--help":
        case "-h":
            printCliHelp();
            break;
        case "repl":
            repl();
            break;
        case "run":
            if (!cliArgs[1]) {
                console.log(chalk_1.default.red.bold("\n  Error: No file specified. Usage: nova run <file.nv>\n"));
                process.exit(1);
            }
            run(cliArgs[1]).catch(e => {
                reportError(e);
                process.exit(1);
            });
            break;
        case "get":
            if (!cliArgs[1]) {
                console.log(chalk_1.default.red.bold("\n  Error: No source specified. Usage: nova get <source>\n"));
                process.exit(1);
            }
            getDependency(cliArgs[1]).then(() => {
                process.exit(0);
            }).catch(e => {
                console.log(chalk_1.default.red.bold(`\n  Import Error: ${e.message}\n`));
                process.exit(1);
            });
            break;
        case "install":
        case "i":
            if (!cliArgs[1]) {
                console.log(chalk_1.default.red.bold("\n  Error: No source specified. Usage: nova install [-g] <source>\n"));
                process.exit(1);
            }
            let isGlobal = false;
            let sourceIndex = 1;
            if (cliArgs[1] === "-g" || cliArgs[1] === "--global") {
                isGlobal = true;
                sourceIndex = 2;
            }
            else if (cliArgs[2] === "-g" || cliArgs[2] === "--global") {
                isGlobal = true;
            }
            const source = cliArgs[sourceIndex];
            if (!source) {
                console.log(chalk_1.default.red.bold("\n  Error: No source specified. Usage: nova install [-g] <source>\n"));
                process.exit(1);
            }
            Promise.resolve().then(() => __importStar(require("./runtime/library_manager"))).then(m => {
                if (isGlobal) {
                    m.LibraryManager.installGlobal(source).catch(e => {
                        console.log(chalk_1.default.red.bold(`\n  Global Install Error: ${e.message}\n`));
                        process.exit(1);
                    });
                }
                else {
                    // Local fallback/get
                    console.log(chalk_1.default.yellow("\n  Note: Local install currently aliases to 'get'. Use -g for global executable.\n"));
                    Promise.resolve().then(() => __importStar(require("./runtime/interpreter"))).then(intp => {
                        m.LibraryManager.resolve(source).then(() => {
                            console.log(chalk_1.default.green(`\n  ✔ Fetched ${source}\n`));
                            process.exit(0);
                        }).catch(e => {
                            console.log(chalk_1.default.red.bold(`\n  Import Error: ${e.message}\n`));
                            process.exit(1);
                        });
                    });
                }
            });
            break;
        case "clean":
            Promise.resolve().then(() => __importStar(require("./runtime/library_manager"))).then(m => {
                m.LibraryManager.clean();
                process.exit(0);
            });
            break;
        default:
            // Assume it's a filename (backward compatible)
            if (cmd.endsWith(".nv") || cmd.endsWith(".nova") || cmd.endsWith(".ns") || fs.existsSync(cmd)) {
                run(cmd).catch(e => {
                    reportError(e);
                    process.exit(1);
                });
            }
            else {
                console.log(chalk_1.default.red.bold(`\n  Unknown command: ${cmd}`));
                console.log(chalk_1.default.gray("  Run 'nova help' for usage.\n"));
                process.exit(1);
            }
            break;
    }
}
