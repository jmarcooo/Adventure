// --- GAME DATA & GLOBALS ---
let gameSpeed = 1; 

let heroData = {};
let enemiesData = {}; 
let equipmentData = []; 
let mutatorsData = []; 
let activeMutator = null;

let player = {
    level: 1, exp: 0, expNeeded: 100, talentPoints: 0,
    gold: 0, gems: 0, currentHero: 'warrior', bonusDamage: 0,
    talents: { damage: 0, gold: 0 }, maxHealth: 100, currentHealth: 100,
    heroStats: {}, // Stores per-hero levels
    heroSkillLevels: {},
    equipment: { head: null, body: null, legs: null, boots: null, weapon: null, leftHand: null, ring: null, amulet: null },
    inventory: [],
    attackProgress: 0, 
    activeEffects: [],
    highestStageUnlocked: 0 // Tracks overall game progression (0 to 59)
};

let runStats = {
    pAtk: 0, atkSpd: 0.0, pDef: 0, mAtk: 0, mDef: 0, spd: 0, evasion: 0.0, crit: 0.0, luck: 0.0,
    splashDmg: 0.0, doubleHitChance: 0.0, lifesteal: 0.0,
    pAtkMulti: 1.0, mAtkMulti: 1.0, pDefMulti: 1.0, mDefMulti: 1.0, atkSpdMulti: 1.0,
    goldMultiplier: 1.0, enemyHpMultiplier: 1.0,
    runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
    upgradeLevels: { p_atk: 0, m_atk: 0, spd: 0, splash: 0, double: 0, crit: 0, lifesteal: 0, evasion: 0, p_def: 0, m_def: 0 },
    hasRareUpgrade: false, hasUltimateUpgrade: false,
    commonUpgradeCounts: { heal: 0, gold: 0, temp_atk: 0, vitality: 0 },
    maxHpBonus: 0
};

let runUpgradeData = [];
let commonUpgradesData = [];
let bossSkillsData = [];

let viewingHero = null;
let activeEnemies = [];
let waveManager = { 
    wave: 1, 
    currentBiomeIndex: 0, 
    currentSubstageIndex: 0, 
    isUpgrading: false, 
    transitioning: false, 
    normalEmojis: ['👾', '🧟', '🦇', '💀', '🕷️', '🦂'], 
    bossEmojis: ['🐉', '👹', '🦑', '🦖'] 
};

let combatTickInterval;
let mutatorTickTimer = 0;
let isTestMode = false;

// --- STAGE DEFINITIONS ---
const STAGE_DATA = [
    { id: 'forest', name: 'Forest', bossName: 'Great Forest Troll', bossEmoji: '🧌', skill: 'bash' },
    { id: 'cave', name: 'Cave', bossName: 'Cave Serpent', bossEmoji: '🐍', skill: 'poison_aura' },
    { id: 'graveyard', name: 'Haunted Graveyard', bossName: 'Great Skeleton', bossEmoji: '💀', skill: 'intimidate_revive' },
    { id: 'ruins', name: 'Ancient Ruins', bossName: 'Ancient Golem', bossEmoji: '🗿', skill: 'high_armor' },
    { id: 'coast', name: 'Forbidden Coast', bossName: 'Leviathan', bossEmoji: '🐋', skill: 'leviathan_spawns' },
    { id: 'volcano', name: 'Volcanic Crag', bossName: 'Infernal Dragon', bossEmoji: '🐉', skill: 'high_armor' },
    { id: 'tundra', name: 'Frozen Tundra', bossName: 'Frost Lich', bossEmoji: '🥶', skill: 'intimidate_revive' },
    { id: 'desert', name: 'Scorched Desert', bossName: 'Giant Sandworm', bossEmoji: '🐛', skill: 'poison_aura' },
    { id: 'void', name: 'Shadow Realm', bossName: 'Void Lord', bossEmoji: '👁️‍🗨️', skill: 'leviathan_spawns' },
    { id: 'celestial', name: "Celestial Palace", bossName: 'Fallen Titan', bossEmoji: '👼', skill: 'bash' }
];

const SUBSTAGE_NAMES = ['Outskirts', 'Trail', 'Depths', 'Ruins', 'Gauntlet', 'Lair'];

function getMutatorMod(key, defaultValue) {
    if (activeMutator && activeMutator.modifiers && activeMutator.modifiers[key] !== undefined) {
        return activeMutator.modifiers[key];
    }
    return defaultValue;
}

// --- NAVIGATION & GENERAL LOGIC ---
const screens = ['home', 'heroes', 'gear', 'talents', 'shop', 'game', 'stages'];

function showNotification(msg) {
    let el = document.getElementById('in-app-notification');
    if(!el) return;
    el.innerText = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
}

function openMenu(targetScreen) {
    if(targetScreen !== 'game') { clearInterval(combatTickInterval); }
    if(targetScreen === 'heroes') { viewingHero = null; renderHeroSelection(); }
    if(targetScreen === 'gear') { renderGearMenu(); }
    if(targetScreen === 'stages') { 
        showBiomeList(); 
        renderStagesMenu(); 
    } 
    
    screens.forEach(s => {
        let el = document.getElementById('screen-' + s);
        if(el) el.classList.remove('active');
    });
    
    let tEl = document.getElementById('screen-' + targetScreen);
    if(tEl) tEl.classList.add('active');

    if(targetScreen !== 'game') {
        document.getElementById('bottom-nav-bar').style.display = 'flex';
        screens.forEach(s => { 
            let btn = document.getElementById('btn-' + s);
            if(btn) btn.classList.remove('active'); 
        });
        if(targetScreen !== 'stages') { 
            document.getElementById('btn-' + targetScreen).classList.add('active');
        } else {
            document.getElementById('btn-home').classList.add('active'); 
        }
    } else {
        document.getElementById('bottom-nav-bar').style.display = 'none';
    }
}

// --- STAGE MENU LOGIC (Biomes & Sub-stages) ---
function renderStagesMenu() {
    let container = document.getElementById('stages-list-container');
    container.innerHTML = '';
    
    if (player.highestStageUnlocked === undefined) player.highestStageUnlocked = 0;

    STAGE_DATA.forEach((stage, index) => {
        let isUnlocked = player.highestStageUnlocked >= (index * 6);
        let stateClass = isUnlocked ? '' : 'locked';
        let icon = isUnlocked ? '🔓' : '🔒';
        let clickAction = isUnlocked ? `onclick="showSubstageList(${index})"` : '';
        
        let progressInsideBiome = 0;
        if (player.highestStageUnlocked >= (index * 6) + 6) progressInsideBiome = 6;
        else if (player.highestStageUnlocked >= index * 6) progressInsideBiome = player.highestStageUnlocked - (index * 6);

        container.innerHTML += `
            <div class="card ${stateClass}" ${clickAction}>
                <div class="card-icon" style="font-size: 2.5rem;">${icon}</div>
                <div class="card-info">
                    <h3 style="color: #fff; font-size: 1.1rem;">Region ${index + 1}: ${stage.name}</h3>
                    <p style="color: ${isUnlocked ? '#f1c40f' : '#7f8c8d'}; font-size: 0.8rem;">
                        ${isUnlocked ? `Progress: ${progressInsideBiome}/6 Cleared` : 'Complete previous region'}
                    </p>
                </div>
            </div>
        `;
    });
}

function showBiomeList() {
    document.getElementById('substage-list-view').style.display = 'none';
    document.getElementById('biome-list-view').style.display = 'block';
}

function showSubstageList(biomeIndex) {
    document.getElementById('biome-list-view').style.display = 'none';
    document.getElementById('substage-list-view').style.display = 'flex';
    
    let biome = STAGE_DATA[biomeIndex];
    document.getElementById('selected-biome-title').innerText = biome.name;

    let container = document.getElementById('substages-container');
    container.innerHTML = '';

    for (let i = 0; i < 6; i++) {
        let flatIndex = (biomeIndex * 6) + i;
        let isUnlocked = player.highestStageUnlocked >= flatIndex;
        let stateClass = isUnlocked ? '' : 'locked';
        let clickAction = isUnlocked ? `onclick="startStage(${biomeIndex}, ${i})"` : '';
        
        let nodeName = SUBSTAGE_NAMES[i];
        let isBossNode = (i === 5);
        let icon = isBossNode ? '☠️' : '⚔️';

        container.innerHTML += `
            <div class="substage-card ${stateClass}" ${clickAction} style="margin-bottom: 10px;">
                <div class="substage-info">
                    <h4>Stage ${biomeIndex + 1}-${i + 1}: ${nodeName}</h4>
                    <p>${isUnlocked ? (isBossNode ? 'Biome Boss Encounter' : '10 Waves') : 'Locked'}</p>
                </div>
                <div style="font-size: 1.5rem;">${isUnlocked ? icon : '🔒'}</div>
            </div>
        `;
    }
}

function startStage(bIndex, sIndex) {
    let flatIndex = (bIndex * 6) + sIndex;
    if (flatIndex > player.highestStageUnlocked) return;
    
    waveManager.currentBiomeIndex = bIndex;
    waveManager.currentSubstageIndex = sIndex;
    startGame();
}

let secretGemClickCount = 0;
let secretGemClickTimer = null;

function checkSecretCheat() {
    secretGemClickCount++;
    clearTimeout(secretGemClickTimer);

    if (secretGemClickCount >= 10) {
        player.gems += 10000;
        updateUI();
        showNotification("🛠️ DEV MODE: +10,000 Gems Added!");
        secretGemClickCount = 0; 
    } else {
        secretGemClickTimer = setTimeout(() => { secretGemClickCount = 0; }, 1000);
    }
}

function renderHeroSelection() {
    let listView = document.getElementById('heroes-list-view');
    let detailsView = document.getElementById('hero-details-view');

    if (!viewingHero) {
        listView.style.display = 'block';
        detailsView.style.display = 'none';
        renderHeroList();
    } else {
        listView.style.display = 'none';
        detailsView.style.display = 'flex';
        renderHeroDetails(viewingHero);
    }
}

function renderHeroList() {
    let container = document.getElementById('heroes-list-container');
    if (!container) return;
    container.innerHTML = '';
    for (let heroId in heroData) {
        let hero = heroData[heroId];
        let isSelected = player.currentHero === heroId ? 'selected' : '';
        let hLvl = player.heroStats[heroId] ? player.heroStats[heroId].level : 1;
        container.innerHTML += `
        <div class="card ${isSelected}" style="flex-direction: column; text-align: center; gap: 5px;" onclick="viewingHero = '${heroId}'; renderHeroSelection();">
            <div class="card-icon" style="font-size: 2.5rem;">${hero.emoji}</div>
            <div class="card-info" style="text-align: center;">
                <h3 style="font-size: 1rem;">${hero.name} <span style="font-size:0.7rem; color:#f1c40f;">Lv.${hLvl}</span></h3>
            </div>
        </div>`;
    }
}

