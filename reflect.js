let currentSessionId = new Date().toISOString().split('T')[0]; // Default to today's date
let currentPageNum = 1;
let currentHorizon = 'daily';
let journalData = JSON.parse(localStorage.getItem('psylog_sessions') || '{}');
 
const canvas = document.getElementById('doodleCanvas');
const ctx = canvas.getContext('2d');
let isDrawingActive = false, isDrawing = false;

const journalDateInput = document.getElementById('journalDate');
const diaryText = document.getElementById('diaryText');
const pageContainer = document.getElementById('pageContainer');
const pagesList = document.getElementById('pagesList');
const toggleDoodleBtn = document.getElementById('toggleDoodleBtn');
const voiceMicBtn = document.getElementById('voiceMicBtn');

let moodChartInstance = null, triggerChartInstance = null;

let activeBookPages = [];
let activeBookIndex = 0;

function resizeCanvas() {
  canvas.width = pageContainer.clientWidth;
  canvas.height = pageContainer.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 200);

// Initialize or get default session
if (!journalData[currentSessionId]) {
  journalData[currentSessionId] = {
    title: "Today's Reflection",
    pages: {
      1: { text: '', stickers: [], doodle: null, mood: 7, energy: 6 }
    }
  };
}

journalDateInput.value = currentSessionId;

document.getElementById('resetAppBtn').addEventListener('click', () => {
  if (confirm("Clear all local journal data and start fresh?")) {
    localStorage.removeItem('psylog_sessions');
    journalData = {};
    currentSessionId = new Date().toISOString().split('T')[0];
    currentPageNum = 1;
    
    journalData[currentSessionId] = {
      title: "Today's Reflection",
      pages: { 1: { text: '', stickers: [], doodle: null, mood: 7, energy: 6 } }
    };
    
    loadPageContent();
    alert('App reset successfully!');
  }
});

document.getElementById('moodSlider').addEventListener('input', (e) => {
  document.getElementById('moodVal').textContent = `${e.target.value} / 10`;
});
document.getElementById('energySlider').addEventListener('input', (e) => {
  document.getElementById('energyVal').textContent = `${e.target.value} / 10`;
});

function loadPageContent() {
  if (!journalData[currentSessionId]) {
    journalData[currentSessionId] = { title: "Diary Session", pages: { 1: { text: '', stickers: [], doodle: null, mood: 7, energy: 6 } } };
  }

  const session = journalData[currentSessionId];
  if (!session.pages[currentPageNum]) {
    session.pages[currentPageNum] = { text: '', stickers: [], doodle: null, mood: 7, energy: 6 };
  }

  const savedPage = session.pages[currentPageNum];

  diaryText.value = savedPage.text || '';
  document.getElementById('moodSlider').value = savedPage.mood || 7;
  document.getElementById('moodVal').textContent = `${savedPage.mood || 7} / 10`;
  document.getElementById('energySlider').value = savedPage.energy || 6;
  document.getElementById('energyVal').textContent = `${savedPage.energy || 6} / 10`;

  document.querySelectorAll('.draggable-sticker').forEach(el => el.remove());
  if (savedPage.stickers && Array.isArray(savedPage.stickers)) {
    savedPage.stickers.forEach(st => createStickerElement(st.src, st.x, st.y));
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (savedPage.doodle) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = savedPage.doodle;
  }

  document.getElementById('currentPageTitle').textContent = `${session.title || 'Diary'} - Page ${currentPageNum}`;
  renderPagesList();
  renderMemoryVault();
  updateCharts();
}

