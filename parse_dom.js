import ts from 'typescript';
import fs from 'fs';

const src = fs.readFileSync('components/AdminDashboard.tsx', 'utf8');
const sourceFile = ts.createSourceFile('AdminDashboard.tsx', src, ts.ScriptTarget.Latest, true);

function findJSX(node, depth = 0) {
    if (node.kind === ts.SyntaxKind.JsxElement || node.kind === ts.SyntaxKind.JsxSelfClosingElement) {
        let tagName = '';
        if (node.kind === ts.SyntaxKind.JsxElement) {
            tagName = node.openingElement.tagName.escapedText;
        } else {
            tagName = node.tagName.escapedText;
        }
        
        let className = '';
        const attributes = node.kind === ts.SyntaxKind.JsxElement ? node.openingElement.attributes.properties : node.attributes.properties;
        for (const attr of attributes) {
             if (attr.name && attr.name.escapedText === 'className') {
                 if (attr.initializer && attr.initializer.kind === ts.SyntaxKind.StringLiteral) {
                     className = attr.initializer.text;
                 } else {
                     className = '{...}';
                 }
             }
        }
        console.log('  '.repeat(depth) + '<' + tagName + (className ? ' className="' + className + '"' : '') + '>');
    }
    ts.forEachChild(node, child => findJSX(child, depth + (node.kind === ts.SyntaxKind.JsxElement ? 1 : 0)));
}

let foundOrdersContent = false;
function findTab(node) {
  if (node.kind === ts.SyntaxKind.BinaryExpression) {
    if (node.left.getText(sourceFile) === "activeTab === 'orders'") {
        findJSX(node.right);
        foundOrdersContent = true;
    }
  }
  if (!foundOrdersContent) {
      ts.forEachChild(node, findTab);
  }
}

findTab(sourceFile);