function renderHeroDetails(heroId) {
    let hero = heroData[heroId];
    let skillLvl = player.heroSkillLevels[heroId] || 0;
    let cost = (skillLvl + 1) * 500;
    let btnText = skillLvl >= 2 ? "MAX LEVEL" : `Upgrade Skill (${cost}🪙)`;
    let skillChance = hero.innateSkill ? Math.round(hero.innateSkill.chances[skillLvl] * 100) : 0;
    let hLvl = player.heroStats[heroId] ? player.heroStats[heroId].level : 1;

    let bonusPAtk = (hLvl - 1) * (hero.pAtkGrowth || 0);
    let bonusMAtk = (hLvl - 1) * (hero.mAtkGrowth || 0);
    let bonusPDef = (hLvl - 1) * (hero.pDefGrowth || 0);
    let bonusMDef = (hLvl - 1) * (hero.mDefGrowth || 0);

    let contentDiv = document.getElementById('hero-details-content');
    contentDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <div style="font-size: 4rem;">${hero.emoji}</div>
            <div>
                <h2 style="margin: 0; font-size: 2rem;">${hero.name}</h2>
                <p style="margin: 0; font-size: 1.2rem;">Weapon: ${hero.weapon}</p>
            </div>
        </div>
        <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 0.9rem;">
            <p><b>P.Atk:</b> <span style="color: #e74c3c;">${hero.pAtk + bonusPAtk}</span> <span style="font-size:0.7rem; color:#aaa;">(+${hero.pAtkGrowth || 0}/lv)</span></p>
            <p><b>M.Atk:</b> <span style="color: #9b59b6;">${hero.mAtk + bonusMAtk}</span> <span style="font-size:0.7rem; color:#aaa;">(+${hero.mAtkGrowth || 0}/lv)</span></p>
            <p><b>P.Def:</b> <span style="color: #f39c12;">${hero.pDef + bonusPDef}</span> <span style="font-size:0.7rem; color:#aaa;">(+${hero.pDefGrowth || 0}/lv)</span></p>
            <p><b>M.Def:</b> <span style="color: #3498db;">${hero.mDef + bonusMDef}</span> <span style="font-size:0.7rem; color:#aaa;">(+${hero.mDefGrowth || 0}/lv)</span></p>
            <p><b>Speed:</b> <span style="color: #2ecc71;">${hero.spd}</span></p>
            <p><b>Atk.Spd:</b> <span style="color: #e67e22;">${hero.atkSpd}</span></p>
            <p><b>Crit:</b> <span style="color: #f1c40f;">${hero.crit * 100}%</span></p>
            <p><b>Dodge:</b> <span style="color: #1abc9c;">${hero.evasion * 100}%</span></p>
            <p><b>Luck:</b> <span style="color: #f39c12;">${hero.luck * 100}%</span></p>
        </div>

        <p style="margin-top: 5px;"><b>Innate Passive:</b> <span style="color: #f1c40f;">${hero.innateDesc || 'None'}</span></p>
        <p style="margin-top: 5px;"><b>Active Skill:</b> <span style="color: #3498db;">${hero.innateSkill ? `(${skillChance}%) ${hero.innateSkill.desc}` : 'None'}</span></p>

        <button class="hud-btn" style="width: 100%; margin-top: 15px; padding: 10px; background: #e67e22;" onclick="upgradeHeroSkill('${heroId}')">${btnText}</button>
    `;

    let btnActive = document.getElementById('btn-set-active');
    btnActive.onclick = () => setActiveHero(heroId);
    if (player.currentHero === heroId) {
        btnActive.innerText = "CURRENTLY ACTIVE";
        btnActive.style.background = "#2ecc71";
        btnActive.disabled = true;
    } else {
        btnActive.innerText = "SET ACTIVE";
        btnActive.style.background = "linear-gradient(180deg, #f1c40f 0%, #f39c12 100%)";
        btnActive.disabled = false;
    }
}

function upgradeHeroSkill(heroId) {
    let currentLvl = player.heroSkillLevels[heroId];
    if (currentLvl >= 2) { showNotification("Skill is already Max Level!"); return; }
    let cost = (currentLvl + 1) * 500;
    if (player.gold >= cost) {
        player.gold -= cost; player.heroSkillLevels[heroId]++;
        updateUI(); renderHeroSelection(); showNotification(`Skill Upgraded to Level ${player.heroSkillLevels[heroId] + 1}!`);
    } else { showNotification(`Not enough Gold! Need ${cost} 🪙`); }
}

function setActiveHero(heroId) {
    player.currentHero = heroId;
    document.getElementById('home-hero').innerText = heroData[heroId].emoji;
    document.getElementById('home-weapon').innerText = heroData[heroId].weapon;
    renderHeroSelection(); 
    showNotification(`${heroData[heroId].name} is now your active hero!`);
}

function upgradeTalent(type) {
    if (player.talentPoints > 0) { player.talentPoints--; player.talents[type]++; updateUI(); }
    else { showNotification("You need Talent Points!"); }
}

function renderGearMenu() {
    let slots = ['head', 'body', 'legs', 'boots', 'weapon', 'leftHand', 'ring', 'amulet'];
    slots.forEach(slot => {
        let el = document.getElementById(`slot-${slot}`);
        if (el) {
            if (player.equipment[slot]) {
                el.innerHTML = `<span style="cursor:pointer;" onclick="showGearModal(player.equipment['${slot}'], 'equipped', '${slot}')">${player.equipment[slot].icon}</span>`;
            } else { el.innerHTML = ''; }
        }
    });

    updateGearStatsPanel();

    let grid = document.getElementById('inventory-grid');
    if (grid) {
        grid.innerHTML = '';
        let totalSlots = Math.max(12, player.inventory.length);
        for(let i=0; i < totalSlots; i++) {
            let item = player.inventory[i];
            if (item) {
                grid.innerHTML += `<div class="inv-slot" style="cursor:pointer; position: relative;" onclick="showGearModal(player.inventory[${i}], 'inventory', ${i})">${item.icon}
                <div style="position: absolute; bottom: 2px; right: 2px; font-size: 0.5rem; background: rgba(0,0,0,0.6); padding: 1px 3px; border-radius: 3px; color: #ccc;">${item.type}</div>
                </div>`;
            } else { grid.innerHTML += `<div class="inv-slot"></div>`; }
        }
    }
}

function showGearModal(item, source, key) {
    if (!item) return;
    document.getElementById('gear-modal-icon').innerText = item.icon;
    document.getElementById('gear-modal-name').innerText = item.name;
    document.getElementById('gear-modal-type').innerText = item.slot;

    let statsDiv = document.getElementById('gear-modal-stats');
    statsDiv.innerHTML = '';
    let statNames = { pAtk: 'P.Atk', mAtk: 'M.Atk', pDef: 'P.Def', mDef: 'M.Def', atkSpd: 'Atk.Spd', spd: 'Speed', evasion: 'Dodge', crit: 'Crit', luck: 'Luck' };
    let currentEquipped = source === 'inventory' ? player.equipment[item.slot] : null;

    for (let stat in statNames) {
        let itemVal = item.stats[stat] || 0;
        let equippedVal = currentEquipped && currentEquipped.stats[stat] ? currentEquipped.stats[stat] : 0;
        if (itemVal > 0 || equippedVal > 0) {
            let diff = itemVal - equippedVal;
            let diffHtml = '';
            if (source === 'inventory') {
                if (diff > 0) diffHtml = `<span class="stat-positive">(+${diff})</span>`;
                else if (diff < 0) diffHtml = `<span class="stat-negative">(${diff})</span>`;
                else diffHtml = `<span class="stat-neutral">(-)</span>`;
            }
            statsDiv.innerHTML += `<div style="display: flex; justify-content: space-between;"><span>${statNames[stat]}:</span><span><b>${itemVal}</b> ${diffHtml}</span></div>`;
        }
    }

    if (item.onHit) {
        statsDiv.innerHTML += `
        <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 5px 0;">
        <div style="display: flex; justify-content: space-between; color: #e74c3c;">
            <span>On Hit:</span><span><b>${Math.round(item.onHit.chance * 100)}%</b> chance to <b>${item.onHit.type.toUpperCase()}</b></span>
        </div>`;
    }

    if (item.onHitTaken) {
        statsDiv.innerHTML += `
        <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 5px 0;">
        <div style="display: flex; justify-content: space-between; color: #3498db;">
            <span>When Hit:</span><span><b>${Math.round(item.onHitTaken.chance * 100)}%</b> chance to <b>${item.onHitTaken.type.toUpperCase()}</b> attacker</span>
        </div>`;
    }

    let actionBtn = document.getElementById('gear-modal-action-btn');
    if (source === 'inventory') {
        actionBtn.innerText = 'EQUIP';
        actionBtn.onclick = () => { equipItem(key, item.slot); document.getElementById('gear-details-modal').style.display = 'none'; };
    } else {
        actionBtn.innerText = 'UNEQUIP';
        actionBtn.onclick = () => { unequipItem(key); document.getElementById('gear-details-modal').style.display = 'none'; };
    }
    document.getElementById('gear-details-modal').style.display = 'flex';
}

function equipItem(invIndex, slot) {
    let itemToEquip = player.inventory[invIndex];
    let currentEquipped = player.equipment[slot];
    player.equipment[slot] = itemToEquip;
    player.inventory.splice(invIndex, 1);
    if (currentEquipped) player.inventory.push(currentEquipped);
    renderGearMenu();
}

function unequipItem(slot) {
    let item = player.equipment[slot];
    if (item) { player.inventory.push(item); player.equipment[slot] = null; }
    renderGearMenu();
}

// --- FIXED MATH CALCULATORS ---
function getMaxHealth() {
    let base = player.maxHealth || 100;
    let eq = getEquipmentStats();
    let total = base + (eq.maxHp || 0) + (runStats.maxHpBonus || 0);
    if(isNaN(total)) return base;
    return Math.floor(total);
}

function getEquipmentStats() {
    let eqStats = { pAtk: 0, mAtk: 0, pDef: 0, mDef: 0, atkSpd: 0, spd: 0, evasion: 0, crit: 0, luck: 0, maxHp: 0 };
    for (let slot in player.equipment) {
        let item = player.equipment[slot];
        if (item && item.stats) { for (let key in eqStats) { if (item.stats[key]) eqStats[key] += item.stats[key]; } }
    }
    return eqStats;
}

function getPlayerStats() {
    if (!heroData || !heroData[player.currentHero]) return { pAtk:1, mAtk:1, pDef:0, mDef:0, atkSpd:1, spd:1, evasion:0, crit:0, luck:0 };
    let hero = heroData[player.currentHero];
    let eq = getEquipmentStats();

    // Applying Hero Stat Growths
    let hStats = player.heroStats[player.currentHero] || {level: 1};
    let lvlBonusPAtk = (hStats.level - 1) * (hero.pAtkGrowth || 0);
    let lvlBonusMAtk = (hStats.level - 1) * (hero.mAtkGrowth || 0);
    let lvlBonusPDef = (hStats.level - 1) * (hero.pDefGrowth || 0);
    let lvlBonusMDef = (hStats.level - 1) * (hero.mDefGrowth || 0);

    let stats = {
        pAtk: Math.floor((hero.pAtk + lvlBonusPAtk + runStats.pAtk + eq.pAtk) * runStats.pAtkMulti),
        mAtk: Math.floor((hero.mAtk + lvlBonusMAtk + runStats.mAtk + eq.mAtk) * runStats.mAtkMulti),
        pDef: Math.floor((hero.pDef + lvlBonusPDef + runStats.pDef + eq.pDef) * runStats.pDefMulti),
        mDef: Math.floor((hero.mDef + lvlBonusMDef + runStats.mDef + eq.mDef) * runStats.mDefMulti),
        atkSpd: (hero.atkSpd + runStats.atkSpd + eq.atkSpd) * runStats.atkSpdMulti,
        spd: hero.spd + runStats.spd + eq.spd,
        evasion: hero.evasion + runStats.evasion + eq.evasion,
        crit: hero.crit + runStats.crit + eq.crit,
        luck: hero.luck + runStats.luck + eq.luck
    };

    if (activeEnemies && activeEnemies.find(e => e.hp > 0 && e.skill === 'intimidate_revive')) {
        stats.pAtk = Math.floor(stats.pAtk * 0.75); stats.mAtk = Math.floor(stats.mAtk * 0.75); stats.atkSpd = stats.atkSpd * 0.75;
    }
    
    if (hasStatus(player, 'haste')) stats.atkSpd *= 1.5;
    if (hasStatus(player, 'slow')) stats.atkSpd *= 0.5;
    if (hasStatus(player, 'berserk')) { stats.pDef = 0; stats.mDef = 0; }

    return stats;
}

function getTotalDamage() {
    let stats = getPlayerStats();
    let baseP = stats.pAtk;
    let baseM = stats.mAtk;
    
    let dmgTalent = player.talents ? (player.talents.damage || 0) : 0;
    
    baseP = Math.floor(baseP * (1 + (dmgTalent * 0.10)));
    baseM = Math.floor(baseM * (1 + (dmgTalent * 0.10)));
    baseP += player.bonusDamage;

    if (runStats.tempAtkActive) { baseP *= 3; baseM *= 3; }

    baseP = Math.floor(baseP * getMutatorMod('pAtkMult', 1.0));
    baseM = Math.floor(baseM * getMutatorMod('mAtkMult', 1.0));

    return { pDmg: baseP, mDmg: baseM };
}

function updateGearStatsPanel() {
    let panel = document.getElementById('gear-hero-stats');
    if (!panel) return;
    if (!player.currentHero || !heroData[player.currentHero]) {
        panel.innerHTML = '<div style="text-align:center; padding: 20px;">No Hero Active</div>'; return;
    }
    let stats = getPlayerStats();
    let maxH = getMaxHealth(); 
    let html = `<h4 style="margin: 0 0 5px 0; color: #f1c40f; text-align: center;">${heroData[player.currentHero].name}</h4>`;
    html += `<div class="equip-stat-row"><span>Max HP</span> <span>${maxH}</span></div>`;
    html += `<div class="equip-stat-row"><span>P.Atk</span> <span>${stats.pAtk}</span></div>`;
    html += `<div class="equip-stat-row"><span>M.Atk</span> <span>${stats.mAtk}</span></div>`;
    html += `<div class="equip-stat-row"><span>P.Def</span> <span>${stats.pDef}</span></div>`;
    html += `<div class="equip-stat-row"><span>M.Def</span> <span>${stats.mDef}</span></div>`;
    html += `<div class="equip-stat-row"><span>Atk Spd</span> <span>${stats.atkSpd.toFixed(2)}</span></div>`;
    html += `<div class="equip-stat-row"><span>Speed</span> <span>${stats.spd}</span></div>`;
    html += `<div class="equip-stat-row"><span>Crit %</span> <span>${(stats.crit * 100).toFixed(1)}%</span></div>`;
    html += `<div class="equip-stat-row"><span>Evasion %</span> <span>${(stats.evasion * 100).toFixed(1)}%</span></div>`;
    html += `<div class="equip-stat-row"><span>Luck</span> <span>${stats.luck}</span></div>`;
    panel.innerHTML = html;
}

function buyPremium(item) {
    if (item === 'gold' && player.gems >= 10) { player.gems -= 10; player.gold += 1000; updateUI(); showNotification("Purchased 1,000 Gold!"); }
    else if (item === 'damage' && player.gems >= 50) { player.gems -= 50; player.bonusDamage += 50; updateUI(); showNotification("Purchased +50 Permanent DMG!"); }
    else if (item === 'chest' && player.gems >= 20) {
        player.gems -= 20; 
        let newGear = generateRandomEquipment(); 
        player.inventory.push(newGear); 
        updateUI(); 
        showNotification(`You got a ${newGear.name}!`);
    } else { showNotification("Not enough Gems!"); }
}

function toggleGameSpeed() {
    gameSpeed = gameSpeed === 1 ? 2 : 1;
    document.getElementById('speed-toggle-btn').innerText = gameSpeed === 1 ? '▶️ x1' : '⏩ x2';
}

// --- HYBRID STATUS ENGINE ---
function applyStatus(unit, type, value, isCharge = false) {
    if (getMutatorMod('nullifyStatuses', false)) {
        return; 
    }

    if (!unit.activeEffects) unit.activeEffects = [];
    let existing = unit.activeEffects.find(eff => eff.type === type);
    
    if (existing) {
        if (isCharge) existing.charges = value;
        else existing.duration = value;
    } else {
        if (isCharge) unit.activeEffects.push({ type: type, charges: value, maxCharges: value });
        else unit.activeEffects.push({ type: type, duration: value, maxDuration: value, tickTimer: 0 });
    }
    renderStatusEffects();
}

function hasStatus(unit, type) {
    return unit.activeEffects && unit.activeEffects.some(eff => eff.type === type);
}

function consumeCharge(unit, type) {
    if (!unit.activeEffects) return false;
    let idx = unit.activeEffects.findIndex(eff => eff.type === type && eff.charges !== undefined);
    if (idx !== -1) {
        unit.activeEffects[idx].charges--;
        let result = true;
        if (unit.activeEffects[idx].charges <= 0) {
            unit.activeEffects.splice(idx, 1);
        }
        renderStatusEffects();
        return result;
    }
    return false;
}

function applyHeal(unit, amount) {
    if (hasStatus(unit, 'decay')) {
        if (unit === player) {
            player.currentHealth -= amount;
            updatePlayerHealthBar();
            spawnFloatingText('player-combat-area', "DECAY -" + amount, "float-enemy-dmg");
            if (player.currentHealth <= 0) triggerGameOver("Rotted away from Decay");
        } else {
            unit.hp -= amount;
            animateHit(unit.id, amount, false);
            spawnFloatingText(`enemy-${unit.id}`, "DECAY!", "float-enemy-dmg");
        }
    } else {
        if (unit === player) {
            let maxH = getMaxHealth();
            player.currentHealth = Math.min(maxH, player.currentHealth + amount);
            updatePlayerHealthBar();
            spawnFloatingText('player-combat-area', "+" + amount, "float-heal");
        } else {
            unit.hp = Math.min(unit.maxHp, unit.hp + amount);
            let hpBarDiv = document.getElementById(`enemy-hp-bar-${unit.id}`);
            let hpTextDiv = document.getElementById(`enemy-hp-text-${unit.id}`);
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
                eff.tickTimer = 0;
                let maxH = unit === player ? getMaxHealth() : unit.maxHp;

                let hpDmgPct = getMutatorMod('hpDmgPerSec', 0);
                if (hpDmgPct > 0) {
                    let mutatorDmg = Math.max(1, Math.floor(maxH * hpDmgPct));
                    if (unit === player) {
                        player.currentHealth -= mutatorDmg; updatePlayerHealthBar();
                        if (player.currentHealth <= 0) triggerGameOver("Choked by Toxic Air");
                    } else {
                        unit.hp -= mutatorDmg; animateHit(unit.id, mutatorDmg, false);
                    }
                }

                if (eff.type === 'poison') {
                    let dmg = Math.max(1, Math.floor(maxH * 0.05));
                    if (unit === player) {
                        player.currentHealth -= dmg;
                        updatePlayerHealthBar();
                        spawnFloatingText('player-combat-area', "POISON -" + dmg, "float-enemy-dmg");
                        if (player.currentHealth <= 0) triggerGameOver("Succumbed to poison");
                    } else {
                        unit.hp -= dmg; animateHit(unit.id, dmg, false);
                    }
                } 
                else if (eff.type === 'burn') {
                    let dmg = Math.max(1, Math.floor(maxH * 0.08));
                    if (unit === player) {
                        player.currentHealth -= dmg;
                        updatePlayerHealthBar();
                        spawnFloatingText('player-combat-area', "BURN -" + dmg, "float-enemy-dmg");
                        if (player.currentHealth <= 0) triggerGameOver("Burnt to a crisp");
                    } else {
                        unit.hp -= dmg; animateHit(unit.id, dmg, false);
                    }
                }
                else if (eff.type === 'regen') {
                    applyHeal(unit, Math.max(1, Math.floor(maxH * 0.05)));
                }
            }

            if (eff.duration <= 0) {
                if (eff.type === 'doom') {
                    if (unit === player) {
                        player.currentHealth = 0; updatePlayerHealthBar();
                        spawnFloatingText('player-combat-area', "DOOMED!", "float-enemy-dmg");
                        triggerGameOver("Erased from existence by Doom");
                    } else {
                        unit.hp = 0; animateHit(unit.id, 9999, false);
                        spawnFloatingText(`enemy-${unit.id}`, "DOOMED!", "float-crit");
                    }
                }
                unit.activeEffects.splice(i, 1);
                uiChanged = true;
            } else if (oldSec !== newSec) {
                uiChanged = true;
            }
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
        if (activeEnemies && activeEnemies.find(e => e.hp > 0 && e.skill === 'intimidate_revive')) {
            pCont.innerHTML += `<div class="status-icon debuff" title="Intimidated">💀 Intimidated</div>`;
        }
        if (player.activeEffects) {
            player.activeEffects.forEach(eff => { pCont.innerHTML += createStatusHtml(eff); });
        }
    }

    activeEnemies.forEach(e => {
        let eCont = document.getElementById(`enemy-status-${e.id}`);
        if (eCont) {
            eCont.innerHTML = '';
            if (e.activeEffects) {
                e.activeEffects.forEach(eff => { eCont.innerHTML += createStatusHtml(eff, true); });
            }
        }
    });
}

// --- DEBUG FUNCTIONS ---
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
            <p>💨 ${Math.round(stats.evasion * 100)}% Ddg</p>
            <p>🍀 ${Math.round(stats.luck * 100)}% Lck</p>
        </div>
    `;
    document.getElementById('run-runes-text').innerText = runStats.runes;
}

