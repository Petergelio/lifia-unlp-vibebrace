/**
 * editor.js — Lógica de la interfaz de VibeBrace Studio
 * 
 * Responsabilidades:
 *   - Estado del patrón (array de pasos)
 *   - Comunicación con el servidor (fetch + WebSocket)
 *   - Renderizado de la lista de pasos
 *   - Dibujo del timeline en el canvas
 *   - Respuesta a eventos del usuario
 * 
 * Depende de pattern.js (debe cargarse antes en index.html).
 */

'use strict';

// ─── Estado ───────────────────────────────────────────────────────────────────

let steps = [];      // array de pasos del patrón actual
let connected = false;   // true si hay conexión activa con el Arduino

// ─── Referencias al DOM ───────────────────────────────────────────────────────

const portSelect = document.getElementById('portSelect');
const btnListPorts = document.getElementById('btnListPorts');
const btnConnect = document.getElementById('btnConnect');
const statusIndicator = document.getElementById('statusIndicator');
const btnSend = document.getElementById('btnSend');
const btnStop = document.getElementById('btnStop');
const btnSave = document.getElementById('btnSave');
const btnLoad = document.getElementById('btnLoad');
const fileInput = document.getElementById('fileInput');
const btnAddStep = document.getElementById('btnAddStep');
const btnClearSteps = document.getElementById('btnClearSteps');
const btnClearLog = document.getElementById('btnClearLog');
const stepList = document.getElementById('stepList');
const stepCount = document.getElementById('stepCount');
const logEl = document.getElementById('log');
const marksCanvas = document.getElementById('timemarksCanvas');
const marksCtx = marksCanvas.getContext('2d');
const canvas = document.getElementById('timelineCanvas');
const ctx = canvas.getContext('2d');
const stepKindSelect = document.getElementById('stepKind');




// ─── Log ──────────────────────────────────────────────────────────────────────

function log(message, type = 'info') {
	const line = document.createElement('span');
	line.className = `log--${type}`;
	line.textContent = `[${new Date().toLocaleTimeString()}] ${message}\n`;
	logEl.appendChild(line);
	logEl.scrollTop = logEl.scrollHeight;
}

btnClearLog.addEventListener('click', () => { logEl.innerHTML = ''; });

// ─── WebSocket ────────────────────────────────────────────────────────────────

const ws = new WebSocket(`ws://${location.host}`);

ws.addEventListener('open', () => {
	log('WebSocket conectado al servidor', 'info');
});


//sección donde se recibe el websocket ────────────────────────────────────────────────────────────────

ws.addEventListener('message', (event) => {
	const msg = event.data.trim();
	log(`← ${msg}`, 'received');

	//────────────────────────────────────────────────────────────────


	if (msg === 'DONE') {
		setPlaying(false);
		log('Secuencia completada', 'info');
	}

	if (msg.startsWith('ERR')) {
		log(`Error del firmware: ${msg}`, 'error');
		setPlaying(false);
	}

	if (msg === 'DISCONNECTED') {
		setConnected(false);
		log('Arduino desconectado', 'error');
	}
});

ws.addEventListener('close', () => {
	log('WebSocket cerrado — recargá la página si el servidor fue reiniciado', 'error');
});

// ─── Conexión ─────────────────────────────────────────────────────────────────

btnListPorts.addEventListener('click', async () => {
	try {
		const res = await fetch('/ports');   //Sección donde se realiza el fetch (pide al servidor los datos del puerto)
		const data = await res.json();

		portSelect.innerHTML = '<option value="">— puerto —</option>';
		for (const p of data.ports) {
			const opt = document.createElement('option');
			opt.value = p;
			opt.textContent = p;
			portSelect.appendChild(opt);
		}

		log(`Puertos encontrados: ${data.ports.join(', ') || 'ninguno'}`, 'info');
	} catch (err) {
		log(`Error listando puertos: ${err.message}`, 'error');
	}
});

