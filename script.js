// --- GAME DATA ---
        let gameSpeed = 1; // 1 = Slow (Default), 2 = Fast

let heroData = {};

        let player = {
            level: 1, exp: 0, expNeeded: 100, talentPoints: 0,
            gold: 0, gems: 0, currentHero: 'warrior', bonusDamage: 0,
            talents: { damage: 0, gold: 0 }, maxHealth: 100, currentHealth: 100
        };

        // Run Stats & Upgrade Tracking
        let runStats = {
            bonusAtk: 0, splashDmg: 0.0, doubleHitChance: 0.0, critChance: 0.0,
            lifesteal: 0.0, evasion: 0.0, damageReduction: 0.0, atkSpeedBonus: 0.0,
            dmgMultiplier: 1.0, goldMultiplier: 1.0, enemyHpMultiplier: 1.0,

                runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
                upgradeLevels: { atk: 0, spd: 0, splash: 0, double: 0, crit: 0, lifesteal: 0, evasion: 0, armor: 0 },
                hasRareUpgrade: false, hasUltimateUpgrade: false
};

        // MASTER UPGRADE DATABASE
        let runUpgradeData = [];
        let commonUpgradesData = [];

        let bossSkillsData = [];

        let cursedRelicsData = [];

        let activeEnemies = [];
        let waveManager = { wave: 1, isUpgrading: false, normalEmojis: ['👾', '🧟', '🦇', '💀', '🕷️', '🦂'], bossEmojis: ['🐉', '👹', '🦑', '🦖'] };
        let enemyAttackTimer;
        let playerAttackTimer;

        // --- NAVIGATION & GENERAL LOGIC ---
        const screens = ['home', 'heroes', 'gear', 'talents', 'shop', 'game'];

        function openMenu(targetScreen) {
            if(targetScreen !== 'game') { clearInterval(enemyAttackTimer); clearInterval(playerAttackTimer); }
            screens.forEach(s => document.getElementById('screen-' + s).classList.remove('active'));
            document.getElementById('screen-' + targetScreen).classList.add('active');

            if(targetScreen !== 'game') {
                document.getElementById('bottom-nav-bar').style.display = 'flex';
                screens.forEach(s => { if(document.getElementById('btn-' + s)) document.getElementById('btn-' + s).classList.remove('active'); });
                document.getElementById('btn-' + targetScreen).classList.add('active');
            } else {
                document.getElementById('bottom-nav-bar').style.display = 'none';
            }
        }


        function renderHeroSelection() {
            let container = document.querySelector('#screen-heroes .list-container');
            if (!container) return;
            container.innerHTML = '';
            for (let heroId in heroData) {
                let hero = heroData[heroId];
                let isSelected = player.currentHero === heroId ? 'selected' : '';
                container.innerHTML += `
                <div class="card ${isSelected}" id="card-${heroId}" onclick="selectHero('${heroId}')">
                    <div class="card-icon">${hero.emoji}</div>
                    <div class="card-info">
                        <h3>${hero.name}</h3>
                        <p>Base Damage: ${hero.baseDamage}</p>
                        <p style="color: #f1c40f; font-size: 0.8rem;">${hero.innateDesc || ''}</p>
                    </div>
                </div>`;
            }
        }

        function selectHero(heroId) {
            player.currentHero = heroId;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
            document.getElementById('card-' + heroId).classList.add('selected');
            document.getElementById('home-hero').innerText = heroData[heroId].emoji;
            document.getElementById('home-weapon').innerText = heroData[heroId].weapon;
        }

        function upgradeTalent(type) {
            if (player.talentPoints > 0) { player.talentPoints--; player.talents[type]++; updateUI(); }
            else { alert("You need Talent Points!"); }
        }

        function buyPermanentUpgrade() {
            if(player.gold >= 100) { player.gold -= 100; player.bonusDamage += 15; updateUI(); }
            else { alert("Not enough Gold!"); }
        }

        function buyPremium(item) {
            if (item === 'gold' && player.gems >= 10) { player.gems -= 10; player.gold += 1000; updateUI(); alert("Purchased 1,000 Gold!"); }
            else if (item === 'damage' && player.gems >= 50) { player.gems -= 50; player.bonusDamage += 50; updateUI(); alert("Purchased +50 Permanent DMG!"); }
            else { alert("Not enough Gems!"); }
        }

        // --- GAME SPEED TOGGLE ---
        function toggleGameSpeed() {
            gameSpeed = gameSpeed === 1 ? 2 : 1;
            document.getElementById('speed-toggle-btn').innerText = gameSpeed === 1 ? '▶️ x1' : '⏩ x2';

            // Instantly apply the new speed if in combat
            if (!waveManager.isUpgrading && document.getElementById('screen-game').classList.contains('active')) {
                startPlayerAutoAttack();
                startEnemyAutoAttack();
            }
        }

        // --- COMBAT CORE ---
        function getTotalDamage() {
            let rawDamage = heroData[player.currentHero].baseDamage + player.bonusDamage + runStats.bonusAtk;
            return Math.floor(rawDamage * (1 + (player.talents.damage * 0.10)) * runStats.dmgMultiplier);
        }

        function updateCombatStatsPanel() {
            let panel = document.getElementById('combat-stats-panel');
            let aps = (1 + runStats.atkSpeedBonus).toFixed(2);

            panel.innerHTML = `
                <div class="combat-stats-icon" id="player-combat-icon">${heroData[player.currentHero].emoji}</div>
                <div>
                    <p>⚔️ ${getTotalDamage()} DMG</p>
                    <p>⏱️ ${aps}/s Atk Spd</p>
                    <p>🎯 ${Math.round(runStats.critChance * 100)}% Crit</p>
                </div>
                <div>
                    <p>🛡️ ${Math.round(runStats.damageReduction * 100)}% Arm</p>
                    <p>💨 ${Math.round(runStats.evasion * 100)}% Ddg</p>
                    <p>🩸 ${Math.round(runStats.lifesteal * 100)}% L.S.</p>
                </div>
            `;
            document.getElementById('run-runes-text').innerText = runStats.runes;
        }

        function spawnFloatingText(targetId, text, className) {
            let targetDiv = document.getElementById(targetId);
            if(!targetDiv) return;

            let ft = document.createElement('div');
            ft.className = `floating-text ${className}`;
            ft.innerText = text;

            let offsetX = (Math.random() * 40) - 20;
            ft.style.left = `calc(50% + ${offsetX}px)`;
            ft.style.top = '10px';

            targetDiv.appendChild(ft);
            setTimeout(() => { if(ft.parentElement) ft.remove(); }, 800);
        }

        function spawnLootDrop(targetId, type) {
            let targetDiv = document.getElementById(targetId);
            if(!targetDiv) return;

            let emoji = type === 'rune' ? '🌀' : '🪙';
            let ft = document.createElement('div');
            ft.className = 'loot-drop';
            ft.innerText = emoji;

            let dirX = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random());
            ft.style.setProperty('--dirX', dirX);

            ft.style.left = '50%';
            ft.style.top = '30%';

            targetDiv.appendChild(ft);
            setTimeout(() => { if(ft.parentElement) ft.remove(); }, 800);
        }


        function startGame() {
            runStats = {
                bonusAtk: 0, splashDmg: 0.0, doubleHitChance: 0.0, critChance: 0.0,
                lifesteal: 0.0, evasion: 0.0, damageReduction: 0.0, atkSpeedBonus: 0.0,
                dmgMultiplier: 1.0, goldMultiplier: 1.0, enemyHpMultiplier: 1.0,

                runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
                upgradeLevels: { atk: 0, spd: 0, splash: 0, double: 0, crit: 0, lifesteal: 0, evasion: 0, armor: 0 },
                hasRareUpgrade: false, hasUltimateUpgrade: false
};

            // Apply innate abilities
            if (heroData[player.currentHero] && heroData[player.currentHero].innate) {
                let innate = heroData[player.currentHero].innate;
                for (let key in innate) {
                    if (runStats.hasOwnProperty(key)) {
                        runStats[key] += innate[key];
                    }
                }
            }
waveManager.wave = 1;
            player.currentHealth = player.maxHealth;

            document.getElementById('run-summary-ui').style.display = 'none';
            document.getElementById('wave-upgrade-ui').style.display = 'none';
            document.getElementById('boss-clear-ui').style.display = 'none';
            waveManager.isUpgrading = false;

            updateCombatStatsPanel();
            openMenu('game');
            spawnEnemyPack();

            startEnemyAutoAttack();
            startPlayerAutoAttack();
        }

        function startEnemyAutoAttack() {
            clearInterval(enemyAttackTimer);
            // Default speed (1) = 3 seconds. Fast speed (2) = 1.5 seconds.
            enemyAttackTimer = setInterval(enemyStrikesBack, 3000 / gameSpeed);
        }

        function startPlayerAutoAttack() {
            clearInterval(playerAttackTimer);
            // Default speed (1) = 2 seconds. Fast speed (2) = 1 second. (Modified by Atk Speed Bonus)
            let interval = 2000 / (gameSpeed * Math.max(0.1, (1 + runStats.atkSpeedBonus)));
            playerAttackTimer = setInterval(autoAttackEnemy, interval);
        }

        function getLevelAndWave() {
            let stageLvl = Math.floor((waveManager.wave - 1) / 15) + 1;
            let stageWave = ((waveManager.wave - 1) % 15) + 1;
            return { level: stageLvl, wave: stageWave, isBoss: stageWave === 15 };
        }

        function spawnEnemyPack() {
            let container = document.getElementById('enemy-container');
            let textEl = document.getElementById('level-wave-text');

            container.innerHTML = ''; activeEnemies = []; waveManager.isUpgrading = false;

            let stageInfo = getLevelAndWave();

            if (stageInfo.isBoss) {
                let bossHp = Math.floor((150 + (waveManager.wave * 25)) * runStats.enemyHpMultiplier);
                let bossDmg = 5 + Math.floor(waveManager.wave * 1.2);
                let bSkill = bossSkillsData[Math.floor(Math.random() * bossSkillsData.length)];

                activeEnemies.push({ id: 0, maxHp: bossHp, hp: bossHp, damage: bossDmg, skill: bSkill.id, isDead: false, isBoss: true });

                textEl.innerHTML = `<span style="color:#e74c3c; text-shadow: 0 0 10px #e74c3c;">⚠️ BOSS Level ${stageInfo.level} - Wave ${stageInfo.wave} ⚠️</span>`;
                container.innerHTML = `
                    <div class="enemy-unit boss" id="enemy-0">
                        <div class="emoji">${waveManager.bossEmojis[Math.floor(Math.random() * waveManager.bossEmojis.length)]}</div>
                        <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-0"></div></div>
                        <div class="mini-hp-text" id="enemy-hp-text-0">${bossHp}/${bossHp}</div>
                        <div class="boss-skill-badge" title="${bSkill.desc}">${bSkill.icon} ${bSkill.name}</div>
                    </div>`;
            } else {
                let enemyCount = Math.min(5, Math.floor(((waveManager.wave - 1) % 15) / 3) + 1);
                let normHp = Math.floor((20 + (waveManager.wave * 10)) * runStats.enemyHpMultiplier);
                let normDmg = Math.max(1, Math.floor(waveManager.wave * 0.6));
                let packEmoji = waveManager.normalEmojis[Math.floor(Math.random() * waveManager.normalEmojis.length)];

                textEl.innerHTML = `Level ${stageInfo.level} - Wave ${stageInfo.wave}`;

                for(let i = 0; i < enemyCount; i++) {
                    let isElite = Math.random() < 0.20;
                    let finalHp = isElite ? normHp * 2 : normHp;
                    let finalDmg = isElite ? normDmg * 2 : normDmg;
                    let eliteClass = isElite ? 'elite' : '';

                    activeEnemies.push({ id: i, maxHp: finalHp, hp: finalHp, damage: finalDmg, skill: null, isDead: false, isBoss: false, isElite: isElite });
                    container.innerHTML += `
                        <div class="enemy-unit ${eliteClass}" id="enemy-${i}">
                            <div class="emoji">${packEmoji}</div>
                            <div class="mini-bar-container"><div class="mini-bar-fill" id="enemy-hp-bar-${i}"></div></div>
                            <div class="mini-hp-text" id="enemy-hp-text-${i}">${finalHp}/${finalHp}</div>
                        </div>`;
                }
            }
        }

        function handleEnemyDeath(target, unitId, unitDiv) {
            if (target.isDead) return;
            target.isDead = true;
            runStats.enemiesKilled++;

            if (target.isBoss) {
                runStats.runes += (5 + waveManager.wave);
                for(let i=0; i<5; i++) {
                    setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'rune'), i * 150);
                }

                let goldEarned = 10;
                runStats.goldGained += goldEarned;
                for(let i=0; i<10; i++) {
                    setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'gold'), i * 100);
                }
            } else if (target.isElite) {
                if (Math.random() < 0.5) { runStats.runes += 1; spawnLootDrop(`enemy-${unitId}`, 'rune'); }

                let goldEarned = 3;
                runStats.goldGained += goldEarned;
                for(let i=0; i<3; i++) {
                    setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'gold'), i * 150);
                }
            } else {
                if (Math.random() < 0.5) { runStats.runes += 1; spawnLootDrop(`enemy-${unitId}`, 'rune'); }

                if (Math.random() < 0.25) {
                    let goldEarned = 1;
                    runStats.goldGained += goldEarned;
                    spawnLootDrop(`enemy-${unitId}`, 'gold');
                }
            }

            document.getElementById('run-runes-text').innerText = runStats.runes;

            if(unitDiv) { unitDiv.classList.add('dead'); setTimeout(() => unitDiv.style.display = 'none', 300); }
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

        function autoAttackEnemy() {
            if(waveManager.isUpgrading || player.currentHealth <= 0 || !document.getElementById('screen-game').classList.contains('active')) return;

            let aliveEnemies = activeEnemies.filter(e => e.hp > 0);
            if(aliveEnemies.length === 0) return;

            let pIcon = document.getElementById('player-combat-icon');
            if(pIcon) { pIcon.classList.add('player-attack-anim'); setTimeout(() => pIcon.classList.remove('player-attack-anim'), 200); }

            let strikes = (Math.random() < runStats.doubleHitChance) ? 2 : 1;

            for (let s = 0; s < strikes; s++) {
                setTimeout(() => {
                    let target = activeEnemies.find(e => e.hp > 0);
                    if (!target) return;

                    let dmg = getTotalDamage();
                    let isCrit = Math.random() < runStats.critChance;
                    if (isCrit) dmg = Math.floor(dmg * 2.5);

                    if (target.skill === 'armor') dmg = Math.floor(dmg * 0.70);

                    target.hp -= dmg;
                    animateHit(target.id, dmg, isCrit);

                    if (runStats.lifesteal > 0) {
                        let healAmount = Math.floor(dmg * runStats.lifesteal);
                        if (healAmount > 0) { player.currentHealth = Math.min(player.maxHealth, player.currentHealth + healAmount); updatePlayerHealthBar(); }
                    }

                    if (runStats.splashDmg > 0) {
                        let sDmg = Math.floor(dmg * runStats.splashDmg);
                        activeEnemies.forEach(e => {
                            if (e.id !== target.id && e.hp > 0) { e.hp -= sDmg; animateHit(e.id, sDmg, false); }
                        });
                    }
                }, s * 150);
            }

            setTimeout(() => { if (activeEnemies.every(e => e.hp <= 0)) packDefeated(); }, 400);
        }

        function enemyStrikesBack() {
            if(!document.getElementById('screen-game').classList.contains('active') || player.currentHealth <= 0 || waveManager.isUpgrading) return;

            let aliveEnemies = activeEnemies.filter(e => e.hp > 0);
            aliveEnemies.forEach((e, index) => {
                setTimeout(() => {
                    if(player.currentHealth <= 0 || waveManager.isUpgrading) return;

                    let unitDiv = document.getElementById(`enemy-${e.id}`);
                    if(unitDiv) { unitDiv.classList.add('attack-anim'); setTimeout(() => unitDiv.classList.remove('attack-anim'), 300); }

                    let incomingDmg = e.damage;

                    if (e.skill === 'crit' && Math.random() < 0.25) { incomingDmg = Math.floor(incomingDmg * 2); spawnFloatingText(`enemy-${e.id}`, "BOSS CRIT!", "float-enemy-dmg"); }
                    if (e.skill !== 'magic' && Math.random() < runStats.evasion) { spawnFloatingText('player-combat-area', "MISS!", "float-miss"); return; }
                    if (e.skill !== 'magic') { incomingDmg = Math.floor(incomingDmg * (1 - runStats.damageReduction)); }
                    if(incomingDmg < 1) incomingDmg = 1;

                    player.currentHealth -= incomingDmg;
                    updatePlayerHealthBar();
                    spawnFloatingText('player-combat-area', "-" + incomingDmg, "float-enemy-dmg");

                    if (e.skill === 'vampire') {
                        e.hp = Math.min(e.maxHp, e.hp + Math.floor(incomingDmg * 0.5));
                        let hpBarDiv = document.getElementById(`enemy-hp-bar-${e.id}`); let hpTextDiv = document.getElementById(`enemy-hp-text-${e.id}`);
                        if (hpBarDiv) hpBarDiv.style.width = (e.hp / e.maxHp) * 100 + '%';
                        if (hpTextDiv) hpTextDiv.innerText = `${Math.ceil(e.hp)}/${e.maxHp}`;
                    }

                    let container = document.getElementById('game-container');
                    container.style.backgroundColor = 'rgba(231, 76, 60, 0.4)';
                    setTimeout(() => { container.style.backgroundColor = '#2c3e50'; }, 100);

                    if (player.currentHealth <= 0) { triggerGameOver(); }
                }, index * 150);
            });
        }

        function updatePlayerHealthBar() {
            let pPercent = Math.max(0, (player.currentHealth / player.maxHealth) * 100);
            let pBar = document.getElementById('player-health');
            pBar.style.width = pPercent + '%';
            document.getElementById('player-hp-text').innerText = Math.max(0, Math.floor(player.currentHealth)) + '/' + player.maxHealth;

            if (pPercent <= 30) pBar.style.backgroundColor = '#e74c3c';
            else if (pPercent <= 50) pBar.style.backgroundColor = '#e67e22';
            else if (pPercent <= 70) pBar.style.backgroundColor = '#f1c40f';
            else pBar.style.backgroundColor = '#2ecc71';
        }

        // --- WAVE DEFEATED & SMART SHOP ---

        function packDefeated() {
            if(waveManager.isUpgrading) return;
            waveManager.isUpgrading = true;

            let isBoss = getLevelAndWave().isBoss;
            let packSize = activeEnemies.length;

            let gemsEarned = 0;
            if (isBoss) gemsEarned = 5; else if (Math.random() > 0.8) gemsEarned = 1;
            runStats.gemsGained += gemsEarned;

            let expGainedThisWave = isBoss ? (100 * waveManager.wave) : (15 * waveManager.wave * packSize);
            runStats.expGained += expGainedThisWave;

            updateCombatStatsPanel();

            // Build shop pool
            let shopPool = [];
            window.currentShopPool = shopPool;

            // Add Common
            commonUpgradesData.forEach(u => shopPool.push({ ...u, rarity: 'common', cost: 1 }));

            // Add Uncommon (if not maxed)
            runUpgradeData.forEach(u => {
                if (runStats.upgradeLevels[u.id] < u.maxLevel) {
                    let cost = 1 + (runStats.upgradeLevels[u.id] * 2);
                    shopPool.push({ ...u, rarity: 'uncommon', cost: cost, currentLvl: runStats.upgradeLevels[u.id] });
                }
            });

            // Add Rare and Ultimate if affordable/applicable (for simplicity, they are one-time and cost more)
            let hero = heroData[player.currentHero];
            if (!runStats.hasRareUpgrade && runStats.runes >= 5) {
                shopPool.push({ ...hero.rareUpgrade, id: 'rare_upg', rarity: 'rare', cost: 5, type: 'rare' });
            }
            if (!runStats.hasUltimateUpgrade && runStats.runes >= 10) {
                shopPool.push({ ...hero.ultimateUpgrade, id: 'ult_upg', rarity: 'ultimate', cost: 10, type: 'ultimate' });
            }

            let canAffordAny = shopPool.some(u => runStats.runes >= u.cost);
            if(isBoss) {
                showBossClearUI();
            } else if (shopPool.length === 0 || !canAffordAny) {
                setTimeout(() => { continueToNextWave(); }, 1000 / gameSpeed);
            } else {
                showUpgradeShop(shopPool);
            }
        }

        function showUpgradeShop(shopPool) {
            document.getElementById('wave-upgrade-ui').style.display = 'flex';
            document.getElementById('shop-runes-display').innerText = runStats.runes;

            let list = document.getElementById('upgrade-list'); list.innerHTML = '';

            // Shuffle pool
            for (let i = shopPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shopPool[i], shopPool[j]] = [shopPool[j], shopPool[i]];
            }

            shopPool.slice(0, 3).forEach(u => {
                let canAfford = runStats.runes >= u.cost;
                let lvlText = u.rarity === 'uncommon' ? ` <span class="lvl-badge">(Lv ${u.currentLvl + 1}/${u.maxLevel})</span>` : '';

                list.innerHTML += `
                    <button class="upgrade-btn rarity-${u.rarity} ${canAfford ? '' : 'disabled'}" onclick="buyRunUpgrade(window.currentShopPool[${shopPool.indexOf(u)}])">
                        <div class="info">
                            <h4>${u.name}${lvlText}</h4>
                            <p>${u.desc}</p>
                        </div>
                        <div class="cost">${u.cost} 🌀</div>
                    </button>`;
            });
        }

        function buyRunUpgrade(upgrade) {
            if (runStats.runes < upgrade.cost) return;

            runStats.runes -= upgrade.cost;

            if (upgrade.rarity === 'uncommon') {
                runStats.upgradeLevels[upgrade.id]++;
                if(upgrade.id === 'atk') runStats.bonusAtk += 20;
                if(upgrade.id === 'spd') { runStats.atkSpeedBonus += 0.10; startPlayerAutoAttack(); }
                if(upgrade.id === 'splash') runStats.splashDmg += 0.10;
                if(upgrade.id === 'double') runStats.doubleHitChance += 0.10;
                if(upgrade.id === 'crit') runStats.critChance += 0.10;
                if(upgrade.id === 'lifesteal') runStats.lifesteal += 0.05;
                if(upgrade.id === 'evasion') runStats.evasion += 0.05;
                if(upgrade.id === 'armor') runStats.damageReduction += 0.05;
            } else if (upgrade.rarity === 'common') {
                if (upgrade.effect.heal) { player.currentHealth = Math.min(player.maxHealth, player.currentHealth + upgrade.effect.heal); updatePlayerHealthBar(); }
                if (upgrade.effect.gold) runStats.goldGained += upgrade.effect.gold;
                if (upgrade.effect.atk) runStats.bonusAtk += upgrade.effect.atk;
            } else if (upgrade.rarity === 'rare' || upgrade.rarity === 'ultimate') {
                if (upgrade.rarity === 'rare') runStats.hasRareUpgrade = true;
                if (upgrade.rarity === 'ultimate') runStats.hasUltimateUpgrade = true;

                for (let key in upgrade.effect) {
                    if (runStats.hasOwnProperty(key)) {
                        runStats[key] += upgrade.effect[key];
                    }
                    if (key === 'maxHealth') {
                        player.maxHealth += upgrade.effect[key];
                        player.currentHealth += upgrade.effect[key];
                        updatePlayerHealthBar();
                    }
                    if (key === 'heal') {
                        player.currentHealth = Math.min(player.maxHealth, player.currentHealth + upgrade.effect[key]);
                        updatePlayerHealthBar();
                    }
                }
                startPlayerAutoAttack(); // Re-trigger just in case atk speed changed
            }

            updateCombatStatsPanel();
            continueToNextWave();
        }
