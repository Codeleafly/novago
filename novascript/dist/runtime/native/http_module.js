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
exports.createHTTPModule = createHTTPModule;
const values_1 = require("../values");
const interpreter_1 = require("../interpreter");
const environment_1 = __importDefault(require("../environment"));
const child_process_1 = require("child_process");
const http = __importStar(require("http"));
const url_1 = require("url");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
// A more robust, native HTTP implementation for v5.0.0
function createHTTPModule() {
    const httpProps = new Map();
    // Native Client
    const makeRequest = (method, urlStr, data, headers = {}) => {
        const script = `
            const { request } = require('${urlStr.startsWith('https') ? 'https' : 'http'}');
            const data = ${data ? JSON.stringify(data) : 'null'};
            const options = {
                method: '${method.toUpperCase()}',
                headers: ${JSON.stringify(headers)}
            };
            const req = request('${urlStr}', options, (res) => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    console.log(JSON.stringify({
                        data: body,
                        status: res.statusCode,
                        headers: res.headers
                    }));
                });
            });
            req.on('error', (e) => {
                console.log(JSON.stringify({ error: e.message }));
            });
            if (data) {
                req.write(data);
            }
            req.end();
        `;
        try {
            const tempFile = path.join(os.tmpdir(), `novascript-http-${Date.now()}.js`);
            fs.writeFileSync(tempFile, script);
            const nodeModulesPath = path.resolve(__dirname, '..', '..', '..', 'node_modules');
            const outputBuffer = (0, child_process_1.execSync)(`node "${tempFile}"`, {
                env: { ...process.env, NODE_PATH: nodeModulesPath }
            });
            const output = outputBuffer ? outputBuffer.toString() : "";
            fs.unlinkSync(tempFile);
            if (!output) {
                console.log("HTTP Request Error: No output from helper script.");
                return (0, values_1.MK_NULL)();
            }
            const res = JSON.parse(output);
            if (res.error) {
                console.log("HTTP Request Error:", res.error);
                return (0, values_1.MK_NULL)();
            }
            const resProps = new Map();
            resProps.set("data", (0, values_1.MK_STRING)(res.data));
            resProps.set("status", (0, values_1.MK_NUMBER)(res.status));
            // You could add headers here too if needed
            return (0, values_1.MK_OBJECT)(resProps);
        }
        catch (e) {
            console.log("Failed to execute HTTP request:", e.message);
            return (0, values_1.MK_NULL)();
        }
    };
    httpProps.set("get", (0, values_1.MK_NATIVE_FN)((args) => {
        const url = args[0].value;
        const headersVal = args[1] && args[1].type === "object" ? args[1].properties : undefined;
        const headers = {};
        if (headersVal) {
            headersVal.forEach((v, k) => headers[k] = v.value);
        }
        return makeRequest("GET", url, undefined, headers);
    }));
    httpProps.set("post", (0, values_1.MK_NATIVE_FN)((args) => {
        const url = args[0].value;
        const data = args[1].value;
        const headersVal = args[2] && args[2].type === "object" ? args[2].properties : undefined;
        const headers = { 'Content-Type': 'application/json' };
        if (headersVal) {
            headersVal.forEach((v, k) => headers[k] = v.value);
        }
        return makeRequest("POST", url, data, headers);
    }));
    // Native Server
    httpProps.set("createServer", (0, values_1.MK_NATIVE_FN)((args, env) => {
        const routes = new Map();
        const server = http.createServer((req, res) => {
            const parsedUrl = new url_1.URL(req.url || "/", `http://${req.headers.host}`);
            const path = parsedUrl.pathname;
            const method = (req.method || "GET").toUpperCase();
            const pathRoutes = routes.get(path);
            const handler = pathRoutes ? pathRoutes.get(method) : undefined;
            if (!handler) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("Not Found");
                return;
            }
            let body = "";
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                const scope = new environment_1.default(handler.declarationEnv);
                const reqProps = new Map();
                reqProps.set("body", (0, values_1.MK_STRING)(body));
                // Add query/params later if needed
                const nsReq = (0, values_1.MK_OBJECT)(reqProps);
                const resProps = new Map();
                resProps.set("send", (0, values_1.MK_NATIVE_FN)((args) => {
                    const data = args[0].value;
                    const headersVal = args[1] && args[1].type === "object" ? args[1].properties : undefined;
                    if (!res.headersSent) {
                        const h = { "Content-Type": "text/plain" };
                        if (headersVal) {
                            headersVal.forEach((v, k) => {
                                h[k] = v.value;
                            });
                        }
                        res.writeHead(200, h);
                    }
                    res.end(data);
                    return (0, values_1.MK_NULL)();
                }));
                const nsRes = (0, values_1.MK_OBJECT)(resProps);
                if (handler.parameters.length >= 1)
                    scope.declareVar(handler.parameters[0], nsReq, false);
                if (handler.parameters.length >= 2)
                    scope.declareVar(handler.parameters[1], nsRes, false);
                try {
                    (0, interpreter_1.evaluate)({ kind: "Program", body: handler.body }, scope);
                }
                catch (e) {
                    if (!(e instanceof values_1.ReturnException)) {
                        console.error("Error in NovaScript HTTP handler:", e);
                        res.writeHead(500);
                        res.end("Internal Server Error");
                    }
                }
            });
        });
        const serverObj = new Map();
        const addRoute = (method) => (0, values_1.MK_NATIVE_FN)((args) => {
            const path = args[0].value;
            const handler = args[1];
            if (!routes.has(path))
                routes.set(path, new Map());
            routes.get(path).set(method, handler);
            return (0, values_1.MK_NULL)();
        });
        serverObj.set("get", addRoute("GET"));
        serverObj.set("post", addRoute("POST"));
        serverObj.set("listen", (0, values_1.MK_NATIVE_FN)((args) => {
            const port = args[0].value;
            server.listen(port, () => {
                console.log(`NovaScript Native Server listening on port ${port}`);
            });
            // Keep process alive
            return (0, values_1.MK_NULL)();
        }));
        return (0, values_1.MK_OBJECT)(serverObj);
    }));
    return (0, values_1.MK_OBJECT)(httpProps);
}
