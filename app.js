// ============================================================
//  GLOBAL STATE
// ============================================================
let currentUser = null;
let currentTool = 'exercices';
let apiProvider = localStorage.getItem('api_provider') || 'gemini';
let apiKey = localStorage.getItem('gemini_api_key') || '';
let selectedModel = localStorage.getItem('gemini_model') || 'gemini-2.5-flash-preview-05-20';
let openrouterKey = localStorage.getItem('openrouter_api_key') || '';
let openrouterEndpoint = localStorage.getItem('openrouter_endpoint') || 'https://openrouter.ai/api/v1/chat/completions';
let openrouterModel = localStorage.getItem('openrouter_model') || 'openai/gpt-4o-mini';
let theme = localStorage.getItem('theme') || 'light';
let pdfTemplate = localStorage.getItem('pdf_template') || 'magicwork';
let customThemes = [];
let selectedDiff = 'Facile';

let qcmData = [];
let qcmAnswers = [];
let qcmCurrentQ = 0;
let qcmMode = 'quiz';

let flashcards = [];
let fcIndex = 0;
let fcKnew = new Set();
let fcDidnt = new Set();
let fcMode = 'study';
let fcFlipped = false;

const mathThemes = {
  "6e": ["Nombres entiers et décimaux","Fractions","Calcul mental et écrit","Résolution de problèmes","Longueurs, masses, capacités","Aires et volumes simples","Temps et durées","Lecture de données","Moyennes simples","Probabilités élémentaires","Proportionnalité simple","Algorithmes simples"],
  "5e": ["Nombres rationnels","Fractions et pourcentages","Puissances","Calcul littéral simple","Proportionnalité et pourcentages","Statistiques (moyennes, étendues)","Probabilités simples","Expressions littérales","Équations du 1er degré"],
  "4e": ["Nombres relatifs","Puissances","Développements et réductions","Notion de fonction","Représentation graphique","Proportionnalité et linéarité","Équations complexes","Systèmes d'équations simples","Aires et volumes de solides","Histogrammes et quartiles","Probabilités conditionnelles simples"],
  "3e": ["Fonctions affines","Équations et systèmes","Inéquations dans ℝ","Factorisation","Puissances et racines carrées","Notation scientifique","Statistiques et analyse de données","Probabilités composées","Aires et volumes complexes","Similarité de figures"]
};

// ============================================================
//  INIT
// ============================================================
window.onload = function() {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    document.getElementById('themeIcon').textContent = '☀️';
    document.getElementById('themeText').textContent = 'Clair';
  }
  applyTemplate(pdfTemplate, false);
  const savedUser = localStorage.getItem('magicwork_user');
  if (savedUser) { currentUser = JSON.parse(savedUser); showSplash(); }
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({ client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', callback: handleGoogleSignIn });
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
};

// ============================================================
//  AUTH
// ============================================================
function showSplash() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('splash').classList.add('active');
  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').classList.add('active');
    updateUserProfile();
    loadTool('exercices');
  }, 2700);
}
function signInWithGoogle() {
  const u = { name: 'Utilisateur Google', email: 'user@gmail.com', picture: null, loginMethod: 'google' };
  login(u);
}
function handleGoogleSignIn(response) {
  const p = JSON.parse(atob(response.credential.split('.')[1]));
  login({ name: p.name, email: p.email, picture: p.picture, loginMethod: 'google' });
}
function showEmailForm() {
  document.getElementById('loginButtons').style.display = 'none';
  document.getElementById('emailForm').classList.add('active');
  document.getElementById('emailInput').focus();
}
function hideEmailForm() {
  document.getElementById('loginButtons').style.display = 'flex';
  document.getElementById('emailForm').classList.remove('active');
  document.getElementById('emailInput').value = '';
}
function signInWithEmail() {
  const email = document.getElementById('emailInput').value.trim();
  if (!email || !email.includes('@')) { alert('Adresse e-mail invalide'); return; }
  const name = email.split('@')[0];
  login({ name: name.charAt(0).toUpperCase() + name.slice(1), email, picture: null, loginMethod: 'email' });
}
function login(user) {
  currentUser = user;
  localStorage.setItem('magicwork_user', JSON.stringify(user));
  showSplash();
}
function logout() {
  currentUser = null;
  localStorage.removeItem('magicwork_user');
  document.getElementById('app').classList.remove('active');
  document.getElementById('loginScreen').style.display = 'flex';
  hideEmailForm();
}
function updateUserProfile() {
  if (!currentUser) return;
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmail').textContent = currentUser.email;
  const av = document.getElementById('userAvatar');
  if (currentUser.picture) av.innerHTML = `<img src="${currentUser.picture}" alt="${currentUser.name}">`;
  else av.textContent = currentUser.name.charAt(0).toUpperCase();
}

// ============================================================
//  NAVIGATION
// ============================================================
function switchTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
  const titles = { exercices:"Générateur d'exercices", simplificateur:"Simplificateur d'exercices", resumeur:"Résumeur de cours", fiches:"Fiches de révision", qcm:"Générateur de QCM", correcteur:"Correcteur de devoir", maths:"Problèmes mathématiques", examens:"Sujets d'examen", flashcards:"Flashcards interactives", settings:"Paramètres" };
  document.getElementById('topBarTitle').textContent = titles[tool] || tool;
  loadTool(tool);
  if (window.innerWidth <= 1024) toggleSidebar();
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}
function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
  document.body.classList.toggle('dark');
  document.getElementById('themeIcon').textContent = theme === 'light' ? '🌙' : '☀️';
  document.getElementById('themeText').textContent = theme === 'light' ? 'Sombre' : 'Clair';
}

// ============================================================
//  TEMPLATE
// ============================================================
function applyTemplate(tpl, save=true) {
  pdfTemplate = tpl;
  if (save) localStorage.setItem('pdf_template', tpl);
  document.body.classList.remove('tpl-magicwork','tpl-simple','tpl-accessible');
  if (tpl === 'simple') document.body.classList.add('tpl-simple');
  if (tpl === 'accessible') document.body.classList.add('tpl-accessible');
  const badge = document.getElementById('tplBadge');
  const names = { magicwork:'MagicWork', simple:'Simple', accessible:'Accessible' };
  if (badge) badge.textContent = names[tpl] || tpl;
}

// ============================================================
//  TOOL LOADER
// ============================================================
function loadTool(tool) {
  const c = document.getElementById('contentArea');
  const map = { exercices:getExercicesTool, simplificateur:getSimplificateurTool, resumeur:getResumeurTool, fiches:getFichesTool, qcm:getQCMTool, correcteur:getCorrecteurTool, maths:getMathsTool, examens:getExamensTool, flashcards:getFlashcardsTool, settings:getSettingsTool };
  c.innerHTML = map[tool] ? map[tool]() : '<p>Outil non trouvé.</p>';
  if (tool === 'exercices') buildThemes('6e');
  if (tool === 'simplificateur') setupFileUpload('simplificateur');
  if (tool === 'resumeur') setupFileUpload('resumeur');
}

// ============================================================
//  TOOL TEMPLATES (HTML)
// ============================================================
function getExercicesTool() { return `
  <h1 class="page-title">Créez vos <em>exercices</em> sur mesure</h1>
  <p class="page-sub">// Paramètres → Générer → Télécharger</p>
  <div class="api-banner">
    <span>🔑 Clé API Gemini</span>
    <input class="api-input" id="apiKeyInput" type="password" placeholder="Votre clé API..." value="${apiKey}" onchange="saveApiKey(this.value)">
  </div>
  <div class="config-grid">
    <div class="field-group">
      <div class="field-label">Niveau</div>
      <div class="radio-group">
        <input type="radio" name="niveau" id="n6" value="6e" checked onchange="buildThemes('6e')"><label for="n6">6ème</label>
        <input type="radio" name="niveau" id="n5" value="5e" onchange="buildThemes('5e')"><label for="n5">5ème</label>
        <input type="radio" name="niveau" id="n4" value="4e" onchange="buildThemes('4e')"><label for="n4">4ème</label>
        <input type="radio" name="niveau" id="n3" value="3e" onchange="buildThemes('3e')"><label for="n3">3ème</label>
      </div>
    </div>
    <div class="field-group">
      <div class="field-label">Nombre d'exercices</div>
      <input class="num-input" type="number" id="nbExercices" value="5" min="1" max="20">
    </div>
    <div class="field-group">
      <div class="field-label">Niveau de difficulté</div>
      <div class="diff-row">
        <div class="diff-btn easy active" data-diff="Facile" onclick="selectDiff(this)">⬤ Facile</div>
        <div class="diff-btn medium" data-diff="Moyen" onclick="selectDiff(this)">⬤ Moyen</div>
        <div class="diff-btn hard" data-diff="Difficile" onclick="selectDiff(this)">⬤ Difficile</div>
        <div class="diff-btn expert" data-diff="Expert" onclick="selectDiff(this)">⬤ Expert</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;color:var(--muted);font-family:'DM Mono',monospace;font-size:0.75rem;letter-spacing:0.1em;">Sélectionnez vos thèmes →</div>
    <div class="field-group full">
      <div class="field-label" id="themesLabel">Thèmes</div>
      <div class="themes-columns" id="themesContainer"></div>
      <div class="theme-actions">
        <button class="theme-action-btn" onclick="selectAllThemes()">Tout sélectionner</button>
        <button class="theme-action-btn" onclick="deselectAllThemes()">Tout désélectionner</button>
      </div>
      <div class="custom-theme-section">
        <div class="custom-theme-label">Thème personnalisé</div>
        <div class="custom-theme-row">
          <input class="custom-theme-input" id="customThemeInput" type="text" placeholder="Ex : Trigonométrie…" onkeydown="if(event.key==='Enter') addCustomTheme()">
          <button class="custom-theme-add-btn" onclick="addCustomTheme()">+ Ajouter</button>
        </div>
        <div class="custom-tags" id="customTagsContainer"></div>
      </div>
    </div>
  </div>
  <button class="gen-btn" id="genBtn" onclick="genererExercices()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">⚡ Générer les exercices</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">Vos <span>exercices</span></div>
      <div class="output-actions">
        <button class="copy-btn" onclick="copyRendered('exercises-container')">📋 Copier</button>
        <button class="pdf-btn" onclick="downloadExercicesPDF()">⬇ PDF mis en forme</button>
      </div>
    </div>
    <div class="result-container"><div class="result-rendered" id="exercises-container"></div></div>
  </div>
`; }

function getSimplificateurTool() { return `
  <h1 class="page-title">Simplifiez vos <em>exercices</em></h1>
  <p class="page-sub">// Uploadez un PDF, obtenez une version simplifiée</p>
  <div class="field-group full">
    <div class="field-label">Document PDF</div>
    <div class="file-upload" id="fileUpload-simplificateur" onclick="document.getElementById('fileInput-simplificateur').click()">
      <div class="file-upload-icon">📄</div>
      <div class="file-upload-text">Cliquez ou glissez votre PDF ici</div>
      <div class="file-upload-hint">Format PDF uniquement</div>
      <input type="file" id="fileInput-simplificateur" accept=".pdf">
    </div>
    <div class="file-info" id="fileInfo-simplificateur"></div>
  </div>
  <button class="gen-btn" id="genBtn" onclick="simplifierExercice()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">✨ Simplifier l'exercice</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">Exercice <span>simplifié</span></div>
      <div class="output-actions">
        <button class="copy-btn" onclick="copyRendered('result-rendered-main')">📋 Copier</button>
        <button class="pdf-btn" onclick="downloadSimplePDF()">⬇ PDF</button>
      </div>
    </div>
    <div class="result-container"><div class="result-rendered" id="result-rendered-main"></div></div>
  </div>
`; }

function getResumeurTool() { return `
  <h1 class="page-title">Résumez vos <em>cours</em></h1>
  <p class="page-sub">// Uploadez un PDF et obtenez un résumé intelligent</p>
  <div class="config-grid">
    <div class="field-group">
      <div class="field-label">Type de résumé</div>
      <div class="radio-group">
        <input type="radio" name="resumeType" id="rcourt" value="court" checked><label for="rcourt">Court</label>
        <input type="radio" name="resumeType" id="rdetaille" value="detaille"><label for="rdetaille">Détaillé</label>
        <input type="radio" name="resumeType" id="rbullet" value="bullet"><label for="rbullet">Bullet points</label>
      </div>
    </div>
    <div></div>
  </div>
  <div class="field-group full">
    <div class="field-label">Document PDF</div>
    <div class="file-upload" id="fileUpload-resumeur" onclick="document.getElementById('fileInput-resumeur').click()">
      <div class="file-upload-icon">📄</div>
      <div class="file-upload-text">Cliquez ou glissez votre PDF ici</div>
      <div class="file-upload-hint">Format PDF uniquement</div>
      <input type="file" id="fileInput-resumeur" accept=".pdf">
    </div>
    <div class="file-info" id="fileInfo-resumeur"></div>
  </div>
  <button class="gen-btn" id="genBtn" onclick="resumerCours()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">📝 Générer le résumé</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">Votre <span>résumé</span></div>
      <div class="output-actions">
        <button class="copy-btn" onclick="copyRendered('result-rendered-main')">📋 Copier</button>
        <button class="pdf-btn" onclick="downloadResumePDF()">⬇ PDF</button>
      </div>
    </div>
    <div class="result-container"><div class="result-rendered" id="result-rendered-main"></div></div>
  </div>
`; }