function playBattleStartAnimation() {
    let overlay = document.getElementById('battle-start-overlay');
    let swords = document.getElementById('crossed-swords');
    if(overlay && swords) {
        overlay.style.display = 'flex';
        swords.classList.remove('animate-swords');
        void swords.offsetWidth; 
        swords.classList.add('animate-swords');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 1000);
    }
}

function spawnFloatingText(targetId, text, className) {
    let targetDiv = document.getElementById(targetId);
    if(!targetDiv) return;
    let ft = document.createElement('div');
    ft.className = `floating-text ${className}`;
    ft.innerText = text;
    let offsetX = (Math.random() * 40) - 20;
    ft.style.left = `calc(50% + ${offsetX}px)`; ft.style.top = '10px';
    targetDiv.appendChild(ft);
    setTimeout(() => { if(ft.parentElement) ft.remove(); }, 1500);
}

function spawnLootDrop(targetId, type) {
    let targetDiv = document.getElementById(targetId);
    if(!targetDiv) return;
    let emoji = type === 'rune' ? '🌀' : '🪙';
    let ft = document.createElement('div');
    ft.className = 'loot-drop'; ft.innerText = emoji;
    let dirX = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random());
    ft.style.setProperty('--dirX', dirX);
    ft.style.left = '50%'; ft.style.top = '30%';
    targetDiv.appendChild(ft);
    setTimeout(() => { if(ft.parentElement) ft.remove(); }, 1500);
}

