// --- GAME DATA ---
let gameSpeed = 1; 

let heroData = {};
let enemiesData = {}; 

let player = {
    level: 1, exp: 0, expNeeded: 100, talentPoints: 0,
    gold: 0, gems: 0, currentHero: 'warrior', bonusDamage: 0,
    talents: { damage: 0, gold: 0 }, maxHealth: 100, currentHealth: 100,
    heroSkillLevels: {},
    equipment: { head: null, body: null, legs: null, weapon: null, shield: null, ring: null, amulet: null },
    inventory: [],
    attackProgress: 0, 
    attackCount: 0,
    activeEffects: [] 
};

let runStats = {
    pAtk: 0, atkSpd: 0.0, pDef: 0, mAtk: 0, mDef: 0, spd: 0, crit: 0.0, luck: 0.0, lifesteal: 0.0,
    pAtkMulti: 1.0, mAtkMulti: 1.0, pDefMulti: 1.0, mDefMulti: 1.0, atkSpdMulti: 1.0,
    goldMultiplier: 1.0, enemyHpMultiplier: 1.0,
    runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
    upgradeLevels: { p_atk: 0, m_atk: 0, spd: 0, crit: 0, lifesteal: 0, p_def: 0, m_def: 0, vitality: 0 },
    ownedItems: [],
    commonUpgradeCounts: { heal: 0, gold: 0, temp_atk: 0 }
};

// --- NEW HARDCODED SHOP UPGRADES ---
const SHOP_DATA = {
    common: [
        { id: 'heal', name: 'Healing Salve', icon: '🧪', desc: 'Heal 25% of Max HP', type: 'consumable' },
        { id: 'gold', name: 'Bounty', icon: '💰', desc: 'Gain 50 Gold instantly', type: 'consumable' },
        { id: 'temp_atk', name: 'Whetstone', icon: '🗡️', desc: '+5 Base Attack', type: 'consumable' }
    ],
    uncommon: [
        { id: 'p_atk', name: 'Strength', icon: '💪', desc: '+15 Physical Attack', type: 'stat' },
        { id: 'm_atk', name: 'Intelligence', icon: '🧠', desc: '+15 Magic Attack', type: 'stat' },
        { id: 'p_def', name: 'Iron Plating', icon: '🛡️', desc: '+10 Physical Defense', type: 'stat' },
        { id: 'm_def', name: 'Mystic Ward', icon: '🔮', desc: '+10 Magic Defense', type: 'stat' },
        { id: 'vitality', name: 'Vitality', icon: '❤️', desc: '+30 Max HP', type: 'stat' },
        { id: 'spd', name: 'Agility', icon: '⚡', desc: '+0.05 Attack Speed', type: 'stat' },
        { id: 'crit', name: 'Precision', icon: '🎯', desc: '+5% Crit Chance', type: 'stat' },
        { id: 'lifesteal', name: 'Leech', icon: '🦇', desc: '+2% Lifesteal', type: 'stat' }
    ],
    rare: [
        { id: 'venom_strike', name: 'Venom Strike', icon: '🐍', desc: '10% chance to Poison (5s) on hit.' },
        { id: 'scorching_blade', name: 'Scorching Blade', icon: '🔥', desc: '10% chance to Burn (5s) on hit.' },
        { id: 'sunder', name: 'Sunder', icon: '🔨', desc: '10% chance to make target Vulnerable (3s) on hit.' },
        { id: 'frost_guard', name: 'Frost Guard', icon: '❄️', desc: '15% chance when hit to Slow attacker (3s).' },
        { id: 'thornmail', name: 'Thornmail', icon: '🌵', desc: 'Reflect 15% of incoming damage permanently.' },
        { id: 'focus_ring', name: 'Focus Ring', icon: '💍', desc: 'Every 5th attack is a guaranteed Critical Hit.' }
    ],
    ultimate: [
        { id: 'sadism', name: 'Sadism', icon: '😈', desc: 'While an enemy has Poison/Burn/Bleed, gain 50% Speed.', req: ['venom_strike', 'scorching_blade'] },
        { id: 'executioner', name: 'Executioner', icon: '🪓', desc: 'Critical Hits apply Doom (10s).', reqLvl: { id: 'crit', lvl: 3 } },
        { id: 'paladin_resolve', name: 'Holy Resolve', icon: '🛡️', desc: 'Healing while at Max HP grants a Barrier (3s).' },
        { id: 'blood_magic', name: 'Blood Magic', icon: '🩸', desc: 'M.Atk heals for 10% of damage. P.Def becomes 0.' },
        { id: 'time_dilation', name: 'Time Dilation', icon: '⏳', desc: 'Applying a status to an enemy grants you Haste (3s).' }
    ]
};

let bossSkillsData = [];
let cursedRelicsData = [];

let viewingHero = null;
let activeEnemies = [];
let waveManager = { wave: 1, isUpgrading: false, normalEmojis: ['👾', '🧟', '🦇', '💀', '🕷️', '🦂'], bossEmojis: ['🐉', '👹', '🦑', '🦖'] };

let combatTickInterval;
let isTestMode = false;

// --- UTILITY LOGIC ---
const screens = ['home', 'heroes', 'gear', 'talents', 'shop', 'game'];

