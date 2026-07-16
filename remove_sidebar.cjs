const fs = require('fs');

const path = 'src/pages/Search.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Replace lines 341 and 342
// 341:       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
// 342:         <div className="lg:col-span-3 space-y-6">
lines[340] = '      <div className="w-full space-y-6">';
lines[341] = ''; // Remove the inner div

// Remove the end of the inner div and the sidebar
// 517:         </div>
// 518: 
// 519:         {/* Sidebar Column */}
// ... up to 715:       </div>

for (let i = 516; i <= 714; i++) {
  lines[i] = ''; // Blank out these lines
}

// Clean up empty lines
const newContent = lines.filter((line, index) => {
  // we want to keep the line if it's not one of the lines we explicitly blanked out,
  // EXCEPT we actually set them to '' which is a valid blank line. Let's just write them as is,
  // the empty strings will become blank lines. To avoid too many blank lines:
  if (index === 341 || (index >= 516 && index <= 714)) return false;
  return true;
}).join('\n');

fs.writeFileSync(path, newContent, 'utf8');
console.log("Search.jsx updated successfully.");
