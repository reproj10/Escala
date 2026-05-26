const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function test() {
  const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5186, 5188];
  for (const port of ports) {
    try {
      console.log(`Checking port ${port}...`);
      const res = await get(`http://localhost:${port}/`);
      console.log(`Port ${port} is active! Status: ${res.status}`);
      console.log(`HTML snippet: ${res.data.slice(0, 200)}`);
      
      console.log(`Checking main.jsx...`);
      const resJs = await get(`http://localhost:${port}/src/main.jsx`);
      console.log(`main.jsx status: ${resJs.status}`);
      if (resJs.status !== 200) {
        console.log(`main.jsx error: ${resJs.data.slice(0, 1000)}`);
      } else {
        console.log(`main.jsx loaded successfully!`);
      }
    } catch (e) {
      console.log(`Port ${port} failed: ${e.message}`);
    }
  }
}

test();