function showNotification(msg) {
    let el = document.getElementById('in-app-notification');
    if(!el) return; el.innerText = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

function openMenu(targetScreen) {
    if(targetScreen !== 'game') { clearInterval(combatTickInterval); }
    if(targetScreen === 'heroes') { viewingHero = null; renderHeroSelection(); }
    if(targetScreen === 'gear') { renderGearMenu(); }
    screens.forEach(s => document.getElementById('screen-' + s).classList.remove('active'));
    document.getElementById('screen-' + targetScreen).classList.add('active');
    if(targetScreen !== 'game') {
        document.getElementById('bottom-nav-bar').style.display = 'flex';
        screens.forEach(s => { if(document.getElementById('btn-' + s)) document.getElementById('btn-' + s).classList.remove('active'); });
        document.getElementById('btn-' + targetScreen).classList.add('active');
    } else { document.getElementById('bottom-nav-bar').style.display = 'none'; }
}

let secretGemClickCount = 0; let secretGemClickTimer = null;
function checkSecretCheat() {
    secretGemClickCount++; clearTimeout(secretGemClickTimer);
    if (secretGemClickCount >= 10) { player.gems += 10000; updateUI(); showNotification("🛠️ DEV MODE: +10,000 Gems Added!"); secretGemClickCount = 0; } 
    else { secretGemClickTimer = setTimeout(() => { secretGemClickCount = 0; }, 1000); }
}

function renderHeroSelection() { /* Unchanged from your base code */ }
function renderHeroList() { /* Unchanged */ }
function renderHeroDetails(heroId) { /* Unchanged */ }
function upgradeHeroSkill(heroId) { /* Unchanged */ }
function setActiveHero(heroId) { /* Unchanged */ }
function upgradeTalent(type) { /* Unchanged */ }
function renderGearMenu() { /* Unchanged */ }
function showGearModal(item, source, key) { /* Unchanged */ }
function equipItem(invIndex, slot) { /* Unchanged */ }
function unequipItem(slot) { /* Unchanged */ }
function generateRandomEquipment() { /* Unchanged */ return { name: "Test Gear", type: 'head', slot: 'head', icon: '🪖', stats: {pDef: 5} }; }
function updateGearStatsPanel() { /* Unchanged */ }
function buyPremium(item) { /* Unchanged */ }
function toggleGameSpeed() { gameSpeed = gameSpeed === 1 ? 2 : 1; document.getElementById('speed-toggle-btn').innerText = gameSpeed === 1 ? '▶️ x1' : '⏩ x2'; }

// --- HYBRID STATUS ENGINE ---
function applyStatus(unit, type, value, isCharge = false) {
    if (!unit.activeEffects) unit.activeEffects = [];
    let existing = unit.activeEffects.find(eff => eff.type === type);
    
    if (existing) { if (isCharge) existing.charges = value; else existing.duration = value; } 
    else {
        if (isCharge) unit.activeEffects.push({ type: type, charges: value, maxCharges: value });
        else unit.activeEffects.push({ type: type, duration: value, maxDuration: value, tickTimer: 0 });
    }
    
    // Synergies: Time Dilation
    if (hasOwnedItem('time_dilation') && unit !== player) applyStatus(player, 'haste', 3000);
    renderStatusEffects();
}

function hasStatus(unit, type) { return unit.activeEffects && unit.activeEffects.some(eff => eff.type === type); }
function consumeCharge(unit, type) {
    if (!unit.activeEffects) return false;
    let idx = unit.activeEffects.findIndex(eff => eff.type === type && eff.charges !== undefined);
    if (idx !== -1) {
        unit.activeEffects[idx].charges--; let result = true;
        if (unit.activeEffects[idx].charges <= 0) { unit.activeEffects.splice(idx, 1); }
        renderStatusEffects(); return result;
    }
    return false;
}

function applyHeal(unit, amount) {
    if (hasStatus(unit, 'decay')) {
        if (unit === player) {
            player.currentHealth -= amount; updatePlayerHealthBar(); spawnFloatingText('player-combat-area', "DECAY -" + amount, "float-enemy-dmg");
            if (player.currentHealth <= 0) triggerGameOver("Rotted away from Decay");
        } else {
            unit.hp -= amount; animateHit(unit.id, amount, false); spawnFloatingText(`enemy-${unit.id}`, "DECAY!", "float-enemy-dmg");
        }
    } else {
        if (unit === player) {
            if (hasOwnedItem('paladin_resolve') && player.currentHealth >= player.maxHealth) applyStatus(player, 'barrier', 3000);
            player.currentHealth = Math.min(player.maxHealth, player.currentHealth + amount);
            updatePlayerHealthBar(); spawnFloatingText('player-combat-area', "+" + amount, "float-heal");
        } else {
            unit.hp = Math.min(unit.maxHp, unit.hp + amount);
            let hpBarDiv = document.getElementById(`enemy-hp-bar-${unit.id}`); let hpTextDiv = document.getElementById(`enemy-hp-text-${unit.id}`);
            if (hpBarDiv) hpBarDiv.style.width = (unit.hp / unit.maxHp) * 100 + '%';
            if (hpTextDiv) hpTextDiv.innerText = `${Math.ceil(unit.hp)}/${unit.maxHp}`;
            spawnFloatingText(`enemy-${unit.id}`, "+" + amount, "float-heal");
        }
    }
}

function processTimeEffects(unit) {
    if (!unit || !unit.activeEffects) return;
    let uiChanged = false;
    for (let i = unit.activeEffects.length - 1; i >= 0; i--) {
        let eff = unit.activeEffects[i];
        if (eff.duration !== undefined) {
            let oldSec = Math.ceil(eff.duration / 1000); 
            eff.duration -= (50 * gameSpeed);
            let newSec = Math.ceil(eff.duration / 1000); 
            eff.tickTimer = (eff.tickTimer || 0) + (50 * gameSpeed);
            
            if (eff.tickTimer >= 1000) {
                eff.tickTimer = 0; let maxH = unit.maxHealth || unit.maxHp;
                if (eff.type === 'poison') {
                    let dmg = Math.max(1, Math.floor(maxH * 0.05));
                    if (unit === player) {
                        player.currentHealth -= dmg; updatePlayerHealthBar(); spawnFloatingText('player-combat-area', "POISON -" + dmg, "float-enemy-dmg");
                        if (player.currentHealth <= 0) triggerGameOver("Succumbed to poison");
                    } else { unit.hp -= dmg; animateHit(unit.id, dmg, false); }
                } 
                else if (eff.type === 'burn') {
                    let dmg = Math.max(1, Math.floor(maxH * 0.08));
                    if (unit === player) {
                        player.currentHealth -= dmg; updatePlayerHealthBar(); spawnFloatingText('player-combat-area', "BURN -" + dmg, "float-enemy-dmg");
                        if (player.currentHealth <= 0) triggerGameOver("Burnt to a crisp");
                    } else { unit.hp -= dmg; animateHit(unit.id, dmg, false); }
                }
                else if (eff.type === 'regen') { applyHeal(unit, Math.max(1, Math.floor(maxH * 0.05))); }
            }

            if (eff.duration <= 0) {
                if (eff.type === 'doom') {
                    if (unit === player) {
                        player.currentHealth = 0; updatePlayerHealthBar(); spawnFloatingText('player-combat-area', "DOOMED!", "float-enemy-dmg");
                        triggerGameOver("Erased from existence by Doom");
                    } else { unit.hp = 0; animateHit(unit.id, 9999, false); spawnFloatingText(`enemy-${unit.id}`, "DOOMED!", "float-crit"); }
                }
                unit.activeEffects.splice(i, 1); uiChanged = true;
            } else if (oldSec !== newSec) { uiChanged = true; }
        }
    }
    if (uiChanged) renderStatusEffects();
}

function createStatusHtml(eff, mini = false) {
    let text = ""; let iconClass = "buff"; let emoji = "✨";
    if (eff.type === 'stun') { text = "Stun"; iconClass = "debuff"; emoji = "💫"; }
    else if (eff.type === 'poison') { text = "Poison"; iconClass = "debuff"; emoji = "☠️"; }
    else if (eff.type === 'burn') { text = "Burn"; iconClass = "debuff"; emoji = "🔥"; }
    else if (eff.type === 'bleed') { text = "Bleed"; iconClass = "debuff"; emoji = "🩸"; }
    else if (eff.type === 'decay') { text = "Decay"; iconClass = "debuff"; emoji = "🧟"; }
    else if (eff.type === 'slow') { text = "Slow"; iconClass = "debuff"; emoji = "🐢"; }
    else if (eff.type === 'haste') { text = "Haste"; iconClass = "buff"; emoji = "⚡"; }
    else if (eff.type === 'blind') { text = "Blind"; iconClass = "debuff"; emoji = "👁️‍🗨️"; }
    else if (eff.type === 'empower') { text = "Empower"; iconClass = "buff"; emoji = "🔥"; }
    else if (eff.type === 'vulnerable') { text = "Vuln"; iconClass = "debuff"; emoji = "💔"; }
    else if (eff.type === 'barrier') { text = "Barrier"; iconClass = "buff"; emoji = "🛡️"; }
    else if (eff.type === 'regen') { text = "Regen"; iconClass = "buff"; emoji = "💖"; }
    else if (eff.type === 'thorns') { text = "Thorns"; iconClass = "buff"; emoji = "🌵"; }
    else if (eff.type === 'berserk') { text = "Berserk"; iconClass = "buff"; emoji = "😡"; } 
    else if (eff.type === 'block') { text = "Block"; iconClass = "buff"; emoji = "🛡️"; }
    else if (eff.type === 'focused') { text = "Focus"; iconClass = "buff"; emoji = "👁️"; }
    else if (eff.type === 'marked') { text = "Marked"; iconClass = "debuff"; emoji = "🎯"; }
    else if (eff.type === 'doom') { text = "Doom"; iconClass = "debuff"; emoji = "⏳"; }

    let durText = eff.duration !== undefined ? Math.ceil(eff.duration/1000) + "s" : eff.charges + "x";
    if (mini) return `<div title="${text} (${durText})" style="font-size:0.9rem;">${emoji} ${durText}</div>`;
    return `<div class="status-icon ${iconClass}">${emoji} ${text} (${durText})</div>`;
}

function renderStatusEffects() {
    let pCont = document.getElementById('player-status-effects');
    if (pCont) {
        pCont.innerHTML = '';
        if (activeEnemies && activeEnemies.find(e => e.hp > 0 && e.skill === 'intimidate_revive')) pCont.innerHTML += `<div class="status-icon debuff" title="Intimidated">💀 Intimidated</div>`;
        if (player.activeEffects) player.activeEffects.forEach(eff => { pCont.innerHTML += createStatusHtml(eff); });
    }
    activeEnemies.forEach(e => {
        let eCont = document.getElementById(`enemy-status-${e.id}`);
        if (eCont) {
            eCont.innerHTML = '';
            if (e.activeEffects) e.activeEffects.forEach(eff => { eCont.innerHTML += createStatusHtml(eff, true); });
        }
    });
}

function debugApply(type, targetStr) {
    if (!isTestMode) return;
    let target = (targetStr === 'player') ? player : activeEnemies[0];
    if (!target || target.hp <= 0 && target !== player) return;
    if (type === 'stun') applyStatus(target, 'stun', 3000); 
    else if (type === 'poison') applyStatus(target, 'poison', 5000); 
    else if (type === 'burn') applyStatus(target, 'burn', 5000); 
    else if (type === 'bleed') applyStatus(target, 'bleed', 5000); 
    else if (type === 'decay') applyStatus(target, 'decay', 5000); 
    else if (type === 'regen') applyStatus(target, 'regen', 5000);
    else if (type === 'haste') applyStatus(target, 'haste', 5000); 
    else if (type === 'slow') applyStatus(target, 'slow', 5000); 
    else if (type === 'vulnerable') applyStatus(target, 'vulnerable', 5000); 
    else if (type === 'barrier') applyStatus(target, 'barrier', 5000); 
    else if (type === 'thorns') applyStatus(target, 'thorns', 5000); 
    else if (type === 'berserk') applyStatus(target, 'berserk', 5000); 
    else if (type === 'doom') applyStatus(target, 'doom', 10000); 
    else if (type === 'blind') applyStatus(target, 'blind', 1, true); 
    else if (type === 'empower') applyStatus(target, 'empower', 1, true); 
    else if (type === 'block') applyStatus(target, 'block', 1, true); 
    else if (type === 'focused') applyStatus(target, 'focused', 1, true); 
    else if (type === 'marked') applyStatus(target, 'marked', 1, true); 
    updateCombatStatsPanel();
}

// --- COMBAT CORE & MATH ENGINE ---
function getEquipmentStats() {
    let eqStats = { pAtk: 0, mAtk: 0, pDef: 0, mDef: 0, atkSpd: 0, spd: 0, evasion: 0, crit: 0, luck: 0 };
    for (let slot in player.equipment) {
        let item = player.equipment[slot];
        if (item && item.stats) { for (let key in eqStats) { if (item.stats[key]) eqStats[key] += item.stats[key]; } }
    }
    return eqStats;
}

function hasOwnedItem(id) { return runStats.ownedItems.includes(id); }

function getPlayerStats() {
    if (!heroData || !heroData[player.currentHero]) return { pAtk:1, mAtk:1, pDef:0, mDef:0, atkSpd:1, spd:1, evasion:0, crit:0, luck:0 };
    let hero = heroData[player.currentHero]; let eq = getEquipmentStats();

    let stats = {
        pAtk: Math.floor((hero.pAtk + runStats.pAtk + eq.pAtk) * runStats.pAtkMulti),
        mAtk: Math.floor((hero.mAtk + runStats.mAtk + eq.mAtk) * runStats.mAtkMulti),
        pDef: Math.floor((hero.pDef + runStats.pDef + eq.pDef) * runStats.pDefMulti),
        mDef: Math.floor((hero.mDef + runStats.mDef + eq.mDef) * runStats.mDefMulti),
        atkSpd: (hero.atkSpd + runStats.atkSpd + eq.atkSpd) * runStats.atkSpdMulti,
        spd: hero.spd + runStats.spd + eq.spd,
        crit: hero.crit + runStats.crit + eq.crit,
        luck: hero.luck + runStats.luck + eq.luck,
        evasion: 0
    };

    if (activeEnemies && activeEnemies.find(e => e.hp > 0 && e.skill === 'intimidate_revive')) {
        stats.pAtk = Math.floor(stats.pAtk * 0.75); stats.mAtk = Math.floor(stats.mAtk * 0.75); stats.atkSpd = stats.atkSpd * 0.75;
    }
    
    if (hasStatus(player, 'haste')) stats.atkSpd *= 1.5;
    if (hasStatus(player, 'slow')) stats.atkSpd *= 0.5;
    if (hasStatus(player, 'berserk') || hasOwnedItem('blood_magic')) { stats.pDef = 0; stats.mDef = 0; }

    // Synergy: Sadism
    if (hasOwnedItem('sadism')) {
        let dotEnemy = activeEnemies.find(e => e.hp > 0 && !e.isDead && (hasStatus(e, 'poison') || hasStatus(e, 'burn') || hasStatus(e, 'bleed')));
        if (dotEnemy) stats.atkSpd *= 1.5; 
    }

    return stats;
}

function getTotalDamage() {
    let stats = getPlayerStats(); let baseP = stats.pAtk; let baseM = stats.mAtk;
    baseP = Math.floor(baseP * (1 + (player.talents.damage * 0.10))); baseM = Math.floor(baseM * (1 + (player.talents.damage * 0.10)));
    baseP += player.bonusDamage; return { pDmg: baseP, mDmg: baseM };
}

function addCurrency(type, amount) {
    if (amount <= 0) return;
    if (type === 'gold') { player.gold += amount; runStats.goldGained += amount; spawnFloatingText('gold-container', `+${amount}`, 'float-gold'); } 
    else if (type === 'gem') { player.gems += amount; runStats.gemsGained += amount; spawnFloatingText('gem-container', `+${amount}`, 'float-gem'); }
    updateUI();
}

function updateCombatStatsPanel() {
    let panel = document.getElementById('combat-stats-panel');
    let stats = getPlayerStats(); let d = getTotalDamage();

    panel.innerHTML = `
        <div class="combat-stats-icon" id="player-combat-icon">${heroData[player.currentHero] ? heroData[player.currentHero].emoji : '🧑'}</div>
        <div>
            <p>⚔️ ${d.pDmg} P / ${d.mDmg} M</p>
            <p>⏱️ ${stats.atkSpd.toFixed(2)}/s Atk</p>
            <p>🎯 ${Math.round(stats.crit * 100)}% Crit</p>
        </div>
        <div>
            <p>🛡️ ${stats.pDef} P / ${stats.mDef} M</p>
            <p>🦇 ${Math.round(runStats.lifesteal * 100)}% L.Steal</p>
            <p>🍀 ${Math.round(stats.luck * 100)}% Lck</p>
        </div>
    `;
    document.getElementById('run-runes-text').innerText = runStats.runes;
}

function playBattleStartAnimation() {
    let overlay = document.getElementById('battle-start-overlay');
    let swords = document.getElementById('crossed-swords');
    if(overlay && swords) {
        overlay.style.display = 'flex'; swords.classList.remove('animate-swords');
        void swords.offsetWidth; swords.classList.add('animate-swords');
        setTimeout(() => { overlay.style.display = 'none'; }, 1000);
    }
}

function spawnFloatingText(targetId, text, className) {
    let targetDiv = document.getElementById(targetId); if(!targetDiv) return;
    let ft = document.createElement('div'); ft.className = `floating-text ${className}`; ft.innerText = text;
    let offsetX = (Math.random() * 40) - 20; ft.style.left = `calc(50% + ${offsetX}px)`; ft.style.top = '10px';
    targetDiv.appendChild(ft); setTimeout(() => { if(ft.parentElement) ft.remove(); }, 1500);
}

function spawnLootDrop(targetId, type) {
    let targetDiv = document.getElementById(targetId); if(!targetDiv) return;
    let emoji = type === 'rune' ? '🌀' : '🪙'; let ft = document.createElement('div');
    ft.className = 'loot-drop'; ft.innerText = emoji; let dirX = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random());
    ft.style.setProperty('--dirX', dirX); ft.style.left = '50%'; ft.style.top = '30%';
    targetDiv.appendChild(ft); setTimeout(() => { if(ft.parentElement) ft.remove(); }, 1500);
}