// --- ATB LOOP ENGINE ---
function startCombatLoop() {
    clearInterval(combatTickInterval);
    combatTickInterval = setInterval(combatTick, 50); 
}

function combatTick() {
    if(!document.getElementById('screen-game').classList.contains('active') || player.currentHealth <= 0 || waveManager.isUpgrading) return;

    processTimeEffects(player);
    let aliveEnemies = activeEnemies.filter(e => e.hp > 0 && !e.isDead);
    aliveEnemies.forEach(e => processTimeEffects(e));

    aliveEnemies = activeEnemies.filter(e => e.hp > 0 && !e.isDead);

    let stats = getPlayerStats();
    let actionQueue = []; 
    let atbMult = getMutatorMod('atbSpeedMult', 1.0);

    if (!hasStatus(player, 'stun')) {
        player.attackProgress += (Math.max(0.1, stats.atkSpd) * gameSpeed * 2.5 * atbMult);
        if (player.attackProgress >= 100) {
            player.attackProgress = 100;
            actionQueue.push({ type: 'player', spd: stats.spd }); 
        }
    } 
    let pAtb = document.getElementById('player-atb');
    if(pAtb) pAtb.style.width = Math.max(0, Math.min(100, player.attackProgress)) + '%';

    aliveEnemies.forEach(e => {
        if (!hasStatus(e, 'stun')) {
            let eAtkSpd = e.atkSpd || 1.0;
            if (hasStatus(e, 'haste')) eAtkSpd *= 1.5;
            if (hasStatus(e, 'slow')) eAtkSpd *= 0.5;

            e.attackProgress += (eAtkSpd * gameSpeed * 2.5 * atbMult);
            if (e.attackProgress >= 100) {
                e.attackProgress = 100;
                actionQueue.push({ type: 'enemy', entity: e, spd: e.spd }); 
            }
        }
        let atbBar = document.getElementById(`enemy-atb-bar-${e.id}`);
        if (atbBar) atbBar.style.width = Math.max(0, Math.min(100, e.attackProgress)) + '%';
    });

    if (actionQueue.length > 0) {
        actionQueue.sort((a, b) => b.spd - a.spd); 
        
        actionQueue.forEach(action => {
            if (action.type === 'player' && player.attackProgress >= 100 && player.currentHealth > 0) {
                executePlayerAttack();
                player.attackProgress = 0;
                if(pAtb) pAtb.style.width = '0%';
            } else if (action.type === 'enemy' && action.entity.hp > 0 && action.entity.attackProgress >= 100 && player.currentHealth > 0) {
                executeEnemyAttack(action.entity);
                action.entity.attackProgress = 0;
                let atbBar = document.getElementById(`enemy-atb-bar-${action.entity.id}`);
                if (atbBar) atbBar.style.width = '0%';
            }
        });
    }
}

