// Probe HTTP readiness: Vite's terminal banner changes in CI and with ANSI colors.
module.exports = async function startVite(port) {
  const server = require('node:child_process').spawn(process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {cwd: require('node:path').resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']});
  process.on('exit', () => server.kill());
  let output = '';
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  server.on('error', error => { output += error.message; });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && server.exitCode === null) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/tests/fixtures/items.html`,
        {signal: AbortSignal.timeout(1000)});
      if (response.ok) return server;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  server.kill();
  throw Error(`Vite failed to start: ${output}`);
};
