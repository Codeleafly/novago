"use strict";
// src/runtime/diagnostics.ts
// Unified Diagnostics System for NovaScript v6.1.0-dev
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
exports.Diagnostics = void 0;
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
const os = __importStar(require("os"));
const errors_1 = require("./errors");
const ERROR_ICONS = {
    [errors_1.ErrorType.SyntaxError]: "✘",
    [errors_1.ErrorType.TypeError]: "⚠",
    [errors_1.ErrorType.ReferenceError]: "?",
    [errors_1.ErrorType.RuntimeError]: "✘",
    [errors_1.ErrorType.ImportError]: "⬇",
    [errors_1.ErrorType.ValueError]: "✘",
    [errors_1.ErrorType.ZeroDivisionError]: "÷",
};
const ERROR_COLORS = {
    [errors_1.ErrorType.SyntaxError]: chalk_1.default.red,
    [errors_1.ErrorType.TypeError]: chalk_1.default.yellow,
    [errors_1.ErrorType.ReferenceError]: chalk_1.default.magenta,
    [errors_1.ErrorType.RuntimeError]: chalk_1.default.red,
    [errors_1.ErrorType.ImportError]: chalk_1.default.cyan,
    [errors_1.ErrorType.ValueError]: chalk_1.default.red,
    [errors_1.ErrorType.ZeroDivisionError]: chalk_1.default.red,
};
class Diagnostics {
    constructor(version) {
        this.version = version;
    }
    /**
     * Reports a NovaError or generic JS Error with premium formatting.
     */
    report(err) {
        console.log("");
        if (err instanceof errors_1.NovaError) {
            this.reportNovaError(err);
        }
        else {
            this.reportSystemError(err);
        }
    }
    reportNovaError(err) {
        const icon = ERROR_ICONS[err.type] || "✘";
        const colorFn = ERROR_COLORS[err.type] || chalk_1.default.red;
        // Header Title
        const headerTitle = colorFn.bold(`${icon} ${err.type}`);
        // Location Info
        const loc = err.location;
        let content = `${chalk_1.default.whiteBright(err.message)}\n\n${chalk_1.default.gray(`File: ${loc.file}:${loc.line}:${loc.column}`)}\n`;
        // Source code snippet (10 lines total)
        if (loc.source) {
            const lines = loc.source.split("\n");
            const startLine = Math.max(0, loc.line - 6);
            const endLine = Math.min(lines.length, loc.line + 4);
            content += chalk_1.default.gray("─".repeat(50)) + "\n";
            for (let i = startLine; i < endLine; i++) {
                const lineNum = i + 1;
                const lineContent = lines[i];
                const numStr = String(lineNum).padStart(4, " ");
                if (lineNum === loc.line) {
                    // Error line highlighted
                    content += colorFn.bold(` ${numStr} | `) + chalk_1.default.whiteBright(lineContent) + "\n";
                    // Caret pointer underneath
                    const caretPad = " ".repeat(Math.max(0, loc.column - 1));
                    content += chalk_1.default.gray(`      | `) + colorFn.bold(`${caretPad}^── ${err.message}`) + "\n";
                }
                else {
                    // Normal context line
                    content += chalk_1.default.gray(` ${numStr} | ${lineContent}`) + "\n";
                }
            }
        }
        const diagnosticInfo = `\nNovaScript ${this.version} | ${os.platform()} ${os.arch()} | Node ${process.version}\n${new Date().toLocaleString()}`;
        content += chalk_1.default.gray("─".repeat(50)) + "\n" + chalk_1.default.dim(diagnosticInfo);
        console.log((0, boxen_1.default)(content, {
            title: headerTitle,
            titleAlignment: "left",
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "gray",
        }));
    }
    reportSystemError(err) {
        const headerTitle = chalk_1.default.red.bold("✘ System Error");
        let content = chalk_1.default.white(err instanceof Error ? err.message : String(err));
        if (err instanceof Error && err.stack) {
            content += "\n\n" + chalk_1.default.gray(err.stack.split("\n").slice(1, 5).map(s => s.trim()).join("\n"));
        }
        console.log((0, boxen_1.default)(content, {
            title: headerTitle,
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "red",
        }));
    }
}
exports.Diagnostics = Diagnostics;
