/* =====================================================================
   SCRIPT.JS — toute la logique du site
   Tout est commente pour que tu puisses modifier facilement.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) A MODIFIER FACILEMENT ICI
   --------------------------------------------------------------------- */

// prenom attendu (la verification est volontairement souple : accents,
// majuscules et fautes de frappe proches sont acceptes)
const EXPECTED_NAME = "zoe";
const WELCOME_NAME = "Zoé";

// mots de passe acceptes pour l'enveloppe (uniquement des chiffres)
const ACCEPTED_PASSWORDS = ["15062009", "150609"];

// date de debut de la relation (annee, mois, jour) -> sert au compteur
// mois 1 = fevrier (JS compte les mois de 0 a 11)
const START_DATE = new Date(2026, 1, 1);

// texte de la lettre finale
const LETTER_TEXT =
`Coucou mon cœur,

Si tu lis ça c'est que t'es arrivée jusqu'au bout du site, déjà j'espère qu'il t'a plu parce que je t'avoue que j'ai passé pas mal de temps dessus.

Je savais pas trop quoi te faire pour ton anniversaire, je voulais pas juste t'acheter un truc, j'avais envie de faire quelque chose qui reste et que tu puisses revoir plus tard.

Bon je préfère être honnête, j'ai utilisé une IA juste pour corriger les fautes parce que tu sais très bien que l'orthographe et moi ça fait deux, mais tout le reste vient de moi.

Ça fait pas si longtemps qu'on est ensemble mais t'as déjà pris une énorme place dans ma vie. Même si on est à distance, ça change rien à ce que je ressens, ça me donne juste encore plus envie de te revoir.

Merci pour tous nos appels, tous les moments où tu me fais sourire sans même t'en rendre compte. J'espère qu'on aura encore plein de souvenirs à créer tous les deux parce que franchement on est qu'au début de notre histoire.

Je sais pas ce que l'avenir nous réserve mais j'espère juste qu'on continuera d'avancer ensemble le plus longtemps possible.

En tout cas aujourd'hui profite à fond de ta journée parce qu'elle est faite pour toi.

Joyeux anniversaire mon cœur ❤️ et merci d'être entrée dans ma vie.

— Clément`;

// coordonnees des deux villes pour la carte
const SENS_COORDS = [48.1972, 3.2831];
const ORLEANS_COORDS = [47.9029, 1.9093];

/* ---------------------------------------------------------------------
   2) OUTILS
   --------------------------------------------------------------------- */
let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx){ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  return audioCtx;
}
function playTone(freq, duration, type, volume){
  try{
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }catch(e){ /* audio non disponible, tant pis */ }
}
function playClickSound(){ playTone(720, 0.12, "sine", 0.05); }
function playPaperSound(){
  playTone(180, 0.25, "triangle", 0.04);
  setTimeout(()=>playTone(260, 0.2, "triangle", 0.03), 90);
}
function playChime(){
  playTone(660, 0.3, "sine", 0.05);
  setTimeout(()=>playTone(880, 0.35, "sine", 0.045), 140);
}
function digitsOnly(str){ return (str || "").replace(/\D/g, ""); }
function vibrate(pattern){ if(navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} } }

