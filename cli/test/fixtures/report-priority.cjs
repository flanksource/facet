if (process.argv[2] === 'error') {
  process.stdout.write('partial output');
  process.stderr.write('expected failure');
  process.exitCode = 7;
} else if (process.argv[2] === 'wait') {
  setTimeout(() => undefined, 1_000);
} else {
  process.stdout.write(String(require('node:os').getPriority(0)));
}