btnConnect.addEventListener('click', async () => {
	if (connected) {
		// Desconectar
		try {
			await fetch('/disconnect', { method: 'POST' });
			setConnected(false);
			log('Desconectado', 'info');
		} catch (err) {
			log(`Error al desconectar: ${err.message}`, 'error');
		}
		return;
	}

	const port = portSelect.value;
	if (!port) {
		log('Seleccioná un puerto antes de conectar', 'error');
		return;
	}

	try {
		const res = await fetch('/connect', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ port })
		});
		const data = await res.json();

		if (data.error) {
			log(`Error al conectar: ${data.error}`, 'error');
		} else {
			setConnected(true);
			log(`Conectado a ${port}`, 'info');
		}
	} catch (err) {
		log(`Error al conectar: ${err.message}`, 'error');
	}
});

function setConnected(value) {
	connected = value;
	btnConnect.textContent = value ? 'Desconectar' : 'Conectar';
	statusIndicator.className = value ? 'status status--on' : 'status status--off';
	btnSend.disabled = !value || steps.length === 0;
	btnStop.disabled = !value;
}

function setPlaying(value) {
	statusIndicator.className = value ? 'status status--busy' : (connected ? 'status status--on' : 'status status--off');
	btnSend.disabled = value || !connected || steps.length === 0;
}

// ─── Enviar patrón ────────────────────────────────────────────────────────────

btnSend.addEventListener('click', async () => {
	if (steps.length === 0) {
		log('No hay pasos en la secuencia', 'error');
		return;
	}

	const lines = patternToLines(steps);
	log(`Enviando ${lines.length} líneas: ${lines.join(' | ')}`, 'sent');

	setPlaying(true);

	try {
		const res = await fetch('/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ lines })
		});
		const data = await res.json();

		if (data.error) {
			log(`Error al enviar: ${data.error}`, 'error');
			setPlaying(false);
		}
	} catch (err) {
		log(`Error al enviar: ${err.message}`, 'error');
		setPlaying(false);
	}
});

btnStop.addEventListener('click', async () => {
	try {
		await fetch('/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ lines: ['STOP'] })
		});
		log('→ STOP', 'sent');
		setPlaying(false);
	} catch (err) {
		log(`Error al enviar STOP: ${err.message}`, 'error');
	}
});

// ─── Gestión de pasos ─────────────────────────────────────────────────────────

btnAddStep.addEventListener('click', () => {
	const { kind, params } = readFormParams();
	const step = { id: generateId(), kind, params };

	const validation = validateStep(step);
	let error = false;
	for (const key in validation) {
		const value = validation[key]
		const result = value[1]

		// Obtener elemento del form para usarlo para obtener el mensaje de erro
		const kindParamElement = document.querySelector(`#${kind}_${key}`)
		const errorMsg = kindParamElement.querySelector(".error-msg")

		if (result !== null) {
			error = true;
			errorMsg.textContent = result
		} else {
			errorMsg.textContent = "";
		}
	}
	if (error) return;

	steps.push(step);
	renderStepList();
	drawTimeline();
	log(`Paso agregado: ${stepToSerial(step)}`, 'info');
});

btnClearSteps.addEventListener('click', () => {
	steps = [];
	renderStepList();
	drawTimeline();
	log('Lista de pasos limpiada', 'info');
});

function deleteStep(id) {
	steps = steps.filter(s => s.id !== id);
	renderStepList();
	drawTimeline();
}



//_____________Función que permite duplicar los pasos de la lista_______________//
function duplicateStep(id) {
	const step = steps.find(s => s.id === id);
	const clone = { ...step }
	clone.id = generateId();
	const indiceRef = steps.findIndex(s => s.id === id);
	if (indiceRef !== -1) {
		steps.splice(indiceRef + 1, 0, clone);
	}
	renderStepList();
	drawTimeline();
}

