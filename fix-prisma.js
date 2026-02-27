const fs = require('fs');

const files = [
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\page.tsx",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\cortex\\page.tsx",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\dashboard\\page.tsx",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\sources\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\shadow-feed\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\cortex\\upload\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\profile\\[id]\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\profile\\push-token\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\cortex\\hunt\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\cortex\\analyze-gaps\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\cron\\radar-worker\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\api\\cron\\hunt\\route.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\app\\actions\\profile.ts",
    "c:\\Users\\Frédéric\\.gemini\\antigravity\\scratch\\digital-twin-profile\\lib\\profile\\profile-manager.ts"
];

let replacedCount = 0;

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    const original = content;
    content = content.replace(/import\s*\{\s*PrismaClient\s*\}\s*from\s*['"]@prisma\/client['"];?(\r?\n)?/g, '');
    content = content.replace(/const\s+prisma\s*=\s*new\s*PrismaClient\s*\(\)\s*;?(\r?\n)?/g, 'import prisma from \'@/lib/prisma\';\n');

    if (original !== content) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
        replacedCount++;
    }
});

console.log(`Finished updating ${replacedCount} files.`);
