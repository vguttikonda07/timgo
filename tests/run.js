// Timgo test runner — `node tests/run.js` from the repo root (or anywhere).
const { execSync } = require('child_process');
const path = require('path');
const suites = ['test','edge','logic','regress','seed','sec','fmt','unit','seven','theme','share','bg'];
let fails = 0, total = 0;
for(const s of suites){
  try{
    const out = execSync(`node "${path.join(__dirname, s + '.js')}"`, {encoding:'utf8'});
    const line = out.trim().split('\n').pop();
    total += +(line.match(/^(\d+)/)?.[1] || 0);
    console.log(`  ${s.padEnd(8)} ${line}`);
  }catch(e){
    fails++;
    console.log(`  ${s.padEnd(8)} FAILED\n${(e.stdout||'').split('\n').filter(l=>l.includes('✗')).join('\n')}`);
  }
}
console.log(`\n${fails ? 'SUITES FAILING: '+fails : total + ' tests, all green'}`);
process.exit(fails ? 1 : 0);
