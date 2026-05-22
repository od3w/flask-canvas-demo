const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const result = document.getElementById('result');

// 初始化白色背景（不能用透明，否則 base64 進後端後 PIL invert 出來會全黑）
function clearCanvas() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}
clearCanvas();

let drawing = false;
let last = null;

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    return {
        x: (cx - rect.left) * (canvas.width / rect.width),
        y: (cy - rect.top) * (canvas.height / rect.height),
    };
}

function start(e) {
    e.preventDefault();
    drawing = true;
    last = getPos(e);
    // 點一下就畫一個圓點，免得只點不拖什麼都沒畫
    ctx.beginPath();
    ctx.arc(last.x, last.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();
}

function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    last = pos;
}

function stop(e) {
    if (e) e.preventDefault();
    drawing = false;
}

canvas.addEventListener('mousedown', start);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stop);
canvas.addEventListener('mouseleave', stop);
canvas.addEventListener('touchstart', start, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stop);

document.getElementById('clear').addEventListener('click', () => {
    clearCanvas();
    result.innerHTML = '';
    result.className = 'result';
});

document.getElementById('predict').addEventListener('click', async () => {
    const dataUrl = canvas.toDataURL('image/png');
    result.className = 'result';
    result.innerHTML = '<p>辨識中…</p>';

    try {
        const res = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl }),
        });
        const data = await res.json();
        if (data.error) {
            result.className = 'result error';
            result.innerHTML = `<p>${data.error}</p>`;
            return;
        }
        result.className = 'result show';
        result.innerHTML = `
            <div class="big-digit">${data.digit}</div>
            <div class="confidence">信心：${(data.confidence * 100).toFixed(1)}%</div>
            <div class="top3">
                ${data.top3.map(t => `<span>${t.digit} (${(t.prob * 100).toFixed(1)}%)</span>`).join('')}
            </div>
        `;
    } catch (err) {
        result.className = 'result error';
        result.innerHTML = `<p>網路錯誤：${err.message}</p>`;
    }
});