function showBossClearUI() {
            document.getElementById('boss-clear-ui').style.display = 'flex';
            document.getElementById('boss-ui-gold').innerText = runStats.goldGained;
            document.getElementById('boss-ui-gems').innerText = runStats.gemsGained;
            document.getElementById('boss-ui-exp').innerText = runStats.expGained;

            let list = document.getElementById('cursed-list'); list.innerHTML = '';

            let shuffledCurses = cursedRelicsData.sort(() => 0.5 - Math.random());
            let c = shuffledCurses[0];

            list.innerHTML = `
                <button class="upgrade-btn cursed-btn" onclick="selectCursedRelic('${c.id}')" id="btn-curse-${c.id}">
                    <div class="info"><h4>${c.name}</h4><p>${c.desc}</p><p class="curse-text">${c.curseDesc}</p></div>
                    <div class="cost">${c.icon}</div>
                </button>`;

            document.getElementById('btn-descend').disabled = true;
        }



        function selectCursedRelic(id) {
            if(id === 'glass') { runStats.dmgMultiplier += 0.20; runStats.critChance += 0.25; adjustMaxHp(-0.30); }
            if(id === 'berserk') { runStats.atkSpeedBonus += 0.40; runStats.bonusAtk -= 15; startPlayerAutoAttack(); }
            if(id === 'phantom') { runStats.evasion += 0.15; adjustMaxHp(-0.20); }
            if(id === 'giant') { runStats.bonusAtk += 30; runStats.splashDmg += 0.10; runStats.atkSpeedBonus -= 0.20; startPlayerAutoAttack(); }
            if(id === 'blood') { runStats.lifesteal += 0.10; runStats.damageReduction -= 0.15; }
            if(id === 'midas') { runStats.goldMultiplier += 0.50; runStats.enemyHpMultiplier += 0.20; }
            if(id === 'reckless') { runStats.doubleHitChance += 0.15; runStats.evasion = -999; }
            if(id === 'spiked') { runStats.damageReduction += 0.20; runStats.atkSpeedBonus -= 0.10; startPlayerAutoAttack(); }

            updateCombatStatsPanel();
            document.getElementById(`btn-curse-${id}`).style.borderColor = '#2ecc71';
            document.getElementById('btn-descend').disabled = false;
        }

        function adjustMaxHp(percentChange) {
            let changeAmount = Math.floor(player.maxHealth * percentChange);
            player.maxHealth += changeAmount;
            if(player.currentHealth > player.maxHealth) player.currentHealth = player.maxHealth;
            updatePlayerHealthBar();
        }

        function continueToNextWave() {
            document.getElementById('wave-upgrade-ui').style.display = 'none';
            document.getElementById('boss-clear-ui').style.display = 'none';
            waveManager.wave++;
            spawnEnemyPack();
        }

        // --- GAME OVER & RUN SUMMARY LOGIC ---
        function endRun(titleText, titleColor) {
            clearInterval(enemyAttackTimer);
            clearInterval(playerAttackTimer);
            document.getElementById('wave-upgrade-ui').style.display = 'none';
            document.getElementById('boss-clear-ui').style.display = 'none';

            let summaryUi = document.getElementById('run-summary-ui');
            let titleEl = document.getElementById('run-summary-title');

            titleEl.innerText = titleText;
            titleEl.style.color = titleColor;

            document.getElementById('summary-kills').innerText = runStats.enemiesKilled;
            document.getElementById('summary-gold').innerText = runStats.goldGained;
            document.getElementById('summary-exp').innerText = runStats.expGained;

            summaryUi.style.display = 'flex';
        }

        function triggerGameOver() {
            player.currentHealth = 0;
            updatePlayerHealthBar();
            endRun('DEFEATED', '#e74c3c');
        }

        function fleeCombat() {
            endRun('RETREATED', '#f39c12');
        }

        function collectRunRewards() {
            player.gold += runStats.goldGained;
            player.gems += runStats.gemsGained;
            player.exp += runStats.expGained;

            let leveledUp = false;
            while(player.exp >= player.expNeeded) {
                player.level++; player.exp -= player.expNeeded; player.expNeeded = Math.floor(player.expNeeded * 1.5);
                player.talentPoints++; player.maxHealth += 25; player.currentHealth = player.maxHealth;
                leveledUp = true;
            }
            if(leveledUp) alert("🎉 You Leveled Up from that run!");

            document.getElementById('run-summary-ui').style.display = 'none';
            openMenu('home');
            updateUI();
        }

        // --- UI REFRESH ---
        function updateUI() {
            document.getElementById('gold-amount').innerText = player.gold;
            document.getElementById('gem-amount').innerText = player.gems;

            document.getElementById('player-level-text').innerText = player.level;
            document.getElementById('player-exp-fill').style.width = ((player.exp / player.expNeeded) * 100) + '%';
            document.getElementById('player-exp-text').innerText = player.exp + '/' + player.expNeeded;

            document.getElementById('tp-amount').innerText = player.talentPoints;
            document.getElementById('talent-lvl-damage').innerText = player.talents.damage;
            document.getElementById('talent-lvl-gold').innerText = player.talents.gold;
        }


async function initGame() {
    try {
        const heroesResponse = await fetch('heroes.json');
        heroData = await heroesResponse.json();

        const itemsResponse = await fetch('items.json');
        const itemsData = await itemsResponse.json();

        runUpgradeData = itemsData.runUpgradeData;
        commonUpgradesData = itemsData.commonUpgradesData;
        bossSkillsData = itemsData.bossSkillsData;
        cursedRelicsData = itemsData.cursedRelicsData;

        renderHeroSelection();
        updateUI();

        // Select warrior by default if available
        if (heroData.warrior) {
             selectHero('warrior');
        }
    } catch (error) {
        console.error("Failed to load game data:", error);
    }
}

// Ensure initGame is called
initGame();