function saveCurrentPage() {
  if (!journalData[currentSessionId]) {
    journalData[currentSessionId] = { title: "Diary Session", pages: {} };
  }

  const session = journalData[currentSessionId];
  
  const stickers = [];
  document.querySelectorAll('.draggable-sticker').forEach(el => {
    stickers.push({
      src: el.querySelector('img').src,
      x: parseFloat(el.style.left) || 20,
      y: parseFloat(el.style.top) || 20
    });
  });

  // Auto-generate title from first line of text if default
  if (diaryText.value.trim() && (session.title === "Today's Reflection" || session.title === "Diary Session")) {
    const firstLine = diaryText.value.trim().split('\n')[0];
    session.title = firstLine.length > 25 ? firstLine.substring(0, 25) + '...' : firstLine;
  }

  session.pages[currentPageNum] = {
    text: diaryText.value,
    stickers: stickers,
    doodle: canvas.toDataURL(),
    mood: parseInt(document.getElementById('moodSlider').value),
    energy: parseInt(document.getElementById('energySlider').value),
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem('psylog_sessions', JSON.stringify(journalData));
  document.getElementById('saveStatus').textContent = 'Saved at ' + new Date().toLocaleTimeString();
  renderPagesList();
  renderMemoryVault();
  updateCharts();
}

function renderPagesList() {
  pagesList.innerHTML = '';
  const session = journalData[currentSessionId];
  if (!session || !session.pages) return;

  const pageNums = Object.keys(session.pages).map(Number).sort((a,b) => a - b);

  pageNums.forEach(i => {
    const hasContent = session.pages[i] && session.pages[i].text ? '•' : '';
    const btn = document.createElement('button');
    btn.className = `w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${currentPageNum === i ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'}`;
    btn.innerHTML = `<span>Page ${i} ${hasContent}</span>`;
    btn.onclick = () => {
      saveCurrentPage();
      currentPageNum = i;
      loadPageContent();
    };
    pagesList.appendChild(btn);
  });
}

document.getElementById('addPageBtn').addEventListener('click', () => {
  saveCurrentPage();
  const session = journalData[currentSessionId];
  const pageNums = Object.keys(session.pages).map(Number);
  const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 0;
  
  currentPageNum = maxPage + 1;
  session.pages[currentPageNum] = { text: '', stickers: [], doodle: null, mood: 7, energy: 6 };
  
  saveCurrentPage();
  loadPageContent();
});

journalDateInput.addEventListener('change', (e) => {
  saveCurrentPage();
  const newDate = e.target.value;
  currentSessionId = newDate;
  currentPageNum = 1;

  if (!journalData[currentSessionId]) {
    journalData[currentSessionId] = {
      title: `Session (${newDate})`,
      pages: { 1: { text: '', stickers: [], doodle: null, mood: 7, energy: 6 } }
    };
  }
  loadPageContent();
});

// Render Memory Vault (Like Sidebar History / Date Folders)
function renderMemoryVault() {
  const vaultGrid = document.getElementById('memoryVaultGrid');
  vaultGrid.innerHTML = '';

  const sessionIds = Object.keys(journalData).sort().reverse();

  if (sessionIds.length === 0) {
    vaultGrid.innerHTML = `<p class="col-span-full text-xs text-slate-500 italic">No diary sessions found yet.</p>`;
    return;
  }

  sessionIds.forEach(dateStr => {
    const session = journalData[dateStr];
    const pageKeys = Object.keys(session.pages || {});
    const firstPage = session.pages[pageKeys[0]] || {};
    const previewText = firstPage.text ? firstPage.text.substring(0, 60) + '...' : '(No text on first page)';

    const card = document.createElement('div');
    card.className = `bg-slate-900 border ${currentSessionId === dateStr ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-700/80'} rounded-xl p-4 flex flex-col justify-between hover:border-indigo-400 transition shadow-md cursor-pointer group`;
    
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-indigo-400">📅 ${dateStr}</span>
          <span class="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">${pageKeys.length} Page(s)</span>
        </div>
        <h4 class="text-xs font-bold text-slate-200 mb-1 truncate">${session.title || 'Diary Session'}</h4>
        <p class="text-xs text-slate-400 line-clamp-2 font-serif">${previewText}</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
        <span class="text-xs text-indigo-300 font-medium group-hover:underline">📖 Open Book View</span>
        <span class="text-[10px] text-slate-500">Mood: ${firstPage.mood || 7}/10</span>
      </div>
    `;

    card.addEventListener('click', (e) => {
      // If clicked on open book view or card body, let's open the modal reader or switch session
      openBookModal(dateStr, session);
    });

    vaultGrid.appendChild(card);
  });
}

// Book Reader Modal Logic
function openBookModal(dateStr, session) {
  activeBookPages = Object.keys(session.pages).sort((a,b) => a - b).map(pNum => ({
    pageNum: pNum,
    data: session.pages[pNum]
  }));
  activeBookIndex = 0;

  document.getElementById('modalBookTitle').textContent = `📖 Diary: ${session.title || dateStr} (${dateStr})`;
  document.getElementById('bookModal').classList.remove('hidden');
  renderBookModalPage();
}

function renderBookModalPage() {
  if (!activeBookPages || activeBookPages.length === 0) return;
  const currentP = activeBookPages[activeBookIndex];
  
  document.getElementById('modalBookSubtitle').textContent = `Page ${currentP.pageNum} of ${activeBookPages.length} (Mood: ${currentP.data.mood || 7}/10)`;
  document.getElementById('bookPageIndicator').textContent = `Page ${activeBookIndex + 1} / ${activeBookPages.length}`;
  
  document.getElementById('modalPageText').textContent = currentP.data.text || '(No text on this page)';

  const stickersArea = document.getElementById('modalStickersArea');
  stickersArea.innerHTML = '';
  if (currentP.data.stickers && Array.isArray(currentP.data.stickers)) {
    currentP.data.stickers.forEach(st => {
      stickersArea.innerHTML += `<div class="bg-white p-1 rounded border shadow inline-block"><img src="${st.src}" class="w-24 h-20 object-cover rounded"></div>`;
    });
  }

  const mCanvas = document.getElementById('modalCanvas');
  const mCtx = mCanvas.getContext('2d');
  mCanvas.width = mCanvas.parentElement.clientWidth - 80;
  mCanvas.height = 400;
  mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
  if (currentP.data.doodle) {
    const dImg = new Image();
    dImg.onload = () => mCtx.drawImage(dImg, 0, 0);
    dImg.src = currentP.data.doodle;
  }

  const prevBtn = document.getElementById('prevBookPageBtn');
  const nextBtn = document.getElementById('nextBookPageBtn');
  
  prevBtn.disabled = activeBookIndex === 0;
  prevBtn.style.opacity = activeBookIndex === 0 ? '0.5' : '1';
  
  nextBtn.disabled = activeBookIndex === activeBookPages.length - 1;
  nextBtn.style.opacity = activeBookIndex === activeBookPages.length - 1 ? '0.5' : '1';
}

function flipBookPage(direction) {
  const newIndex = activeBookIndex + direction;
  if (newIndex >= 0 && newIndex < activeBookPages.length) {
    activeBookIndex = newIndex;
    renderBookModalPage();
  }
}

function closeBookModal() {
  document.getElementById('bookModal').classList.add('hidden');
}

// Charts & Tools
function updateCharts() {
  const sessionIds = Object.keys(journalData).sort().slice(-7);
  const labels = [], moodVals = [], energyVals = [];
  
  sessionIds.forEach(d => {
    labels.push(d);
    const session = journalData[d];
    let sumM = 0, sumE = 0, count = 0;
    Object.values(session.pages).forEach(page => {
      sumM += (page.mood || 7);
      sumE += (page.energy || 6);
      count++;
    });
    moodVals.push(Math.round(sumM / count));
    energyVals.push(Math.round(sumE / count));
  });

  if (labels.length === 0) {
    labels.push('Mon', 'Tue', 'Wed', 'Thu', 'Fri');
    moodVals.push(6, 7, 8, 7, 9);
    energyVals.push(5, 6, 7, 6, 8);
  }

  const ctxLine = document.getElementById('moodTrendChart').getContext('2d');
  if (moodChartInstance) moodChartInstance.destroy();
  moodChartInstance = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Mood', data: moodVals, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.3 },
        { label: 'Energy', data: energyVals, borderColor: '#a855f7', borderDash: [4,4], tension: 0.3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } } }
  });

  const ctxDonut = document.getElementById('triggerChart').getContext('2d');
  if (triggerChartInstance) triggerChartInstance.destroy();
  triggerChartInstance = new Chart(ctxDonut, {
    type: 'doughnut',
    data: {
      labels: ['Work', 'Health', 'Personal', 'Stress'],
      datasets: [{ data: [40, 25, 20, 15], backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 10 } } } } }
  });
}

// Speech-to-Text
let recognition = null, isListening = false;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
    }
    if (transcript) {
      diaryText.value += (diaryText.value ? ' ' : '') + transcript;
      saveCurrentPage();
    }
  };
  recognition.onerror = () => stopListening();
  recognition.onend = () => { if (isListening) recognition.start(); };
}

voiceMicBtn.addEventListener('click', () => {
  if (!isListening) {
    isListening = true; recognition.start();
    voiceMicBtn.classList.add('mic-active');
    voiceMicBtn.innerHTML = '🛑 Recording... Click to Stop';
  } else {
    isListening = false; recognition.stop();
    voiceMicBtn.classList.remove('mic-active');
    voiceMicBtn.innerHTML = '🎤 Start Speech-to-Text';
  }
});

// Photo Sticker
document.getElementById('imageUploader').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      createStickerElement(event.target.result, 30, 30);
      saveCurrentPage();
    };
    reader.readAsDataURL(file);
  }
});

function createStickerElement(src, initialX, initialY) {
  const sticker = document.createElement('div');
  sticker.className = 'draggable-sticker bg-white p-2 rounded-xl border border-slate-300 w-36';
  sticker.style.left = initialX + 'px'; sticker.style.top = initialY + 'px';
  sticker.innerHTML = `
    <div class="relative group">
      <button onclick="this.closest('.draggable-sticker').remove(); saveCurrentPage();" class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold shadow-md z-30">✕</button>
      <img src="${src}" class="w-full h-28 object-cover rounded-lg pointer-events-none">
    </div>
  `;
  pageContainer.appendChild(sticker);

  let isDragging = false, startX, startY, initialLeft, initialTop;
  sticker.addEventListener('mousedown', (e) => {
    if (isDrawingActive || e.target.tagName === 'BUTTON') return;
    isDragging = true; startX = e.clientX; startY = e.clientY;
    initialLeft = sticker.offsetLeft; initialTop = sticker.offsetTop;
    sticker.style.zIndex = 40;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    sticker.style.left = (initialLeft + e.clientX - startX) + 'px';
    sticker.style.top = (initialTop + e.clientY - startY) + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (isDragging) { isDragging = false; sticker.style.zIndex = 20; saveCurrentPage(); }
  });
}

// Doodle Canvas
toggleDoodleBtn.addEventListener('click', () => {
  isDrawingActive = !isDrawingActive;
  canvas.classList.toggle('drawing-active', isDrawingActive);
  toggleDoodleBtn.textContent = isDrawingActive ? '✏️ Draw: ON' : '✏️ Draw: OFF';
});

canvas.addEventListener('mousedown', (e) => {
  if (!isDrawingActive) return;
  isDrawing = true; ctx.beginPath();
  const rect = canvas.getBoundingClientRect();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 4; ctx.lineCap = 'round';
});
canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing || !isDrawingActive) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
});
canvas.addEventListener('mouseup', () => { isDrawing = false; saveCurrentPage(); });
document.getElementById('clearDoodleBtn').addEventListener('click', () => { ctx.clearRect(0,0,canvas.width,canvas.height); saveCurrentPage(); });

document.getElementById('convertHandwritingBtn').addEventListener('click', async () => {
  const btn = document.getElementById('convertHandwritingBtn');
  btn.textContent = "⏳ Recognizing Handwriting...";
  btn.disabled = true;
  try {
    const image = canvas.toDataURL('image/png');
    const result = await Tesseract.recognize(image, 'eng');
    const text = result.data.text.trim();
    if (text) {
      diaryText.value += (diaryText.value ? '\n' : '') + text;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      saveCurrentPage();
      alert(`Recognized: "${text}" added!`);
    } else {
      alert('No handwriting detected.');
    }
  } catch (err) {
    alert('OCR failed.');
  } finally {
    btn.textContent = "✨ Convert Handwriting to Text";
    btn.disabled = false;
  }
});

document.getElementById('savePageBtn').addEventListener('click', saveCurrentPage);

// AI Horizon Reflection
function setHorizon(horizon) {
  currentHorizon = horizon;
  ['Daily', 'Weekly', 'Monthly', 'Yearly'].forEach(t => {
    const btn = document.getElementById(`tab${t}`);
    if (t.toLowerCase() === horizon) btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white transition";
    else btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition";
  });
  const desc = {
    daily: "Analyzing today's multi-page booklet session.",
    weekly: "Synthesizing the past 7 days of reflections, moods, and energy trends.",
    monthly: "Detecting deeper emotional themes across this month's journal sessions.",
    yearly: "Long-term psychological horizon review and milestone progression."
  };
  document.getElementById('horizonDescription').textContent = desc[horizon];
}

document.getElementById('generateAiBtn').addEventListener('click', async () => {
  saveCurrentPage();
  const output = document.getElementById('aiOutput');
  output.innerHTML = '<span class="text-indigo-400">✨ Analyzing today’s session booklet with AI...</span>';

  const session = journalData[currentSessionId];
  let bookletText = "";
  if (session && session.pages) {
    Object.keys(session.pages).sort((a,b) => a - b).forEach(pNum => {
      bookletText += `\n--- Page ${pNum} ---\n` + (session.pages[pNum].text || '');
    });
  }

  if (!bookletText.trim()) {
    output.innerHTML = `<span class="text-amber-400">⚠️ No text found in this session. Write something first!</span>`;
    return;
  }

  try {
    const response = await fetch('/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `Analyze this diary session titled "${session.title}" for date ${currentSessionId} (${currentHorizon} horizon) and provide psychological insights in English:\n\n${bookletText}` })
    });
    const data = await response.json();
    if (response.ok) {
      output.innerHTML = `<div class="space-y-2"><div class="font-bold text-indigo-300 capitalize">🌟 ${currentHorizon} Session Analysis:</div><p class="whitespace-pre-line text-slate-200">${data.text}</p></div>`;
    } else {
      output.innerHTML = `<span class="text-red-400">Error: ${data.error || 'Failed'}</span>`;
    }
  } catch (err) {
    output.innerHTML = `<span class="text-red-400">Connection error with AI server.</span>`;
  }
});

// Initial Load
loadPageContent();
