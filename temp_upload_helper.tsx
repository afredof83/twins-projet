
// --- FILE UPLOAD FUNCTION (Reused by Drag & Click) ---
const handleFileUpload = async (file: File) => {
    if (!profileId) return;

    addLog(`[SENSOR] Analyse de ${file.name}...`);
    playSFX(SFX.LAUNCH);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('profileId', profileId);

    try {
        const res = await fetch('/api/sensors/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            addLog(`[SUCCÈS] ${data.fragments} fragments mémorisés.`);
            playSFX(SFX.SUCCESS);
            loadMemories(profileId);
        } else {
            addLog(`[ERREUR] ${data.error}`);
            playSFX(SFX.DELETE);
        }
    } catch (err) { addLog(`[CRITIQUE] Échec upload.`); }
};