// --- ATB LOOP ENGINE ---
function startCombatLoop() { clearInterval(combatTickInterval); combatTickInterval = setInterval(combatTick, 50); }

function combatTick() {
    if(!document.getElementById('screen-game').classList.contains('active') || player.currentHealth <= 0 || waveManager.isUpgrading) return;

    processTimeEffects(player);
    let aliveEnemies = activeEnemies.filter(e => e.hp > 0 && !e.isDead);
    aliveEnemies.forEach(e => processTimeEffects(e));
    aliveEnemies = activeEnemies.filter(e => e.hp > 0 && !e.isDead);

    let stats = getPlayerStats(); let actionQueue = []; 

    if (!hasStatus(player, 'stun')) {
        player.attackProgress += (Math.max(0.1, stats.atkSpd) * gameSpeed * 2.5);
        if (player.attackProgress >= 100) { player.attackProgress = 100; actionQueue.push({ type: 'player', spd: stats.spd }); }
    } 
    let pAtb = document.getElementById('player-atb'); if(pAtb) pAtb.style.width = Math.max(0, Math.min(100, player.attackProgress)) + '%';

    aliveEnemies.forEach(e => {
        if (!hasStatus(e, 'stun')) {
            let eAtkSpd = e.atkSpd || 1.0;
            if (hasStatus(e, 'haste')) eAtkSpd *= 1.5;
            if (hasStatus(e, 'slow')) eAtkSpd *= 0.5;

            e.attackProgress += (eAtkSpd * gameSpeed * 2.5);
            if (e.attackProgress >= 100) { e.attackProgress = 100; actionQueue.push({ type: 'enemy', entity: e, spd: e.spd }); }
        }
        let atbBar = document.getElementById(`enemy-atb-bar-${e.id}`);
        if (atbBar) atbBar.style.width = Math.max(0, Math.min(100, e.attackProgress)) + '%';
    });

    if (actionQueue.length > 0) {
        actionQueue.sort((a, b) => b.spd - a.spd); 
        actionQueue.forEach(action => {
            if (action.type === 'player' && player.attackProgress >= 100 && player.currentHealth > 0) {
                executePlayerAttack(); player.attackProgress = 0; if(pAtb) pAtb.style.width = '0%';
            } else if (action.type === 'enemy' && action.entity.hp > 0 && action.entity.attackProgress >= 100 && player.currentHealth > 0) {
                executeEnemyAttack(action.entity); action.entity.attackProgress = 0;
                let atbBar = document.getElementById(`enemy-atb-bar-${action.entity.id}`); if (atbBar) atbBar.style.width = '0%';
            }
        });
    }
}

