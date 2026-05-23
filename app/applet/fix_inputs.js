const fs = require('fs');

function fix(file) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace uppercase inside className strings of <input and <textarea elements
    content = content.replace(/<(input|textarea)([^>]*)className=(['"`])([^'"`]*)\buppercase\b([^'"`]*)\3([^>]*)>/g, '<$1$2className=$3$4$5$3$6>');
    
    // Some lines might have multiple occurrences or be multiline.
    // A simpler way:
    // We just find all <input ...> and <textarea ...> tags and remove "uppercase" from them.
    let modified = content.replace(/<(input|textarea)[\s\S]*?>/g, match => {
        return match.replace(/\buppercase\b/g, '');
    });

    if (content !== modified) {
        fs.writeFileSync(file, modified);
        console.log('Fixed', file);
    }
}

fix('components/AdminDashboard.tsx');
fix('components/PosSystem.tsx');
fix('App.tsx');