// normalise un prenom pour la comparaison (enleve accents/espaces/majuscules)
function normalizeName(str){
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* ---------------------------------------------------------------------
   3) PRECHARGEMENT DES IMAGES (pour qu'aucune photo ne clignote)
   --------------------------------------------------------------------- */
function preloadImages(){
  const paths = [
    "assets/images/photo-1.jpg","assets/images/photo-2.jpg","assets/images/photo-3.jpg",
    "assets/images/photo-4.jpg","assets/images/photo-final.jpg","assets/images/photo-bg.jpg"
  ];
  paths.forEach(p => { const img = new Image(); img.src = p; });
}
preloadImages();

/* ---------------------------------------------------------------------
   4) MUSIQUE DE FOND + BOUTON SON (une seule piste, du debut a la fin)
   --------------------------------------------------------------------- */
const music = document.getElementById("bg-music");
const muteBtn = document.getElementById("mute-btn");
let musicStarted = false;

function startMusicOnce(){
  if(musicStarted) return;
  musicStarted = true;
  music.volume = 0.5;
  
  const play = () => {
    music.play().then(() => {
      muteBtn.hidden = false;
    }).catch(e => {
      console.log("Audio play blocked, waiting for interaction");
    });
  };

  play();

  // Sécurité supplémentaire : relancer au premier clic n'importe où
  const forcePlay = () => {
    if(music.paused) play();
    document.removeEventListener("click", forcePlay);
    document.removeEventListener("touchstart", forcePlay);
  };
  document.addEventListener("click", forcePlay);
  document.addEventListener("touchstart", forcePlay);
}
muteBtn.addEventListener("click", () => {
  music.muted = !music.muted;
  muteBtn.classList.toggle("muted", music.muted);
});

/* ---------------------------------------------------------------------
   5) NAVIGATION ENTRE LES GRANDS ECRANS
   --------------------------------------------------------------------- */
const SCREENS = ["screen-gate","screen-hub","screen-souvenirs","screen-histoire","screen-surprise"];
const backBtn = document.getElementById("back-btn");

function showScreen(id){
  SCREENS.forEach(s => document.getElementById(s).classList.toggle("active", s === id));
  const showBack = (id === "screen-souvenirs" || id === "screen-histoire" || id === "screen-surprise");
  backBtn.hidden = !showBack;
}
backBtn.addEventListener("click", () => {
  playClickSound();
  showScreen("screen-hub");
});

/* ---------------------------------------------------------------------
   6) ECRAN 1 — LA GRILLE (verification du prenom)
   --------------------------------------------------------------------- */
const gateSteps = {
  lock: document.getElementById("gate-step-lock"),
  name: document.getElementById("gate-step-name"),
  check: document.getElementById("gate-step-check"),
  welcome: document.getElementById("gate-step-welcome"),
};
function goToGateStep(step){
  Object.values(gateSteps).forEach(el => {
    el.classList.remove("gate-step-active", "in");
  });
  gateSteps[step].classList.add("gate-step-active");
  requestAnimationFrame(() => requestAnimationFrame(() => gateSteps[step].classList.add("in")));
}
goToGateStep("lock");

document.getElementById("gate-continue").addEventListener("click", () => {
  playClickSound();
  goToGateStep("name");
  setTimeout(() => document.getElementById("gate-name-input").focus(), 300);
});

const gateNameInput = document.getElementById("gate-name-input");
const gateRetryMsg = document.getElementById("gate-retry-msg");
let gateAttempts = 0;

function submitGateName(){
  const value = normalizeName(gateNameInput.value);
  if(!value) return;
  playClickSound();
  gateAttempts++;
  goToGateStep("check");
  setTimeout(() => {
    // verification volontairement bienveillante : ce site est fait pour une
    // seule personne, donc on la laisse toujours entrer, avec un petit
    // clin d'oeil si le prenom tape ne correspond pas exactement
    const matches = value.includes(EXPECTED_NAME.slice(0,3));
    if(matches || gateAttempts >= 2){
      goToGateStep("welcome");
    } else {
      gateRetryMsg.textContent = "Hmm, ce n'est pas tout à fait ça… réessaie 🤍";
      goToGateStep("name");
      setTimeout(() => gateNameInput.focus(), 300);
    }
  }, 1500);
}
document.getElementById("gate-name-submit").addEventListener("click", submitGateName);
gateNameInput.addEventListener("keydown", (e) => { if(e.key === "Enter") submitGateName(); });

document.getElementById("gate-enter-btn").addEventListener("click", () => {
  playClickSound();
  startMusicOnce();
  showScreen("screen-hub");
});

/* ---------------------------------------------------------------------
   7) ECRAN 2 — LES 3 CADEAUX
   --------------------------------------------------------------------- */
const giftState = { souvenirs:false, histoire:false };
const giftBoxes = {
  souvenirs: document.getElementById("gift-souvenirs"),
  histoire: document.getElementById("gift-histoire"),
  surprise: document.getElementById("gift-surprise"),
};
const hubHint = document.getElementById("hub-hint");
const toastEl = document.getElementById("toast");
let toastTimer = null;
function showToast(text){
  toastEl.textContent = text;
  toastEl.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 2200);
}