// --- NEW TEST BATTLE MODE ---
function startTestBattle() {
    isTestMode = true; player.activeEffects = []; player.attackCount = 0;
    runStats = {
        pAtk: 0, atkSpd: 0.0, pDef: 0, mAtk: 0, mDef: 0, spd: 0, crit: 0.0, luck: 0.0, lifesteal: 0.0,
        pAtkMulti: 1.0, mAtkMulti: 1.0, pDefMulti: 1.0, mDefMulti: 1.0, atkSpdMulti: 1.0,
        goldMultiplier: 1.0, enemyHpMultiplier: 1.0, runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
        upgradeLevels: { p_atk: 0, m_atk: 0, spd: 0, crit: 0, lifesteal: 0, p_def: 0, m_def: 0, vitality: 0 },
        ownedItems: [], commonUpgradeCounts: { heal: 0, gold: 0, temp_atk: 0 }
    };
    waveManager.wave = 1; player.currentHealth = player.maxHealth;
    document.getElementById('run-summary-ui').style.display = 'none'; document.getElementById('wave-upgrade-ui').style.display = 'none'; document.getElementById('boss-clear-ui').style.display = 'none';
    document.getElementById('debug-panel').style.display = 'flex'; waveManager.isUpgrading = true; 
    updateCombatStatsPanel(); openMenu('game');

    let container = document.getElementById('enemy-container'); let textEl = document.getElementById('level-wave-text');
    container.innerHTML = ''; activeEnemies = [];
    textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[TRAINING GROUND]</span><br><span style="color:#9b59b6; text-shadow: 0 0 10px #9b59b6;">⚠️ TARGET DUMMY ⚠️</span>`;

    let dummyHp = 9999;
    let dummy = { id: 0, maxHp: dummyHp, hp: dummyHp, damage: 0, pDef: 9999, mDef: 9999, skill: 'dummy', attackProgress: 0, activeEffects: [], isDead: false, isBoss: true, spd: 1, atkSpd: 0.1, name: "Training Dummy" };
    activeEnemies.push(dummy);

    container.innerHTML = `
        <div class="enemy-unit boss" id="enemy-0">
            <div class="emoji" style="font-size: 5rem;">🎯</div>
            <div class="enemy-name" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 4px;">Training Dummy</div>
            <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-0"></div></div>
            <div class="mini-bar-container" style="height: 6px; margin-top: 2px;"><div class="mini-bar-fill" id="enemy-atb-bar-0" style="background: #f1c40f; width: 0%; transition: none;"></div></div>
            <div class="mini-hp-text" id="enemy-hp-text-0">${dummyHp}/${dummyHp}</div>
            <div id="enemy-status-0" style="display:flex; justify-content:center; gap:2px; margin-top:2px; height:15px; color: white;"></div>
            <div class="boss-skill-badge" title="Immune to most damage">🛡️ 9999 DEF/MDEF</div>
        </div>`;

    player.attackProgress = 95; dummy.attackProgress = 0; let pAtb = document.getElementById('player-atb'); if(pAtb) pAtb.style.width = '95%';
    renderStatusEffects(); playBattleStartAnimation();
    setTimeout(() => { waveManager.isUpgrading = false; startCombatLoop(); }, 1500); 
}

function startGame() {
    if (!heroData || Object.keys(heroData).length === 0) { alert("ERROR: Game data failed to load."); return; }
    isTestMode = false; document.getElementById('debug-panel').style.display = 'none'; player.activeEffects = []; player.attackCount = 0;
    runStats = {
        pAtk: 0, atkSpd: 0.0, pDef: 0, mAtk: 0, mDef: 0, spd: 0, crit: 0.0, luck: 0.0, lifesteal: 0.0,
        pAtkMulti: 1.0, mAtkMulti: 1.0, pDefMulti: 1.0, mDefMulti: 1.0, atkSpdMulti: 1.0,
        goldMultiplier: 1.0, enemyHpMultiplier: 1.0, runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
        upgradeLevels: { p_atk: 0, m_atk: 0, spd: 0, crit: 0, lifesteal: 0, p_def: 0, m_def: 0, vitality: 0 },
        ownedItems: [], commonUpgradeCounts: { heal: 0, gold: 0, temp_atk: 0 }
    };
    waveManager.wave = 1; player.currentHealth = player.maxHealth;
    document.getElementById('run-summary-ui').style.display = 'none'; document.getElementById('wave-upgrade-ui').style.display = 'none'; document.getElementById('boss-clear-ui').style.display = 'none';
    waveManager.isUpgrading = true; updateCombatStatsPanel(); openMenu('game');
    spawnEnemyPack(); playBattleStartAnimation();
    setTimeout(() => { waveManager.isUpgrading = false; startCombatLoop(); }, 1500); 
}

function spawnEnemyPack() {
    let container = document.getElementById('enemy-container'); let textEl = document.getElementById('level-wave-text');
    container.innerHTML = ''; activeEnemies = []; let stageInfo = getLevelAndWave();

    if (stageInfo.isBiomeBoss) {
        let bossHp = Math.floor((300 + (waveManager.wave * 35)) * runStats.enemyHpMultiplier);
        let bossDmg = 10 + Math.floor(waveManager.wave * 1.5);
        let bSkill = { id: stageInfo.biome.skill, name: stageInfo.biome.bossName, icon: '👑', desc: 'Unique Biome Boss' };
        activeEnemies.push({ id: 0, name: stageInfo.biome.bossName, maxHp: bossHp, hp: bossHp, damage: bossDmg, skill: bSkill.id, attackProgress: 0, activeEffects: [], isDead: false, isBoss: true, isBiomeBoss: true });

        if (stageInfo.biome.skill === 'leviathan_spawns') {
            for(let i=1; i<=4; i++) {
                let spawnHp = Math.floor(bossHp * 0.2); let spawnDmg = Math.floor(bossDmg * 0.5);
                activeEnemies.push({ id: i, name: "Leviathan Spawn", maxHp: spawnHp, hp: spawnHp, damage: spawnDmg, skill: 'magic', attackProgress: 0, activeEffects: [], isDead: false, isBoss: false });
            }
        }
        textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[${stageInfo.biome.name.toUpperCase()}]</span><br><span style="color:#e74c3c; text-shadow: 0 0 10px #e74c3c;">⚠️ BIOME BOSS ⚠️</span>`;
        let html = `
            <div class="enemy-unit boss" id="enemy-0">
                <div class="emoji" style="font-size: 4rem;">${stageInfo.biome.bossEmoji}</div>
                <div class="enemy-name" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 4px;">${stageInfo.biome.bossName}</div>
                <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-0"></div></div>
                <div class="mini-bar-container" style="height: 6px; margin-top: 2px;"><div class="mini-bar-fill" id="enemy-atb-bar-0" style="background: #f1c40f; width: 0%; transition: none;"></div></div>
                <div class="mini-hp-text" id="enemy-hp-text-0">${bossHp}/${bossHp}</div>
                <div id="enemy-status-0" style="display:flex; justify-content:center; gap:2px; margin-top:2px; height:15px; color: white;"></div>
                <div class="boss-skill-badge" title="${bSkill.desc}">${bSkill.icon} ${bSkill.name}</div>
            </div>`;
        if (stageInfo.biome.skill === 'leviathan_spawns') {
            for(let i=1; i<=4; i++) {
                html += `
                <div class="enemy-unit elite" id="enemy-${i}">
                    <div class="emoji">🦑</div>
                    <div class="enemy-name" style="font-size: 0.8rem; font-weight: bold; margin-bottom: 2px;">Leviathan Spawn</div>
                    <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-${i}"></div></div>
                    <div class="mini-bar-container" style="height: 4px; margin-top: 2px;"><div class="mini-bar-fill" id="enemy-atb-bar-${i}" style="background: #f1c40f; width: 0%; transition: none;"></div></div>
                    <div class="mini-hp-text" id="enemy-hp-text-${i}">${activeEnemies[i].hp}/${activeEnemies[i].hp}</div>
                    <div id="enemy-status-${i}" style="display:flex; justify-content:center; gap:2px; margin-top:2px; height:15px; color: white;"></div>
                </div>`;
            }
        }
        container.innerHTML = html;
    } else if (stageInfo.isBoss) {
        let bossHp = Math.floor((150 + (waveManager.wave * 25)) * runStats.enemyHpMultiplier);
        let bossDmg = 5 + Math.floor(waveManager.wave * 1.2);
        let bSkill = bossSkillsData && bossSkillsData.length > 0 ? bossSkillsData[Math.floor(Math.random() * bossSkillsData.length)] : {id: 'none', name: 'No Skill', icon: '❓', desc: ''};
        activeEnemies.push({ id: 0, name: "Level Boss", maxHp: bossHp, hp: bossHp, damage: bossDmg, skill: bSkill.id, attackProgress: 0, activeEffects: [], isDead: false, isBoss: true });
        textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[${stageInfo.biome.name.toUpperCase()}]</span><br><span style="color:#e74c3c; text-shadow: 0 0 10px #e74c3c;">⚠️ BOSS Level ${stageInfo.level} - Wave ${stageInfo.wave} ⚠️</span>`;
        container.innerHTML = `
            <div class="enemy-unit boss" id="enemy-0">
                <div class="emoji">${waveManager.bossEmojis[Math.floor(Math.random() * waveManager.bossEmojis.length)]}</div>
                <div class="enemy-name" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 4px;">Level Boss</div>
                <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-0"></div></div>
                <div class="mini-bar-container" style="height: 6px; margin-top: 2px;"><div class="mini-bar-fill" id="enemy-atb-bar-0" style="background: #f1c40f; width: 0%; transition: none;"></div></div>
                <div class="mini-hp-text" id="enemy-hp-text-0">${bossHp}/${bossHp}</div>
                <div id="enemy-status-0" style="display:flex; justify-content:center; gap:2px; margin-top:2px; height:15px; color: white;"></div>
                <div class="boss-skill-badge" title="${bSkill.desc}">${bSkill.icon} ${bSkill.name}</div>
            </div>`;
    } else {
        let enemyCount = Math.min(5, Math.floor(((waveManager.wave - 1) % 15) / 3) + 1);
        let biomeEnemies = enemiesData[stageInfo.biome.id];
        if (!biomeEnemies || biomeEnemies.length === 0) { biomeEnemies = [{ id: 'error_slime', name: 'Slime', emoji: '👾', baseHp: 20, baseDmg: 2, skill: null }]; }
        textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[${stageInfo.biome.name.toUpperCase()}]</span><br>Level ${stageInfo.level} - Wave ${stageInfo.wave}`;

        for(let i = 0; i < enemyCount; i++) {
            let isElite = Math.random() < 0.20;
            let enemyTemplate = biomeEnemies[Math.floor(Math.random() * biomeEnemies.length)];
            let normHp = Math.floor((enemyTemplate.baseHp + (waveManager.wave * 15)) * runStats.enemyHpMultiplier);
            let normDmg = Math.max(1, Math.floor(enemyTemplate.baseDmg + (waveManager.wave * 0.8)));
            let finalHp = isElite ? normHp * 2 : normHp; let finalDmg = isElite ? normDmg * 2 : normDmg;
            let eliteClass = isElite ? 'elite' : ''; let eName = (isElite ? 'Elite ' : '') + enemyTemplate.name; 

            activeEnemies.push({ id: i, name: eName, maxHp: finalHp, hp: finalHp, damage: finalDmg, skill: enemyTemplate.skill, attackProgress: 0, activeEffects: [], isDead: false, isBoss: false, isElite: isElite });
            
            container.innerHTML += `
                <div class="enemy-unit ${eliteClass}" id="enemy-${i}">
                    <div class="emoji">${enemyTemplate.emoji}</div>
                    <div class="enemy-name" style="font-size: 0.8rem; font-weight: bold; margin-bottom: 2px;">${eName}</div>
                    <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-${i}"></div></div>
                    <div class="mini-bar-container" style="height: 4px; margin-top: 2px;"><div class="mini-bar-fill" id="enemy-atb-bar-${i}" style="background: #f1c40f; width: 0%; transition: none;"></div></div>
                    <div class="mini-hp-text" id="enemy-hp-text-${i}">${finalHp}/${finalHp}</div>
                    <div id="enemy-status-${i}" style="display:flex; justify-content:center; gap:2px; margin-top:2px; height:15px; color: white;"></div>
                </div>`;
        }
    }
    
    let pStats = getPlayerStats(); let combatants = [];
    combatants.push({ type: 'player', spd: pStats.spd, atkSpd: Math.max(0.1, pStats.atkSpd), ref: player });

    activeEnemies.forEach(e => {
        e.spd = e.spd || (e.isBoss ? 15 : (e.isElite ? 12 : 10)); 
        e.atkSpd = e.atkSpd || (e.isBoss ? 1.2 : 1.0); 
        combatants.push({ type: 'enemy', spd: e.spd, atkSpd: e.atkSpd, ref: e });
    });

    combatants.sort((a, b) => b.spd - a.spd);
    combatants.forEach((c, index) => {
        let progressPerTick = c.atkSpd * gameSpeed * 2.5; let staggerTicks = index * 10; 
        let initialProgress = 100 - (staggerTicks * progressPerTick);

        if (c.type === 'player') { player.attackProgress = initialProgress; let pAtb = document.getElementById('player-atb'); if(pAtb) pAtb.style.width = Math.max(0, Math.min(100, player.attackProgress)) + '%'; } 
        else { c.ref.attackProgress = initialProgress; let atbBar = document.getElementById(`enemy-atb-bar-${c.ref.id}`); if (atbBar) atbBar.style.width = Math.max(0, Math.min(100, c.ref.attackProgress)) + '%'; }
    });
    renderStatusEffects(); 
}