// --- NEW TEST BATTLE MODE ---
function startTestBattle() {
    if (!heroData || Object.keys(heroData).length === 0) {
        alert("ERROR: Game data failed to load.");
        return;
    }

    isTestMode = true;
    player.activeEffects = []; 

    runStats = {
        pAtk: 0, atkSpd: 0.0, pDef: 0, mAtk: 0, mDef: 0, spd: 0, evasion: 0.0, crit: 0.0, luck: 0.0,
        splashDmg: 0.0, doubleHitChance: 0.0, lifesteal: 0.0,
        pAtkMulti: 1.0, mAtkMulti: 1.0, pDefMulti: 1.0, mDefMulti: 1.0, atkSpdMulti: 1.0,
        goldMultiplier: 1.0, enemyHpMultiplier: 1.0, tempAtkActive: false, purificationActive: false,
        runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
        upgradeLevels: { p_atk: 0, m_atk: 0, spd: 0, splash: 0, double: 0, crit: 0, lifesteal: 0, evasion: 0, p_def: 0, m_def: 0 },
        hasRareUpgrade: false, hasUltimateUpgrade: false,
        commonUpgradeCounts: { heal: 0, gold: 0, temp_atk: 0, vitality: 0 },
        maxHpBonus: 0
    };

    if (heroData[player.currentHero] && heroData[player.currentHero].innate) {
        let innate = heroData[player.currentHero].innate;
        for (let key in innate) { if (runStats.hasOwnProperty(key)) runStats[key] += innate[key]; }
    }
    
    waveManager.wave = 1;
    waveManager.currentBiomeIndex = 0;
    waveManager.currentSubstageIndex = 0;
    
    player.currentHealth = getMaxHealth();

    document.getElementById('run-summary-ui').style.display = 'none';
    document.getElementById('wave-upgrade-ui').style.display = 'none';
    document.getElementById('boss-clear-ui').style.display = 'none';
    
    document.getElementById('debug-panel').style.display = 'flex'; 
    waveManager.isUpgrading = true; 
    waveManager.transitioning = false; 

    updateCombatStatsPanel();
    updatePlayerHealthBar();
    
    openMenu('game');

    let container = document.getElementById('enemy-container');
    let textEl = document.getElementById('level-wave-text');
    let mutatorEl = document.getElementById('mutator-display');
    if(mutatorEl) mutatorEl.style.display = 'none';
    activeMutator = null;

    container.innerHTML = ''; activeEnemies = [];

    textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[TRAINING GROUND]</span><br><span style="color:#9b59b6; text-shadow: 0 0 10px #9b59b6;">⚠️ TARGET DUMMY ⚠️</span>`;

    let dummyHp = 999999;
    let dummy = {
        id: 0, maxHp: dummyHp, hp: dummyHp, pAtk: 0, mAtk: 0, pDef: 9999, mDef: 9999, exp: 0,
        skill: 'dummy', attackProgress: 0, activeEffects: [], isDead: false, isBoss: true, spd: 1, atkSpd: 0.1,
        name: "Training Dummy"
    };
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

    player.attackProgress = 95;
    dummy.attackProgress = 0;
    let pAtb = document.getElementById('player-atb');
    if(pAtb) pAtb.style.width = '95%';

    renderStatusEffects(); 
    playBattleStartAnimation();

    setTimeout(() => { 
        waveManager.isUpgrading = false; 
        startCombatLoop(); 
    }, 1500); 
}

function startGame() {
    if (!heroData || Object.keys(heroData).length === 0) {
        alert("ERROR: Game data failed to load.");
        return;
    }

    isTestMode = false;
    document.getElementById('debug-panel').style.display = 'none';
    player.activeEffects = [];

    // --- STRICT RESET FOR ACTUAL RUN ---
    runStats = {
        pAtk: 0, atkSpd: 0.0, pDef: 0, mAtk: 0, mDef: 0, spd: 0, evasion: 0.0, crit: 0.0, luck: 0.0,
        splashDmg: 0.0, doubleHitChance: 0.0, lifesteal: 0.0,
        pAtkMulti: 1.0, mAtkMulti: 1.0, pDefMulti: 1.0, mDefMulti: 1.0, atkSpdMulti: 1.0,
        goldMultiplier: 1.0, enemyHpMultiplier: 1.0, tempAtkActive: false, purificationActive: false,
        runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
        upgradeLevels: { p_atk: 0, m_atk: 0, spd: 0, splash: 0, double: 0, crit: 0, lifesteal: 0, evasion: 0, p_def: 0, m_def: 0 },
        hasRareUpgrade: false, hasUltimateUpgrade: false,
        commonUpgradeCounts: { heal: 0, gold: 0, temp_atk: 0, vitality: 0 },
        maxHpBonus: 0
    };

    if (heroData[player.currentHero] && heroData[player.currentHero].innate) {
        let innate = heroData[player.currentHero].innate;
        for (let key in innate) { if (runStats.hasOwnProperty(key)) runStats[key] += innate[key]; }
    }
    
    // Game starts at Wave 1 of the selected stage
    waveManager.wave = 1; 
    player.currentHealth = getMaxHealth();

    document.getElementById('run-summary-ui').style.display = 'none';
    document.getElementById('wave-upgrade-ui').style.display = 'none';
    document.getElementById('boss-clear-ui').style.display = 'none';
    
    waveManager.isUpgrading = true; 
    waveManager.transitioning = false; 

    updateCombatStatsPanel();
    updatePlayerHealthBar(); 
    
    openMenu('game');
    
    spawnEnemyPack();
    playBattleStartAnimation();

    setTimeout(() => { 
        waveManager.isUpgrading = false; 
        startCombatLoop(); 
    }, 1500); 
}

// --- EXACT STAGE MATH ---
function getLevelAndWave() {
    let bIndex = waveManager.currentBiomeIndex;
    let sIndex = waveManager.currentSubstageIndex;
    let stageWave = waveManager.wave;
    
    let biome = STAGE_DATA[bIndex] || STAGE_DATA[0];
    
    // Absolute scaling from 1 to 60 based on node position
    let absoluteLevel = (bIndex * 6) + sIndex + 1;

    let isGenericBoss = stageWave === 10;
    let isBiomeBoss = stageWave === 10 && sIndex === 5; 
    let isMiniBoss = stageWave === 5;

    return { 
        absoluteLevel: absoluteLevel,
        biomeIndex: bIndex,
        substageIndex: sIndex,
        wave: stageWave, 
        isBoss: isGenericBoss, 
        isBiomeBoss: isBiomeBoss, 
        isMiniBoss: isMiniBoss, 
        biome: biome 
    };
}

function renderBossUI(id, name, emoji, hp, bSkill) {
    let container = document.getElementById('enemy-container');
    container.innerHTML += `
        <div class="enemy-unit boss" id="enemy-${id}">
            <div class="emoji" style="font-size: 4rem;">${emoji}</div>
            <div class="enemy-name" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-${id}"></div></div>
            <div class="mini-bar-container" style="height: 6px; margin-top: 2px;"><div class="mini-bar-fill" id="enemy-atb-bar-${id}" style="background: #f1c40f; width: 0%; transition: none;"></div></div>
            <div class="mini-hp-text" id="enemy-hp-text-${id}">${hp}/${hp}</div>
            <div id="enemy-status-${id}" style="display:flex; justify-content:center; gap:2px; margin-top:2px; height:15px; color: white;"></div>
            ${bSkill ? `<div class="boss-skill-badge" title="${bSkill.desc}">${bSkill.icon} ${bSkill.name}</div>` : ''}
        </div>`;
}

function renderNormalEnemyUI(id, enemyData, emoji, isElite) {
    let container = document.getElementById('enemy-container');
    let eliteClass = isElite ? 'elite' : '';
    container.innerHTML += `
        <div class="enemy-unit ${eliteClass}" id="enemy-${id}">
            <div class="emoji">${emoji}</div>
            <div class="enemy-name" style="font-size: 0.8rem; font-weight: bold; margin-bottom: 2px;">${enemyData.name}</div>
            <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-${id}"></div></div>
            <div class="mini-bar-container" style="height: 4px; margin-top: 2px;"><div class="mini-bar-fill" id="enemy-atb-bar-${id}" style="background: #f1c40f; width: 0%; transition: none;"></div></div>
            <div class="mini-hp-text" id="enemy-hp-text-${id}">${enemyData.hp}/${enemyData.hp}</div>
            <div id="enemy-status-${id}" style="display:flex; justify-content:center; gap:2px; margin-top:2px; height:15px; color: white;"></div>
        </div>`;
}

function spawnEnemyPack() {
    let container = document.getElementById('enemy-container');
    let textEl = document.getElementById('level-wave-text');
    let mutatorEl = document.getElementById('mutator-display'); 
    
    container.innerHTML = ''; activeEnemies = [];
    activeMutator = null; 
    if(mutatorEl) mutatorEl.style.display = 'none';

    let stageInfo = getLevelAndWave();
    
    // Safety check for enemiesData
    let biomeEnemies = enemiesData[stageInfo.biome.id];
    if (!biomeEnemies || biomeEnemies.length === 0) {
        biomeEnemies = [{ id: 'error_slime', name: 'Slime', emoji: '👾', baseHp: 20, pAtk: 2, mAtk: 0, pDef: 1, mDef: 1, spd: 10, atkSpd: 1.0, exp: 10, skill: null }];
    }

    let gameScreen = document.getElementById('screen-game');
    if (stageInfo.biome && stageInfo.biome.background) {
        gameScreen.style.backgroundImage = `linear-gradient(rgba(44, 62, 80, 0.7), rgba(44, 62, 80, 0.9)), url('${stageInfo.biome.background}')`;
        gameScreen.style.backgroundSize = 'cover'; gameScreen.style.backgroundPosition = 'center'; gameScreen.style.backgroundRepeat = 'no-repeat';
    } else {
        gameScreen.style.backgroundImage = 'none'; gameScreen.style.backgroundColor = '#2c3e50';
    }

    if (stageInfo.isBiomeBoss) {
        let bossHp = Math.floor((300 + (stageInfo.absoluteLevel * 35)) * runStats.enemyHpMultiplier);
        let bPAtk = 10 + Math.floor(stageInfo.absoluteLevel * 1.5);
        let bMAtk = 10 + Math.floor(stageInfo.absoluteLevel * 1.5);
        let bPDef = 5 + Math.floor(stageInfo.absoluteLevel * 1.0);
        let bMDef = 5 + Math.floor(stageInfo.absoluteLevel * 1.0);
        let bExp = 100 + (stageInfo.absoluteLevel * 20);
        
        let bSkill = { id: stageInfo.biome.skill, name: stageInfo.biome.bossName, icon: '👑', desc: 'Unique Biome Boss' };

        activeEnemies.push({ id: 0, name: stageInfo.biome.bossName, maxHp: bossHp, hp: bossHp, pAtk: bPAtk, mAtk: bMAtk, pDef: bPDef, mDef: bMDef, exp: bExp, skill: bSkill.id, attackProgress: 0, activeEffects: [], isDead: false, isBoss: true, isBiomeBoss: true });

        if (stageInfo.biome.skill === 'leviathan_spawns') {
            for(let i=1; i<=4; i++) {
                let spawnHp = Math.floor(bossHp * 0.2); 
                let spawnDmg = Math.floor(bPAtk * 0.5);
                activeEnemies.push({ id: i, name: "Leviathan Spawn", maxHp: spawnHp, hp: spawnHp, pAtk: spawnDmg, mAtk: spawnDmg, pDef: 5, mDef: 5, exp: 10, skill: 'magic', attackProgress: 0, activeEffects: [], isDead: false, isBoss: false });
            }
        }

        textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[${stageInfo.biome.name.toUpperCase()}]</span><br><span style="color:#e74c3c; text-shadow: 0 0 10px #e74c3c;">⚠️ REGION BOSS ⚠️</span>`;
        renderBossUI(0, stageInfo.biome.bossName, stageInfo.biome.bossEmoji, bossHp, bSkill);

        if (stageInfo.biome.skill === 'leviathan_spawns') {
            for(let i=1; i<=4; i++) { renderNormalEnemyUI(i, activeEnemies[i], '🦑', true); }
        }

    } else if (stageInfo.isBoss) {
        let bossHp = Math.floor((200 + (stageInfo.absoluteLevel * 25)) * runStats.enemyHpMultiplier);
        let bPAtk = 8 + Math.floor(stageInfo.absoluteLevel * 1.2);
        let bMAtk = 8 + Math.floor(stageInfo.absoluteLevel * 1.2);
        let bPDef = 5 + Math.floor(stageInfo.absoluteLevel * 0.8);
        let bMDef = 5 + Math.floor(stageInfo.absoluteLevel * 0.8);
        let bExp = 50 + (stageInfo.absoluteLevel * 10);
        
        let bSkill = bossSkillsData && bossSkillsData.length > 0 ? bossSkillsData[Math.floor(Math.random() * bossSkillsData.length)] : {id: 'none', name: 'No Skill', icon: '❓', desc: ''};

        activeEnemies.push({ id: 0, name: "Area Guardian", maxHp: bossHp, hp: bossHp, pAtk: bPAtk, mAtk: bMAtk, pDef: bPDef, mDef: bMDef, exp: bExp, skill: bSkill.id, attackProgress: 0, activeEffects: [], isDead: false, isBoss: true });
        
        let nodeName = SUBSTAGE_NAMES[stageInfo.substageIndex];
        textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[${stageInfo.biome.name.toUpperCase()}]</span><br><span style="color:#e74c3c; text-shadow: 0 0 10px #e74c3c;">⚠️ BOSS: ${nodeName} ⚠️</span>`;
        
        renderBossUI(0, "Area Guardian", waveManager.bossEmojis[Math.floor(Math.random() * waveManager.bossEmojis.length)], bossHp, bSkill);

    } else if (stageInfo.isMiniBoss) {
        let nodeName = SUBSTAGE_NAMES[stageInfo.substageIndex];
        textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[${stageInfo.biome.name.toUpperCase()}]</span><br><span style="color:#f39c12; text-shadow: 0 0 10px #f39c12;">⚔️ ${nodeName} Elite ⚔️</span>`;
        
        let strongestTemplate = [...biomeEnemies].sort((a, b) => b.baseHp - a.baseHp)[0];
        let mbHp = Math.floor((strongestTemplate.baseHp + (stageInfo.absoluteLevel * 15)) * runStats.enemyHpMultiplier * 2.5); 
        let mbPAtk = Math.max(1, Math.floor((strongestTemplate.pAtk || 0) + (stageInfo.absoluteLevel * 0.8)) * 1.5); 
        let mbMAtk = Math.max(0, Math.floor((strongestTemplate.mAtk || 0) + (stageInfo.absoluteLevel * 0.8)) * 1.5); 
        let mbPDef = Math.floor((strongestTemplate.pDef || 0) + (stageInfo.absoluteLevel * 0.5) * 1.5);
        let mbMDef = Math.floor((strongestTemplate.mDef || 0) + (stageInfo.absoluteLevel * 0.5) * 1.5);
        let mbExp = Math.floor((strongestTemplate.exp || 10) + (stageInfo.absoluteLevel * 2)) * 3;

        activeEnemies.push({ id: 0, name: `Elite ${strongestTemplate.name}`, maxHp: mbHp, hp: mbHp, pAtk: mbPAtk, mAtk: mbMAtk, pDef: mbPDef, mDef: mbMDef, exp: mbExp, skill: strongestTemplate.skill, attackProgress: 0, activeEffects: [], isDead: false, isBoss: false, isElite: true });
        renderNormalEnemyUI(0, activeEnemies[0], strongestTemplate.emoji, true);

        let minionTemplate = [...biomeEnemies].sort((a, b) => a.baseHp - b.baseHp)[0];
        for(let i=1; i<=2; i++) {
            let mHp = Math.floor((minionTemplate.baseHp + (stageInfo.absoluteLevel * 10)) * runStats.enemyHpMultiplier);
            let mPAtk = Math.max(1, Math.floor((minionTemplate.pAtk || 0) + (stageInfo.absoluteLevel * 0.5)));
            let mMAtk = Math.max(0, Math.floor((minionTemplate.mAtk || 0) + (stageInfo.absoluteLevel * 0.5)));
            let mPDef = Math.floor((minionTemplate.pDef || 0) + (stageInfo.absoluteLevel * 0.3));
            let mMDef = Math.floor((minionTemplate.mDef || 0) + (stageInfo.absoluteLevel * 0.3));
            let mExp = Math.floor((minionTemplate.exp || 10) + (stageInfo.absoluteLevel * 1));

            activeEnemies.push({ id: i, name: minionTemplate.name, maxHp: mHp, hp: mHp, pAtk: mPAtk, mAtk: mMAtk, pDef: mPDef, mDef: mMDef, exp: mExp, skill: minionTemplate.skill, attackProgress: 0, activeEffects: [], isDead: false, isBoss: false, isElite: false });
            renderNormalEnemyUI(i, activeEnemies[i], minionTemplate.emoji, false);
        }

    } else {
        let nodeName = SUBSTAGE_NAMES[stageInfo.substageIndex];
        textEl.innerHTML = `<span style="font-size: 1rem; color: #bdc3c7;">[${stageInfo.biome.name.toUpperCase()}]</span><br>Stage ${stageInfo.biomeIndex + 1}-${stageInfo.substageIndex + 1} (${nodeName})<br><span style="font-size: 0.8rem">Wave ${stageInfo.wave}</span>`;

        let waveProgress = stageInfo.wave / 10;
        let poolSize = Math.max(2, Math.ceil(biomeEnemies.length * (waveProgress + 0.3))); 
        if (poolSize > biomeEnemies.length) poolSize = biomeEnemies.length;
        let availableEnemies = biomeEnemies.slice(0, poolSize);

        let baseCount = Math.floor(stageInfo.wave / 3) + 2; 
        let variance = Math.floor(Math.random() * 3) - 1; 
        let enemyCount = Math.min(5, Math.max(1, baseCount + variance));

        let sortedByHp = [...availableEnemies].sort((a, b) => b.baseHp - a.baseHp);
        let tankT = sortedByHp[0];
        let squishyT = sortedByHp[sortedByHp.length - 1];
        let magicT = availableEnemies.find(e => e.skill === 'magic') || squishyT;
        
        let formationRoll = Math.random();
        let useFormation = (stageInfo.wave >= 6 && formationRoll < 0.6);
        let formationType = formationRoll < 0.2 ? 'wall' : (formationRoll < 0.4 ? 'ambush' : 'coven');

        let spawnList = [];

        if (useFormation) {
            if (formationType === 'wall') { spawnList = [tankT, tankT, squishyT]; } 
            else if (formationType === 'ambush') { spawnList = [squishyT, squishyT, squishyT, squishyT]; } 
            else if (formationType === 'coven') { spawnList = [tankT, magicT, magicT]; }
        } else {
            for(let i=0; i<enemyCount; i++) {
                spawnList.push(availableEnemies[Math.floor(Math.random() * availableEnemies.length)]);
            }
        }

        for(let i = 0; i < spawnList.length; i++) {
            let eTemp = spawnList[i];
            let dynamicEliteChance = 0.05 + (0.25 * (stageInfo.wave / 10));
            let isElite = Math.random() < dynamicEliteChance;
            if (stageInfo.wave >= 8 && i === 0 && !useFormation) isElite = true; 

            let normHp = Math.floor((eTemp.baseHp + (stageInfo.absoluteLevel * 15)) * runStats.enemyHpMultiplier);
            let normPAtk = Math.max(0, Math.floor((eTemp.pAtk || 0) + (stageInfo.absoluteLevel * 0.8)));
            let normMAtk = Math.max(0, Math.floor((eTemp.mAtk || 0) + (stageInfo.absoluteLevel * 0.8)));
            let normPDef = Math.floor((eTemp.pDef || 0) + (stageInfo.absoluteLevel * 0.5));
            let normMDef = Math.floor((eTemp.mDef || 0) + (stageInfo.absoluteLevel * 0.5));
            let normExp = Math.floor((eTemp.exp || 10) + (stageInfo.absoluteLevel * 2));
            
            let finalHp = isElite ? normHp * 2 : normHp;
            let finalPAtk = isElite ? Math.floor(normPAtk * 1.5) : normPAtk;
            let finalMAtk = isElite ? Math.floor(normMAtk * 1.5) : normMAtk;
            let finalPDef = isElite ? Math.floor(normPDef * 1.5) : normPDef;
            let finalMDef = isElite ? Math.floor(normMDef * 1.5) : normMDef;
            let finalExp = isElite ? normExp * 3 : normExp;
            
            let eName = (isElite ? 'Elite ' : '') + eTemp.name; 
            let finalSpd = eTemp.spd || (isElite ? 12 : 10);
            let finalAtkSpd = eTemp.atkSpd || 1.0;

            activeEnemies.push({ id: i, name: eName, maxHp: finalHp, hp: finalHp, pAtk: finalPAtk, mAtk: finalMAtk, pDef: finalPDef, mDef: finalMDef, exp: finalExp, skill: eTemp.skill, attackProgress: 0, activeEffects: [], isDead: false, isBoss: false, isElite: isElite, spd: finalSpd, atkSpd: finalAtkSpd });
            renderNormalEnemyUI(i, activeEnemies[i], eTemp.emoji, isElite);
        }
    }
    
    let pStats = getPlayerStats();
    let combatants = [];

    combatants.push({ type: 'player', spd: pStats.spd, atkSpd: Math.max(0.1, pStats.atkSpd), ref: player });

    activeEnemies.forEach(e => {
        e.spd = e.spd || (e.isBoss ? 15 : (e.isElite ? 12 : 10)); 
        e.atkSpd = e.atkSpd || (e.isBoss ? 1.2 : 1.0); 
        combatants.push({ type: 'enemy', spd: e.spd, atkSpd: e.atkSpd, ref: e });
    });

    combatants.sort((a, b) => b.spd - a.spd);

    combatants.forEach((c, index) => {
        let progressPerTick = c.atkSpd * gameSpeed * 2.5;
        let staggerTicks = index * 10; 
        
        let initialProgress = 100 - (staggerTicks * progressPerTick);

        if (c.type === 'player') {
            player.attackProgress = initialProgress;
            let pAtb = document.getElementById('player-atb');
            if(pAtb) pAtb.style.width = Math.max(0, Math.min(100, player.attackProgress)) + '%';
        } else {
            c.ref.attackProgress = initialProgress;
            let atbBar = document.getElementById(`enemy-atb-bar-${c.ref.id}`);
            if (atbBar) atbBar.style.width = Math.max(0, Math.min(100, c.ref.attackProgress)) + '%';
        }
    });

    renderStatusEffects(); 
}