function renderStepList() {
	stepCount.textContent = `(${steps.length})`;
	btnSend.disabled = !connected || steps.length === 0;

	if (steps.length === 0) {
		stepList.innerHTML = '<li class="step-list__empty">No hay pasos. Agregá uno con el formulario.</li>';
		return;
	}

	let draggedIndex = null;

	stepList.innerHTML = '';
	steps.forEach((step, index) => {
		const li = document.createElement('li');
		li.className = 'step-item';
		li.draggable = true;
		li.innerHTML = `
      		<span class="step-item__kind">${step.kind}</span>
      		<span class="step-item__params">${stepToSerial(step)}</span>
	  		<button class = "step-item__duplicate" title = "Duplicar">Duplicar paso</button>
      		<button class="step-item__delete" title="Eliminar">×</button>
    	`;
		li.querySelector('.step-item__duplicate').addEventListener('click', () => duplicateStep(step.id));
		li.querySelector('.step-item__delete').addEventListener('click', () => deleteStep(step.id));

		li.addEventListener("dragstart", (event) => {
			// Guardar índice del paso arrastrado
			draggedIndex = index
		});

		li.addEventListener("dragover", (event) => {
			event.preventDefault();
		});

		li.addEventListener("dragenter", (event) => {
			const stepItem = event.target.closest(".step-item");
			if (stepItem && draggedIndex !== index) {
				stepItem.classList.add("orderhover");
			}
		});

		li.addEventListener("dragleave", (event) => {
			const stepItem = event.target.closest(".step-item");
			if (
				stepItem &&
				!stepItem.contains(event.relatedTarget)
			) {
				stepItem.classList.remove("orderhover");
			}
		});

		li.addEventListener("drop", (event) => {
			console.log(event.target, draggedIndex)
			event.preventDefault();

			if (draggedIndex === null || draggedIndex === index) return;

			// Elimina el elemento que se está arrastrando del array
			// y guarda el objeto eliminado en la variable "element"
			let element = steps.splice(draggedIndex, 1)[0];
			steps.splice(index, 0, element);
			// Inserta el elemento arrastrado en la posición indicada por "index".
			draggedIndex = null;

			renderStepList();
			drawTimeline();
		});
		stepList.appendChild(li);
	});
}

// ─── Formulario: mostrar/ocultar parámetros según tipo ───────────────────────

stepKindSelect.addEventListener('change', () => {
	const kind = stepKindSelect.value;
	document.getElementById('paramsS').style.display = kind === 'S' ? '' : 'none';
	document.getElementById('paramsRAMP').style.display = kind === 'RAMP' ? '' : 'none';
	document.getElementById('paramsTREMOLO').style.display = kind === 'TREMOLO' ? '' : 'none';
	document.getElementById('paramsXFADE').style.display = kind === 'XFADE' ? '' : 'none';
});

// ─── Guardar / cargar ─────────────────────────────────────────────────────────

