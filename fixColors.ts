import fs from 'fs';
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(/#FFD814/g, '#0055ff')
           .replace(/#F7CA00/g, '#0044cc')
           .replace(/#FCD200/g, '#003399')
           .replace(/#FFA41C/g, '#ffffff')
           .replace(/#FA8900/g, '#f4f4f5')
           .replace(/#FF8F00/g, '#e4e4e7')
           .replace(/#007185/g, '#0055ff');
code = code.replace(/rounded-full/g, 'rounded-none')
           .replace(/rounded-lg/g, 'rounded-none')
           .replace(/rounded-sm/g, 'rounded-none')
           .replace(/rounded-md/g, 'rounded-none')
           .replace(/rounded/g, 'rounded-none');
fs.writeFileSync('App.tsx', code);

let adminCode = fs.readFileSync('components/AdminDashboard.tsx', 'utf8');
adminCode = adminCode.replace(/rounded-full/g, 'rounded-none')
           .replace(/rounded-lg/g, 'rounded-none')
           .replace(/rounded-sm/g, 'rounded-none')
           .replace(/rounded-md/g, 'rounded-none')
           .replace(/rounded/g, 'rounded-none');
fs.writeFileSync('components/AdminDashboard.tsx', adminCode);