function markGiftOpened(name){
  if(giftState[name]) return;
  giftState[name] = true;
  const el = giftBoxes[name];
  if(el) el.classList.add("gift-opened");
  showToast(name === "souvenirs" ? "Souvenirs ouvert ✦" : "Notre histoire ouvert ✦");
  checkUnlockSurprise();
}
function checkUnlockSurprise(){
  // On vérifie les deux cadeaux
  if(giftState.souvenirs && giftState.histoire){
    const surprise = giftBoxes.surprise;
    if(surprise.classList.contains("gift-locked")){
      surprise.classList.remove("gift-locked");
      surprise.classList.add("gift-unlocking");
      hubHint.textContent = "ton dernier cadeau est prêt…";
      setTimeout(() => surprise.classList.remove("gift-unlocking"), 1200);
      playChime();
    }
  }
}

giftBoxes.souvenirs.addEventListener("click", () => {
  playClickSound();
  markGiftOpened("souvenirs"); // Marque comme ouvert dès le clic pour éviter les blocages
  showScreen("screen-souvenirs");
  albumGoTo(0, true);
});
giftBoxes.histoire.addEventListener("click", () => {
  playClickSound();
  markGiftOpened("histoire"); // Marque comme ouvert dès le clic pour éviter les blocages
  showScreen("screen-histoire");
  histoireGoTo(0);
});
giftBoxes.surprise.addEventListener("click", () => {
  if(giftBoxes.surprise.classList.contains("gift-locked")){
    playClickSound();
    giftBoxes.surprise.animate(
      [{ transform:"translateX(0)" },{ transform:"translateX(-6px)" },{ transform:"translateX(6px)" },{ transform:"translateX(0)" }],
      { duration:300 }
    );
    hubHint.textContent = "ouvre les deux premiers cadeaux d'abord…";
    return;
  }
  playClickSound();
  showScreen("screen-surprise");
  surpriseGoTo(0);
});

/* ---------------------------------------------------------------------
   8) ECRAN 3 — SOUVENIRS (album photo, vrai effet page qui tourne)
   --------------------------------------------------------------------- */
const leaves = Array.from(document.querySelectorAll("#album .leaf"));
let albumIndex = 0; // nombre de pages deja tournees

function albumGoTo(index, instant){
  // on ne retourne jamais la toute derniere page : elle reste affichee
  // comme page finale de l'album ("a suivre..." + bouton retour)
  albumIndex = Math.max(0, Math.min(leaves.length - 1, index));
  leaves.forEach((leaf, i) => {
    leaf.classList.toggle("flipped", i < albumIndex);
  });
  if(instant){ /* pas d'animation son au chargement initial */ return; }
}
function albumNext(){
  if(albumIndex >= leaves.length) return;
  playPaperSound();
  vibrate(6);
  albumGoTo(albumIndex + 1);
}
function albumPrev(){
  if(albumIndex <= 0) return;
  playPaperSound();
  albumGoTo(albumIndex - 1);
}
document.getElementById("album-next").addEventListener("click", albumNext);
document.getElementById("album-prev").addEventListener("click", albumPrev);

// swipe tactile sur l'album
let albumTouchX = null;
const albumEl = document.getElementById("album");
albumEl.addEventListener("touchstart", (e) => { albumTouchX = e.changedTouches[0].clientX; }, { passive:true });
albumEl.addEventListener("touchend", (e) => {
  if(albumTouchX === null) return;
  const dx = e.changedTouches[0].clientX - albumTouchX;
  if(Math.abs(dx) > 40){ dx < 0 ? albumNext() : albumPrev(); }
  albumTouchX = null;
}, { passive:true });

document.querySelector(".album-back-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  playClickSound();
  markGiftOpened("souvenirs");
  showScreen("screen-hub");
});

