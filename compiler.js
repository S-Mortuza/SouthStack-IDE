const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os'); 

const PORT = 2000;
const tmpDir = os.tmpdir(); 

http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.end();

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const code = data.files[0].content;
                const lang = data.language;

                let cmd = '';
                
                
                if (lang === 'c++' || lang === 'cpp') {
                    const file = path.join(tmpDir, 'temp.cpp');
                    const exe = path.join(tmpDir, 'temp.exe');
                    fs.writeFileSync(file, code);
                    cmd = `g++ "${file}" -o "${exe}" && "${exe}"`;
                } 
                else if (lang === 'c') {
                    const file = path.join(tmpDir, 'temp.c');
                    const exe = path.join(tmpDir, 'temp.exe');
                    fs.writeFileSync(file, code);
                    cmd = `gcc "${file}" -o "${exe}" && "${exe}"`;
                } 
                else if (lang === 'java') {
                    const file = path.join(tmpDir, 'Main.java');
                    fs.writeFileSync(file, code);
                    cmd = `javac "${file}" && java -cp "${tmpDir}" Main`;
                } 
                else {
                    res.end(JSON.stringify({ run: { stderr: `Language ${lang} not supported locally.` } }));
                    return;
                }

                exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
                    res.end(JSON.stringify({
                        run: { stdout: stdout || '', stderr: stderr || '' },
                        compile: { stderr: error && !stderr ? "Compile Error: " + error.message : '' }
                    }));
                });
            } catch (e) {
                res.end(JSON.stringify({ run: { stderr: "Local Server Error" } }));
            }
        });
    }
}).listen(PORT, () => console.log(`🚀 Local Compiler Microservice is running perfectly on port ${PORT}`));