function handleEnemyDeath(target, unitId, unitDiv) {
    if (target.skill === 'intimidate_revive' && !target.hasRevived) {
        target.hasRevived = true;
        target.hp = Math.floor(target.maxHp * 0.5); 
        let hpBarDiv = document.getElementById(`enemy-hp-bar-${unitId}`);
        let hpTextDiv = document.getElementById(`enemy-hp-text-${unitId}`);
        if (hpBarDiv) hpBarDiv.style.width = '50%';
        if (hpTextDiv) hpTextDiv.innerText = `${target.hp}/${target.maxHp}`;
        spawnFloatingText(`enemy-${unitId}`, "REVIVED!", "float-heal");
        return; 
    }

    if (target.isDead) return;
    target.isDead = true; runStats.enemiesKilled++;

    // --- ACCURATE EXP HARVEST FROM NEW ENEMY JSON STATS ---
    let expReward = target.exp || 10;
    runStats.expGained += expReward;

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
        if (Math.random() < 0.25) {
            let goldEarned = Math.floor(1 * (1 + stats.luck)); if (goldEarned < 1) goldEarned = 1;
            addCurrency('gold', goldEarned); spawnLootDrop(`enemy-${unitId}`, 'gold');
        }
    }

    document.getElementById('run-runes-text').innerText = runStats.runes;
    if(unitDiv) { unitDiv.classList.add('dead'); setTimeout(() => unitDiv.style.display = 'none', 300); }

    if (activeEnemies.length > 0 && activeEnemies.every(e => e.isDead)) {
        if (!waveManager.transitioning) {
            waveManager.transitioning = true;
            setTimeout(() => packDefeated(), 400);
        }
    }
}

function animateHit(unitId, damageDealt, isCrit) {
    let unitDiv = document.getElementById(`enemy-${unitId}`);
    let hpBarDiv = document.getElementById(`enemy-hp-bar-${unitId}`);
    let hpTextDiv = document.getElementById(`enemy-hp-text-${unitId}`);
    let target = activeEnemies.find(e => e.id === unitId);

    if (!target) return;

    if (unitDiv) {
        unitDiv.classList.add('hit-anim');
        if(isCrit) {
            unitDiv.style.filter = "drop-shadow(0 0 10px red)";
            spawnFloatingText(`enemy-${unitId}`, `${damageDealt} CRIT!`, "float-crit");
        } else { spawnFloatingText(`enemy-${unitId}`, damageDealt, "float-dmg"); }
        setTimeout(() => { unitDiv.classList.remove('hit-anim'); unitDiv.style.filter = ""; }, 200);
    }

    let displayHp = Math.max(0, Math.ceil(target.hp));
    if (hpBarDiv) hpBarDiv.style.width = (displayHp / target.maxHp) * 100 + '%';
    if (hpTextDiv) hpTextDiv.innerText = `${displayHp}/${target.maxHp}`;

    if (target.hp <= 0 && !target.isDead) { handleEnemyDeath(target, unitId, unitDiv); }
}

