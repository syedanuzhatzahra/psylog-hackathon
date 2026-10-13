document.getElementById('generateAiBtn').addEventListener('click', async () => {
  saveCurrentPage();
  const output = document.getElementById('aiOutput');
  output.innerHTML = '<span class="text-indigo-400">✨ Generating AI Horizon Reflection... Please wait...</span>';

  const text = diaryText.value.trim();
  if (!text) {
    output.innerHTML = `<span class="text-amber-400">⚠️ Today's entry is empty. Please write or dictate something to generate the reflection.</span>`;
    return;
  }

  try {
    const response = await fetch('/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Analyze the following journal entry for the ${currentHorizon} horizon and provide a thoughtful psychological and emotional reflection in English:\n\n"${text}"`
      })
    });

    const data = await response.json();
    if (response.ok) {
      output.innerHTML = `
        <div class="space-y-2">
          <div class="font-bold text-indigo-300 capitalize">🌟 ${currentHorizon} Horizon AI Analysis:</div>
          <p class="whitespace-pre-line text-slate-200">${data.text}</p>
        </div>
      `;
    } else {
      output.innerHTML = `<span class="text-red-400">Error: ${data.error || 'Failed to generate insight'}</span>`;
    }
  } catch (err) {
    console.error(err);
    output.innerHTML = `<span class="text-red-400">Network error while connecting to AI reflection service.</span>`;
  }
});
