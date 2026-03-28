const fs = require('fs');
const path = require('path');

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && file !== 'node_modules') {
      scanDirectory(filePath, fileList);
    } else if (file.endsWith('.md')) {
      const relativePath = path.relative(process.cwd(), filePath);
      const parts = relativePath.replace(/\\/g, '/').split('/');
      const fileName = parts.pop();
      const title = fileName.replace(/\.md$/, '');

      fileList.push({
        path: relativePath.replace(/\\/g, '/'),
        title: title,
        category: parts.length > 0 ? parts[parts.length - 1] : '',
        level: parts.length
      });
    }
  });

  return fileList;
}

const fileList = scanDirectory('.');
const jsonContent = JSON.stringify(fileList, null, 2);
fs.writeFileSync('js/filelist.json', jsonContent);
console.log(`Generated filelist.json with ${fileList.length} files`);