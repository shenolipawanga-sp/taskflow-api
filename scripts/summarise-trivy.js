const fs = require('fs');

const [reportPath, summaryPath] = process.argv.slice(2);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

const findings = (report.Results || []).flatMap((result) => [
  ...(result.Vulnerabilities || []).map((v) => ({
    id: v.VulnerabilityID,
    severity: v.Severity,
    target: `${v.PkgName} ${v.InstalledVersion}`,
    fix: v.FixedVersion || '',
    title: v.Title || '',
  })),
  ...(result.Secrets || []).map((s) => ({
    id: s.RuleID,
    severity: s.Severity,
    target: result.Target,
    fix: 'remove secret',
    title: s.Title || 'embedded secret',
  })),
]);

const counts = Object.fromEntries(ORDER.map((sev) => [sev, findings.filter((f) => f.severity === sev).length]));
const blocking = findings.filter((f) => ['CRITICAL', 'HIGH'].includes(f.severity) && f.fix);
const accepted = findings.filter((f) => ['CRITICAL', 'HIGH'].includes(f.severity) && !f.fix);

console.log('Trivy findings by severity:', JSON.stringify(counts));
for (const f of findings.sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity))) {
  console.log(`  [${f.severity}] ${f.id} ${f.target} fix: ${f.fix || 'none upstream'} ${f.title}`);
}

const lines = [
  `# Trivy summary for ${report.ArtifactName}`,
  '',
  `| Severity | Count |`,
  `|---|---|`,
  ...ORDER.map((sev) => `| ${sev} | ${counts[sev]} |`),
  '',
  `Blocking (HIGH/CRITICAL with a fix available): ${blocking.length}`,
  `HIGH/CRITICAL with no upstream fix yet (tracked, not blocking): ${accepted.length}`,
  '',
  ...findings.map((f) => `- ${f.severity} ${f.id} in ${f.target}, fix: ${f.fix || 'none upstream'}`),
];
fs.writeFileSync(summaryPath, `${lines.join('\n')}\n`);

if (blocking.length > 0) {
  console.error(`${blocking.length} fixable HIGH/CRITICAL finding(s). Update the affected package or base image.`);
  process.exit(1);
}
console.log('Security gate passed');
