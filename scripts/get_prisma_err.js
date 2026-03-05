const { execSync } = require('child_process');
const fs = require('fs');
try {
    execSync('npx prisma validate', { stdio: 'pipe' });
    console.log("Success");
} catch (e) {
    fs.writeFileSync('error_out.txt', e.stderr.toString() + e.stdout.toString());
}
