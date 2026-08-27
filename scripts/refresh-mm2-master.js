const { execSync } = require('child_process');

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

run('npm run update:mm2-supreme');
run('npm run sync:mm2-master');
run('npm run generate:mm2');
run('npm run data:validate:mm2');

console.log('\nMM2 master database refresh complete.');