/* ---------------------------------------------------------------------
   9) ECRAN 4 — NOTRE HISTOIRE (pagination interne, comme un mini-parcours)
   --------------------------------------------------------------------- */
const hPages = Array.from(document.querySelectorAll("#histoire-experience .hpage"));
let hIndex = -1;
const H_NO_AUTO = ["hpage-q1","hpage-distance","hpage-q2","hpage-envelope","hpage-letter"];

function histoireGoTo(index){
  if(index < 0 || index >= hPages.length) return;
  hPages.forEach((p, i) => p.classList.toggle("page-active", i === index));
  hIndex = index;
  runHistoirePageLogic(hPages[index].id);
}
function histoireNext(){ histoireGoTo(hIndex + 1); }

function runHistoirePageLogic(id){
  if(id === "hpage-counter") animateCounter();
  if(id === "hpage-distance"){ initRealMap(); resetSoulsGame(); }
  if(id === "hpage-letter") typeLetter();
}

document.getElementById("histoire-experience").addEventListener("click", (e) => {
  const page = hPages[hIndex];
  if(!page) return;
  if(H_NO_AUTO.includes(page.id)) return;
  const interactive = e.target.closest("button, input, a");
  if(interactive) return;
  playClickSound();
  histoireNext();
});

// --- compteur ---
function animateCounter(){
  const now = new Date();
  const daysTogether = Math.max(0, Math.floor((now - START_DATE) / 86400000));
  const el = document.getElementById("counter-number");
  let current = 0;
  const step = Math.max(1, Math.round(daysTogether / 60));
  const timer = setInterval(() => {
    current = Math.min(daysTogether, current + step);
    el.textContent = current;
    if(current >= daysTogether) clearInterval(timer);
  }, 20);
}

// --- questions oui/non (reutilisable pour q1 et q2) ---
function setupDodgeQuestion(pageEl){
  const btnNon = pageEl.querySelector(".btn-non");
  const btnOui = pageEl.querySelector(".btn-oui");
  let dodgeCount = 0;

  function dodge(){
    const btnW = btnNon.offsetWidth || 100;
    const btnH = btnNon.offsetHeight || 50;
    const margin = 16;
    const maxLeft = window.innerWidth - btnW - margin;
    const maxTop = window.innerHeight - btnH - margin;
    const newLeft = Math.max(margin, Math.random() * maxLeft);
    const newTop = Math.max(margin, Math.random() * maxTop);
    btnNon.classList.add("fleeing");
    btnNon.style.left = newLeft + "px";
    btnNon.style.top = newTop + "px";
    dodgeCount++;
    vibrate(5);
  }
  pageEl.addEventListener("mousemove", (e) => {
    const rect = btnNon.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width/2);
    const dy = e.clientY - (rect.top + rect.height/2);
    if(Math.sqrt(dx*dx + dy*dy) < 100) dodge();
  });
  btnNon.addEventListener("touchstart", (e) => { e.preventDefault(); dodge(); }, { passive:false });
  btnNon.addEventListener("click", (e) => { e.stopPropagation(); dodge(); });
  btnOui.addEventListener("click", (e) => {
    e.stopPropagation();
    playClickSound();
    histoireNext();
  });
}
setupDodgeQuestion(document.getElementById("hpage-q1"));
setupDodgeQuestion(document.getElementById("hpage-q2"));

// --- carte + jeu des ames ---
let mapInitialized = false;
function initRealMap(){
  if(mapInitialized) return;
  if(typeof L === "undefined") return;
  mapInitialized = true;
  const map = L.map("real-map", { zoomControl:false, attributionControl:true, scrollWheelZoom:false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:'&copy; OpenStreetMap', maxZoom:18 }).addTo(map);
  const heartIcon = (label) => L.divIcon({ className:"map-pin", html:`<span>❤ ${label}</span>`, iconSize:[90,26], iconAnchor:[45,13] });
  L.marker(SENS_COORDS, { icon: heartIcon("Clément · Sens") }).addTo(map);
  L.marker(ORLEANS_COORDS, { icon: heartIcon("Zoé · Orléans") }).addTo(map);
  L.polyline([SENS_COORDS, ORLEANS_COORDS], { color:"#b76e7a", weight:3, dashArray:"6 8" }).addTo(map);
  map.fitBounds(L.latLngBounds([SENS_COORDS, ORLEANS_COORDS]), { padding:[50,50] });
}