btnSave.addEventListener('click', () => {
	const name = prompt('Nombre del patrón:', 'mi-patron') || 'mi-patron';
	const json = savePattern(name, steps);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${name}.json`;
	a.click();
	URL.revokeObjectURL(url);
	log(`Patrón guardado como "${name}.json"`, 'info');
});

btnLoad.addEventListener('click', () => { fileInput.click(); });

fileInput.addEventListener('change', (e) => {
	const file = e.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = (ev) => {
		try {
			const { name, steps: loaded } = loadPattern(ev.target.result);
			steps = loaded;
			renderStepList();
			drawTimeline();
			log(`Patrón "${name}" cargado (${steps.length} pasos)`, 'info');
		} catch (err) {
			log(`Error al cargar el archivo: ${err.message}`, 'error');
		}
	};
	reader.readAsText(file);
	fileInput.value = ''; // permitir recargar el mismo archivo
});

// ─── Timeline (canvas) ────────────────────────────────────────────────────────

/**
 * Dibuja el patrón como bloques de intensidad en el canvas.
 * 
 * Eje X: tiempo (ms), proporcional al ancho del canvas.
 * Eje Y: intensidad del motor (0–255), proporcional a la mitad del alto.
 * 
 * Carril superior: Motor 1 (azul)
 * Carril inferior: Motor 2 (rosa)
 * 
 * Esta es la versión mínima — solo muestra pasos tipo S.
 * Los pasos RAMP, TREMOLO y XFADE se muestran como bloques sólidos
 * con su intensidad promedio hasta que se implemente la visualización detallada.
 */



//── Función donde se dibuja el canvas ──────────────────────────────────────────────────────
function drawTimeline() {
	// timemarkCanvas: Time marks para señalar la escala de la duración total

	let W = marksCanvas.width;
	let H = marksCanvas.height;

	// Limpiar
	marksCtx.fillStyle = '#16213e';
	marksCtx.fillRect(0, 0, W, H);

	const totalMs = estimateDurationMs(steps);

	// Cantidad de ms que hay entre marcas
	let rate = 200
	if (totalMs > 2000) {
		rate = 500
	}

	const markAmount = totalMs / rate // Cantidad de marca
	// Dibujar marcas
	for (let x = 0; x < markAmount; x++) {
		marksCtx.fillStyle = '#ffffff33';
		marksCtx.fillRect((x / markAmount) * W + 1, 1, 1, 10);

		marksCtx.fillStyle = '#444466';
		marksCtx.font = '8px system-ui';
		marksCtx.textAlign = 'center';

		let textPos = 1
		if (x === 0) textPos = 10;
		marksCtx.fillText(`${rate * x} ms`, (x / markAmount) * W + textPos, 20);
	}

	// timelineCanvas ────────────────────────────────────────────────────────────────────────────────────────────

	W = canvas.width;
	H = canvas.height;

	// Limpiar
	ctx.fillStyle = '#0d0d1a';
	ctx.fillRect(0, 0, W, H);

	if (steps.length === 0) {
		ctx.fillStyle = '#444466';
		ctx.font = '13px system-ui';
		ctx.textAlign = 'center';
		ctx.fillText('Agregá pasos para ver la secuencia', W / 2, H / 2);
		return;
	}

	const laneH = H / 2 - 4;  // alto de cada carril
	const msToX = (ms) => (ms / totalMs) * W;

	let currentMs = 0;

	for (const step of steps) {
		const blockW = msToX(step.params.ms);
		const x = msToX(currentMs);

		// --- NUEVO: Guardamos los límites espaciales del bloque en el objeto del paso ---
		step._canvasXStart = x;
		step._canvasXEnd = x + blockW;
		// --------------------------------------------------------------------------------

		// Calcular intensidades para representar en el canvas
		let d1 = 0, d2 = 0;

		switch (step.kind) {
			case 'S':
				d1 = step.params.d1;
				d2 = step.params.d2;
				break;
			case 'RAMP':
				d1 = step.params.m !== 2 ? (step.params.d0 + step.params.d1) / 2 : 0;
				d2 = step.params.m !== 1 ? (step.params.d0 + step.params.d1) / 2 : 0;
				break;
			case 'TREMOLO':
				d1 = step.params.m !== 2 ? step.params.base + step.params.depth / 2 : 0;
				d2 = step.params.m !== 1 ? step.params.base + step.params.depth / 2 : 0;
				break;
			case 'XFADE':
				d1 = step.params.duty / 2;
				d2 = step.params.duty / 2;
				break;
		}
		const h1 = (d1 / 255) * laneH;
		const h2 = (d2 / 255) * laneH;

		// ---Cambiar el color de fondo si el bloque tiene el hover activo ---
		if (step._isHovered) {
			ctx.fillStyle = '#ffffff11'; // Fondo sutil resaltado
			ctx.fillRect(x, 0, blockW, H);
		}
		// ---------------------------------------------------------------------------

		// Motor 1 (carril superior)
		if (h1 > 0) {
			ctx.fillStyle = step._isHovered ? '#8a2be2' : '#6500d8cc';
			ctx.fillRect(x + 1, H / 2 - h1 - 2, blockW - 2, h1);
			ctx.fillStyle = '#ffffff';
			ctx.font = '10px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText(`${Math.round(d1)}`, x + blockW / 2, H / 2 - h1 / 2);

			ctx.font = '9px system-ui';
			ctx.fillText(`${step.params.ms} ms`, x + blockW / 2, H / 2 - h2 / 2 + 12);
		}

		// Motor 2 (carril inferior)
		if (h2 > 0) {
			ctx.fillStyle = step._isHovered ? '#00cc00cc' : '#029209cc';
			ctx.fillRect(x + 1, H / 2 + 2, blockW - 2, h2);
			ctx.fillStyle = '#ffffff';
			ctx.font = '10px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText(`${Math.round(d2)}`, x + blockW / 2, H / 2 + h2 / 2);

			ctx.font = '9px system-ui';
			ctx.fillText(`${step.params.ms} ms`, x + blockW / 2, H / 2 + h2 / 2 + 12);
		}

		// Borde del bloque (separación visual)
		ctx.strokeStyle = step._isHovered ? '#ffffffaa' : '#ffffff22'; // Borde más brillante en hover
		ctx.strokeRect(x, 0, blockW, H);

		currentMs += step.params.ms;
	}
	ctx.strokeStyle = '#ffffff33';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, H / 2);
	ctx.lineTo(W, H / 2);
	ctx.stroke();

	ctx.fillStyle = '#6500d8cc';
	ctx.font = '11px system-ui';
	ctx.textAlign = 'left';
	ctx.fillText('M1', 4, 14);

	ctx.fillStyle = '#029209cc';
	ctx.fillText('M2', 4, H - 4);
}

// ─── Referencia al Tooltip HTML ──────────────────────────────────────────────
const tooltipEl = document.getElementById('canvasTooltip');

// ─── Evento Hover y Tooltip sobre el Timeline ────────────────────────────────
canvas.addEventListener('mousemove', (evento) => {
	if (steps.length === 0) {
		if (tooltipEl) tooltipEl.style.display = 'none';
		return;
	}
	const rect = canvas.getBoundingClientRect();
	const mouseX = (evento.clientX - rect.left) * (canvas.width / rect.width);

	let cambioEstado = false;
	let pasoActivo = null;

	for (const step of steps) {
		const dentroBloque = mouseX >= step._canvasXStart && mouseX <= step._canvasXEnd;

		if (dentroBloque) {
			pasoActivo = step; // Guardamos el paso sobre el que está el mouse
			if (!step._isHovered) {
				step._isHovered = true;
				cambioEstado = true;
				canvas.style.cursor = 'pointer';
			}
		} else {
			if (step._isHovered) {
				step._isHovered = false;
				cambioEstado = true;
			}
		}
	}

	if (pasoActivo && tooltipEl) {// Construir el texto usando la función nativa stepToSerial
		tooltipEl.textContent = `${stepToSerial(pasoActivo)}`;
		tooltipEl.style.display = 'block';
		tooltipEl.style.left = `${evento.clientX + 15}px`;
		tooltipEl.style.top = `${evento.clientY - 35}px`;
	} else if (tooltipEl) {
		tooltipEl.style.display = 'none';
	}
	if (cambioEstado) {
		const algunHover = steps.some(s => s._isHovered);
		if (!algunHover) {
			canvas.style.cursor = 'default';
		}
		drawTimeline();
	}
});
canvas.addEventListener('mouseleave', () => {
	if (tooltipEl) tooltipEl.style.display = 'none';

	let cambioEstado = false;
	for (const step of steps) {
		if (step._isHovered) {
			step._isHovered = false;
			cambioEstado = true;
		}
	}
	if (cambioEstado) {
		canvas.style.cursor = 'default';
		drawTimeline();
	}
});
// ─── Init ─────────────────────────────────────────────────────────────────────
renderStepList();
drawTimeline();
log('VibeBrace Studio listo. Listá los puertos y conectá el Arduino.', 'info');
