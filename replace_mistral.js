const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
let files = [];

function getFiles(dir) {
    const list = fs.readdirSync(dir);
    for (const item of list) {
        if (item === 'node_modules' || item === '.next' || item === 'all_code.txt' || item === 'components' || item === 'public' || item.startsWith('.')) continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getFiles(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }
}

getFiles(projectRoot);

let modifiedCount = 0;

for (const file of files) {
    if (file.endsWith('mistral.ts')) continue;

    let content = fs.readFileSync(file, 'utf8');
    let hasChanges = false;

    // 1. Remove the old import if it's there
    const mistralImportRegex = /import\s*\{\s*Mistral\s*\}\s*from\s*['"]@mistralai\/mistralai['"];?\s*\n?/g;
    if (mistralImportRegex.test(content)) {
        content = content.replace(mistralImportRegex, '');
        hasChanges = true;
    }

    // 2. Add the custom singleton import if we need it AND it's not already there
    const singletonImport = 'import { mistralClient } from "@/lib/mistral";\n';

    const instantiationRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*new\s+Mistral\([^)]*\);?/g;
    if (instantiationRegex.test(content) || content.includes('new Mistral')) {

        // Add import
        if (!content.includes('import { mistralClient }')) {
            content = singletonImport + content;
        }

        // Actually replace
        content = content.replace(instantiationRegex, 'const $1 = mistralClient;');
        hasChanges = true;
    }

    if (hasChanges) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed ' + path.basename(file));
        modifiedCount++;
    }
}
console.log('Modified files:', modifiedCount);