function getFichesTool() { return `
  <h1 class="page-title">Créez vos <em>fiches</em> de révision</h1>
  <p class="page-sub">// Entrez un sujet, obtenez une fiche structurée</p>
  <div class="field-group full">
    <div class="field-label">Sujet ou contenu</div>
    <textarea class="textarea-input" id="ficheInput" style="min-height:140px" placeholder="Ex: La photosynthèse, les équations du 1er degré, la Révolution française..."></textarea>
  </div>
  <button class="gen-btn" id="genBtn" onclick="genererFiche()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">📋 Générer la fiche</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">Votre <span>fiche</span></div>
      <div class="output-actions">
        <button class="copy-btn" onclick="copyRendered('result-rendered-main')">📋 Copier</button>
        <button class="pdf-btn" onclick="downloadFichePDF()">⬇ PDF mis en forme</button>
      </div>
    </div>
    <div class="result-container"><div class="result-rendered" id="result-rendered-main"></div></div>
  </div>
`; }

function getQCMTool() { return `
  <h1 class="page-title">QCM <em>interactif</em></h1>
  <p class="page-sub">// Générez et jouez votre QCM en temps réel</p>
  <div class="config-grid">
    <div class="field-group">
      <div class="field-label">Nombre de questions</div>
      <input class="num-input" type="number" id="nbQuestions" value="8" min="3" max="20">
    </div>
    <div class="field-group">
      <div class="field-label">Difficulté</div>
      <div class="radio-group">
        <input type="radio" name="qcmDiff" id="qfacile" value="Facile" checked><label for="qfacile">Facile</label>
        <input type="radio" name="qcmDiff" id="qmoyen" value="Moyen"><label for="qmoyen">Moyen</label>
        <input type="radio" name="qcmDiff" id="qdifficile" value="Difficile"><label for="qdifficile">Difficile</label>
      </div>
    </div>
  </div>
  <div class="field-group full">
    <div class="field-label">Sujet ou contenu</div>
    <textarea class="textarea-input" id="qcmInput" placeholder="Entrez le sujet du QCM ou collez votre cours..."></textarea>
  </div>
  <button class="gen-btn" id="genBtn" onclick="genererQCM()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">✅ Générer le QCM</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">QCM <span>interactif</span></div>
      <div class="output-actions" id="qcmPdfBtn" style="display:none">
        <button class="pdf-btn" onclick="downloadQCMPDF()">⬇ PDF mis en forme</button>
      </div>
    </div>
    <div id="qcmInteractive"></div>
  </div>
`; }

function getCorrecteurTool() { return `
  <h1 class="page-title">Corrigez votre <em>devoir</em></h1>
  <p class="page-sub">// Correction détaillée avec note estimée</p>
  <div class="field-group full">
    <div class="field-label">Votre devoir</div>
    <textarea class="textarea-input" id="devoirInput" style="min-height:200px" placeholder="Collez votre devoir ici..."></textarea>
  </div>
  <button class="gen-btn" id="genBtn" onclick="corrigerDevoir()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">✓ Corriger le devoir</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">Correction <span>détaillée</span></div>
      <div class="output-actions">
        <button class="copy-btn" onclick="copyRendered('result-rendered-main')">📋 Copier</button>
        <button class="pdf-btn" onclick="downloadGenericPDF('result-rendered-main','Correction de devoir')">⬇ PDF</button>
      </div>
    </div>
    <div class="result-container"><div class="result-rendered" id="result-rendered-main"></div></div>
  </div>
`; }

function getMathsTool() { return `
  <h1 class="page-title">Résolvez un <em>problème</em> mathématique</h1>
  <p class="page-sub">// Explication étape par étape</p>
  <div class="field-group full">
    <div class="field-label">Énoncé du problème</div>
    <textarea class="textarea-input" id="mathsInput" style="min-height:150px" placeholder="Ex: Si x² + 5x + 6 = 0, trouver les valeurs de x..."></textarea>
  </div>
  <button class="gen-btn" id="genBtn" onclick="resoudreMaths()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">🔢 Résoudre le problème</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">Solution <span>détaillée</span></div>
      <div class="output-actions">
        <button class="copy-btn" onclick="copyRendered('result-rendered-main')">📋 Copier</button>
        <button class="pdf-btn" onclick="downloadGenericPDF('result-rendered-main','Résolution mathématique')">⬇ PDF</button>
      </div>
    </div>
    <div class="result-container"><div class="result-rendered" id="result-rendered-main"></div></div>
  </div>
`; }

function getExamensTool() { return `
  <h1 class="page-title">Générez un <em>sujet</em> d'examen</h1>
  <p class="page-sub">// Sujet complet prêt à imprimer</p>
  <div class="config-grid">
    <div class="field-group">
      <div class="field-label">Matière</div>
      <input class="text-input" type="text" id="matiere" placeholder="Ex: Mathématiques" value="Mathématiques">
    </div>
    <div class="field-group">
      <div class="field-label">Niveau</div>
      <div class="radio-group">
        <input type="radio" name="examNiveau" id="e6" value="6e" checked><label for="e6">6ème</label>
        <input type="radio" name="examNiveau" id="e5" value="5e"><label for="e5">5ème</label>
        <input type="radio" name="examNiveau" id="e4" value="4e"><label for="e4">4ème</label>
        <input type="radio" name="examNiveau" id="e3" value="3e"><label for="e3">3ème</label>
      </div>
    </div>
  </div>
  <div class="field-group full">
    <div class="field-label">Thème ou chapitres</div>
    <input class="text-input" type="text" id="themeExamen" placeholder="Ex: Fractions et proportionnalité">
  </div>
  <button class="gen-btn" id="genBtn" onclick="genererExamen()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">📚 Générer le sujet</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">Sujet <span>d'examen</span></div>
      <div class="output-actions">
        <button class="copy-btn" onclick="copyRendered('result-rendered-main')">📋 Copier</button>
        <button class="pdf-btn" onclick="downloadExamenPDF()">⬇ PDF mis en forme</button>
      </div>
    </div>
    <div class="result-container"><div class="result-rendered" id="result-rendered-main"></div></div>
  </div>
`; }

function getFlashcardsTool() { return `
  <h1 class="page-title">Flashcards <em>interactives</em></h1>
  <p class="page-sub">// Retournez les cartes, évaluez-vous, progressez</p>
  <div class="field-group full">
    <div class="field-label">Sujet ou contenu</div>
    <textarea class="textarea-input" id="flashcardInput" placeholder="Entrez le sujet ou collez votre cours..."></textarea>
  </div>
  <div class="config-grid" style="margin-top:1rem;">
    <div class="field-group">
      <div class="field-label">Nombre de flashcards</div>
      <input class="num-input" type="number" id="nbFlashcards" value="12" min="5" max="30">
    </div>
    <div></div>
  </div>
  <button class="gen-btn" id="genBtn" onclick="genererFlashcards()">
    <div class="btn-spinner" id="spinner"></div>
    <span id="genBtnText">🃏 Générer les flashcards</span>
  </button>
  <div class="error-msg" id="errorMsg"></div>
  <div class="output-section" id="output-section">
    <div class="output-header">
      <div class="output-title">Vos <span>flashcards</span></div>
      <div class="output-actions" id="fcActions" style="display:none">
        <button class="copy-btn" onclick="fcToggleMode()">⊞ Vue grille</button>
        <button class="pdf-btn" onclick="downloadFlashcardsPDF()">⬇ PDF cartes découpables</button>
      </div>
    </div>
    <div id="fcContainer"></div>
  </div>
`; }

function getSettingsTool() { return `
  <h1 class="page-title">Para<em>mètres</em></h1>
  <p class="page-sub">// Configurez votre expérience MagicWork</p>

  <div class="settings-section">
    <h2 class="settings-title">🔑 Configuration API</h2>
    <div class="settings-group">
      <label class="settings-label">Fournisseur IA</label>
      <p class="settings-description">Choisissez entre Gemini (Google) et OpenRouter</p>
      <div class="radio-group">
        <input type="radio" name="providerSelect" id="pGemini" value="gemini" ${apiProvider==='gemini'?'checked':''} onchange="saveProvider('gemini')"><label for="pGemini">🟢 Google Gemini</label>
        <input type="radio" name="providerSelect" id="pOpenRouter" value="openrouter" ${apiProvider==='openrouter'?'checked':''} onchange="saveProvider('openrouter')"><label for="pOpenRouter">🔵 OpenRouter</label>
      </div>
    </div>

    <div id="gemini-panel" style="display:${apiProvider==='gemini'?'block':'none'}">
      <div class="settings-group">
        <label class="settings-label">Clé API Gemini</label>
        <p class="settings-description">Obtenez votre clé sur aistudio.google.com</p>
        <input class="text-input" type="password" id="settingsApiKey" placeholder="AIza..." value="${apiKey}" onchange="saveApiKey(this.value)">
      </div>
      <div class="settings-group">
        <label class="settings-label">Modèle IA</label>
        <p class="settings-description">Choisissez le modèle Gemini/Gemma à utiliser</p>
        <select class="select-input" id="modelSelect" onchange="saveModel(this.value)">
          <optgroup label="— Gemini 2.5 (Dernière génération)">
            <option value="gemini-2.5-pro-preview-06-05" ${selectedModel==='gemini-2.5-pro-preview-06-05'?'selected':''}>Gemini 2.5 Pro Preview (Le plus puissant)</option>
            <option value="gemini-2.5-flash-preview-05-20" ${selectedModel==='gemini-2.5-flash-preview-05-20'?'selected':''}>✨ Gemini 2.5 Flash Preview (Recommandé)</option>
            <option value="gemini-2.5-flash-lite-preview-06-17" ${selectedModel==='gemini-2.5-flash-lite-preview-06-17'?'selected':''}>Gemini 2.5 Flash Lite (Rapide)</option>
          </optgroup>
          <optgroup label="— Gemini 2.0">
            <option value="gemini-2.0-flash" ${selectedModel==='gemini-2.0-flash'?'selected':''}>Gemini 2.0 Flash</option>
            <option value="gemini-2.0-flash-lite" ${selectedModel==='gemini-2.0-flash-lite'?'selected':''}>Gemini 2.0 Flash Lite</option>
            <option value="gemini-2.0-flash-thinking-exp" ${selectedModel==='gemini-2.0-flash-thinking-exp'?'selected':''}>Gemini 2.0 Flash Thinking</option>
          </optgroup>
          <optgroup label="— Gemini 1.5">
            <option value="gemini-1.5-pro" ${selectedModel==='gemini-1.5-pro'?'selected':''}>Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash" ${selectedModel==='gemini-1.5-flash'?'selected':''}>Gemini 1.5 Flash</option>
            <option value="gemini-1.5-flash-8b" ${selectedModel==='gemini-1.5-flash-8b'?'selected':''}>Gemini 1.5 Flash 8B</option>
          </optgroup>
          <optgroup label="— Gemma (Open Source)">
            <option value="gemma-3-27b-it" ${selectedModel==='gemma-3-27b-it'?'selected':''}>Gemma 3 27B</option>
            <option value="gemma-3-12b-it" ${selectedModel==='gemma-3-12b-it'?'selected':''}>Gemma 3 12B</option>
            <option value="gemma-3-4b-it" ${selectedModel==='gemma-3-4b-it'?'selected':''}>Gemma 3 4B</option>
            <option value="gemma-2-27b-it" ${selectedModel==='gemma-2-27b-it'?'selected':''}>Gemma 2 27B</option>
            <option value="gemma-2-9b-it" ${selectedModel==='gemma-2-9b-it'?'selected':''}>Gemma 2 9B</option>
            <option value="gemma-2-2b-it" ${selectedModel==='gemma-2-2b-it'?'selected':''}>Gemma 2 2B</option>
          </optgroup>
        </select>
      </div>
    </div>

    <div id="openrouter-panel" style="display:${apiProvider==='openrouter'?'block':'none'}">
      <div class="settings-group">
        <label class="settings-label">Clé API OpenRouter</label>
        <p class="settings-description">Obtenez votre clé sur openrouter.ai</p>
        <input class="text-input" type="password" id="orApiKey" placeholder="sk-or-..." value="${openrouterKey}" onchange="saveOpenrouterKey(this.value)">
      </div>
      <div class="settings-group">
        <label class="settings-label">Endpoint</label>
        <p class="settings-description">URL de l'API OpenRouter (ou compatible)</p>
        <input class="text-input" type="text" id="orEndpoint" placeholder="https://openrouter.ai/api/v1/chat/completions" value="${openrouterEndpoint}" onchange="saveOpenrouterEndpoint(this.value)">
      </div>
      <div class="settings-group">
        <label class="settings-label">Modèle</label>
        <p class="settings-description">Identifiant du modèle OpenRouter (ex: openai/gpt-4o, anthropic/claude-3-5-sonnet)</p>
        <input class="text-input" type="text" id="orModel" placeholder="openai/gpt-4o-mini" value="${openrouterModel}" onchange="saveOpenrouterModel(this.value)">
      </div>
    </div>
  </div>

  <div class="settings-section">
    <h2 class="settings-title">🎨 Apparence</h2>
    <div class="settings-group">
      <label class="settings-label">Thème de l'interface</label>
      <p class="settings-description">Choisissez entre le thème clair et sombre</p>
      <div class="radio-group">
        <input type="radio" name="themeSelect" id="tlight" value="light" ${theme==='light'?'checked':''} onchange="setTheme('light')"><label for="tlight">☀️ Clair</label>
        <input type="radio" name="themeSelect" id="tdark" value="dark" ${theme==='dark'?'checked':''} onchange="setTheme('dark')"><label for="tdark">🌙 Sombre</label>
      </div>
    </div>
  </div>

  <div class="settings-section">
    <h2 class="settings-title">📄 Templates de mise en page PDF</h2>
    <p class="settings-description" style="margin-bottom:1.5rem;font-family:'DM Mono',monospace;font-size:0.82rem;color:var(--muted)">
      Le template choisi s'applique à <strong>tous les exports PDF</strong> et à l'affichage des résultats dans l'interface.<br>
      Tous les templates respectent le Markdown : <strong>**gras**</strong> → <strong>gras</strong>, <em>*italique*</em> → <em>italique</em>, les astérisques ne sont jamais affichés.
    </p>
    <div class="template-cards">

      <div class="template-card ${pdfTemplate==='magicwork'?'active':''}" onclick="selectTemplate('magicwork', this)">
        <div class="template-preview tpl-preview-magicwork">
          <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;">Magic<span style="color:#d4401a">Work</span></span>
        </div>
        <div class="template-card-name">MagicWork</div>
        <div class="template-card-desc">Template par défaut. Design en charte graphique : fond noir/rouge pour les titres, encadrés crème, logo bicolore MagicWork, puces rouges, pagination stylisée.</div>
      </div>

      <div class="template-card ${pdfTemplate==='simple'?'active':''}" onclick="selectTemplate('simple', this)">
        <div class="template-preview tpl-preview-simple">
          <span style="font-family:'Georgia',serif;font-size:0.9rem;color:#111">Simple &amp; épuré</span>
        </div>
        <div class="template-card-name">Simple</div>
        <div class="template-card-desc">Mise en page minimaliste. Fond blanc pur, police Georgia serif, titres sobres avec ligne de séparation, logo MathGen discret en bas de page. Aucune couleur superflue.</div>
      </div>

      <div class="template-card ${pdfTemplate==='accessible'?'active':''}" onclick="selectTemplate('accessible', this)">
        <div class="template-preview tpl-preview-accessible">
          <span style="font-family:'Arial',sans-serif;font-size:1rem;font-weight:bold;color:#0056b3;letter-spacing:0.05em">Aa Accessible</span>
        </div>
        <div class="template-card-name">Accessible</div>
        <div class="template-card-desc">Conçu pour la dyslexie et les troubles de lecture : taille de texte 13pt, espacement +40%, fort contraste bleu marine, titres centrés sur fond bleu, pagination lisible.</div>
      </div>

    </div>
    <div style="margin-top:1.2rem;padding:1rem 1.5rem;background:var(--paper);border:1px solid var(--border);border-radius:8px;font-family:'DM Mono',monospace;font-size:0.8rem;color:var(--muted);line-height:1.7;">
      <strong style="color:var(--ink)">Rendu Markdown dans les PDF :</strong><br>
      <code>**texte**</code> → <strong>gras</strong> &nbsp;|&nbsp;
      <code>*texte*</code> → <em>italique</em> &nbsp;|&nbsp;
      <code># Titre</code> → titre H1 &nbsp;|&nbsp;
      <code>## Titre</code> → titre H2<br>
      <code>- item</code> → liste à puces &nbsp;|&nbsp;
      <code>1. item</code> → liste numérotée &nbsp;|&nbsp;
      <code>\`code\`</code> → code inline &nbsp;|&nbsp;
      <code>---</code> → séparateur
    </div>
  </div>

  <div class="settings-section">
    <h2 class="settings-title">ℹ️ À propos</h2>
    <p style="line-height:1.8;color:var(--muted)"><strong>MagicWork v4.0</strong> — Centre d'outils IA pour étudiants<br>
    QCM interactifs · Flashcards 3D découpables · PDF stylisés avec Markdown · 3 templates<br>
    Propulsé par Google Gemini AI · Développé avec ❤️</p>
  </div>
`; }