function handleEnemyDeath(target, unitId, unitDiv) {
    if (target.skill === 'intimidate_revive' && !target.hasRevived) {
        target.hasRevived = true; target.hp = Math.floor(target.maxHp * 0.5); 
        let hpBarDiv = document.getElementById(`enemy-hp-bar-${unitId}`); let hpTextDiv = document.getElementById(`enemy-hp-text-${unitId}`);
        if (hpBarDiv) hpBarDiv.style.width = '50%'; if (hpTextDiv) hpTextDiv.innerText = `${target.hp}/${target.maxHp}`;
        spawnFloatingText(`enemy-${unitId}`, "REVIVED!", "float-heal"); return; 
    }
    if (target.isDead) return;
    target.isDead = true; runStats.enemiesKilled++;

    if (target.isBoss) {
        let rGained = (5 + waveManager.wave); runStats.runes += rGained; spawnFloatingText('in-run-currency', `+${rGained}`, 'float-rune');
        for(let i=0; i<5; i++) { setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'rune'), i * 150); }
        let stats = getPlayerStats(); let goldEarned = Math.floor(10 * (1 + stats.luck)); addCurrency('gold', goldEarned);
        for(let i=0; i<10; i++) { setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'gold'), i * 100); }
    } else if (target.isElite) {
        if (Math.random() < 0.5) { runStats.runes += 1; spawnLootDrop(`enemy-${unitId}`, 'rune'); spawnFloatingText('in-run-currency', '+1', 'float-rune'); }
        let stats = getPlayerStats(); let goldEarned = Math.floor(3 * (1 + stats.luck)); addCurrency('gold', goldEarned);
        for(let i=0; i<3; i++) { setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'gold'), i * 150); }
    } else {
        if (Math.random() < 0.5) { runStats.runes += 1; spawnLootDrop(`enemy-${unitId}`, 'rune'); spawnFloatingText('in-run-currency', '+1', 'float-rune'); }
        let stats = getPlayerStats();
        if (Math.random() < 0.25) { let goldEarned = Math.floor(1 * (1 + stats.luck)); if (goldEarned < 1) goldEarned = 1; addCurrency('gold', goldEarned); spawnLootDrop(`enemy-${unitId}`, 'gold'); }
    }
    document.getElementById('run-runes-text').innerText = runStats.runes;
    if(unitDiv) { unitDiv.classList.add('dead'); setTimeout(() => unitDiv.style.display = 'none', 300); }
}

