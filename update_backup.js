
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const outputFile = path.join(rootDir, 'all_code.txt');
const extensions = ['.ts', '.tsx', '.css', '.js', '.mjs', '.json', '.sql', '.prisma', '.md'];
const excludeDirs = ['node_modules', '.next', '.git', '.gemini', 'dist', 'build'];
const excludeFiles = ['all_code.txt', 'package-lock.json', 'yarn.lock', 'update_backup.js'];

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!excludeDirs.includes(file)) {
                arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
            }
        } else {
            if (!excludeFiles.includes(file) && extensions.includes(path.extname(file))) {
                arrayOfFiles.push(filePath);
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(rootDir);
let output = '';

files.forEach(file => {
    try {
        const relativePath = path.relative(rootDir, file);
        const content = fs.readFileSync(file, 'utf8');
        output += `\n--- ${relativePath} ---\n`;
        output += content + '\n';
    } catch (e) {
        console.error(`Error reading ${file}: ${e.message}`);
    }
});

fs.writeFileSync(outputFile, output, 'utf8');
console.log(`Backup updated: ${files.length} files written to ${outputFile}`);
