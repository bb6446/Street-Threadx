import fs from 'fs';
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(/rounded-none-none-none/g, 'rounded-none')
           .replace(/rounded-none-none/g, 'rounded-none');
fs.writeFileSync('App.tsx', code);

let adminCode = fs.readFileSync('components/AdminDashboard.tsx', 'utf8');
adminCode = adminCode.replace(/rounded-none-none-none/g, 'rounded-none')
           .replace(/rounded-none-none/g, 'rounded-none');
fs.writeFileSync('components/AdminDashboard.tsx', adminCode);