function animateHit(unitId, damageDealt, isCrit) {
    let unitDiv = document.getElementById(`enemy-${unitId}`); let hpBarDiv = document.getElementById(`enemy-hp-bar-${unitId}`); let hpTextDiv = document.getElementById(`enemy-hp-text-${unitId}`);
    let target = activeEnemies.find(e => e.id === unitId); if (!target) return;
    if (unitDiv) {
        unitDiv.classList.add('hit-anim');
        if(isCrit) { unitDiv.style.filter = "drop-shadow(0 0 10px red)"; spawnFloatingText(`enemy-${unitId}`, `${damageDealt} CRIT!`, "float-crit"); } 
        else { spawnFloatingText(`enemy-${unitId}`, damageDealt, "float-dmg"); }
        setTimeout(() => { unitDiv.classList.remove('hit-anim'); unitDiv.style.filter = ""; }, 200);
    }
    let displayHp = Math.max(0, Math.ceil(target.hp));
    if (hpBarDiv) hpBarDiv.style.width = (displayHp / target.maxHp) * 100 + '%';
    if (hpTextDiv) hpTextDiv.innerText = `${displayHp}/${target.maxHp}`;
    if (target.hp <= 0 && !target.isDead) { handleEnemyDeath(target, unitId, unitDiv); }
}

function executePlayerAttack() {
    let aliveEnemies = activeEnemies.filter(e => e.hp > 0); if(aliveEnemies.length === 0) return;
    player.attackCount++; // Track attacks for Focus Ring

    if (hasStatus(player, 'bleed')) {
        let bDmg = Math.floor(player.maxHealth * 0.05); player.currentHealth -= bDmg; updatePlayerHealthBar(); spawnFloatingText('player-combat-area', "BLEED -" + bDmg, "float-enemy-dmg");
        if (player.currentHealth <= 0) { triggerGameOver("Died from severe blood loss"); return; }
    }

    if (consumeCharge(player, 'blind')) { spawnFloatingText('player-combat-area', "BLIND MISS!", "float-miss"); return; }
    let isEmpowered = consumeCharge(player, 'empower');

    let pIcon = document.getElementById('player-combat-icon');
    if(pIcon) { pIcon.classList.add('player-attack-anim'); setTimeout(() => pIcon.classList.remove('player-attack-anim'), 200); }

    // Synergy Focus Ring
    if (hasOwnedItem('focus_ring') && player.attackCount % 5 === 0) applyStatus(player, 'focused', 1, true);

    let strikes = 1;
    for (let s = 0; s < strikes; s++) {
        setTimeout(() => {
            let target = activeEnemies.find(e => e.hp > 0); if (!target) return;
            let damages = getTotalDamage(); let stats = getPlayerStats();
            
            let isCrit = Math.random() < stats.crit;
            if (consumeCharge(player, 'focused')) isCrit = true;
            if (consumeCharge(target, 'marked')) isCrit = true;

            let eDefP = target.pDef || 0; let eDefM = target.mDef || 0;
            if (hasStatus(target, 'berserk')) { eDefP = 0; eDefM = 0; }

            let pDmg = Math.max(1, damages.pDmg - eDefP); let mDmg = Math.max(0, damages.mDmg - eDefM);
            if (target.skill === 'high_armor' || target.skill === 'armor') pDmg = Math.floor(pDmg * 0.1); 

            let dmg = pDmg + mDmg;
            if (isCrit) {
                dmg = Math.floor(dmg * 2.5);
                if (hasOwnedItem('executioner')) applyStatus(target, 'doom', 10000); // Synergy Executioner
            }
            
            if (isEmpowered) { dmg *= 2; spawnFloatingText('player-combat-area', "EMPOWERED!", "float-crit"); }
            if (hasStatus(player, 'berserk')) dmg *= 2;
            if (hasStatus(target, 'vulnerable')) dmg = Math.floor(dmg * 1.5);
            if (hasStatus(target, 'barrier')) dmg = Math.floor(dmg * 0.5);

            // Item Status Procs
            if (hasOwnedItem('venom_strike') && Math.random() < 0.10) applyStatus(target, 'poison', 5000);
            if (hasOwnedItem('scorching_blade') && Math.random() < 0.10) applyStatus(target, 'burn', 5000);
            if (hasOwnedItem('sunder') && Math.random() < 0.10) applyStatus(target, 'vulnerable', 3000);

            // Blood Magic Synergy
            if (hasOwnedItem('blood_magic') && mDmg > 0) applyHeal(player, Math.floor(mDmg * 0.10));

            if (consumeCharge(target, 'block')) { spawnFloatingText(`enemy-${target.id}`, "BLOCKED!", "float-miss"); dmg = 0; } 
            else {
                target.hp -= dmg; animateHit(target.id, dmg, isCrit);
                if (hasStatus(target, 'thorns') && dmg > 0) {
                    let tDmg = Math.floor(dmg * 0.2); player.currentHealth -= tDmg; updatePlayerHealthBar(); spawnFloatingText('player-combat-area', "THORNS -" + tDmg, "float-enemy-dmg");
                    if (player.currentHealth <= 0) { triggerGameOver("Slain by " + target.name + "'s Thorns"); return; }
                }
            }

            if (runStats.lifesteal > 0 && dmg > 0) applyHeal(player, Math.floor(dmg * runStats.lifesteal));

        }, s * 150);
    }
    setTimeout(() => { if (activeEnemies.every(e => e.hp <= 0)) packDefeated(); }, 400);
}