const soulA = document.getElementById("soul-a");
const soulB = document.getElementById("soul-b");
const soulLine = document.getElementById("soul-line");
const soulsBtn = document.getElementById("souls-btn");
const soulsSuccess = document.getElementById("souls-success");
const soulsContinue = document.getElementById("souls-continue");
let soulsProgress = 0, soulsWon = false, soulsDecayInterval = null, lastSoulsClick = 0;

function resetSoulsGame(){
  soulsProgress = 0; soulsWon = false;
  soulsSuccess.classList.remove("visible"); soulsSuccess.textContent = "";
  soulsContinue.hidden = true; soulsContinue.classList.remove("visible");
  soulA.classList.remove("merged"); soulB.classList.remove("merged");
  updateSoulsPositions();
  if(soulsDecayInterval) clearInterval(soulsDecayInterval);
  // le rythme retombe doucement si on arrete de cliquer, pour que le jeu
  // demande un vrai petit effort regulier (mais jamais frustrant)
  soulsDecayInterval = setInterval(() => {
    if(soulsWon) return;
    if(Date.now() - lastSoulsClick > 700 && soulsProgress > 0){
      soulsProgress = Math.max(0, soulsProgress - 2.2);
      updateSoulsPositions();
    }
  }, 120);
}
function updateSoulsPositions(){
  const a = 8 + (soulsProgress / 100) * 42;
  const b = 92 - (soulsProgress / 100) * 42;
  soulA.style.left = a + "%";
  soulB.style.left = b + "%";
  soulLine.style.opacity = 1 - soulsProgress / 130;
}
soulsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if(soulsWon) return;
  playClickSound();
  lastSoulsClick = Date.now();
  soulsProgress = Math.min(100, soulsProgress + 6.5);
  updateSoulsPositions();
  vibrate(6);
  if(soulsProgress >= 100){
    soulsWon = true;
    soulA.classList.add("merged"); soulB.classList.add("merged");
    soulsSuccess.textContent = "Vos âmes se sont retrouvées 💫";
    soulsSuccess.classList.add("visible");
    for(let i=0;i<6;i++) setTimeout(() => spawnPopHeart(
      window.innerWidth/2 + (Math.random()*60-30),
      window.innerHeight/2 + (Math.random()*40-20)
    ), i*90);
    setTimeout(() => { soulsContinue.hidden = false; requestAnimationFrame(()=>soulsContinue.classList.add("visible")); }, 500);
  }
});
soulsContinue.addEventListener("click", (e) => { e.stopPropagation(); playClickSound(); histoireNext(); });

function spawnPopHeart(x, y){
  const h = document.createElement("span");
  h.className = "click-heart";
  h.textContent = "❤";
  h.style.left = x + "px"; h.style.top = y + "px";
  h.style.setProperty("--dx", "0px");
  document.body.appendChild(h);
  setTimeout(() => h.remove(), 1100);
}

// --- enveloppe + mot de passe ---
const envelope = document.getElementById("envelope");
const envelopeHint = document.getElementById("envelope-hint");
const passwordBox = document.getElementById("password-box");
const passwordInput = document.getElementById("password-input");
const passwordError = document.getElementById("password-error");
let envelopeOpened = false;