function selectTemplate(tpl, el) {
  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  applyTemplate(tpl);
}

// ============================================================
//  SETTINGS
// ============================================================
function saveApiKey(k) { apiKey = k; localStorage.setItem('gemini_api_key', k); }
function saveModel(m) { selectedModel = m; localStorage.setItem('gemini_model', m); }
function saveProvider(p) {
  apiProvider = p;
  localStorage.setItem('api_provider', p);
  const geminiPanel = document.getElementById('gemini-panel');
  const orPanel = document.getElementById('openrouter-panel');
  if (geminiPanel) geminiPanel.style.display = p === 'gemini' ? 'block' : 'none';
  if (orPanel) orPanel.style.display = p === 'openrouter' ? 'block' : 'none';
}
function saveOpenrouterKey(k) { openrouterKey = k; localStorage.setItem('openrouter_api_key', k); }
function saveOpenrouterEndpoint(e) { openrouterEndpoint = e; localStorage.setItem('openrouter_endpoint', e); }
function saveOpenrouterModel(m) { openrouterModel = m; localStorage.setItem('openrouter_model', m); }
function setTheme(t) {
  theme = t; localStorage.setItem('theme', t);
  t === 'dark' ? document.body.classList.add('dark') : document.body.classList.remove('dark');
  document.getElementById('themeIcon').textContent = t === 'light' ? '🌙' : '☀️';
  document.getElementById('themeText').textContent = t === 'light' ? 'Sombre' : 'Clair';
}

// ============================================================
//  MARKDOWN → HTML (pour l'affichage dans l'interface)
// ============================================================
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // EXERCICE special
  html = html.replace(/^(EXERCICE\s*\d+[^\n]*)/gm, '<span class="ex-title">$1</span>');
  // HR
  html = html.replace(/^[-*_]{3,}$/gm, '<hr>');
  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+?)_/g, '<em>$1</em>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // Lists
  html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>$2');
  html = html.replace(/<\/ul>\n?<ul>/g, '');
  html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>');
  html = html.replace(/(<oli>[\s\S]*?<\/oli>)(\n(?!<oli>)|$)/g, '<ol>$1</ol>$2');
  html = html.replace(/<\/ol>\n?<ol>/g, '');
  html = html.replace(/<oli>/g, '<li>').replace(/<\/oli>/g, '</li>');
  // Tables
  html = html.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g, (_, header, rows) => {
    const ths = header.split('|').filter(c=>c.trim()).map(c=>`<th>${c.trim()}</th>`).join('');
    const trs = rows.trim().split('\n').map(row => {
      const tds = row.split('|').filter(c=>c.trim()).map(c=>`<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  // Paragraphs
  const lines = html.split('\n');
  let out = ''; let inPre = false;
  for (const line of lines) {
    if (line.startsWith('<pre>')) inPre = true;
    if (line.includes('</pre>')) inPre = false;
    if (inPre) { out += line + '\n'; continue; }
    const trimmed = line.trim();
    if (!trimmed) { out += '<br>'; continue; }
    if (/^<(h[1-6]|ul|ol|li|pre|blockquote|hr|table|thead|tbody|tr|th|td|span class)/.test(trimmed)) {
      out += trimmed + '\n';
    } else {
      out += `<p>${trimmed}</p>\n`;
    }
  }
  out = out.replace(/(<br>\s*){3,}/g, '<br><br>');
  return out;
}
function setRendered(elId, markdownText) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = renderMarkdown(markdownText);
}

// ============================================================
//  EXERCICES HELPERS
// ============================================================
function selectDiff(el) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedDiff = el.dataset.diff;
}
function buildThemes(niveau) {
  const c = document.getElementById('themesContainer');
  if (!c) return;
  c.innerHTML = '';
  mathThemes[niveau].forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'theme-item';
    d.innerHTML = `<input type="checkbox" id="th${i}" value="${t}" onchange="updateThemeLabel()"><label for="th${i}"><span class="theme-checkbox"></span>${t}</label>`;
    c.appendChild(d);
  });
  updateThemeLabel();
}
function updateThemeLabel() {
  const total = getSelectedThemes().length;
  const l = document.getElementById('themesLabel');
  if (l) l.textContent = `Thèmes${total > 0 ? ' — '+total+' sélectionné'+(total>1?'s':'') : ''}`;
}
function selectAllThemes() {
  document.querySelectorAll('#themesContainer input[type="checkbox"]').forEach(c => c.checked = true);
  customThemes.forEach(ct => ct.active = true); renderCustomTags(); updateThemeLabel();
}
function deselectAllThemes() {
  document.querySelectorAll('#themesContainer input[type="checkbox"]').forEach(c => c.checked = false);
  customThemes.forEach(ct => ct.active = false); renderCustomTags(); updateThemeLabel();
}
function addCustomTheme() {
  const inp = document.getElementById('customThemeInput');
  const v = inp.value.trim();
  if (!v || customThemes.find(ct => ct.label === v)) { inp.value = ''; return; }
  customThemes.push({ label: v, active: true }); inp.value = '';
  renderCustomTags(); updateThemeLabel();
}
function toggleCustomTheme(lbl) {
  const ct = customThemes.find(c => c.label === lbl);
  if (ct) { ct.active = !ct.active; renderCustomTags(); updateThemeLabel(); }
}
function removeCustomTheme(lbl) {
  customThemes = customThemes.filter(c => c.label !== lbl);
  renderCustomTags(); updateThemeLabel();
}
function renderCustomTags() {
  const c = document.getElementById('customTagsContainer');
  if (!c) return;
  c.innerHTML = '';
  customThemes.forEach(ct => {
    const t = document.createElement('div');
    t.className = 'custom-tag' + (ct.active ? ' active' : '');
    t.onclick = () => toggleCustomTheme(ct.label);
    t.innerHTML = `<span>${ct.label}</span><span class="custom-tag-remove" onclick="event.stopPropagation();removeCustomTheme('${ct.label.replace(/'/g,"\\'")}')">✕</span>`;
    c.appendChild(t);
  });
}
function getSelectedThemes() {
  return [
    ...Array.from(document.querySelectorAll('#themesContainer input[type="checkbox"]:checked')).map(c => c.value),
    ...customThemes.filter(ct => ct.active).map(ct => ct.label)
  ];
}
function getNiveau() { return document.querySelector('input[name="niveau"]:checked')?.value || '6e'; }

// ============================================================
//  AI API (Gemini + OpenRouter)
// ============================================================
async function callGemini(prompt) {
  if (apiProvider === 'openrouter') {
    return await callOpenRouter(prompt);
  }
  // --- Gemini ---
  const key = apiKey || document.getElementById('apiKeyInput')?.value?.trim() || '';
  if (!key) throw new Error('Veuillez configurer votre clé API Gemini dans les Paramètres.');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 8192 } })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Erreur API ${res.status}`); }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error("Réponse vide de l'API.");
  return text;
}

async function callOpenRouter(prompt) {
  const key = openrouterKey;
  if (!key) throw new Error('Veuillez configurer votre clé API OpenRouter dans les Paramètres.');
  const endpoint = openrouterEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
  const model = openrouterModel || 'openai/gpt-4o-mini';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MagicWork'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 8192
    })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Erreur OpenRouter ${res.status}`); }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error("Réponse vide de l'API OpenRouter.");
  return text;
}

// ============================================================
//  TOOL LOGIC
// ============================================================

