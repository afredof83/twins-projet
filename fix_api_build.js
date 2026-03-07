const fs = require('fs');
const path = require('path');

const apiRoutesFile = 'api_routes.txt';
if (!fs.existsSync(apiRoutesFile)) {
    console.error('api_routes.txt not found');
    process.exit(1);
}

const routes = fs.readFileSync(apiRoutesFile, 'utf8').split('\r\n').join('\n').split('\n').filter(Boolean);

routes.forEach(routePath => {
    // Trim and normalize path for Windows
    const normalizedPath = routePath.trim();
    if (!fs.existsSync(normalizedPath)) {
        console.warn(`File not found: ${normalizedPath}`);
        return;
    }

    let content = fs.readFileSync(normalizedPath, 'utf8');

    // 1. Force static at the very top if not present
    if (!content.includes("export const dynamic = 'force-static'")) {
        content = "export const dynamic = 'force-static';\n" + content;
    }

    // 2. Inject bypass in exported functions
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    methods.forEach(m => {
        // Match: export async function GET(...) {
        const regex = new RegExp(`export async function ${m}\\s*\\(([^)]*)\\)\\s*{`, 'g');
        content = content.replace(regex, (match, args) => {
            if (content.includes("process.env.BUILD_TARGET === 'mobile'")) {
                // Avoid double injection
                if (match.includes("process.env.BUILD_TARGET === 'mobile'")) return match;
            }
            return `export async function ${m}(${args}) {\n    if (process.env.BUILD_TARGET === 'mobile') return new Response(JSON.stringify({ success: true, message: 'Static build bypass' }), { status: 200, headers: { 'Content-Type': 'application/json' } });`;
        });
    });

    fs.writeFileSync(normalizedPath, content);
    console.log(`Updated ${normalizedPath}`);
});