envelope.addEventListener("click", (e) => {
  e.stopPropagation();
  if(envelopeOpened) return;
  playClickSound();
  passwordBox.classList.add("visible");
  envelopeHint.style.opacity = "0";
  passwordInput.focus();
});
function tryPassword(){
  const value = digitsOnly(passwordInput.value);
  const isCorrect = ACCEPTED_PASSWORDS.some(pw => digitsOnly(pw) === value && value.length > 0);
  if(isCorrect){
    envelopeOpened = true;
    envelope.classList.add("open");
    playPaperSound();
    passwordBox.classList.remove("visible");
    passwordError.textContent = "";
    setTimeout(() => histoireNext(), 900);
  } else {
    passwordError.textContent = "Ce n'est pas ça, réessaie 🤍";
    passwordBox.classList.add("shake");
    setTimeout(() => passwordBox.classList.remove("shake"), 400);
  }
}
document.getElementById("password-submit").addEventListener("click", (e) => { e.stopPropagation(); tryPassword(); });
passwordInput.addEventListener("click", (e) => e.stopPropagation());
passwordInput.addEventListener("keydown", (e) => { if(e.key === "Enter") tryPassword(); });

// --- lettre (effet machine a ecrire) ---
let letterStarted = false;
function typeLetter(){
  if(letterStarted) return;
  letterStarted = true;
  const el = document.getElementById("letter-text");
  let i = 0;
  const speed = 20;
  function step(){
    if(i <= LETTER_TEXT.length){
      el.textContent = LETTER_TEXT.slice(0, i);
      i++;
      setTimeout(step, speed);
    } else {
      const btn = document.getElementById("histoire-end-btn");
      btn.hidden = false;
      requestAnimationFrame(() => btn.classList.add("visible"));
    }
  }
  step();
}
document.getElementById("histoire-end-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  playClickSound();
  markGiftOpened("histoire");
  showScreen("screen-hub");
});

/* ---------------------------------------------------------------------
   10) ECRAN 5 — LA SURPRISE
   --------------------------------------------------------------------- */
const sPages = Array.from(document.querySelectorAll("#surprise-experience .spage"));
let sIndex = -1;
const S_NO_AUTO = ["spage-touch","spage-cake"];

function surpriseGoTo(index){
  if(index < 0 || index >= sPages.length) return;
  sPages.forEach((p, i) => p.classList.toggle("page-active", i === index));
  sIndex = index;
  runSurprisePageLogic(sPages[index].id);
}
function surpriseNext(){ surpriseGoTo(sIndex + 1); }
function runSurprisePageLogic(id){
  if(id === "spage-cake") setupCandles();
  if(id === "spage-happy") playHappySequence();
  if(id === "spage-credits") playCreditsSequence();
}
document.getElementById("surprise-experience").addEventListener("click", (e) => {
  const page = sPages[sIndex];
  if(!page) return;
  if(S_NO_AUTO.includes(page.id)) return;
  const interactive = e.target.closest("button, input, a");
  if(interactive) return;
  surpriseNext();
});

// --- pose ton doigt : vibration + coeur qui bat ---
const touchZone = document.getElementById("touch-zone");
let touchHoldTimer = null;
let touchAdvanced = false;
function startTouchHold(){
  if(touchAdvanced) return;
  touchZone.classList.add("active");
  vibrate(15);
  touchHoldTimer = setTimeout(() => {
    touchAdvanced = true;
    vibrate([20,40,20,40,60]);
    setTimeout(surpriseNext, 700);
  }, 1400);
}
function cancelTouchHold(){
  if(touchAdvanced) return;
  clearTimeout(touchHoldTimer);
  touchZone.classList.remove("active");
}
touchZone.addEventListener("pointerdown", startTouchHold);
touchZone.addEventListener("pointerup", cancelTouchHold);
touchZone.addEventListener("pointerleave", cancelTouchHold);