// — Exercices
async function genererExercices() {
  const niveau = getNiveau(), nbEx = parseInt(document.getElementById('nbExercices').value)||5;
  const themes_sel = getSelectedThemes();
  if (!themes_sel.length) { showError('Veuillez sélectionner au moins un thème.'); return; }
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const txt = await callGemini(
`Tu es un professeur de mathématiques expérimenté. Génère exactement ${nbEx} exercice(s) pour des élèves de ${niveau}.
Niveau de difficulté : ${selectedDiff}
Thèmes : ${themes_sel.join(', ')}

Instructions de formatage Markdown :
- Commence directement par "EXERCICE 1"
- Chaque exercice : EXERCICE [n] — [Thème] sur sa propre ligne
- Mets les termes importants en **gras**
- Utilise des listes à puces (- ) pour les sous-questions
- Utilise des blocs de code (\`\`) pour les formules
- NE donne PAS les corrections`);
    setRendered('exercises-container', txt);
    document.getElementById('output-section').classList.add('active');
    document.getElementById('output-section').scrollIntoView({ behavior: 'smooth' });
    window._exMeta = { niveau, nbEx, difficulte: selectedDiff, themes: themes_sel.join(', '), rawText: txt };
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

// — Simplificateur
async function simplifierExercice() {
  const fi = document.getElementById('fileInput-simplificateur');
  if (!fi.files[0]) { showError('Veuillez sélectionner un fichier PDF.'); return; }
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const text = await extractPDFText(fi.files[0]);
    const result = await callGemini(
`Tu es un professeur pédagogue. Simplifie l'exercice suivant.
Règles :
- Garde exactement les mêmes questions
- Rends l'énoncé plus clair et plus court
- Supprime le texte inutile
- Formate la réponse en Markdown : titres ##, **gras** pour les termes clés, listes - pour les questions
- Commence directement sans introduction

Texte à simplifier :
${text}`);
    setRendered('result-rendered-main', result);
    document.getElementById('output-section').classList.add('active');
    window._simpleMeta = { rawText: result };
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

// — Résumeur
async function resumerCours() {
  const fi = document.getElementById('fileInput-resumeur');
  if (!fi.files[0]) { showError('Veuillez sélectionner un fichier PDF.'); return; }
  const type = document.querySelector('input[name="resumeType"]:checked')?.value || 'court';
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const text = await extractPDFText(fi.files[0]);
    const instr = {
      court: 'un résumé court (max 10 lignes). Utilise des titres ## et du **gras** pour les points clés.',
      detaille: 'un résumé détaillé et complet. Utilise des titres ##, ### et du **gras** pour structurer.',
      bullet: 'un résumé sous forme de listes à puces Markdown (- ). Groupe par thèmes avec des titres ##.'
    };
    const result = await callGemini(
`Tu es un professeur. Génère ${instr[type]} du cours suivant.
Formate en Markdown propre. Commence directement sans introduction.

Cours :
${text}`);
    setRendered('result-rendered-main', result);
    document.getElementById('output-section').classList.add('active');
    window._resumeMeta = { rawText: result, type };
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

// — Fiches
async function genererFiche() {
  const input = document.getElementById('ficheInput').value.trim();
  if (!input) { showError('Veuillez entrer un sujet.'); return; }
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const result = await callGemini(
`Tu es un professeur. Crée une fiche de révision structurée sur : "${input}".

Formate OBLIGATOIREMENT en Markdown :
# FICHE DE RÉVISION : [TITRE EN MAJUSCULES]

## 📌 Définitions clés
- **[terme]** : [définition]

## 📚 Points essentiels
- [point 1]
- [point 2]

## 💡 Exemples
- [exemple avec explication]

## ⚡ À retenir absolument
- [point mémo 1]

Utilise le **gras** pour les termes importants, l'*italique* pour les nuances.`);
    setRendered('result-rendered-main', result);
    document.getElementById('output-section').classList.add('active');
    window._ficheMeta = { rawText: result, sujet: input };
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

// — QCM
async function genererQCM() {
  const input = document.getElementById('qcmInput').value.trim();
  const nbQ = parseInt(document.getElementById('nbQuestions').value) || 8;
  const diff = document.querySelector('input[name="qcmDiff"]:checked')?.value || 'Facile';
  if (!input) { showError('Veuillez entrer un sujet.'); return; }
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const raw = await callGemini(
`Tu es un professeur. Crée un QCM de ${nbQ} questions de niveau ${diff} sur : "${input}".
Format STRICT pour chaque question (respecte exactement) :
QUESTION [n]: [énoncé]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
RÉPONSE: [lettre unique A/B/C/D]
EXPLICATION: [1-2 phrases d'explication]

Sépare chaque question par "---". Commence directement par QUESTION 1.`);
    qcmData = parseQCM(raw);
    if (!qcmData.length) throw new Error('Impossible de parser le QCM. Réessayez.');
    qcmAnswers = new Array(qcmData.length).fill(null);
    qcmCurrentQ = 0; qcmMode = 'quiz';
    window._qcmRaw = raw;
    document.getElementById('output-section').classList.add('active');
    renderQCM();
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

function parseQCM(raw) {
  const blocks = raw.split(/---|\\n\\n(?=QUESTION)/i).map(b => b.trim()).filter(Boolean);
  const result = [];
  for (const block of blocks) {
    const qMatch = block.match(/QUESTION\s*\d+\s*:\s*(.+?)(?=\nA\))/si);
    const aMatch = block.match(/^A\)\s*(.+)/m);
    const bMatch = block.match(/^B\)\s*(.+)/m);
    const cMatch = block.match(/^C\)\s*(.+)/m);
    const dMatch = block.match(/^D\)\s*(.+)/m);
    const rMatch = block.match(/RÉPONSE\s*:\s*([ABCD])/i);
    const eMatch = block.match(/EXPLICATION\s*:\s*(.+)/si);
    if (qMatch && aMatch && bMatch && cMatch && dMatch && rMatch) {
      result.push({
        q: qMatch[1].trim(),
        options: { A: aMatch[1].trim(), B: bMatch[1].trim(), C: cMatch[1].trim(), D: dMatch[1].trim() },
        answer: rMatch[1].toUpperCase(),
        expl: eMatch ? eMatch[1].trim() : ''
      });
    }
  }
  return result;
}

function renderQCM() {
  const wrap = document.getElementById('qcmInteractive');
  if (!wrap) return;
  if (qcmMode === 'quiz') renderQCMQuiz(wrap);
  else renderQCMReview(wrap);
  const pdfBtn = document.getElementById('qcmPdfBtn');
  if (pdfBtn) pdfBtn.style.display = 'flex';
}

function renderQCMQuiz(wrap) {
  const answered = qcmAnswers.filter(a => a !== null).length;
  const isComplete = answered === qcmData.length;
  if (isComplete) { renderQCMScore(wrap); return; }
  const q = qcmData[qcmCurrentQ];
  const userAns = qcmAnswers[qcmCurrentQ];
  const isAnswered = userAns !== null;
  let html = `
    <div class="qcm-mode-tabs">
      <div class="qcm-tab active">📝 Quiz (${answered}/${qcmData.length})</div>
      <div class="qcm-tab" onclick="qcmMode='review'; renderQCM()">📋 Révision</div>
    </div>
    <div class="qcm-progress-bar-wrap">
      <div class="qcm-progress-bar" style="width:${(answered/qcmData.length)*100}%"></div>
    </div>
    <div class="qcm-question-card">
      <div class="qcm-q-header">
        <div class="qcm-q-num">${qcmCurrentQ+1}</div>
        <div class="qcm-q-text">${q.q}</div>
      </div>
      <div class="qcm-options" id="qcmOptions">`;
  ['A','B','C','D'].forEach(letter => {
    let cls = 'qcm-option';
    if (isAnswered) {
      if (letter === q.answer) cls += ' correct';
      else if (letter === userAns && userAns !== q.answer) cls += ' wrong';
      else cls += ' answered';
    }
    html += `<div class="${cls}" onclick="${!isAnswered ? `selectQCMAnswer('${letter}')` : ''}">
      <div class="qcm-option-letter">${letter}</div>
      <div>${q.options[letter]}</div>
    </div>`;
  });
  html += `</div>`;
  if (isAnswered && q.expl) {
    const icon = userAns === q.answer ? '✅' : '❌';
    const msg = userAns === q.answer ? 'Bonne réponse !' : `Mauvaise réponse. La bonne réponse était <strong>${q.answer}</strong>.`;
    html += `<div class="qcm-explanation active">${icon} ${msg}${q.expl ? '<br><br>💡 ' + q.expl : ''}</div>`;
  }
  const canNext = isAnswered && qcmCurrentQ < qcmData.length - 1;
  const canFinish = isAnswered && qcmCurrentQ === qcmData.length - 1;
  if (canNext) html += `<button class="qcm-next-btn active" onclick="qcmNext()">Question suivante →</button>`;
  if (canFinish) html += `<button class="qcm-next-btn active" onclick="qcmFinish()" style="background:var(--accent2)">🎉 Voir mes résultats</button>`;
  html += `<div style="display:flex;gap:0.4rem;margin-top:1.5rem;flex-wrap:wrap;">`;
  for (let i = 0; i < qcmData.length; i++) {
    const a = qcmAnswers[i];
    let color = 'var(--border)';
    if (a !== null) color = a === qcmData[i].answer ? 'var(--accent2)' : 'var(--accent)';
    if (i === qcmCurrentQ) color = 'var(--ink)';
    html += `<div onclick="qcmGoTo(${i})" style="width:28px;height:28px;border-radius:50%;background:${color};cursor:pointer;border:2px solid ${i===qcmCurrentQ?'var(--accent)':'transparent'};transition:all 0.2s;" title="Q${i+1}"></div>`;
  }
  html += `</div></div>`;
  wrap.innerHTML = html;
}

function renderQCMScore(wrap) {
  const correct = qcmAnswers.filter((a, i) => a === qcmData[i].answer).length;
  const pct = Math.round((correct / qcmData.length) * 100);
  const msg = pct >= 80 ? '🎉 Excellent résultat !' : pct >= 60 ? '👍 Bon travail, continuez !' : '📚 Révisez encore un peu.';
  wrap.innerHTML = `
    <div class="qcm-score-card">
      <div class="qcm-score-label">Votre score</div>
      <div class="qcm-score-big">${correct}/${qcmData.length}</div>
      <div style="font-family:'DM Mono',monospace;font-size:1rem;color:var(--accent3);margin-bottom:0.5rem;">${pct}%</div>
      <div class="qcm-score-msg">${msg}</div>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
        <button class="qcm-restart-btn" onclick="qcmRestart()">🔄 Recommencer</button>
        <button class="qcm-restart-btn" style="background:var(--accent3);color:var(--ink)" onclick="qcmMode='review';renderQCM()">📋 Revoir les réponses</button>
      </div>
    </div>`;
}

function renderQCMReview(wrap) {
  const answered = qcmAnswers.filter(a => a !== null).length;
  const correct = qcmAnswers.filter((a,i) => a === qcmData[i].answer).length;
  let html = `
    <div class="qcm-mode-tabs">
      <div class="qcm-tab" onclick="qcmMode='quiz';renderQCM()">📝 Quiz (${answered}/${qcmData.length})</div>
      <div class="qcm-tab active">📋 Révision</div>
    </div>
    <div style="margin-bottom:1.5rem;font-family:'DM Mono',monospace;font-size:0.85rem;color:var(--muted)">Score actuel : ${correct}/${qcmData.length} — ${answered} répondu(s)</div>
    <div class="qcm-review-list">`;
  qcmData.forEach((q, i) => {
    const a = qcmAnswers[i];
    const isOk = a && a === q.answer;
    html += `<div class="qcm-review-item ${a ? (isOk ? 'ok' : 'ko') : ''}">
      <div class="qcm-review-q">${i+1}. ${q.q}</div>
      <div class="qcm-review-ans">
        ${['A','B','C','D'].map(l => `<span style="color:${l===q.answer?'var(--accent2)':l===a&&a!==q.answer?'var(--accent)':'var(--muted)'};font-weight:${l===q.answer||l===a?700:400}">${l===q.answer?'✓ ':l===a&&a!==q.answer?'✗ ':'  '}${l}) ${q.options[l]}</span>`).join('')}
        ${q.expl ? `<span style="font-size:0.82rem;color:var(--muted);margin-top:0.3rem">💡 ${q.expl}</span>` : ''}
      </div>
    </div>`;
  });
  html += `</div>`;
  wrap.innerHTML = html;
}

function selectQCMAnswer(letter) {
  if (qcmAnswers[qcmCurrentQ] !== null) return;
  qcmAnswers[qcmCurrentQ] = letter;
  renderQCMQuiz(document.getElementById('qcmInteractive'));
}
function qcmNext() { if (qcmCurrentQ < qcmData.length-1) { qcmCurrentQ++; renderQCMQuiz(document.getElementById('qcmInteractive')); } }
function qcmFinish() { renderQCMScore(document.getElementById('qcmInteractive')); }
function qcmGoTo(i) { qcmCurrentQ = i; qcmMode = 'quiz'; renderQCMQuiz(document.getElementById('qcmInteractive')); }
function qcmRestart() { qcmAnswers = new Array(qcmData.length).fill(null); qcmCurrentQ = 0; qcmMode = 'quiz'; renderQCMQuiz(document.getElementById('qcmInteractive')); }

