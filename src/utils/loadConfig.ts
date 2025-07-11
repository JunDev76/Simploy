import * as process from "node:process";
import * as fs from "node:fs";
import * as path from "node:path";

export default function loadConfig(fileName: string, basePath = process.cwd()) {
    return JSON.parse(fs.readFileSync(path.resolve(basePath, fileName), 'utf-8'));
}