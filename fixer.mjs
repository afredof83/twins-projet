import fs from 'fs';
import path from 'path';

const targets = {
    "ðŸ‘ï¸ ": "👁️",
    "ðŸ‘ï¸": "👁️",
    "âš ï¸ ": "⚠️ ",
    "âš ï¸": "⚠️",
    "ðŸ”¥ ": "🔥 ",
    "ðŸ”¥": "🔥",
    "âœ“ ": "✅ ",
    "âœ“": "✅",
    "âœ• ": "❌ ",
    "âœ•": "❌",
    "ðŸš« ": "🚫 ",
    "ðŸš«": "🚫",
    "ðŸ‘¤ ": "👤 ",
    "ðŸ‘¤": "👤",
    "âš¡": "⚡",
    "âš™ï¸": "⚙️",
    "âš—ï¸": "⚗️",
    "âš ": "⚡ ",
    "âš": "⚡"
};

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.next' || file === '.git' || file === '.gemini') continue;
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            walk(p, fileList);
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
                fileList.push(p);
            }
        }
    }
    return fileList;
}

const files = walk('.');
let foundFiles = [];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [bad, good] of Object.entries(targets)) {
        if (content.includes(bad)) {
            content = content.replaceAll(bad, good);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        foundFiles.push(file);
    }
}
console.log('Fixed files:\\n' + foundFiles.join('\\n'));