// — Correcteur
async function corrigerDevoir() {
  const input = document.getElementById('devoirInput').value.trim();
  if (!input) { showError('Veuillez entrer votre devoir.'); return; }
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const result = await callGemini(
`Tu es un professeur correcteur bienveillant mais rigoureux. Corrige le devoir suivant.

Formate ta correction en Markdown :
## ✅ Points positifs
- [ce qui est bien]

## ❌ Erreurs & Corrections
- **[erreur]** → [correction avec explication]

## 💡 Suggestions d'amélioration
- [suggestion]

## 📊 Note estimée
**[X]/20** — [justification courte]

Devoir à corriger :
${input}`);
    setRendered('result-rendered-main', result);
    document.getElementById('output-section').classList.add('active');
    window._correcteurMeta = { rawText: result };
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

// — Maths
async function resoudreMaths() {
  const input = document.getElementById('mathsInput').value.trim();
  if (!input) { showError('Veuillez entrer un problème.'); return; }
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const result = await callGemini(
`Tu es un professeur de maths pédagogue. Résous ce problème étape par étape.

Formate en Markdown :
## 🔍 Analyse du problème
[description]

## 📐 Résolution
### Étape 1 — [titre]
[explication]

### Étape 2 — [titre]
[explication]

## 🔢 Formules utilisées
- \`[formule 1]\` : [description]

## ✅ Réponse finale
**[réponse claire et encadrée]**

## 🔄 Vérification
[si applicable]

Problème :
${input}`);
    setRendered('result-rendered-main', result);
    document.getElementById('output-section').classList.add('active');
    window._mathsMeta = { rawText: result };
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

// — Examen
async function genererExamen() {
  const matiere = document.getElementById('matiere').value.trim() || 'Mathématiques';
  const niveau = document.querySelector('input[name="examNiveau"]:checked')?.value || '6e';
  const themeEx = document.getElementById('themeExamen').value.trim();
  if (!themeEx) { showError('Veuillez entrer un thème.'); return; }
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const result = await callGemini(
`Tu es un professeur expérimenté. Crée un sujet d'examen complet.
Matière : ${matiere} | Niveau : ${niveau} | Thème : ${themeEx}

Formate OBLIGATOIREMENT en Markdown :
# CONTRÔLE — ${matiere.toUpperCase()} — ${niveau.toUpperCase()}
**Durée :** 1h30 | **Note :** /20

**Nom :** ___________________________ **Prénom :** ___________________________

---

## Exercice 1 — [titre] *(X points)*
[énoncé complet]

## Exercice 2 — [titre] *(X points)*
[énoncé complet]

[4 à 6 exercices progressifs]

---
**Barème total : 20 points**

Fournis directement le sujet.`);
    setRendered('result-rendered-main', result);
    document.getElementById('output-section').classList.add('active');
    window._examenMeta = { rawText: result, matiere, niveau };
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

// — Flashcards
async function genererFlashcards() {
  const input = document.getElementById('flashcardInput').value.trim();
  const nbFC = parseInt(document.getElementById('nbFlashcards').value) || 12;
  if (!input) { showError('Veuillez entrer un sujet.'); return; }
  setLoading(true); hideError();
  document.getElementById('output-section').classList.remove('active');
  try {
    const raw = await callGemini(
`Tu es un professeur. Crée exactement ${nbFC} flashcards question/réponse sur : "${input}".
Format STRICT pour chaque carte :
Q: [question claire et concise]
R: [réponse précise]
---
Ne mets aucune introduction. Commence directement par Q:`);
    flashcards = parseFlashcards(raw);
    if (!flashcards.length) throw new Error('Impossible de parser les flashcards. Réessayez.');
    fcIndex = 0; fcKnew = new Set(); fcDidnt = new Set(); fcMode = 'study'; fcFlipped = false;
    document.getElementById('output-section').classList.add('active');
    const fcA = document.getElementById('fcActions');
    if (fcA) fcA.style.display = 'flex';
    renderFlashcards();
  } catch(e) { showError(e.message); } finally { setLoading(false); }
}

function parseFlashcards(raw) {
  const blocks = raw.split(/---|\n{2,}(?=Q:)/i).map(b => b.trim()).filter(Boolean);
  const result = [];
  for (const block of blocks) {
    const qm = block.match(/Q:\s*(.+)/i);
    const rm = block.match(/R:\s*([\s\S]+)/i);
    if (qm && rm) result.push({ q: qm[1].trim(), r: rm[1].split(/\n---/)[0].trim() });
  }
  return result;
}

function renderFlashcards() {
  const c = document.getElementById('fcContainer');
  if (!c || !flashcards.length) return;
  if (fcMode === 'grid') { renderFCGrid(c); return; }
  const remaining = flashcards.filter((_, i) => !fcKnew.has(i));
  if (remaining.length === 0) { renderFCComplete(c); return; }
  if (fcIndex >= flashcards.length) fcIndex = 0;
  const card = flashcards[fcIndex];
  const knewCount = fcKnew.size;
  const didntCount = fcDidnt.size;
  const totalNotKnew = flashcards.filter((_, i) => !fcKnew.has(i)).length;
  c.innerHTML = `
    <div class="fc-stats">
      <div class="fc-stat"><div class="fc-stat-num blue">${flashcards.length}</div><div class="fc-stat-label">Total</div></div>
      <div class="fc-stat"><div class="fc-stat-num green">${knewCount}</div><div class="fc-stat-label">✓ Sus</div></div>
      <div class="fc-stat"><div class="fc-stat-num red">${didntCount}</div><div class="fc-stat-label">✗ À revoir</div></div>
      <div class="fc-stat"><div class="fc-stat-num" style="color:var(--muted)">${totalNotKnew}</div><div class="fc-stat-label">Restants</div></div>
    </div>
    <div class="fc-progress-wrap">
      <div class="fc-progress-fill" style="width:${(knewCount/flashcards.length)*100}%"></div>
    </div>
    <div class="fc-card-wrap">
      <div class="fc-card ${fcFlipped ? 'flipped' : ''}" id="fcCard" onclick="fcFlipCard()">
        <div class="fc-face fc-front">
          <span class="fc-side-label">Question</span>
          <div class="fc-text">${card.q}</div>
          <span class="fc-flip-hint">Cliquez pour retourner ↩</span>
        </div>
        <div class="fc-face fc-back">
          <span class="fc-side-label" style="color:rgba(245,240,232,0.4)">Réponse</span>
          <div class="fc-text">${card.r}</div>
        </div>
      </div>
    </div>
    <div class="fc-counter">Carte ${fcIndex+1} sur ${flashcards.length} • ${Math.round((knewCount/flashcards.length)*100)}% maîtrisé</div>
    <div class="fc-controls">
      <button class="fc-btn" onclick="fcPrev()" ${fcIndex===0?'disabled':''}>← Préc.</button>
      <button class="fc-btn flip" onclick="fcFlipCard()">🔄 Retourner</button>
      <button class="fc-btn" onclick="fcNext()" ${fcIndex===flashcards.length-1?'disabled':''}>Suiv. →</button>
    </div>
    <div class="fc-controls" style="margin-top:0">
      <button class="fc-btn knew" onclick="fcMarkKnew()">✓ Je savais !</button>
      <button class="fc-btn didnt" onclick="fcMarkDidnt()">✗ À revoir</button>
    </div>`;
}

function renderFCGrid(c) {
  let html = `<div class="fc-mode-tabs">
    <div class="fc-tab" onclick="fcMode='study';renderFlashcards()">🃏 Mode révision</div>
    <div class="fc-tab active">⊞ Vue grille</div>
  </div>
  <div style="margin-bottom:1rem;font-family:'DM Mono',monospace;font-size:0.82rem;color:var(--muted)">${fcKnew.size} sus · ${fcDidnt.size} à revoir · ${flashcards.length-fcKnew.size-fcDidnt.size} non vus</div>
  <div class="fc-grid">`;
  flashcards.forEach((fc, i) => {
    const cls = fcKnew.has(i) ? 'knew' : fcDidnt.has(i) ? 'didnt' : '';
    html += `<div class="fc-grid-card ${cls}" onclick="fcGoTo(${i})">
      <div class="fc-grid-q">${fc.q}</div>
      <div class="fc-grid-a">${fc.r.substring(0,80)}${fc.r.length>80?'…':''}</div>
    </div>`;
  });
  html += `</div>`;
  c.innerHTML = html;
}

function renderFCComplete(c) {
  c.innerHTML = `<div class="fc-complete">
    <div style="font-size:3rem;margin-bottom:1rem">🎉</div>
    <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:700;margin-bottom:0.5rem">Félicitations !</div>
    <div class="fc-complete-score">${fcKnew.size}/${flashcards.length}</div>
    <div style="font-family:'DM Mono',monospace;font-size:0.85rem;color:var(--accent3);margin-bottom:2rem">cartes maîtrisées</div>
    <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
      <button class="qcm-restart-btn" onclick="fcReset()">🔄 Recommencer</button>
      <button class="qcm-restart-btn" style="background:var(--accent3);color:var(--ink)" onclick="fcMode='grid';renderFlashcards()">⊞ Voir toutes les cartes</button>
    </div>
  </div>`;
}

function fcFlipCard() { fcFlipped = !fcFlipped; const c = document.getElementById('fcCard'); if(c) c.classList.toggle('flipped', fcFlipped); }
function fcNext() { if(fcIndex < flashcards.length-1) { fcIndex++; fcFlipped=false; renderFlashcards(); } }
function fcPrev() { if(fcIndex > 0) { fcIndex--; fcFlipped=false; renderFlashcards(); } }
function fcGoTo(i) { fcIndex = i; fcFlipped = false; fcMode = 'study'; renderFlashcards(); }
function fcMarkKnew() { fcKnew.add(fcIndex); fcDidnt.delete(fcIndex); fcFlipped = false; if(fcIndex < flashcards.length-1) fcIndex++; renderFlashcards(); }
function fcMarkDidnt() { fcDidnt.add(fcIndex); fcKnew.delete(fcIndex); fcFlipped = false; if(fcIndex < flashcards.length-1) fcIndex++; renderFlashcards(); }
function fcReset() { fcKnew = new Set(); fcDidnt = new Set(); fcIndex = 0; fcFlipped = false; fcMode = 'study'; renderFlashcards(); }
function fcToggleMode() {
  fcMode = fcMode === 'study' ? 'grid' : 'study';
  const btn = document.querySelector('#fcActions .copy-btn');
  if (btn) btn.textContent = fcMode === 'study' ? '⊞ Vue grille' : '🃏 Révision';
  renderFlashcards();
}

// ============================================================
//  PDF ENGINE
// ============================================================

// ————— Template configs —————
const TPL = {
  magicwork: {
    // couleurs [R,G,B]
    bgColor:      [15, 14, 13],
    accentColor:  [212, 64, 26],
    accent2Color: [45, 106, 79],
    accent3Color: [244, 162, 97],
    paperColor:   [245, 240, 232],
    creamColor:   [237, 231, 213],
    mutedColor:   [138, 128, 112],
    inkColor:     [15, 14, 13],
    bodyFont:     'helvetica',
    headingFont:  'helvetica',
    fs: { body: 10.5, h1: 15, h2: 12.5, h3: 11, sm: 8, lbl: 7.5 },
    logoName:     'MagicWork',
    logoSub:      "Centre d'outils IA pour étudiants",
    headerH:      56,   // hauteur bloc header
    margin:       18
  },
  simple: {
    bgColor:      [80, 80, 80],
    accentColor:  [60, 60, 60],
    accent2Color: [60, 60, 60],
    accent3Color: [130, 130, 130],
    paperColor:   [255, 255, 255],
    creamColor:   [247, 247, 247],
    mutedColor:   [120, 120, 120],
    inkColor:     [17, 17, 17],
    bodyFont:     'times',
    headingFont:  'times',
    fs: { body: 11, h1: 16, h2: 13, h3: 11.5, sm: 8, lbl: 7.5 },
    logoName:     'MathGen',
    logoSub:      'magicwork.app',
    headerH:      28,
    margin:       18
  },
  accessible: {
    bgColor:      [20, 60, 140],
    accentColor:  [0, 86, 179],
    accent2Color: [0, 120, 0],
    accent3Color: [180, 100, 0],
    paperColor:   [255, 254, 245],
    creamColor:   [255, 248, 220],
    mutedColor:   [85, 85, 85],
    inkColor:     [20, 20, 40],
    bodyFont:     'helvetica',
    headingFont:  'helvetica',
    fs: { body: 13, h1: 18, h2: 15, h3: 13, sm: 10, lbl: 9 },
    logoName:     'MagicWork Accessible',
    logoSub:      'Version accessible — grandes polices + fort contraste',
    headerH:      42,
    margin:       20
  }
};

function getTpl() { return TPL[pdfTemplate] || TPL.magicwork; }

// ————— Markdown → segments pour PDF —————
function mdToSegments(text) {
  const lines = text.split('\n');
  const segs = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const tr = raw.trim();
    if (!tr) { segs.push({ type: 'blank' }); i++; continue; }
    if (/^[-*_]{3,}$/.test(tr)) { segs.push({ type: 'hr' }); i++; continue; }
    // Titres
    const hm = tr.match(/^(#{1,3})\s+(.*)/);
    if (hm) { segs.push({ type: 'h', level: hm[1].length, text: hm[2] }); i++; continue; }
    // EXERCICE spécial
    if (/^EXERCICE\s*\d+/i.test(tr)) { segs.push({ type: 'exTitle', text: tr }); i++; continue; }
    // Blocs de code
    if (tr.startsWith('```')) {
      i++;
      let code = '';
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code += lines[i] + '\n'; i++; }
      segs.push({ type: 'code', text: code.trim() }); i++; continue;
    }
    // Blockquote
    if (tr.startsWith('>')) { segs.push({ type: 'bq', text: tr.replace(/^>\s*/, '') }); i++; continue; }
    // Listes non ordonnées
    if (/^[-•*]\s/.test(tr)) {
      const items = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•*]\s/, ''));
        i++;
      }
      segs.push({ type: 'ul', items }); continue;
    }
    // Listes ordonnées
    if (/^\d+\.\s/.test(tr)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      segs.push({ type: 'ol', items }); continue;
    }
    // Paragraphe normal
    segs.push({ type: 'p', text: tr }); i++;
  }
  return segs;
}

// ————— Supprimer les marqueurs Markdown (pour jsPDF plain) —————
function stripMd(t) {
  return t
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/_([^_\n]+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .trim();
}

// ————— Parser inline (bold/italic) → tableau de runs —————
// Retourne [{text, bold, italic}]
function inlineRuns(text) {
  const runs = [];
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|__(.+?)__|_([^_\n]+?)_|\*([^*\n]+?)\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), bold: false, italic: false });
    if (m[0].startsWith('***')) runs.push({ text: m[2], bold: true, italic: true });
    else if (m[0].startsWith('**') || m[0].startsWith('__')) runs.push({ text: m[3] || m[4], bold: true, italic: false });
    else runs.push({ text: m[5] || m[6], bold: false, italic: true });
    last = re.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last), bold: false, italic: false });
  return runs;
}

