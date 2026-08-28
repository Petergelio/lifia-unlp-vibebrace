// pattern.test.js

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
  } catch (e) {
    console.error(`✗ ${description}: ${e.message}`);
  }
}

// Tests de stepToSerial

test('S: genera la línea correcta', () => {
  const result = stepToSerial({ kind: 'S', params: { d1: 200, d2: 150, ms: 500 } });
  console.assert(result === 'S,200,150,500', `Esperado "S,200,150,500", recibido "${result}"`);
});

test('RAMP: genera la línea correcta', () => {
  const result = stepToSerial({ kind: 'RAMP', params: { m: 3, d0: 0, d1: 200, ms: 1000, steps: 16 } });
  console.assert(result === 'RAMP,3,0,200,1000,16', `Recibido "${result}"`);
});

// ... agregar tests para TREMOLO, XFADE, patternToLines, validateStep

test('TREMOLO: validación correcta', () => {
  const result = validateStep({ kind: 'TREMOLO', params: { m:1, base:340, depth:80, rate:5, ms:1000 } });
  console.assert(result === null, `Recibido "${result}"`);
});

test('XFADE: validación correcta', () => {
  const result = validateStep({ kind: 'XFADE', params: { duty:200, ms:1000, steps:64 } });
  console.assert(result === null, `Recibido "${result}"`);
});

test('XFADE: validación correcta', () => {
  const result = validateStep({ kind: 'XFADE', params: { duty:200, ms:1000, steps:6 } });
  console.assert(result === null, `Recibido "${result}"`);
});