function executePlayerAttack() {
    let aliveEnemies = activeEnemies.filter(e => e.hp > 0 && !e.isDead);
    
    if(aliveEnemies.length === 0) { 
        if (activeEnemies.length > 0 && activeEnemies.every(e => e.isDead)) {
            if (!waveManager.transitioning) {
                waveManager.transitioning = true;
                packDefeated(); 
            }
        }
        return; 
    }

    if (hasStatus(player, 'bleed')) {
        let bDmg = Math.floor(getMaxHealth() * 0.05);
        player.currentHealth -= bDmg;
        updatePlayerHealthBar();
        spawnFloatingText('player-combat-area', "BLEED -" + bDmg, "float-enemy-dmg");
        if (player.currentHealth <= 0) { triggerGameOver("Died from severe blood loss"); return; }
    }

    if (consumeCharge(player, 'blind')) {
        spawnFloatingText('player-combat-area', "BLIND MISS!", "float-miss");
        return;
    }

    let isEmpowered = consumeCharge(player, 'empower');

    let pIcon = document.getElementById('player-combat-icon');
    if(pIcon) { pIcon.classList.add('player-attack-anim'); setTimeout(() => pIcon.classList.remove('player-attack-anim'), 200); }

    let strikes = (Math.random() < runStats.doubleHitChance) ? 2 : 1;

    for (let s = 0; s < strikes; s++) {
        setTimeout(() => {
            let target = activeEnemies.find(e => e.hp > 0 && !e.isDead);
            if (!target) return;

            let damages = getTotalDamage();
            let stats = getPlayerStats();
            
            let isCrit = Math.random() < stats.crit;
            if (consumeCharge(player, 'focused')) isCrit = true;
            if (consumeCharge(target, 'marked')) isCrit = true;

            let eDefP = target.pDef || 0;
            let eDefM = target.mDef || 0;
            
            if (hasStatus(target, 'berserk')) { eDefP = 0; eDefM = 0; }

            let pDmg = Math.max(1, damages.pDmg - eDefP);
            let mDmg = Math.max(0, damages.mDmg - eDefM);

            if (getMutatorMod('nullifyMagic', false)) {
                mDmg = 0; 
            }

            if (target.skill === 'high_armor' || target.skill === 'armor') {
                pDmg = Math.floor(pDmg * 0.1); 
            }

            let dmg = pDmg + mDmg;
            if (isCrit) dmg = Math.floor(dmg * 2.5);
            
            if (isEmpowered) { dmg *= 2; spawnFloatingText('player-combat-area', "EMPOWERED!", "float-crit"); }
            if (hasStatus(player, 'berserk')) dmg *= 2;
            
            if (hasStatus(target, 'vulnerable')) dmg = Math.floor(dmg * 1.5);
            if (hasStatus(target, 'barrier')) dmg = Math.floor(dmg * 0.5);

            let hero = heroData[player.currentHero];
            let innateLvl = player.heroSkillLevels[player.currentHero] || 0;
            let innateTrigger = false;

            if (hero.innateSkill && Math.random() < hero.innateSkill.chances[innateLvl]) innateTrigger = true;

            if (innateTrigger) {
                spawnFloatingText('player-combat-area', hero.innateSkill.name + "!", "float-crit");
                if (hero.innateSkill.type === 'hunter_instakill' && !target.isBoss) {
                    dmg = target.hp; 
                } else if (hero.innateSkill.type === 'berserker_rage') {
                    dmg = dmg * 2;
                } else if (hero.innateSkill.type === 'warlock_curse') {
                    dmg = dmg * 3;
                    player.currentHealth -= Math.floor(getMaxHealth() * 0.05);
                    updatePlayerHealthBar();
                    if (player.currentHealth <= 0) { triggerGameOver("Consumed by Dark Magic"); return; }
                }
            }

            if (consumeCharge(target, 'block')) {
                spawnFloatingText(`enemy-${target.id}`, "BLOCKED!", "float-miss");
                dmg = 0;
            } else {
                target.hp -= dmg;
                animateHit(target.id, dmg, isCrit);

                if (player.equipment && player.equipment.weapon && player.equipment.weapon.onHit) {
                    let hitEff = player.equipment.weapon.onHit;
                    if (Math.random() < hitEff.chance) {
                        applyStatus(target, hitEff.type, hitEff.duration);
                        spawnFloatingText(`enemy-${target.id}`, `${hitEff.type.toUpperCase()}!`, "float-enemy-dmg");
                    }
                }

                if (hasStatus(target, 'thorns') && dmg > 0) {
                    let tDmg = Math.floor(dmg * 0.2);
                    player.currentHealth -= tDmg;
                    updatePlayerHealthBar();
                    spawnFloatingText('player-combat-area', "THORNS -" + tDmg, "float-enemy-dmg");
                    if (player.currentHealth <= 0) { triggerGameOver("Slain by " + target.name + "'s Thorns"); return; }
                }
            }

            if (innateTrigger) {
                if (hero.innateSkill.type === 'warrior_splash') {
                    activeEnemies.forEach(e => { if (e.id !== target.id && e.hp > 0) { e.hp -= dmg; animateHit(e.id, dmg, false); } });
                } else if (hero.innateSkill.type === 'mage_arcane') {
                    activeEnemies.forEach(e => { if (e.id !== target.id && e.hp > 0) { e.hp -= dmg; animateHit(e.id, dmg, false); } });
                } else if (hero.innateSkill.type === 'paladin_heal') {
                    applyHeal(player, Math.floor(getMaxHealth() * 0.20));
                } else if (hero.innateSkill.type === 'rogue_steal') {
                    addCurrency('gold', 5); spawnLootDrop(`enemy-${target.id}`, 'gold');
                } else if (hero.innateSkill.type === 'necro_summon') {
                    let d = Math.floor(dmg * 0.5);
                    activeEnemies.forEach(e => { if (e.hp > 0) { e.hp -= d; animateHit(e.id, d, false); } });
                    applyHeal(player, d);
                } else if (hero.innateSkill.type === 'beast_bite') {
                    let biteDmg = Math.floor(dmg * 1.5); target.hp -= biteDmg; animateHit(target.id, biteDmg, false);
                } else if (hero.innateSkill.type === 'monk_combo') {
                    target.hp -= dmg; animateHit(target.id, dmg, false); target.hp -= dmg; animateHit(target.id, dmg, false);
                } else if (hero.innateSkill.type === 'bard_song') {
                    runStats.runes += 1; spawnLootDrop('player-combat-area', 'rune'); spawnFloatingText('in-run-currency', '+1', 'float-rune');
                } else if (hero.innateSkill.type === 'druid_roots') {
                    let d = Math.floor(dmg * 0.5); activeEnemies.forEach(e => { if (e.id !== target.id && e.hp > 0) { e.hp -= d; animateHit(e.id, d, false); } });
                }
            }

            if (runStats.lifesteal > 0 && dmg > 0) {
                applyHeal(player, Math.floor(dmg * runStats.lifesteal));
            }

            if (runStats.splashDmg > 0 && dmg > 0) {
                let sDmg = Math.floor(dmg * runStats.splashDmg);
                activeEnemies.forEach(e => { if (e.id !== target.id && e.hp > 0) { e.hp -= sDmg; animateHit(e.id, sDmg, false); } });
            }
        }, s * 150);
    }
}

function executeEnemyAttack(e) {
    if (hasStatus(e, 'bleed')) {
        let bDmg = Math.floor(e.maxHp * 0.05);
        e.hp -= bDmg;
        animateHit(e.id, bDmg, false);
        if (e.hp <= 0) return; 
    }

    if (consumeCharge(e, 'blind')) {
        spawnFloatingText(`enemy-${e.id}`, "BLIND MISS!", "float-miss");
        return;
    }
    
    let isEmpowered = consumeCharge(e, 'empower');

    let unitDiv = document.getElementById(`enemy-${e.id}`);
    if(unitDiv) { unitDiv.classList.add('attack-anim'); setTimeout(() => unitDiv.classList.remove('attack-anim'), 300); }

    let stats = getPlayerStats();
    let incomingDmg = 0;

    let isCrit = false;
    if (e.skill === 'crit' && Math.random() < 0.25) isCrit = true;
    if (consumeCharge(e, 'focused')) isCrit = true;
    if (consumeCharge(player, 'marked')) isCrit = true;

    if (e.skill !== 'magic' && e.skill !== 'leviathan_spawns' && !isCrit && Math.random() < stats.evasion) { 
        spawnFloatingText('player-combat-area', "MISS!", "float-miss"); return; 
    }

    // --- ACCURATELY USES PATK OR MATK ---
    if (e.skill === 'magic' || e.skill === 'leviathan_spawns') {
        incomingDmg = e.mAtk || 0;
        if (runStats.purificationActive) {
            spawnFloatingText('player-combat-area', "IMMUNE!", "float-miss");
            return; 
        }
        incomingDmg = Math.max(1, incomingDmg - stats.mDef);
        if (getMutatorMod('nullifyMagic', false)) {
            spawnFloatingText(`enemy-${e.id}`, "NULLIFIED!", "float-miss");
            return; 
        }
    } else {
        incomingDmg = e.pAtk || 0;
        incomingDmg = Math.max(1, incomingDmg - stats.pDef);
    }

    if (e.skill === 'bash' && Math.random() < 0.25) {
        incomingDmg *= 2; 
        applyStatus(player, 'stun', 2000); 
        spawnFloatingText('player-combat-area', "BASHED!", "float-enemy-dmg");
    }

    if (e.skill === 'poison_aura' || e.skill === 'poison_hit') {
        applyStatus(player, 'poison', 5000); 
        spawnFloatingText('player-combat-area', "POISONED!", "float-enemy-dmg");
    }

    if (consumeCharge(player, 'block')) {
        spawnFloatingText('player-combat-area', "BLOCKED!", "float-miss");
        return; 
    }

    if (isCrit) {
        incomingDmg = Math.floor(incomingDmg * 2);
        spawnFloatingText(`enemy-${e.id}`, "CRIT!", "float-enemy-dmg");
    }

    if (isEmpowered) incomingDmg *= 2;
    if (hasStatus(e, 'berserk')) incomingDmg *= 2;
    
    if (hasStatus(player, 'vulnerable')) incomingDmg = Math.floor(incomingDmg * 1.5);
    if (hasStatus(player, 'barrier')) incomingDmg = Math.floor(incomingDmg * 0.5);

    player.currentHealth -= incomingDmg;
    updatePlayerHealthBar();
    spawnFloatingText('player-combat-area', "-" + incomingDmg, "float-enemy-dmg");

    if (incomingDmg > 0) {
        for (let slotKey in player.equipment) {
            let equippedItem = player.equipment[slotKey];
            if (equippedItem && equippedItem.onHitTaken) {
                let proc = equippedItem.onHitTaken;
                if (Math.random() < proc.chance) {
                    applyStatus(e, proc.type, proc.duration, proc.type === 'blind'); 
                    spawnFloatingText(`enemy-${e.id}`, `${proc.type.toUpperCase()}!`, "float-enemy-dmg");
                }
            }
        }
    }

    if (hasStatus(player, 'thorns') && incomingDmg > 0) {
        let tDmg = Math.floor(incomingDmg * 0.2);
        e.hp -= tDmg;
        animateHit(e.id, tDmg, false);
    }

    if (e.skill === 'vampire') {
        applyHeal(e, Math.floor(incomingDmg * 0.5));
    }

    let container = document.getElementById('game-container');
    container.style.backgroundColor = 'rgba(231, 76, 60, 0.4)';
    setTimeout(() => { container.style.backgroundColor = '#2c3e50'; }, 100);

    if (player.currentHealth <= 0) { triggerGameOver("Killed by " + e.name); }
}

function updatePlayerHealthBar() {
    let maxH = getMaxHealth(); 
    let pPercent = Math.max(0, (player.currentHealth / maxH) * 100);
    
    let pBar = document.getElementById('player-health');
    let pText = document.getElementById('player-hp-text');

    if (pBar) pBar.style.width = pPercent + '%';
    if (pText) pText.innerText = Math.max(0, Math.floor(player.currentHealth)) + '/' + maxH;

    if (pBar) {
        if (pPercent <= 30) pBar.style.backgroundColor = '#e74c3c';
        else if (pPercent <= 50) pBar.style.backgroundColor = '#e67e22';
        else if (pPercent <= 70) pBar.style.backgroundColor = '#f1c40f';
        else pBar.style.backgroundColor = '#2ecc71';
    }
}

function packDefeated() {
    if(waveManager.isUpgrading) return;
    waveManager.isUpgrading = true;

    if (isTestMode) {
        endRun('TEST CLEARED', '#2ecc71');
        return;
    }

    let isBoss = getLevelAndWave().isBoss;

    let gemsEarned = 0;
    if (isBoss) gemsEarned = 5; else if (Math.random() > 0.8) gemsEarned = 1;
    if (gemsEarned > 0) addCurrency('gem', gemsEarned);

    updateCombatStatsPanel();

    if (isBoss) { 
        if (player.highestStageUnlocked === undefined) player.highestStageUnlocked = 0;
        let flatIndex = (waveManager.currentBiomeIndex * 6) + waveManager.currentSubstageIndex;
        
        if (flatIndex >= player.highestStageUnlocked && flatIndex < 59) {
            player.highestStageUnlocked = flatIndex + 1;
        }
        
        showBossClearUI(); 
        return;
    } 

    let shopPool = []; 
    window.currentShopPool = shopPool;

    commonUpgradesData.forEach(u => {
        let count = runStats.commonUpgradeCounts[u.id] || 0;
        let scaleMult = count + 1;
        let newEffect = {}; let newDesc = "";
        
        if (u.id === 'heal') { newDesc = `Heal 25% Max HP`; } 
        else if (u.id === 'temp_atk') { newDesc = `+200% P/M.Atk (1 Wave)`; } 
        else if (u.id === 'vitality') { newEffect.hp = 25 * scaleMult; newDesc = `+${newEffect.hp} Max HP`; }
        
        shopPool.push({ ...u, rarity: 'common', cost: 0, effect: newEffect, desc: newDesc });
    });

    runUpgradeData.forEach(u => {
        if (runStats.upgradeLevels[u.id] < u.maxLevel) {
            let cost = 1 + (runStats.upgradeLevels[u.id] * 2);
            shopPool.push({ ...u, rarity: 'uncommon', cost: cost, currentLvl: runStats.upgradeLevels[u.id] });
        }
    });

    let canAffordAny = shopPool.some(u => runStats.runes >= u.cost);

    if (shopPool.length === 0 || !canAffordAny) { 
        setTimeout(() => { continueToNextWave(); }, 1000 / gameSpeed); 
    } else { 
        showUpgradeShop(shopPool); 
    }
}