// --- bougies : souffler dans le micro (avec repli si le micro est refuse) ---
let candlesSetup = false;
function setupCandles(){
  if(candlesSetup) return;
  candlesSetup = true;
  const candles = Array.from(document.querySelectorAll(".candle"));
  const instruction = document.getElementById("cake-instruction");
  const fallbackBtn = document.getElementById("blow-fallback-btn");
  let blownOut = 0;
  let finished = false;

  function blowOutNext(){
    if(finished) return;
    const remaining = candles.filter(c => !c.classList.contains("out"));
    if(remaining.length === 0) return;
    playTone(300 - blownOut*40, 0.3, "triangle", 0.04);
    remaining[0].classList.add("out");
    blownOut++;
    vibrate(10);
    if(blownOut >= candles.length){
      finished = true;
      instruction.textContent = "Bien joué ❤️";
      fallbackBtn.hidden = true;
      setTimeout(surpriseNext, 1100);
    }
  }

  // le bouton de repli apparait apres quelques secondes, au cas ou le micro
  // est refuse ou indisponible — jamais bloquant
  const fallbackTimer = setTimeout(() => { fallbackBtn.hidden = false; }, 3500);
  fallbackBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    blowOutNext(); // un clic = une bougie soufflee, on peut cliquer plusieurs fois
  });

  navigator.mediaDevices?.getUserMedia({ audio:true })
    .then(stream => {
      clearTimeout(fallbackTimer);
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastBlow = 0;

      function checkVolume(){
        if(finished){ stream.getTracks().forEach(t => t.stop()); return; }
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for(let i=0;i<data.length;i++){ const v = (data[i]-128)/128; sum += v*v; }
        const rms = Math.sqrt(sum/data.length);
        if(rms > 0.12 && Date.now() - lastBlow > 550){
          lastBlow = Date.now();
          blowOutNext();
        }
        requestAnimationFrame(checkVolume);
      }
      instruction.textContent = "souffle sur ton micro pour éteindre les bougies";
      checkVolume();
    })
    .catch(() => {
      // micro refuse ou indisponible : le bouton de repli prend le relais
      fallbackBtn.hidden = false;
    });
}

// --- joyeux anniversaire + confettis ---
let happyPlayed = false;
function playHappySequence(){
  if(happyPlayed) return;
  happyPlayed = true;
  playChime();
  vibrate([30,50,30,50,80]);
  const layer = document.getElementById("confetti-layer-2");
  const colors = ["#b76e7a","#b08968","#e7c9ce","#f3ebe0"];
  for(let i=0;i<30;i++){
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = Math.random()*100 + "%";
    piece.style.background = colors[Math.floor(Math.random()*colors.length)];
    piece.style.animationDuration = (3 + Math.random()*2.5) + "s";
    piece.style.animationDelay = (Math.random()*1.2) + "s";
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 7000);
  }
  setTimeout(surpriseNext, 4200);
}

// --- generique de fin ---
let creditsPlayed = false;
function playCreditsSequence(){
  if(creditsPlayed) return;
  creditsPlayed = true;
  setTimeout(() => document.getElementById("credits-line-1").classList.add("visible"), 500);
  setTimeout(() => document.getElementById("credits-line-2").classList.add("visible"), 2400);
  setTimeout(() => document.querySelector("#screen-surprise .signature").classList.add("visible"), 3400);
}
document.getElementById("credits-replay-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  playClickSound();
  showScreen("screen-hub");
});

// easter egg : etoile cachee
let starClicks = 0;
document.getElementById("secret-star").addEventListener("click", (e) => {
  e.stopPropagation();
  starClicks++;
  playClickSound();
  if(starClicks >= 5){
    const msg = document.getElementById("secret-message");
    msg.textContent = "Tu as trouvé l'étoile cachée… un peu comme moi j'ai trouvé la meilleure personne du monde ✨";
    msg.classList.add("visible");
  }
});

/* ---------------------------------------------------------------------
   11) PETITS DETAILS : trainee du curseur + coeurs au clic (PC uniquement)
   --------------------------------------------------------------------- */
const trail = document.getElementById("cursor-trail");
window.addEventListener("mousemove", (e) => {
  trail.classList.add("active");
  trail.style.left = e.clientX + "px";
  trail.style.top = e.clientY + "px";
});
window.addEventListener("mouseleave", () => trail.classList.remove("active"));
document.addEventListener("click", (e) => {
  if(e.target.closest("button, input, .leaf")) return;
  const heart = document.createElement("span");
  heart.className = "click-heart";
  heart.textContent = "❤";
  heart.style.left = e.clientX + "px";
  heart.style.top = e.clientY + "px";
  heart.style.setProperty("--dx", (Math.random()*40-20) + "px");
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 1100);
});
