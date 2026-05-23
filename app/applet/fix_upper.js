const fs = require('fs');

function reportUppercaseInInputs(filePath) {
    if (!fs.existsSync(filePath)) return `File not found: ${filePath}\n`;
    let content = fs.readFileSync(filePath, 'utf8');
    let out = '';
    
    let count = 0;
    content.replace(/<(input|textarea)([\s\S]*?)>/g, (match) => {
        if (/\buppercase\b/.test(match)) {
            count++;
            out += `Match: ${match.slice(0, 100)}...\n`;
        }
    });

    return `Found ${count} in ${filePath}\n` + out;
}

let result = reportUppercaseInInputs('App.tsx') + reportUppercaseInInputs('components/AdminDashboard.tsx') + reportUppercaseInInputs('components/PosSystem.tsx');
fs.writeFileSync('out.txt', result);