function executeEnemyAttack(e) {
    if (hasStatus(e, 'bleed')) {
        let bDmg = Math.floor(e.maxHp * 0.05); e.hp -= bDmg; animateHit(e.id, bDmg, false); if (e.hp <= 0) return; 
    }
    if (consumeCharge(e, 'blind')) { spawnFloatingText(`enemy-${e.id}`, "BLIND MISS!", "float-miss"); return; }
    
    let isEmpowered = consumeCharge(e, 'empower');

    let unitDiv = document.getElementById(`enemy-${e.id}`);
    if(unitDiv) { unitDiv.classList.add('attack-anim'); setTimeout(() => unitDiv.classList.remove('attack-anim'), 300); }

    let stats = getPlayerStats(); let incomingDmg = e.damage; let isCrit = false;
    if (e.skill === 'crit' && Math.random() < 0.25) isCrit = true;
    if (consumeCharge(e, 'focused')) isCrit = true;
    if (consumeCharge(player, 'marked')) isCrit = true;

    if (e.skill !== 'magic' && e.skill !== 'leviathan_spawns' && !isCrit && Math.random() < stats.evasion) { spawnFloatingText('player-combat-area', "MISS!", "float-miss"); return; }

    if (e.skill === 'bash' && Math.random() < 0.25) {
        incomingDmg = Math.floor(incomingDmg * 2); applyStatus(player, 'stun', 2000); spawnFloatingText('player-combat-area', "BASHED!", "float-enemy-dmg");
    }
    if (e.skill === 'poison_aura' || e.skill === 'poison_hit') { applyStatus(player, 'poison', 5000); spawnFloatingText('player-combat-area', "POISONED!", "float-enemy-dmg"); }

    if (consumeCharge(player, 'block')) { spawnFloatingText('player-combat-area', "BLOCKED!", "float-miss"); return; }

    if (e.skill === 'magic' || e.skill === 'leviathan_spawns') incomingDmg = Math.max(1, incomingDmg - stats.mDef);
    else incomingDmg = Math.max(1, incomingDmg - stats.pDef);

    if (isCrit) { incomingDmg = Math.floor(incomingDmg * 2); spawnFloatingText(`enemy-${e.id}`, "CRIT!", "float-enemy-dmg"); }
    if (isEmpowered) incomingDmg *= 2;
    if (hasStatus(e, 'berserk')) incomingDmg *= 2;
    if (hasStatus(player, 'vulnerable')) incomingDmg = Math.floor(incomingDmg * 1.5);
    if (hasStatus(player, 'barrier')) incomingDmg = Math.floor(incomingDmg * 0.5);

    player.currentHealth -= incomingDmg; updatePlayerHealthBar(); spawnFloatingText('player-combat-area', "-" + incomingDmg, "float-enemy-dmg");

    // Synergy On-Hit Taken
    if (hasOwnedItem('frost_guard') && incomingDmg > 0 && Math.random() < 0.15) applyStatus(e, 'slow', 3000);

    if ((hasStatus(player, 'thorns') || hasOwnedItem('thornmail')) && incomingDmg > 0) {
        let tDmg = Math.floor(incomingDmg * 0.2); e.hp -= tDmg; animateHit(e.id, tDmg, false);
    }
    if (e.skill === 'vampire') applyHeal(e, Math.floor(incomingDmg * 0.5));

    let container = document.getElementById('game-container'); container.style.backgroundColor = 'rgba(231, 76, 60, 0.4)';
    setTimeout(() => { container.style.backgroundColor = '#2c3e50'; }, 100);

    if (player.currentHealth <= 0) { triggerGameOver(e.name); }
}

function updatePlayerHealthBar() { /* Unchanged */
    let pPercent = Math.max(0, (player.currentHealth / player.maxHealth) * 100);
    let pBar = document.getElementById('player-health'); let pText = document.getElementById('player-hp-text');
    if (pBar) pBar.style.width = pPercent + '%'; if (pText) pText.innerText = Math.max(0, Math.floor(player.currentHealth)) + '/' + player.maxHealth;
    if (pBar) {
        if (pPercent <= 30) pBar.style.backgroundColor = '#e74c3c';
        else if (pPercent <= 50) pBar.style.backgroundColor = '#e67e22';
        else if (pPercent <= 70) pBar.style.backgroundColor = '#f1c40f';
        else pBar.style.backgroundColor = '#2ecc71';
    }
}

// --- NEW SHOP DRAFTING SYSTEM ---
function packDefeated() {
    if(waveManager.isUpgrading) return;
    waveManager.isUpgrading = true;

    if (isTestMode) { endRun('TEST CLEARED', '#2ecc71'); return; }

    let isBoss = getLevelAndWave().isBoss; let packSize = activeEnemies.length;
    let gemsEarned = 0; if (isBoss) gemsEarned = 5; else if (Math.random() > 0.8) gemsEarned = 1;
    if (gemsEarned > 0) addCurrency('gem', gemsEarned);

    runStats.expGained += isBoss ? (100 * waveManager.wave) : (15 * waveManager.wave * packSize);
    updateCombatStatsPanel();

    if(isBoss) { showBossClearUI(); } else { generateShop(); }
}

function generateShop() {
    let shopPool = [];
    
    // 1. Build Filtered Pools
    let poolCommon = [...SHOP_DATA.common];
    let poolUncommon = SHOP_DATA.uncommon.filter(u => runStats.upgradeLevels[u.id] < 10);
    let poolRare = SHOP_DATA.rare.filter(u => !hasOwnedItem(u.id));
    
    // Synergies Check for Ultimates
    let poolUltimate = SHOP_DATA.ultimate.filter(u => {
        if (hasOwnedItem(u.id)) return false;
        if (u.req && !u.req.some(reqId => hasOwnedItem(reqId))) return false;
        if (u.reqLvl && runStats.upgradeLevels[u.reqLvl.id] < u.reqLvl.lvl) return false;
        return true;
    });

    let choices = [];
    
    for(let i=0; i<3; i++) {
        let roll = Math.random() * 100;
        let rarity = 'common';
        
        if (roll > 95 && poolUltimate.length > 0) rarity = 'ultimate';
        else if (roll > 80 && poolRare.length > 0) rarity = 'rare';
        else if (roll > 25 && poolUncommon.length > 0) rarity = 'uncommon';

        // Pity System
        if (rarity === 'ultimate' && runStats.runes < 12) rarity = poolUncommon.length > 0 ? 'uncommon' : 'common';
        if (rarity === 'rare' && runStats.runes < 6) rarity = poolUncommon.length > 0 ? 'uncommon' : 'common';

        let targetPool = rarity === 'common' ? poolCommon : rarity === 'uncommon' ? poolUncommon : rarity === 'rare' ? poolRare : poolUltimate;
        
        // Failsafe
        if (targetPool.length === 0) targetPool = poolCommon;
        
        let itemIndex = Math.floor(Math.random() * targetPool.length);
        let pickedItem = targetPool[itemIndex];
        
        // Calculate Cost
        let cost = 0;
        if (rarity === 'uncommon') cost = 2 + runStats.upgradeLevels[pickedItem.id];
        else if (rarity === 'rare') cost = 6;
        else if (rarity === 'ultimate') cost = 12;

        choices.push({ ...pickedItem, rarity: rarity, cost: cost });
        
        // Prevent Duplicate in same shop
        targetPool.splice(itemIndex, 1);
    }

    showUpgradeShopUI(choices);
}

