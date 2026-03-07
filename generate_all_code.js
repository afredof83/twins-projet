const fs = require('fs');
const path = require('path');

const excludeDirs = ['.next', 'android', 'ios', 'node_modules', 'generated', '.git', '.vercel', 'assets', 'public', '.vscode', 'patches'];
const excludeFiles = ['package-lock.json', 'all_code.txt', 'refactored_code.txt', 'tsconfig.tsbuildinfo', 'build_output.txt', 'build_log.txt', 'compile_errors.txt', 'error_out.txt', 'errors.txt', 'out.txt', 'prisma_err.txt', 'ts_errors.txt', 'db_schema_current.sql', 'diff_log.patch', 'package.json'];
const allowedExts = ['.ts', '.tsx', '.js', '.mjs', '.json', '.prisma', '.md', '.css', '.html'];

function shouldExcludeDir(dirName) {
    return excludeDirs.includes(dirName) || dirName.startsWith('prisma_log') || dirName.includes('tmp');
}

function shouldExcludeFile(fileName) {
    if (excludeFiles.includes(fileName)) return true;
    if (fileName.startsWith('prisma_log') || fileName.startsWith('ts_errors') || fileName.startsWith('ts_real') || fileName.includes('backup') || fileName.endsWith('utf8.txt')) return true;
    return false;
}

function getFiles(dir, fileList) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch (e) {
            continue;
        }

        if (stat.isDirectory()) {
            if (!shouldExcludeDir(item)) {
                getFiles(fullPath, fileList);
            }
        } else {
            if (!shouldExcludeFile(item)) {
                const ext = path.extname(fullPath);
                if (allowedExts.includes(ext)) {
                    fileList.push(fullPath);
                }
            }
        }
    }
    return fileList;
}

const allFiles = [...getFiles(__dirname, [])];
allFiles.sort();

let out = '';
for (const file of allFiles) {
    const relPath = path.relative(__dirname, file).replace(/\\/g, '\\');
    try {
        const content = fs.readFileSync(file, 'utf-8');
        out += `--- ${relPath} ---\n${content}\n\n`;
    } catch (e) {
        console.error(`Error reading ${file}: ${e.message}`);
    }
}

fs.writeFileSync('all_code.txt', out);
console.log(`Successfully generated all_code.txt from ${allFiles.length} files. Total bytes: ${out.length}`);
