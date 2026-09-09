const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
const projectConfig = require('../webpack.config');

const compileApiAddress = async (environmentFile) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stellar-config-'));
  const entry = path.join(directory, 'entry.cjs');
  fs.writeFileSync(entry, 'module.exports = process.env.BURGER_API_URL;');
  if (environmentFile)
    fs.writeFileSync(path.join(directory, '.env'), environmentFile);
  const environmentPlugin = projectConfig.plugins.find(
    (plugin) => plugin instanceof Dotenv
  );
  const compiler = webpack({
    mode: 'development',
    devtool: false,
    entry,
    output: {
      path: directory,
      filename: 'result.cjs',
      library: { type: 'commonjs2' }
    },
    plugins: [
      new Dotenv({
        ...environmentPlugin.config,
        path: path.join(directory, '.env'),
        silent: true
      })
    ]
  });
  try {
    await new Promise((resolve, reject) =>
      compiler.run((error, stats) => {
        if (error) reject(error);
        else if (stats.hasErrors())
          reject(new Error(stats.toString({ all: false, errors: true })));
        else resolve();
      })
    );
    return require(path.join(directory, 'result.cjs'));
  } finally {
    await new Promise((resolve) => compiler.close(resolve));
    // Only remove the temporary directory this test just created.
    if (directory.startsWith(path.join(os.tmpdir(), 'stellar-config-')))
      fs.rmSync(directory, { recursive: true, force: true });
  }
};

test('a ZIP without .env still compiles the official API address, even with an unrelated local-server environment variable', async () => {
  const previous = process.env.BURGER_API_URL;
  process.env.BURGER_API_URL = 'http://localhost:3001';
  try {
    assert.equal(
      await compileApiAddress(),
      'https://norma.education-services.ru/api'
    );
  } finally {
    if (previous === undefined) delete process.env.BURGER_API_URL;
    else process.env.BURGER_API_URL = previous;
  }
});

test('an explicitly configured API remains supported', async () => {
  assert.equal(
    await compileApiAddress('BURGER_API_URL=https://example.test/api\n'),
    'https://example.test/api'
  );
});