function rerollShop() {
    if (runStats.runes >= 1) {
        runStats.runes -= 1;
        document.getElementById('shop-runes-display').innerText = runStats.runes;
        generateShop();
    } else {
        showNotification("Not enough Runes to reroll!");
    }
}

function showUpgradeShopUI(choices) {
    document.getElementById('wave-upgrade-ui').style.display = 'flex';
    document.getElementById('shop-runes-display').innerText = runStats.runes;
    let list = document.getElementById('upgrade-list'); list.innerHTML = '';

    window.currentShopPool = choices;

    choices.forEach((u, index) => {
        let canAfford = runStats.runes >= u.cost;
        let lvlText = u.rarity === 'uncommon' ? ` <span class="lvl-badge">(Lv ${runStats.upgradeLevels[u.id] + 1}/10)</span>` : '';
        list.innerHTML += `
            <button class="upgrade-btn rarity-${u.rarity} ${canAfford ? '' : 'disabled'}" onclick="buyRunUpgrade(${index})">
                <div style="font-size: 3rem; margin-bottom: 10px;">${u.icon || '✨'}</div>
                <h4 style="font-size: 0.8rem; text-transform: uppercase; margin: 0; line-height: 1.2; color: #fff;">${u.name}${lvlText}</h4>
                <p style="font-size: 0.9rem; font-weight: bold; margin-top: 5px; color: #f1c40f;">${u.desc}</p>
                ${u.cost > 0 ? `<div style="margin-top: auto; font-size: 1rem; font-weight: bold; color: #00e5ff;">${u.cost} 🌀</div>` : `<div style="margin-top: auto; font-size: 1rem; font-weight: bold; color: #2ecc71;">FREE</div>`}
            </button>`;
    });
}

function buyRunUpgrade(index) {
    let upgrade = window.currentShopPool[index];
    if (runStats.runes < upgrade.cost) return;
    runStats.runes -= upgrade.cost;

    if (upgrade.rarity === 'uncommon') {
        runStats.upgradeLevels[upgrade.id]++;
        if(upgrade.id === 'p_atk') runStats.pAtk += 15;
        if(upgrade.id === 'm_atk') runStats.mAtk += 15;
        if(upgrade.id === 'spd') runStats.atkSpd += 0.05;
        if(upgrade.id === 'crit') runStats.crit += 0.05;
        if(upgrade.id === 'lifesteal') runStats.lifesteal += 0.02;
        if(upgrade.id === 'p_def') runStats.pDef += 10;
        if(upgrade.id === 'm_def') runStats.mDef += 10;
        if(upgrade.id === 'vitality') { player.maxHealth += 30; applyHeal(player, 30); }
    } else if (upgrade.rarity === 'common') {
        if (upgrade.id === 'heal') applyHeal(player, Math.floor(player.maxHealth * 0.25));
        if (upgrade.id === 'gold') addCurrency('gold', 50);
        if (upgrade.id === 'temp_atk') { runStats.pAtk += 5; runStats.mAtk += 5; }
    } else if (upgrade.rarity === 'rare' || upgrade.rarity === 'ultimate') {
        runStats.ownedItems.push(upgrade.id);
    }

    updateCombatStatsPanel(); continueToNextWave();
}

function showBossClearUI() {
    document.getElementById('boss-clear-ui').style.display = 'flex';
    document.getElementById('boss-ui-gold').innerText = runStats.goldGained;
    document.getElementById('boss-ui-gems').innerText = runStats.gemsGained;
    document.getElementById('boss-ui-exp').innerText = runStats.expGained;
    let list = document.getElementById('cursed-list'); list.innerHTML = ''; document.getElementById('btn-descend').disabled = true;
}

function continueToNextWave() {
    document.getElementById('wave-upgrade-ui').style.display = 'none'; document.getElementById('boss-clear-ui').style.display = 'none';
    waveManager.wave++; waveManager.isUpgrading = true; 
    spawnEnemyPack(); playBattleStartAnimation();
    setTimeout(() => { waveManager.isUpgrading = false; startCombatLoop(); }, 1500); 
}

function endRun(titleText, titleColor, killerText = "") {
    isTestMode = false; document.getElementById('debug-panel').style.display = 'none'; clearInterval(combatTickInterval); 
    document.getElementById('wave-upgrade-ui').style.display = 'none'; document.getElementById('boss-clear-ui').style.display = 'none';

    let summaryUi = document.getElementById('run-summary-ui'); let titleEl = document.getElementById('run-summary-title'); let killerEl = document.getElementById('run-summary-killer');
    titleEl.innerText = titleText; titleEl.style.color = titleColor;

    if (killerEl) {
        if (killerText) { killerEl.innerText = killerText; killerEl.style.display = 'block'; } 
        else { killerEl.style.display = 'none'; }
    }

    document.getElementById('summary-kills').innerText = runStats.enemiesKilled; document.getElementById('summary-gold').innerText = runStats.goldGained;
    document.getElementById('summary-exp').innerText = runStats.expGained; summaryUi.style.display = 'flex';
}

function triggerGameOver(killerText = "Slain by Unknown Forces") { player.currentHealth = 0; updatePlayerHealthBar(); endRun('DEFEATED', '#e74c3c', killerText); }
function fleeCombat() { endRun('RETREATED', '#f39c12'); }

function collectRunRewards() {
    player.exp += runStats.expGained; let leveledUp = false;
    while(player.exp >= player.expNeeded) { player.level++; player.exp -= player.expNeeded; player.expNeeded = Math.floor(player.expNeeded * 1.5); player.talentPoints++; player.maxHealth += 25; player.currentHealth = player.maxHealth; leveledUp = true; }
    if(leveledUp) showNotification("🎉 You Leveled Up from that run!");
    document.getElementById('run-summary-ui').style.display = 'none'; openMenu('home'); updateUI();
}

function updateUI() {
    document.getElementById('gold-amount').innerText = player.gold; document.getElementById('gem-amount').innerText = player.gems;
    document.getElementById('player-level-text').innerText = player.level; document.getElementById('player-exp-fill').style.width = ((player.exp / player.expNeeded) * 100) + '%';
    document.getElementById('player-exp-text').innerText = player.exp + '/' + player.expNeeded; document.getElementById('tp-amount').innerText = player.talentPoints;
    document.getElementById('talent-lvl-damage').innerText = player.talents.damage; document.getElementById('talent-lvl-gold').innerText = player.talents.gold;
}

async function initGame() {
    try {
        const heroesResponse = await fetch('heroes.json'); if (!heroesResponse.ok) throw new Error("HTTP error " + heroesResponse.status);
        heroData = await heroesResponse.json();
        const enemiesResponse = await fetch('enemies.json'); enemiesData = await enemiesResponse.json();
        renderHeroSelection(); updateUI();
        if (heroData.warrior) { setActiveHero('warrior'); }
        for (let h in heroData) { if (player.heroSkillLevels[h] === undefined) { player.heroSkillLevels[h] = 0; } }
        renderHeroSelection();
    } catch (error) { console.error("Failed to load game data:", error); }
}

initGame();