// ————— Dessiner du texte avec inline bold/italic dans jsPDF —————
// Retourne le nombre de lignes dessinées (pour avancer y)
function drawInlineText(doc, rawText, x, y, maxW, baseFont, baseFontSize, baseColor, tpl) {
  const t = TPL[tpl] || TPL.magicwork;
  const runs = inlineRuns(rawText);
  // D'abord on calcule les "tokens" (mots avec style)
  const tokens = [];
  for (const run of runs) {
    const words = run.text.split(/(\s+)/);
    for (const w of words) {
      tokens.push({ text: w, bold: run.bold, italic: run.italic });
    }
  }
  // On construit des lignes en mesurant la largeur
  const lineHeight = baseFontSize * 0.45;
  let lines = [];
  let curLine = [];
  let curWidth = 0;
  for (const tok of tokens) {
    if (!tok.text) continue;
    const style = tok.bold && tok.italic ? 'bolditalic' : tok.bold ? 'bold' : tok.italic ? 'italic' : 'normal';
    doc.setFont(baseFont, style);
    doc.setFontSize(baseFontSize);
    const tw = doc.getTextWidth(tok.text);
    if (curWidth + tw > maxW && curLine.length > 0 && tok.text.trim() !== '') {
      lines.push(curLine);
      curLine = [tok];
      curWidth = tw;
    } else {
      curLine.push(tok);
      curWidth += tw;
    }
  }
  if (curLine.length > 0) lines.push(curLine);

  // Dessiner
  const h = doc.internal.pageSize.getHeight();
  let ly = y;
  for (const line of lines) {
    if (ly > h - 28) { doc.addPage(); ly = (tpl === 'accessible' ? 28 : 22); }
    let cx = x;
    for (const tok of line) {
      const style = tok.bold && tok.italic ? 'bolditalic' : tok.bold ? 'bold' : tok.italic ? 'italic' : 'normal';
      doc.setFont(baseFont, style);
      doc.setFontSize(baseFontSize);
      doc.setTextColor(...(baseColor || t.inkColor));
      doc.text(tok.text, cx, ly);
      cx += doc.getTextWidth(tok.text);
    }
    ly += lineHeight + 1.2;
  }
  return { endY: ly, linesCount: lines.length };
}

// ————— En-tête de page (selon template) —————
function pdfDrawHeader(doc, title, subtitle, tpl) {
  const t = TPL[tpl] || TPL.magicwork;
  const w = doc.internal.pageSize.getWidth();
  const M = t.margin;

  if (tpl === 'simple') {
    doc.setFontSize(t.fs.h1);
    doc.setFont(t.headingFont, 'bold');
    doc.setTextColor(...t.inkColor);
    doc.text(title, M, 20);
    if (subtitle) {
      doc.setFontSize(t.fs.sm);
      doc.setFont(t.bodyFont, 'italic');
      doc.setTextColor(...t.mutedColor);
      doc.text(subtitle, w - M, 20, { align: 'right' });
    }
    doc.setDrawColor(...t.mutedColor);
    doc.setLineWidth(0.4);
    doc.line(M, 24, w - M, 24);
    return 34;
  }

  if (tpl === 'accessible') {
    doc.setFillColor(...t.bgColor);
    doc.rect(0, 0, w, t.headerH, 'F');
    doc.setFontSize(t.fs.h2);
    doc.setFont(t.headingFont, 'bold');
    doc.setTextColor(...t.paperColor);
    doc.text(title, M, 18);
    doc.setFontSize(t.fs.sm + 1);
    doc.setFont(t.bodyFont, 'normal');
    doc.setTextColor(190, 215, 255);
    doc.text(t.logoName, w - M, 18, { align: 'right' });
    if (subtitle) {
      doc.setFontSize(t.fs.sm + 1);
      doc.setTextColor(200, 230, 255);
      doc.text(subtitle, M, 30);
    }
    return t.headerH + 8;
  }

  // MagicWork (défaut)
  // Bloc header noir
  doc.setFillColor(...t.bgColor);
  doc.rect(0, 0, w, 36, 'F');
  doc.setFontSize(20);
  doc.setFont(t.headingFont, 'bold');
  doc.setTextColor(...t.paperColor);
  const mw = doc.getTextWidth('Magic');
  doc.text('Magic', M, 19);
  doc.setTextColor(...t.accentColor);
  doc.text('Work', M + mw, 19);
  doc.setFontSize(t.fs.sm);
  doc.setFont(t.bodyFont, 'normal');
  doc.setTextColor(...t.mutedColor);
  doc.text(t.logoSub, M, 28);
  // Bande rouge titre
  doc.setFillColor(...t.accentColor);
  doc.rect(0, 36, w, 18, 'F');
  doc.setFontSize(t.fs.h2 - 0.5);
  doc.setFont(t.headingFont, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, M, 48);
  if (subtitle) {
    doc.setFontSize(t.fs.sm);
    doc.setFont(t.bodyFont, 'normal');
    doc.setTextColor(255, 220, 200);
    doc.text(subtitle, w - M, 48, { align: 'right' });
  }
  return 62;
}

// ————— Pied de page —————
function pdfDrawFooters(doc, tpl) {
  const t = TPL[tpl] || TPL.magicwork;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pc = doc.internal.getNumberOfPages();
  const date = new Date().toLocaleDateString('fr-FR');
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    if (tpl === 'simple') {
      doc.setDrawColor(...t.mutedColor); doc.setLineWidth(0.2);
      doc.line(18, h - 18, w - 18, h - 18);
      doc.setFontSize(t.fs.sm - 1); doc.setFont(t.bodyFont, 'italic'); doc.setTextColor(...t.mutedColor);
      doc.text(`${t.logoName} — ${date}`, 18, h - 10);
      doc.text(`${i} / ${pc}`, w / 2, h - 10, { align: 'center' });
    } else if (tpl === 'accessible') {
      doc.setFillColor(...t.bgColor);
      doc.rect(0, h - 14, w, 14, 'F');
      doc.setFontSize(t.fs.sm + 1); doc.setFont(t.bodyFont, 'bold'); doc.setTextColor(...t.paperColor);
      doc.text(`Page ${i} / ${pc}`, w / 2, h - 5, { align: 'center' });
      doc.setFont(t.bodyFont, 'normal');
      doc.text(t.logoName, 20, h - 5);
    } else {
      doc.setDrawColor(...t.mutedColor); doc.setLineWidth(0.2);
      doc.line(18, h - 18, w - 18, h - 18);
      doc.setFontSize(t.fs.sm); doc.setFont(t.bodyFont, 'normal'); doc.setTextColor(...t.mutedColor);
      doc.text(`MagicWork · ${date}`, 18, h - 10);
      doc.text(`Page ${i} / ${pc}`, w / 2, h - 10, { align: 'center' });
    }
  }
}

// ————— Vérification espace / saut de page —————
function checkPage(doc, y, needed, tpl) {
  const h = doc.internal.pageSize.getHeight();
  if (y + needed > h - 28) {
    doc.addPage();
    return tpl === 'accessible' ? 28 : 22;
  }
  return y;
}

// ————— Rendu des segments Markdown dans jsPDF —————
function renderSegments(doc, segs, yStart, tpl) {
  const t = TPL[tpl] || TPL.magicwork;
  const w = doc.internal.pageSize.getWidth();
  const M = t.margin;
  const maxW = w - M * 2;
  let y = yStart;

  for (const seg of segs) {
    switch (seg.type) {

      case 'blank':
        y += t.fs.body * 0.32;
        break;

      case 'hr':
        y = checkPage(doc, y, 8, tpl);
        doc.setDrawColor(...t.accentColor); doc.setLineWidth(0.5);
        doc.line(M, y, w - M, y);
        doc.setLineWidth(0.2);
        y += 6;
        break;

      case 'h': {
        const lv = seg.level;
        const fs = lv === 1 ? t.fs.h1 : lv === 2 ? t.fs.h2 : t.fs.h3;
        const clean = stripMd(seg.text);
        y = checkPage(doc, y, fs * 0.7 + 10, tpl);
        y += 4;

        if (tpl === 'simple') {
          doc.setFont(t.headingFont, 'bold'); doc.setFontSize(fs);
          doc.setTextColor(...t.inkColor);
          if (lv === 1) {
            doc.setDrawColor(100,100,100); doc.setLineWidth(0.5);
            doc.line(M, y + 2, w - M, y + 2);
            doc.text(clean, M, y);
          } else if (lv === 2) {
            doc.text(clean, M, y);
          } else {
            doc.setFontSize(fs); doc.setTextColor(...t.mutedColor); doc.text(clean, M, y);
          }
          y += fs * 0.5 + 3;

        } else if (tpl === 'accessible') {
          doc.setFont(t.headingFont, 'bold'); doc.setFontSize(fs);
          if (lv === 1) {
            const bH = fs * 0.55 + 6;
            doc.setFillColor(...t.bgColor);
            doc.roundedRect(M - 2, y - fs * 0.42, maxW + 4, bH, 2, 2, 'F');
            doc.setTextColor(...t.paperColor);
            doc.text(clean, w / 2, y, { align: 'center' });
          } else if (lv === 2) {
            const bH = fs * 0.55 + 4;
            doc.setFillColor(...t.creamColor);
            doc.roundedRect(M - 2, y - fs * 0.42, maxW + 4, bH, 2, 2, 'F');
            doc.setFillColor(...t.accentColor); doc.setLineWidth(3);
            doc.rect(M - 2, y - fs * 0.42, 3, bH, 'F'); doc.setLineWidth(0.2);
            doc.setTextColor(...t.inkColor); doc.text(clean, M + 5, y);
          } else {
            doc.setTextColor(...t.accentColor); doc.text(clean, M, y);
          }
          y += fs * 0.52 + 6;

        } else {
          // MagicWork
          doc.setFont(t.headingFont, 'bold'); doc.setFontSize(fs);
          if (lv === 1) {
            const bH = fs * 0.58 + 6;
            doc.setFillColor(...t.inkColor);
            doc.roundedRect(M - 2, y - fs * 0.44, maxW + 4, bH, 2, 2, 'F');
            doc.setTextColor(...t.paperColor);
            doc.text(clean, w / 2, y, { align: 'center' });
          } else if (lv === 2) {
            const bH = fs * 0.55 + 4;
            doc.setFillColor(...t.creamColor);
            doc.roundedRect(M - 2, y - fs * 0.42, maxW + 4, bH, 2, 2, 'F');
            doc.setFillColor(...t.accentColor);
            doc.rect(M - 2, y - fs * 0.42, 3, bH, 'F');
            doc.setTextColor(...t.inkColor); doc.text(clean, M + 5, y);
          } else {
            doc.setTextColor(...t.accent2Color); doc.text(clean, M, y);
          }
          y += fs * 0.52 + 6;
        }
        break;
      }

      case 'exTitle': {
        const clean = stripMd(seg.text);
        y = checkPage(doc, y, 18, tpl);
        y += 3;
        doc.setFillColor(...t.bgColor);
        doc.roundedRect(M - 2, y - 6, maxW + 4, 12, 2, 2, 'F');
        doc.setTextColor(tpl === 'magicwork' ? t.accentColor[0] : 255, tpl === 'magicwork' ? t.accentColor[1] : 255, tpl === 'magicwork' ? t.accentColor[2] : 255);
        doc.setFont(t.headingFont, 'bold'); doc.setFontSize(t.fs.h3);
        doc.text(clean, M + 3, y + 1);
        y += 12;
        break;
      }

      case 'p': {
        // Rendu avec bold/italic inline
        y = checkPage(doc, y, t.fs.body * 0.5 + 2, tpl);
        doc.setFontSize(t.fs.body);
        const res = drawInlineText(doc, seg.text, M, y, maxW, t.bodyFont, t.fs.body, t.inkColor, tpl);
        y = res.endY;
        y += 1;
        break;
      }

      case 'ul': {
        for (const item of seg.items) {
          const approxLines = Math.ceil(stripMd(item).length / (maxW / (t.fs.body * 0.6)));
          y = checkPage(doc, y, approxLines * (t.fs.body * 0.45 + 1) + 3, tpl);
          // Puce
          doc.setFillColor(...t.accentColor);
          doc.circle(M + 3, y - 1.5, tpl === 'accessible' ? 2.2 : 1.8, 'F');
          // Texte avec inline bold
          const res = drawInlineText(doc, item, M + 8, y, maxW - 8, t.bodyFont, t.fs.body, t.inkColor, tpl);
          y = res.endY + 1;
        }
        y += 1;
        break;
      }

      case 'ol': {
        seg.items.forEach((item, idx) => {
          const approxLines = Math.ceil(stripMd(item).length / (maxW / (t.fs.body * 0.6)));
          y = checkPage(doc, y, approxLines * (t.fs.body * 0.45 + 1) + 3, tpl);
          // Numéro
          doc.setFont(t.bodyFont, 'bold'); doc.setFontSize(t.fs.body);
          doc.setTextColor(...t.accentColor);
          doc.text(`${idx + 1}.`, M, y);
          // Texte
          const res = drawInlineText(doc, item, M + 9, y, maxW - 9, t.bodyFont, t.fs.body, t.inkColor, tpl);
          y = res.endY + 1;
        });
        y += 1;
        break;
      }

      case 'code': {
        const codeLines = seg.text.split('\n');
        const bH = codeLines.length * (t.fs.body * 0.4 + 1) + 9;
        y = checkPage(doc, y, bH + 4, tpl);
        doc.setFillColor(...t.inkColor);
        doc.roundedRect(M, y - 3, maxW, bH, 2, 2, 'F');
        doc.setFont('courier', 'normal'); doc.setFontSize(t.fs.body - 1);
        doc.setTextColor(180, 240, 160);
        let cy = y + 4;
        for (const cl of codeLines) {
          doc.text(cl, M + 4, cy);
          cy += t.fs.body * 0.4 + 1;
        }
        y += bH + 5;
        break;
      }

      case 'bq': {
        const clean = stripMd(seg.text);
        const lines = doc.setFontSize(t.fs.body) || doc.splitTextToSize(clean, maxW - 10);
        const bqLines = doc.splitTextToSize(clean, maxW - 10);
        const bH = bqLines.length * (t.fs.body * 0.42 + 1) + 7;
        y = checkPage(doc, y, bH, tpl);
        doc.setFillColor(...t.creamColor);
        doc.roundedRect(M, y - 4, maxW, bH, 2, 2, 'F');
        doc.setFillColor(...t.accent3Color);
        doc.rect(M, y - 4, 3, bH, 'F');
        doc.setFont(t.bodyFont, 'italic'); doc.setFontSize(t.fs.body);
        doc.setTextColor(...t.mutedColor);
        for (const l of bqLines) {
          doc.text(l, M + 7, y);
          y += t.fs.body * 0.42 + 1;
        }
        y += 5;
        break;
      }
    }
  }
  return y;
}

