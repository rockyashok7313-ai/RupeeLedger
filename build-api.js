import esbuild from 'esbuild';
esbuild.build({
  entryPoints: ['api/_index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'api/index.js',
  external: ['express', 'cors', 'mongodb', 'jsonwebtoken', 'crypto'],
  target: 'node20',
}).then(() => console.log('API bundled successfully')).catch(() => process.exit(1));
