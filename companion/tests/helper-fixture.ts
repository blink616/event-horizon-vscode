const scenario = process.argv[2];
if (scenario === 'invalid') {
  process.stdout.write('{"type":"levels","levels":{"bass":999}}\n');
} else if (scenario === 'oversize') {
  process.stdout.write('x'.repeat(17_000));
} else if (scenario === 'exit') {
  process.exit(1);
} else {
  process.stdout.write('{"type":"rea');
  setTimeout(() => {
    process.stdout.write(
      'dy"}\n{"type":"levels","levels":{"bass":0.4,"mid":0.2,"treble":0.1,"level":0.3}}\n',
    );
  }, 10);
}
const timer = setInterval(() => {}, 1_000);
process.stdin.resume();
process.stdin.on('end', () => {
  clearInterval(timer);
  process.exit(0);
});