// ============================================================
//  EXPORTS PDF SPÉCIALISÉS
// ============================================================

// ——— Exercices ———
function downloadExercicesPDF() {
  const meta = window._exMeta || {};
  const tpl = pdfTemplate;
  const t = TPL[tpl] || TPL.magicwork;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const M = t.margin;

  let y = pdfDrawHeader(doc, 'Exercices de Mathématiques', `${meta.niveau||''} · ${meta.difficulte||''}`, tpl);

  // Boîte d'infos
  doc.setFillColor(...t.creamColor);
  doc.roundedRect(M, y, w - M*2, 14, 2, 2, 'F');
  doc.setFontSize(t.fs.sm + 0.5); doc.setFont(t.bodyFont, 'normal'); doc.setTextColor(...t.mutedColor);
  doc.text(`Thèmes : ${(meta.themes||'').substring(0,90)}`, M+4, y+6);
  doc.text(`${meta.nbEx||''} exercice(s) · Généré le ${new Date().toLocaleDateString('fr-FR')}`, M+4, y+12);
  y += 20;

  const segs = mdToSegments(meta.rawText || '');
  y = renderSegments(doc, segs, y, tpl);
  pdfDrawFooters(doc, tpl);
  doc.save(`exercices-${meta.niveau||'college'}-${Date.now()}.pdf`);
}

// ——— QCM : format QCM imprimable —————
function downloadQCMPDF() {
  if (!qcmData.length) return;
  const tpl = pdfTemplate;
  const t = TPL[tpl] || TPL.magicwork;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const M = t.margin;

  // ——— PAGE SUJET ———
  let y = pdfDrawHeader(doc, 'QCM — Questions à Choix Multiples', `${qcmData.length} questions`, tpl);

  // Cadre instructions
  doc.setFillColor(...t.creamColor);
  doc.setDrawColor(...t.accent3Color); doc.setLineWidth(0.4);
  doc.roundedRect(M, y, w - M*2, 18, 2, 2, 'FD');
  doc.setFontSize(t.fs.sm + 0.5); doc.setFont(t.bodyFont, 'italic'); doc.setTextColor(...t.mutedColor);
  doc.text('Instructions : Entourez ou cochez la lettre correspondant à votre réponse.', M+4, y+7);
  doc.text('Une seule bonne réponse par question. Pas de pénalité pour erreur.', M+4, y+13);
  y += 24;

  // Ligne identité
  doc.setFont(t.bodyFont, 'normal'); doc.setFontSize(t.fs.body - 0.5); doc.setTextColor(...t.inkColor);
  doc.text(`Nom : _________________________  Prénom : _________________________  Note :`, M, y);
  // Case note
  doc.setDrawColor(...t.inkColor); doc.setLineWidth(0.4);
  doc.roundedRect(w - M - 22, y - 5, 22, 8, 1, 1, 'D');
  doc.setFont(t.bodyFont, 'bold'); doc.text(`__ / ${qcmData.length}`, w - M - 20, y);
  y += 10;

  // Séparateur
  doc.setDrawColor(...t.accentColor); doc.setLineWidth(0.5);
  doc.line(M, y, w - M, y); y += 8;

  // ——— QUESTIONS ———
  qcmData.forEach((q, qi) => {
    // Estimation hauteur bloc question
    doc.setFontSize(t.fs.body);
    const qTextLines = doc.splitTextToSize(q.q, w - M*2 - 14);
    const qH = qTextLines.length * (t.fs.body * 0.44) + 4 * 9 + 14;
    if (y + qH > h - 28) { doc.addPage(); y = 22; }

    // Badge numéro
    doc.setFillColor(...t.accentColor);
    doc.circle(M + 5, y + 3.5, 5, 'F');
    doc.setTextColor(255,255,255); doc.setFont(t.bodyFont, 'bold'); doc.setFontSize(t.fs.sm + 1.5);
    doc.text(String(qi+1), M + 5, y + 4.8, { align: 'center' });

    // Texte question
    doc.setTextColor(...t.inkColor); doc.setFont(t.bodyFont, 'bold'); doc.setFontSize(t.fs.body);
    doc.text(qTextLines, M + 13, y + 4);
    y += qTextLines.length * (t.fs.body * 0.44) + 4;

    // Options A B C D
    ['A','B','C','D'].forEach(letter => {
      if (y > h - 28) { doc.addPage(); y = 22; }
      const optText = q.options[letter];
      const optLines = doc.splitTextToSize(optText, w - M*2 - 18);
      const optH = Math.max(8, optLines.length * (t.fs.body * 0.42) + 4);

      // Fond option
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...t.mutedColor); doc.setLineWidth(0.25);
      doc.roundedRect(M, y - 1, w - M*2, optH + 1, 1.5, 1.5, 'FD');

      // Lettre dans un carré
      doc.setFillColor(...t.creamColor);
      doc.roundedRect(M, y - 1, 12, optH + 1, 1.5, 1.5, 'F');
      doc.setFont(t.bodyFont, 'bold'); doc.setFontSize(t.fs.body); doc.setTextColor(...t.accentColor);
      doc.text(letter, M + 6, y + optH * 0.4, { align: 'center' });

      // Cercle à cocher à droite
      doc.setDrawColor(...t.mutedColor); doc.setLineWidth(0.3);
      doc.circle(w - M - 5, y + optH * 0.4, 3, 'D');

      // Texte option avec inline bold
      doc.setFont(t.bodyFont, 'normal'); doc.setFontSize(t.fs.body - (tpl==='accessible'?0:0.5));
      doc.setTextColor(...t.inkColor);
      doc.text(optLines, M + 15, y + (t.fs.body * 0.42));

      y += optH + 2;
    });

    // Séparateur entre questions
    doc.setDrawColor(...t.creamColor); doc.setLineWidth(0.3);
    doc.line(M, y + 1, w - M, y + 1);
    y += 6;
  });

  pdfDrawFooters(doc, tpl);

  // ——— PAGE CORRIGÉ ———
  doc.addPage();
  let cy = pdfDrawHeader(doc, 'Corrigé du QCM', `${qcmData.length} questions — Réservé au professeur`, tpl);

  // Bandeau avertissement
  doc.setFillColor(...t.accent2Color);
  doc.roundedRect(M, cy, w - M*2, 10, 2, 2, 'F');
  doc.setFontSize(t.fs.body); doc.setFont(t.bodyFont, 'bold'); doc.setTextColor(255,255,255);
  doc.text('✓  CORRIGÉ OFFICIEL — Ne pas distribuer aux élèves avant l\'évaluation', M+4, cy+7);
  cy += 16;

  // Grille réponses (4 colonnes)
  const cols = 4;
  const colW = (w - M*2) / cols;
  let col = 0, rowY = cy;
  qcmData.forEach((q, qi) => {
    if (col === 0 && qi > 0) rowY += 18;
    if (rowY + 18 > doc.internal.pageSize.getHeight() - 28) { doc.addPage(); rowY = 24; col = 0; }
    const cx = M + col * colW;

    doc.setFillColor(...t.creamColor);
    doc.roundedRect(cx, rowY, colW - 4, 14, 2, 2, 'F');
    doc.setFont(t.bodyFont, 'bold'); doc.setFontSize(t.fs.body - 1); doc.setTextColor(...t.mutedColor);
    doc.text(`Q${qi+1}`, cx + 4, rowY + 5.5);

    // Cercle réponse
    doc.setFillColor(...t.accent2Color);
    doc.circle(cx + colW - 12, rowY + 7, 5.5, 'F');
    doc.setTextColor(255,255,255); doc.setFont(t.bodyFont,'bold'); doc.setFontSize(t.fs.body + 1);
    doc.text(q.answer, cx + colW - 12, rowY + 8.5, { align: 'center' });

    col = (col + 1) % cols;
  });

  rowY += 26;

  // Explications
  doc.setFont(t.bodyFont, 'bold'); doc.setFontSize(t.fs.body + 0.5); doc.setTextColor(...t.inkColor);
  doc.text('Explications détaillées :', M, rowY); rowY += 8;

  qcmData.forEach((q, qi) => {
    if (!q.expl) return;
    if (rowY > doc.internal.pageSize.getHeight() - 28) { doc.addPage(); rowY = 24; }
    doc.setFont(t.bodyFont, 'bold'); doc.setFontSize(t.fs.body - 0.5); doc.setTextColor(...t.accentColor);
    doc.text(`Q${qi+1} — Réponse : ${q.answer}`, M, rowY);
    doc.setFont(t.bodyFont, 'normal'); doc.setTextColor(...t.inkColor);
    const eLines = doc.splitTextToSize(q.expl, w - M*2 - 4);
    doc.text(eLines, M + 4, rowY + 5);
    rowY += eLines.length * 5.5 + 8;
    doc.setDrawColor(...t.creamColor); doc.setLineWidth(0.2);
    doc.line(M, rowY - 2, w - M, rowY - 2);
  });

  pdfDrawFooters(doc, tpl);
  doc.save(`qcm-${Date.now()}.pdf`);
}

