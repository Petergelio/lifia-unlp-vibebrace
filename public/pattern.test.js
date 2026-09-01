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

test('TREMOLO: validación incorrecta', () => {
  const result = validateStep({ kind: 'TREMOLO', params: { m: 1, base: 340, depth: 80, rate: 5, ms: 1000 } });
  console.assert(result === null, `Recibido "${result}"`);
});

test('XFADE: validación incorrecta', () => {
  const result = validateStep({ kind: 'XFADE', params: { duty: 200, ms: 1000, steps: 64 } });
  console.assert(result === null, `Recibido "${result}"`);
});

test('XFADE: validación correcta', () => {
  const result = validateStep({ kind: 'XFADE', params: { duty: 200, ms: 1000, steps: 6 } });
  console.assert(result === null, `Recibido "${result}"`);
});

test('patternsTolines: validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 200,
          d2: 200,
          ms: 500,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 300,
          d2: 200,
          ms: 600,
        }
      }
    ]
  );
  console.assert(result[1] === "S,200,200,500" && result[2] === "S,300,200,600", `Recibido "${result}"`);
});


test('patternsTolines: segunda validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 200,
          d2: 200,
          ms: 500,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 300,
          d2: 200,
          ms: 600,
        }
      },
      {
        id: "mtipssr3w8ae",
        kind: "XFADE",
        params: {
          duty: 300,
          ms: 500,
          steps: 8
        }
      }
    ]
  );
  console.assert(
    result[1] === "S,200,200,500" && result[2] === "S,300,200,600" && result[3] === "XFADE,300,500,8",
    `Recibido "${result}"`
  );
});


test('patternsTolines: Tercera validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 250,
          d2: 200,
          ms: 300,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 300,
          d2: 200,
          ms: 600,
        }
      },
      {
        id: "mtipssr3w8ae",
        kind: "TREMOLO",
        params: { m:1, base:120, depth:80, rate:5, ms:1000 }
      }
    ]
  );
  console.assert(
    result[1] === "S,250,200,300" && result[2] === "S,300,200,600" && result[3] === "TREMOLO,1,120,80,5,1000",
    `Recibido "${result}"`
  );
});


test('patternsTolines: Cuarta validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 250,
          d2: 200,
          ms: 300,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 300,
          d2: 200,
          ms: 600,
        }
      },
      {
        id: "mtipssr3w8ae",
        kind: "TREMOLO",
        params: { m:1, base:200, depth:100, rate:5, ms:1500 }
      }
    ]
  );
  console.assert(
    result[1] === "S,250,200,300" && result[2] === "S,300,200,600" && result[3] === "TREMOLO,1,200,100,5,1500",
    `Recibido "${result}"`
  );
});



test('patternsTolines: Quinta validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 300,
          d2: 120,
          ms: 120,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 100,
          d2: 250,
          ms: 300,
        }
      },
      {
        id: "mtipssr3w8ae",
        kind: "TREMOLO",
        params: { m:1, base:100, depth:67, rate:2, ms:2000 }
      }
    ]
  );
  console.assert(
    result[1] === "S,300,120,120" && result[2] === "S,100,250,300" && result[3] === "TREMOLO,1,100,67,2,2000",
    `Recibido "${result}"`
  );
});



test('patternsTolines: Tercera validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 250,
          d2: 200,
          ms: 300,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 300,
          d2: 200,
          ms: 600,
        }
      },
      {
        id: "mtipssr3w8ae",
        kind: "TREMOLO",
        params: { m:1, base:120, depth:80, rate:5, ms:1000 }
      }
    ]
  );
  console.assert(
    result[1] === "S,250,200,300" && result[2] === "S,300,200,600" && result[3] === "TREMOLO,1,120,80,5,1000",
    `Recibido "${result}"`
  );
});


test('patternsTolines: Sexta validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 200,
          d2: 230,
          ms: 500,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 380,
          d2: 200,
          ms: 600,
        }
      },
      {
        id: "mtipssr3w8ae",
        kind: "XFADE",
        params: {
          duty: 500,
          ms: 1000,
          steps: 5
        }
      }
    ]
  );
  console.assert(
    result[1] === "S,200,230,500" && result[2] === "S,380,200,600" && result[3] === "XFADE,500,1000,5",
    `Recibido "${result}"`
  );
});


test('patternsTolines: Septima validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 200,
          d2: 200,
          ms: 500,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 320,
          d2: 220,
          ms: 7500,
        }
      },
      {
        id: "mtipssr3w8ae",
        kind: "XFADE",
        params: {
          duty: 3000,
          ms: 200,
          steps: 87
        }
      }
    ]
  );
  console.assert(
    result[1] === "S,200,200,500" && result[2] === "S,320,220,7500" && result[3] === "XFADE,3000,200,87",
    `Recibido "${result}"`
  );
});

test('patternsTolines: Octava validación correcta', () => {
  const result = patternToLines(
    [
      {
        id: "mt8rod6gw4mk",
        kind: "S",
        params: {
          d1: 5600,
          d2: 2050,
          ms: 800,
        }
      },
      {
        id: "mt8scieq0jrj",
        kind: "S",
        params: {
          d1: 3050,
          d2: 2005,
          ms: 6000,
        }
      },
      {
        id: "mtipssr3w8ae",
        kind: "XFADE",
        params: {
          duty: 360,
          ms: 5000,
          steps: 90
        }
      }
    ]
  );
  console.assert(
    result[1] === "S,5600,2050,800" && result[2] === "S,3050,2005,6000" && result[3] === "XFADE,360,5000,90",
    `Recibido "${result}"`
  );
});