function showUpgradeShop(shopPool) {
    document.getElementById('wave-upgrade-ui').style.display = 'flex';
    document.getElementById('shop-runes-display').innerText = runStats.runes;

    let list = document.getElementById('upgrade-list'); list.innerHTML = '';
    for (let i = shopPool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shopPool[i], shopPool[j]] = [shopPool[j], shopPool[i]]; }

    shopPool.slice(0, 3).forEach(u => {
        let canAfford = runStats.runes >= u.cost;
        let lvlText = u.rarity === 'uncommon' ? ` <span class="lvl-badge">(Lv ${u.currentLvl + 1}/${u.maxLevel})</span>` : '';
        list.innerHTML += `
            <button class="upgrade-btn rarity-${u.rarity} ${canAfford ? '' : 'disabled'}" onclick="buyRunUpgrade(window.currentShopPool[${shopPool.indexOf(u)}])">
                <div style="font-size: 3rem; margin-bottom: 10px;">${u.icon || '✨'}</div>
                <h4 style="font-size: 0.8rem; text-transform: uppercase; margin: 0; line-height: 1.2; color: #fff;">${u.name}${lvlText}</h4>
                <p style="font-size: 0.9rem; font-weight: bold; margin-top: 5px; color: #f1c40f;">${u.desc}</p>
                ${u.cost > 0 ? `<div style="margin-top: auto; font-size: 1rem; font-weight: bold; color: #00e5ff;">${u.cost} 🌀</div>` : `<div style="margin-top: auto; font-size: 1rem; font-weight: bold; color: #2ecc71;">FREE</div>`}
            </button>`;
    });
}

function buyRunUpgrade(upgrade) {
    if (runStats.runes < upgrade.cost) return;
    runStats.runes -= upgrade.cost;

    if (upgrade.rarity === 'uncommon') {
        runStats.upgradeLevels[upgrade.id]++;
        
        if(upgrade.id === 'p_atk') runStats.pAtk += 20;
        if(upgrade.id === 'm_atk') runStats.mAtk += 20;
        if(upgrade.id === 'p_def') runStats.pDef += 10;
        if(upgrade.id === 'm_def') runStats.mDef += 10;
        if(upgrade.id === 'spd') { runStats.atkSpdMulti += 0.20; runStats.spdMulti += 0.10; }
        if(upgrade.id === 'crit') { runStats.crit += 0.05; runStats.critDmg += 0.50; }
        if(upgrade.id === 'splash') runStats.splashDmg += 0.10;
        if(upgrade.id === 'double') runStats.doubleHitChance += 0.10;
        if(upgrade.id === 'lifesteal') runStats.lifesteal += 0.05;
        if(upgrade.id === 'evasion') runStats.evasion += 0.05;
        
    } else if (upgrade.rarity === 'common') {
        runStats.commonUpgradeCounts[upgrade.id] = (runStats.commonUpgradeCounts[upgrade.id] || 0) + 1;
        
        if (upgrade.id === 'heal') { 
            let maxH = getMaxHealth(); 
            applyHeal(player, Math.floor(maxH * 0.25)); 
        }
        if (upgrade.id === 'temp_atk') { 
            runStats.tempAtkActive = true; 
        }
        if (upgrade.id === 'vitality') { 
            runStats.maxHpBonus += upgrade.effect.hp; 
            player.currentHealth += upgrade.effect.hp; 
            updatePlayerHealthBar(); 
        }
    }

    updateCombatStatsPanel();
    continueToNextWave();
}

function showBossClearUI() {
    document.getElementById('boss-clear-ui').style.display = 'flex';
    document.getElementById('boss-ui-gold').innerText = runStats.goldGained;
    document.getElementById('boss-ui-gems').innerText = runStats.gemsGained;
    document.getElementById('boss-ui-exp').innerText = runStats.expGained;
}

function continueToNextWave() {
    document.getElementById('wave-upgrade-ui').style.display = 'none';
    document.getElementById('boss-clear-ui').style.display = 'none';
    
    waveManager.wave++; 
    waveManager.isUpgrading = true; 
    
    spawnEnemyPack();
    playBattleStartAnimation();

    setTimeout(() => {
        waveManager.isUpgrading = false; 
        waveManager.transitioning = false;
        startCombatLoop(); 
    }, 1500); 
}

function endRun(titleText, titleColor, killerText = "") {
    isTestMode = false;
    document.getElementById('debug-panel').style.display = 'none';

    clearInterval(combatTickInterval); 
    document.getElementById('wave-upgrade-ui').style.display = 'none';
    document.getElementById('boss-clear-ui').style.display = 'none';

    let summaryUi = document.getElementById('run-summary-ui');
    let titleEl = document.getElementById('run-summary-title');
    let killerEl = document.getElementById('run-summary-killer');

    titleEl.innerText = titleText; 
    titleEl.style.color = titleColor;

    if (killerEl) {
        if (killerText) {
            killerEl.innerText = killerText; 
            killerEl.style.display = 'block';
        } else {
            killerEl.style.display = 'none';
        }
    }

    document.getElementById('summary-kills').innerText = runStats.enemiesKilled;
    document.getElementById('summary-gold').innerText = runStats.goldGained;
    document.getElementById('summary-exp').innerText = runStats.expGained;
    summaryUi.style.display = 'flex';
    
    waveManager.transitioning = false;
    waveManager.isUpgrading = false;
}

function triggerGameOver(killerText = "Slain by Unknown Forces") { 
    player.currentHealth = 0; 
    updatePlayerHealthBar(); 
    endRun('DEFEATED', '#e74c3c', killerText); 
}

function fleeCombat() { 
    endRun('RETREATED', '#f39c12'); 
}

function collectRunRewards() {
    let hStats = player.heroStats[player.currentHero];
    if (hStats) {
        hStats.exp += runStats.expGained; let leveledUp = false;
        while(hStats.exp >= hStats.expNeeded) {
            hStats.level++; hStats.exp -= hStats.expNeeded; hStats.expNeeded = Math.floor(hStats.expNeeded * 1.5);
            player.talentPoints++; player.maxHealth += 25; 
            leveledUp = true;
        }
        if(leveledUp) showNotification(`🎉 Level Up! You are now Level ${hStats.level}!`);
    }
    
    document.getElementById('run-summary-ui').style.display = 'none';
    document.getElementById('boss-clear-ui').style.display = 'none';
    
    openMenu('stages'); 
    updateUI();
    
    waveManager.transitioning = false;
    waveManager.isUpgrading = false;
}

function updateUI() {
    document.getElementById('gold-amount').innerText = player.gold;
    document.getElementById('gem-amount').innerText = player.gems;
    
    if (player.heroStats && player.heroStats[player.currentHero]) {
        let activeH = player.heroStats[player.currentHero];
        document.getElementById('player-level-text').innerText = activeH.level;
        document.getElementById('player-exp-fill').style.width = ((activeH.exp / activeH.expNeeded) * 100) + '%';
        document.getElementById('player-exp-text').innerText = activeH.exp + '/' + activeH.expNeeded;
    }
    
    document.getElementById('tp-amount').innerText = player.talentPoints;
    
    let elDmg = document.getElementById('talent-lvl-damage');
    let elGold = document.getElementById('talent-lvl-gold');
    if(elDmg && player.talents) elDmg.innerText = player.talents.damage || 0;
    if(elGold && player.talents) elGold.innerText = player.talents.gold || 0;
}

function generateRandomEquipment() {
    if (equipmentData && equipmentData.length > 0) {
        let baseItem = equipmentData[Math.floor(Math.random() * equipmentData.length)];
        
        let statsCopy = {};
        if (baseItem.stats) {
            for (let key in baseItem.stats) { statsCopy[key] = baseItem.stats[key]; }
        }

        return { 
            name: baseItem.name, 
            type: baseItem.slot, 
            slot: baseItem.slot, 
            icon: baseItem.icon, 
            stats: statsCopy, 
            onHit: baseItem.onHit || null, 
            onHitTaken: baseItem.onHitTaken || null 
        };
    }

    const slots = ['head', 'body', 'legs', 'boots', 'weapon', 'leftHand', 'ring', 'amulet'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const prefixes = ['Rusty', 'Iron', 'Steel'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    const itemTypes = {
        'head': { name: 'Helm', icon: '🪖', stats: ['pDef', 'mDef', 'maxHp'] },
        'body': { name: 'Armor', icon: '👕', stats: ['pDef', 'mDef', 'maxHp'] },
        'legs': { name: 'Greaves', icon: '👖', stats: ['pDef', 'spd', 'evasion'] },
        'boots': { name: 'Boots', icon: '🥾', stats: ['spd', 'evasion', 'mDef'] },
        'weapon': { name: 'Sword', icon: '🗡️', stats: ['pAtk', 'mAtk', 'atkSpd', 'crit'] },
        'leftHand': { name: 'Off-Hand', icon: '🛡️', stats: ['pDef', 'mDef', 'maxHp', 'mAtk', 'pAtk'] },
        'ring': { name: 'Ring', icon: '💍', stats: ['pAtk', 'mAtk', 'luck', 'crit'] },
        'amulet': { name: 'Amulet', icon: '🧿', stats: ['maxHp', 'luck', 'evasion'] }
    };

    const itemDef = itemTypes[slot];
    let fallbackStats = {};
    let statName = itemDef.stats[0];
    fallbackStats[statName] = 5;

    return { 
        name: `${prefix} ${itemDef.name}`, 
        type: slot, 
        slot: slot, 
        icon: itemDef.icon, 
        stats: fallbackStats, 
        onHit: null, 
        onHitTaken: null 
    };
}

async function initGame() {
    try {
        const heroesResponse = await fetch('heroes.json');
        if (!heroesResponse.ok) throw new Error("HTTP error " + heroesResponse.status);
        heroData = await heroesResponse.json();

        const itemsResponse = await fetch('items.json');
        const itemsData = await itemsResponse.json();

        const enemiesResponse = await fetch('enemies.json');
        enemiesData = await enemiesResponse.json();

        try {
            let equipResponse = await fetch('equipment.json');
            if (!equipResponse.ok) equipResponse = await fetch('equipments.json');
            if (equipResponse.ok) { equipmentData = await equipResponse.json(); } 
        } catch (err) { console.warn("Failed to fetch equipment:", err); }

        runUpgradeData = itemsData.runUpgradeData || [];
        commonUpgradesData = itemsData.commonUpgradesData || [];
        bossSkillsData = itemsData.bossSkillsData || [];

        for (let h in heroData) { 
            if (!player.heroStats[h]) { player.heroStats[h] = { level: 1, exp: 0, expNeeded: 100 }; }
            if (player.heroSkillLevels[h] === undefined) { player.heroSkillLevels[h] = 0; } 
        }

        if (heroData.warrior) { setActiveHero('warrior'); } else { setActiveHero(Object.keys(heroData)[0]); }

        renderHeroSelection();
        updateUI();
    } catch (error) {
        console.error("Failed to load game data:", error);
    }
}

initGame();