// ——— Flashcards : cartes découpables —————
function downloadFlashcardsPDF() {
  if (!flashcards.length) return;
  const tpl = pdfTemplate;
  const t = TPL[tpl] || TPL.magicwork;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const M = 12;
  const cardW = (w - M * 3) / 2;
  const cardH = (h - M * 5) / 2;

  // Couleurs par template
  const CC = {
    magicwork: {
      qBg: [245,240,232], qBorder: [200,191,168], qText: [15,14,13],
      qBadgeBg: [212,64,26], qBadgeText: [255,255,255], qLabel: [138,128,112],
      rBg: [15,14,13], rBorder: [50,45,40], rText: [245,240,232],
      rBadgeBg: [45,106,79], rBadgeText: [255,255,255], rLabel: [100,180,120]
    },
    simple: {
      qBg: [255,255,255], qBorder: [180,180,180], qText: [17,17,17],
      qBadgeBg: [60,60,60], qBadgeText: [255,255,255], qLabel: [150,150,150],
      rBg: [247,247,247], rBorder: [160,160,160], rText: [17,17,17],
      rBadgeBg: [60,60,60], rBadgeText: [255,255,255], rLabel: [130,130,130]
    },
    accessible: {
      qBg: [255,254,245], qBorder: [0,86,179], qText: [20,20,40],
      qBadgeBg: [0,86,179], qBadgeText: [255,255,255], qLabel: [0,86,179],
      rBg: [20,60,140], rBorder: [10,40,120], rText: [255,255,255],
      rBadgeBg: [0,150,60], rBadgeText: [255,255,255], rLabel: [160,220,160]
    }
  };
  const cc = CC[tpl] || CC.magicwork;
  const cardFs = tpl === 'accessible' ? 11 : 9.5;

  // Positions des 4 cartes sur la page (2×2)
  const pos = [
    { x: M,         y: M + 12 },
    { x: M*2+cardW, y: M + 12 },
    { x: M,         y: M*2+cardH+24 },
    { x: M*2+cardW, y: M*2+cardH+24 }
  ];
  // Positions miroir pour le verso (impression recto-verso)
  const posM = [pos[1], pos[0], pos[3], pos[2]];

  // ——— Couverture ———
  doc.setFillColor(...t.inkColor);
  doc.rect(0, 0, w, h, 'F');
  doc.setFillColor(...t.accentColor);
  doc.rect(0, h/2 - 30, w, 60, 'F');
  doc.setTextColor(...t.paperColor);
  doc.setFontSize(tpl === 'accessible' ? 32 : 42); doc.setFont(t.headingFont, 'bold');
  if (tpl === 'simple') {
    doc.text('Flashcards', w/2, h/2 - 8, { align: 'center' });
  } else {
    const mw2 = doc.getTextWidth('Magic');
    doc.text('Magic', w/2 - mw2/2, h/2 - 8);
    doc.setTextColor(255,255,255);
    doc.text('Work', w/2 - mw2/2 + mw2, h/2 - 8);
  }
  doc.setFontSize(16); doc.setFont(t.bodyFont, 'normal'); doc.setTextColor(255,255,255);
  doc.text('Flashcards de révision', w/2, h/2 + 18, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(200,200,200);
  doc.text(`${flashcards.length} cartes · ${new Date().toLocaleDateString('fr-FR')}`, w/2, h/2 + 30, { align: 'center' });

  // ——— Instructions ———
  doc.setFontSize(9); doc.setTextColor(150,150,150); doc.setFont(t.bodyFont, 'italic');
  doc.text('Imprimez recto-verso et découpez le long des pointillés.', w/2, h - 15, { align: 'center' });

  // ——— Cartes par groupe de 4 ———
  let ci = 0;
  while (ci < flashcards.length) {
    const batch = flashcards.slice(ci, ci + 4);

    // — Page RECTO (questions) —
    doc.addPage();

    // En-tête page questions
    const qHdrBg = tpl === 'accessible' ? t.bgColor : [237,231,213];
    doc.setFillColor(...qHdrBg);
    doc.rect(0, 0, w, 11, 'F');
    doc.setFontSize(7.5); doc.setFont(t.bodyFont, 'bold');
    doc.setTextColor(tpl === 'accessible' ? 255 : t.mutedColor[0], tpl === 'accessible' ? 255 : t.mutedColor[1], tpl === 'accessible' ? 255 : t.mutedColor[2]);
    doc.text('QUESTIONS ✦ Découpez le long des pointillés', w/2, 7.5, { align: 'center' });

    // Lignes de découpe horizontale
    doc.setDrawColor(...t.mutedColor); doc.setLineDash([2,2]); doc.setLineWidth(0.2);
    doc.line(M, M + 12 + cardH + 4, w - M, M + 12 + cardH + 4);
    doc.line(0, M * 1.5 + cardH + 12, w, M * 1.5 + cardH + 12);
    doc.setLineDash([]);

    batch.forEach((fc, bi) => {
      const p = pos[bi];
      if (!p) return;

      // Fond carte
      doc.setFillColor(...cc.qBg);
      doc.setDrawColor(...cc.qBorder);
      doc.setLineWidth(tpl === 'accessible' ? 1.5 : 0.4);
      doc.setLineDash([1.5, 1.5]);
      doc.roundedRect(p.x, p.y, cardW, cardH, 3, 3, 'FD');
      doc.setLineDash([]);

      // Badge numéro
      doc.setFillColor(...cc.qBadgeBg);
      doc.roundedRect(p.x + 4, p.y + 4, 22, 9, 2, 2, 'F');
      doc.setTextColor(...cc.qBadgeText); doc.setFontSize(7); doc.setFont(t.bodyFont, 'bold');
      doc.text(`N° ${ci + bi + 1}`, p.x + 15, p.y + 10.5, { align: 'center' });

      // Label QUESTION
      doc.setFontSize(6); doc.setTextColor(...cc.qLabel); doc.setFont(t.bodyFont, 'normal');
      doc.text('QUESTION', p.x + cardW - 5, p.y + 10.5, { align: 'right' });

      // Ligne séparatrice
      doc.setDrawColor(...cc.qBorder); doc.setLineWidth(0.3);
      doc.line(p.x + 4, p.y + 16, p.x + cardW - 4, p.y + 16);

      // Texte question (centré verticalement)
      doc.setTextColor(...cc.qText); doc.setFontSize(cardFs); doc.setFont(t.bodyFont, 'bold');
      const qLines = doc.splitTextToSize(fc.q, cardW - 10);
      const totalQH = qLines.length * (cardFs * 0.45 + 0.5);
      const qStartY = p.y + 20 + (cardH - 26 - totalQH) / 2 + cardFs * 0.4;
      doc.text(qLines, p.x + cardW/2, qStartY, { align: 'center' });

      // Hint
      doc.setFontSize(6); doc.setTextColor(...cc.qLabel); doc.setFont(t.bodyFont, 'italic');
      doc.text('▶ Retournez pour la réponse', p.x + cardW/2, p.y + cardH - 3, { align: 'center' });
    });

    // — Page VERSO (réponses, miroir horizontal) —
    doc.addPage();

    // En-tête verso
    doc.setFillColor(...t.inkColor);
    doc.rect(0, 0, w, 11, 'F');
    doc.setFontSize(7.5); doc.setFont(t.bodyFont, 'bold'); doc.setTextColor(255,255,255);
    doc.text('RÉPONSES ✦ Côté verso — imprimez recto-verso', w/2, 7.5, { align: 'center' });

    // Lignes de découpe
    doc.setDrawColor(...t.mutedColor); doc.setLineDash([2,2]); doc.setLineWidth(0.2);
    doc.line(M, M + 12 + cardH + 4, w - M, M + 12 + cardH + 4);
    doc.line(0, M * 1.5 + cardH + 12, w, M * 1.5 + cardH + 12);
    doc.setLineDash([]);

    batch.forEach((fc, bi) => {
      const p = posM[bi];
      if (!p) return;

      // Fond carte réponse
      doc.setFillColor(...cc.rBg);
      doc.setDrawColor(...cc.rBorder);
      doc.setLineWidth(tpl === 'accessible' ? 1.5 : 0.4);
      doc.setLineDash([1.5, 1.5]);
      doc.roundedRect(p.x, p.y, cardW, cardH, 3, 3, 'FD');
      doc.setLineDash([]);

      // Badge numéro
      doc.setFillColor(...cc.rBadgeBg);
      doc.roundedRect(p.x + 4, p.y + 4, 22, 9, 2, 2, 'F');
      doc.setTextColor(...cc.rBadgeText); doc.setFontSize(7); doc.setFont(t.bodyFont, 'bold');
      doc.text(`N° ${ci + bi + 1}`, p.x + 15, p.y + 10.5, { align: 'center' });

      // Label RÉPONSE
      doc.setFontSize(6); doc.setTextColor(...cc.rLabel); doc.setFont(t.bodyFont, 'normal');
      doc.text('RÉPONSE', p.x + cardW - 5, p.y + 10.5, { align: 'right' });

      // Ligne séparatrice
      doc.setDrawColor(...cc.rBorder); doc.setLineWidth(0.3);
      doc.line(p.x + 4, p.y + 16, p.x + cardW - 4, p.y + 16);

      // Texte réponse (centré verticalement)
      doc.setTextColor(...cc.rText); doc.setFontSize(cardFs - 0.5); doc.setFont(t.bodyFont, 'normal');
      const rLines = doc.splitTextToSize(fc.r, cardW - 10);
      const totalRH = rLines.length * ((cardFs - 0.5) * 0.45 + 0.5);
      const rStartY = p.y + 20 + (cardH - 26 - totalRH) / 2 + (cardFs - 0.5) * 0.4;
      doc.text(rLines, p.x + cardW/2, rStartY, { align: 'center' });
    });

    ci += 4;
  }

  // ——— Page récapitulatif ———
  doc.addPage();
  let sy = pdfDrawHeader(doc, 'Récapitulatif des flashcards', `${flashcards.length} cartes au total`, tpl);

  flashcards.forEach((fc, i) => {
    sy = checkPage(doc, sy, 16, tpl);
    const known = fcKnew.has(i), didnt = fcDidnt.has(i);
    const badgeC = known ? t.accent2Color : didnt ? t.accentColor : t.mutedColor;
    doc.setFillColor(...badgeC);
    doc.roundedRect(M, sy, 8, 8, 1, 1, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont(t.bodyFont, 'bold');
    doc.text(String(i+1), M+4, sy+5.5, { align: 'center' });

    doc.setFontSize(t.fs.body);
    const res = drawInlineText(doc, `Q : ${fc.q}`, M+11, sy+5, w - M*2 - 14, t.bodyFont, t.fs.body, t.inkColor, tpl);
    sy = res.endY;

    doc.setFont(t.bodyFont, 'normal'); doc.setFontSize(t.fs.body - 1); doc.setTextColor(...t.mutedColor);
    const rLines = doc.splitTextToSize(`R : ${fc.r}`, w - M*2 - 14);
    doc.text(rLines, M+11, sy);
    sy += rLines.length * 5 + 4;

    doc.setDrawColor(...t.creamColor); doc.setLineWidth(0.2);
    doc.line(M, sy, w - M, sy); sy += 3;
  });

  pdfDrawFooters(doc, tpl);
  doc.save(`flashcards-${Date.now()}.pdf`);
}

// ——— Fiche de révision ———
function downloadFichePDF() {
  const meta = window._ficheMeta || {};
  const tpl = pdfTemplate;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = pdfDrawHeader(doc, 'Fiche de Révision', meta.sujet || '', tpl);
  const segs = mdToSegments(meta.rawText || '');
  renderSegments(doc, segs, y, tpl);
  pdfDrawFooters(doc, tpl);
  doc.save(`fiche-revision-${Date.now()}.pdf`);
}

// ——— Examen ———
function downloadExamenPDF() {
  const meta = window._examenMeta || {};
  const tpl = pdfTemplate;
  const t = TPL[tpl] || TPL.magicwork;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const M = t.margin;

  let y = pdfDrawHeader(doc, `Sujet d'examen — ${meta.matiere||''}`, meta.niveau || '', tpl);
  const segs = mdToSegments(meta.rawText || '');
  y = renderSegments(doc, segs, y, tpl);

  // Lignes de réponse en bas de dernière page
  const pc = doc.internal.getNumberOfPages();
  doc.setPage(pc);
  const lineY = h - 44;
  if (y < lineY - 10) {
    doc.setDrawColor(...t.mutedColor); doc.setLineWidth(0.25);
    for (let i = 0; i < 3; i++) doc.line(M, lineY + i*9, w-M, lineY + i*9);
  }
  pdfDrawFooters(doc, tpl);
  doc.save(`examen-${(meta.matiere||'sujet').toLowerCase().replace(/\s+/g,'-')}-${Date.now()}.pdf`);
}

// ——— Simplificateur / Résumeur / Générique ———
function downloadSimplePDF() {
  const tpl = pdfTemplate;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = pdfDrawHeader(doc, 'Exercice Simplifié', new Date().toLocaleDateString('fr-FR'), tpl);
  const rawText = window._simpleMeta?.rawText || document.getElementById('result-rendered-main')?.innerText || '';
  renderSegments(doc, mdToSegments(rawText), y, tpl);
  pdfDrawFooters(doc, tpl);
  doc.save(`exercice-simplifie-${Date.now()}.pdf`);
}

function downloadResumePDF() {
  const tpl = pdfTemplate;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = pdfDrawHeader(doc, 'Résumé de cours', new Date().toLocaleDateString('fr-FR'), tpl);
  const rawText = window._resumeMeta?.rawText || document.getElementById('result-rendered-main')?.innerText || '';
  renderSegments(doc, mdToSegments(rawText), y, tpl);
  pdfDrawFooters(doc, tpl);
  doc.save(`resume-cours-${Date.now()}.pdf`);
}

function downloadGenericPDF(elId, docTitle) {
  const tpl = pdfTemplate;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = pdfDrawHeader(doc, docTitle, new Date().toLocaleDateString('fr-FR'), tpl);
  // On récupère le rawText depuis les metas stockées selon l'outil
  let rawText = '';
  if (elId === 'result-rendered-main') {
    rawText = window._correcteurMeta?.rawText || window._mathsMeta?.rawText || document.getElementById(elId)?.innerText || '';
  }
  renderSegments(doc, mdToSegments(rawText), y, tpl);
  pdfDrawFooters(doc, tpl);
  doc.save(`${docTitle.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}.pdf`);
}

// ============================================================
//  UTILITAIRES
// ============================================================
function setLoading(v) {
  const btn = document.getElementById('genBtn');
  const sp = document.getElementById('spinner');
  const txt = document.getElementById('genBtnText');
  if (btn) btn.disabled = v;
  if (sp) sp.style.display = v ? 'block' : 'none';
  if (txt) {
    if (v) { txt.dataset.orig = txt.textContent; txt.textContent = 'Génération en cours...'; }
    else if (txt.dataset.orig) txt.textContent = txt.dataset.orig;
  }
}
function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (el) { el.textContent = msg; el.classList.add('active'); }
}
function hideError() {
  const el = document.getElementById('errorMsg');
  if (el) el.classList.remove('active');
}
function copyRendered(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText || el.textContent).then(() => {
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✓ Copié !';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}
async function extractPDFText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const arr = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument(arr).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        resolve(text);
      } catch(err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}
function setupFileUpload(toolName) {
  const fi = document.getElementById(`fileInput-${toolName}`);
  const fu = document.getElementById(`fileUpload-${toolName}`);
  const ff = document.getElementById(`fileInfo-${toolName}`);
  if (!fi || !fu || !ff) return;
  fi.addEventListener('change', e => {
    if (e.target.files[0]) {
      ff.innerHTML = `<strong>📄 ${e.target.files[0].name}</strong> — ${(e.target.files[0].size/1024).toFixed(1)} KB`;
      ff.classList.add('active');
    }
  });
  ['dragover','dragleave','drop'].forEach(evt => {
    fu.addEventListener(evt, e => {
      e.preventDefault();
      if (evt === 'dragover') fu.classList.add('dragover');
      if (evt === 'dragleave') fu.classList.remove('dragover');
      if (evt === 'drop') {
        fu.classList.remove('dragover');
        if (e.dataTransfer.files[0]) {
          const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]);
          fi.files = dt.files;
          ff.innerHTML = `<strong>📄 ${e.dataTransfer.files[0].name}</strong> — ${(e.dataTransfer.files[0].size/1024).toFixed(1)} KB`;
          ff.classList.add('active');
        }
      }
    });
  });
}
