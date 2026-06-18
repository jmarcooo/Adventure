// --- GAME DATA ---
        let gameSpeed = 1; // 1 = Slow (Default), 2 = Fast

let heroData = {};

        let player = {
            level: 1, exp: 0, expNeeded: 100, talentPoints: 0,
            gold: 0, gems: 0, currentHero: 'warrior', bonusDamage: 0,
            talents: { damage: 0, gold: 0 }, maxHealth: 100, currentHealth: 100,
            heroSkillLevels: {},
            equipment: { head: null, body: null, legs: null, weapon: null, shield: null, ring: null, amulet: null },
            inventory: []
        };

        // Run Stats & Upgrade Tracking
        let runStats = {
            pAtk: 0, atkSpd: 0.0, pDef: 0, mAtk: 0, mDef: 0, spd: 0, evasion: 0.0, crit: 0.0, luck: 0.0,
            splashDmg: 0.0, doubleHitChance: 0.0, lifesteal: 0.0,
            pAtkMulti: 1.0, mAtkMulti: 1.0, pDefMulti: 1.0, mDefMulti: 1.0, atkSpdMulti: 1.0,
            goldMultiplier: 1.0, enemyHpMultiplier: 1.0,

                runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
                upgradeLevels: { p_atk: 0, m_atk: 0, spd: 0, splash: 0, double: 0, crit: 0, lifesteal: 0, evasion: 0, p_def: 0, m_def: 0 },
                hasRareUpgrade: false, hasUltimateUpgrade: false,
                commonUpgradeCounts: { heal: 0, gold: 0, temp_atk: 0 }
};

        // MASTER UPGRADE DATABASE
        let runUpgradeData = [];
        let commonUpgradesData = [];

        let bossSkillsData = [];

        let cursedRelicsData = [];

        let viewingHero = null;
        let activeEnemies = [];
        let waveManager = { wave: 1, isUpgrading: false, normalEmojis: ['👾', '🧟', '🦇', '💀', '🕷️', '🦂'], bossEmojis: ['🐉', '👹', '🦑', '🦖'] };
        let enemyAttackTimer;
        let playerAttackTimer;

        // --- NAVIGATION & GENERAL LOGIC ---
        const screens = ['home', 'heroes', 'gear', 'talents', 'shop', 'game'];


        let notificationTimer;
        function showNotification(msg) {
            let el = document.getElementById('in-app-notification');
            if(!el) return;
            el.innerText = msg;
            el.classList.remove('show');
            // Trigger reflow to restart animation
            void el.offsetWidth;
            el.classList.add('show');
        }

        function openMenu(targetScreen) {
            if(targetScreen !== 'game') { clearInterval(enemyAttackTimer); clearInterval(playerAttackTimer); }
            if(targetScreen === 'heroes') { viewingHero = null; renderHeroSelection(); }
            if(targetScreen === 'gear') { renderGearMenu(); }
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
                container.innerHTML += `
                <div class="card ${isSelected}" style="flex-direction: column; text-align: center; gap: 5px;" onclick="viewingHero = '${heroId}'; renderHeroSelection();">
                    <div class="card-icon" style="font-size: 2.5rem;">${hero.emoji}</div>
                    <div class="card-info" style="text-align: center;">
                        <h3 style="font-size: 1rem;">${hero.name}</h3>
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
                    <p><b>P.Atk:</b> <span style="color: #e74c3c;">${hero.pAtk}</span></p>
                    <p><b>M.Atk:</b> <span style="color: #9b59b6;">${hero.mAtk}</span></p>
                    <p><b>P.Def:</b> <span style="color: #f39c12;">${hero.pDef}</span></p>
                    <p><b>M.Def:</b> <span style="color: #3498db;">${hero.mDef}</span></p>
                    <p><b>Speed:</b> <span style="color: #2ecc71;">${hero.spd}</span></p>
                    <p><b>Atk.Spd:</b> <span style="color: #e67e22;">${hero.atkSpd}</span></p>
                    <p><b>Crit:</b> <span style="color: #f1c40f;">${hero.crit * 100}%</span></p>
                    <p><b>Dodge:</b> <span style="color: #1abc9c;">${hero.evasion * 100}%</span></p>
                    <p><b>Luck:</b> <span style="color: #f39c12;">${hero.luck * 100}%</span></p>
                </div>

                <p style="margin-top: 5px;"><b>Innate Passive:</b> <span style="color: #f1c40f;">${hero.innateDesc || 'None'}</span></p>
                <p style="margin-top: 5px;"><b>Active Skill:</b> <span style="color: #3498db;">${hero.innateSkill ? `(${skillChance}%) ${hero.innateSkill.desc}` : 'None'}</span></p>

                <button class="hud-btn" style="width: 100%; margin-top: 15px; padding: 10px; background: #e67e22;" onclick="upgradeHeroSkill('${heroId}')">${btnText}</button>

                <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 15px 0;">
                <p style="font-size: 0.9rem; color: #95a5a6;">Shop Exclusives (Unlock in Run):</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">🟩 <b>${hero.rareUpgrade ? hero.rareUpgrade.name : 'N/A'}:</b> ${hero.rareUpgrade ? hero.rareUpgrade.desc : ''}</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">🟥 <b>${hero.ultimateUpgrade ? hero.ultimateUpgrade.name : 'N/A'}:</b> ${hero.ultimateUpgrade ? hero.ultimateUpgrade.desc : ''}</p>
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
            if (currentLvl >= 2) {
                showNotification("Skill is already Max Level!");
                return;
            }
            let cost = (currentLvl + 1) * 500;
            if (player.gold >= cost) {
                player.gold -= cost;
                player.heroSkillLevels[heroId]++;
                updateUI();
                renderHeroSelection();
                showNotification(`Skill Upgraded to Level ${player.heroSkillLevels[heroId] + 1}!`);
            } else {
                showNotification(`Not enough Gold! Need ${cost} 🪙`);
            }
        }

        function setActiveHero(heroId) {
            player.currentHero = heroId;
            document.getElementById('home-hero').innerText = heroData[heroId].emoji;
            document.getElementById('home-weapon').innerText = heroData[heroId].weapon;
            renderHeroSelection(); // refresh to show it's active
            showNotification(`${heroData[heroId].name} is now your active hero!`);
        }

        function upgradeTalent(type) {
            if (player.talentPoints > 0) { player.talentPoints--; player.talents[type]++; updateUI(); }
            else { showNotification("You need Talent Points!"); }
        }

        function renderGearMenu() {
            // Render Equipped Slots
            let slots = ['head', 'body', 'legs', 'weapon', 'shield', 'ring', 'amulet'];
            slots.forEach(slot => {
                let el = document.getElementById(`slot-${slot}`);
                if (el) {
                    if (player.equipment[slot]) {
                        el.innerHTML = `<span style="cursor:pointer;" onclick="showGearModal(player.equipment['${slot}'], 'equipped', '${slot}')">${player.equipment[slot].icon}</span>`;
                    } else {
                        el.innerHTML = '';
                    }
                }
            });

            // Render Inventory
            let grid = document.getElementById('inventory-grid');
            if (grid) {
                grid.innerHTML = '';
                // Fill minimum 12 slots for visual aesthetics
                let totalSlots = Math.max(12, player.inventory.length);
                for(let i=0; i < totalSlots; i++) {
                    let item = player.inventory[i];
                    if (item) {
                        grid.innerHTML += `<div class="inv-slot" style="cursor:pointer;" onclick="showGearModal(player.inventory[${i}], 'inventory', ${i})">${item.icon}</div>`;
                    } else {
                        grid.innerHTML += `<div class="inv-slot"></div>`;
                    }
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

                    statsDiv.innerHTML += `<div style="display: flex; justify-content: space-between;">
                        <span>${statNames[stat]}:</span>
                        <span><b>${itemVal}</b> ${diffHtml}</span>
                    </div>`;
                }
            }

            let actionBtn = document.getElementById('gear-modal-action-btn');
            if (source === 'inventory') {
                actionBtn.innerText = 'EQUIP';
                actionBtn.onclick = () => {
                    equipItem(key, item.slot);
                    document.getElementById('gear-details-modal').style.display = 'none';
                };
            } else {
                actionBtn.innerText = 'UNEQUIP';
                actionBtn.onclick = () => {
                    unequipItem(key);
                    document.getElementById('gear-details-modal').style.display = 'none';
                };
            }

            document.getElementById('gear-details-modal').style.display = 'flex';
        }

        function equipItem(invIndex, slot) {
            let itemToEquip = player.inventory[invIndex];
            let currentEquipped = player.equipment[slot];

            player.equipment[slot] = itemToEquip;
            player.inventory.splice(invIndex, 1);

            if (currentEquipped) {
                player.inventory.push(currentEquipped);
            }

            renderGearMenu();
        }

        function unequipItem(slot) {
            let item = player.equipment[slot];
            if (item) {
                player.inventory.push(item);
                player.equipment[slot] = null;
            }
            renderGearMenu();
        }


        function buyPremium(item) {
            if (item === 'gold' && player.gems >= 10) { player.gems -= 10; player.gold += 1000; updateUI(); showNotification("Purchased 1,000 Gold!"); }
            else if (item === 'damage' && player.gems >= 50) { player.gems -= 50; player.bonusDamage += 50; updateUI(); showNotification("Purchased +50 Permanent DMG!"); }
            else { showNotification("Not enough Gems!"); }
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

        function getEquipmentStats() {
            let eqStats = { pAtk: 0, mAtk: 0, pDef: 0, mDef: 0, atkSpd: 0, spd: 0, evasion: 0, crit: 0, luck: 0 };
            for (let slot in player.equipment) {
                let item = player.equipment[slot];
                if (item && item.stats) {
                    for (let key in eqStats) {
                        if (item.stats[key]) eqStats[key] += item.stats[key];
                    }
                }
            }
            return eqStats;
        }

        function getPlayerStats() {
            let hero = heroData[player.currentHero];
            let eq = getEquipmentStats();
            return {
                pAtk: Math.floor((hero.pAtk + runStats.pAtk + eq.pAtk) * runStats.pAtkMulti),
                mAtk: Math.floor((hero.mAtk + runStats.mAtk + eq.mAtk) * runStats.mAtkMulti),
                pDef: Math.floor((hero.pDef + runStats.pDef + eq.pDef) * runStats.pDefMulti),
                mDef: Math.floor((hero.mDef + runStats.mDef + eq.mDef) * runStats.mDefMulti),
                atkSpd: (hero.atkSpd + runStats.atkSpd + eq.atkSpd) * runStats.atkSpdMulti,
                spd: hero.spd + runStats.spd + eq.spd,
                evasion: hero.evasion + runStats.evasion + eq.evasion,
                crit: hero.crit + runStats.crit + eq.crit,
                luck: hero.luck + runStats.luck + eq.luck
            };
        }

        function getTotalDamage() {
            let stats = getPlayerStats();
            let baseP = stats.pAtk;
            let baseM = stats.mAtk;

            // Apply talents
            baseP = Math.floor(baseP * (1 + (player.talents.damage * 0.10)));
            baseM = Math.floor(baseM * (1 + (player.talents.damage * 0.10)));

            // Permanent gear logic uses bonusDamage, lets apply to pAtk
            baseP += player.bonusDamage;

            return { pDmg: baseP, mDmg: baseM };
        }



        function addCurrency(type, amount) {
            if (amount <= 0) return;
            if (type === 'gold') {
                player.gold += amount;
                runStats.goldGained += amount;
                spawnFloatingText('gold-container', `+${amount}`, 'float-gold');
            } else if (type === 'gem') {
                player.gems += amount;
                runStats.gemsGained += amount;
                spawnFloatingText('gem-container', `+${amount}`, 'float-gem');
            }
            updateUI();
        }

                function updateCombatStatsPanel() {
            let panel = document.getElementById('combat-stats-panel');
            let stats = getPlayerStats();
            let d = getTotalDamage();

            panel.innerHTML = `
                <div class="combat-stats-icon" id="player-combat-icon">${heroData[player.currentHero].emoji}</div>
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
            setTimeout(() => { if(ft.parentElement) ft.remove(); }, 1500);
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
            setTimeout(() => { if(ft.parentElement) ft.remove(); }, 1500);
        }


        function startGame() {
            runStats = {
                pAtk: 0, atkSpd: 0.0, pDef: 0, mAtk: 0, mDef: 0, spd: 0, evasion: 0.0, crit: 0.0, luck: 0.0,
                splashDmg: 0.0, doubleHitChance: 0.0, lifesteal: 0.0,
                pAtkMulti: 1.0, mAtkMulti: 1.0, pDefMulti: 1.0, mDefMulti: 1.0, atkSpdMulti: 1.0,
                goldMultiplier: 1.0, enemyHpMultiplier: 1.0,

                runes: 0, expGained: 0, goldGained: 0, gemsGained: 0, enemiesKilled: 0,
                upgradeLevels: { p_atk: 0, m_atk: 0, spd: 0, splash: 0, double: 0, crit: 0, lifesteal: 0, evasion: 0, p_def: 0, m_def: 0 },
                hasRareUpgrade: false, hasUltimateUpgrade: false,
                commonUpgradeCounts: { heal: 0, gold: 0, temp_atk: 0 }
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
            let stats = getPlayerStats();
            let interval = 2000 / (gameSpeed * Math.max(0.1, stats.atkSpd));
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
                let rGained = (5 + waveManager.wave); runStats.runes += rGained; spawnFloatingText('in-run-currency', `+${rGained}`, 'float-rune');
                for(let i=0; i<5; i++) {
                    setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'rune'), i * 150);
                }

                let stats = getPlayerStats();
                let goldEarned = Math.floor(10 * (1 + stats.luck));
                addCurrency('gold', goldEarned);
                for(let i=0; i<10; i++) {
                    setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'gold'), i * 100);
                }
            } else if (target.isElite) {
                if (Math.random() < 0.5) { runStats.runes += 1; spawnLootDrop(`enemy-${unitId}`, 'rune'); spawnFloatingText('in-run-currency', '+1', 'float-rune'); }

                let stats = getPlayerStats();
                let goldEarned = Math.floor(3 * (1 + stats.luck));
                addCurrency('gold', goldEarned);
                for(let i=0; i<3; i++) {
                    setTimeout(() => spawnLootDrop(`enemy-${unitId}`, 'gold'), i * 150);
                }
            } else {
                if (Math.random() < 0.5) { runStats.runes += 1; spawnLootDrop(`enemy-${unitId}`, 'rune'); spawnFloatingText('in-run-currency', '+1', 'float-rune'); }

                let stats = getPlayerStats();
                if (Math.random() < 0.25) {
                    let goldEarned = Math.floor(1 * (1 + stats.luck));
                    if (goldEarned < 1) goldEarned = 1;
                    addCurrency('gold', goldEarned);
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

                    let damages = getTotalDamage();
                    let stats = getPlayerStats();
                    let isCrit = Math.random() < stats.crit;

                    // Simple defense math: DMG = Atk - Def (min 1)
                    // If target has armor skill, reduce DMG further
                    let pDmg = Math.max(1, damages.pDmg); // enemies don't have pDef defined right now, so we just use base.
                    let mDmg = Math.max(1, damages.mDmg);

                    let dmg = pDmg + mDmg;
                    if (isCrit) dmg = Math.floor(dmg * 2.5);

                    let hero = heroData[player.currentHero];
                    let innateLvl = player.heroSkillLevels[player.currentHero] || 0;
                    let innateTrigger = false;

                    if (hero.innateSkill && Math.random() < hero.innateSkill.chances[innateLvl]) {
                        innateTrigger = true;
                    }

                    // Pre-damage Innate Logic
                    if (innateTrigger) {
                        spawnFloatingText('player-combat-area', hero.innateSkill.name + "!", "float-crit");
                        if (hero.innateSkill.type === 'hunter_instakill' && !target.isBoss) {
                            dmg = target.hp; // Instakill normal/elite
                        } else if (hero.innateSkill.type === 'berserker_rage') {
                            dmg = dmg * 2;
                        } else if (hero.innateSkill.type === 'warlock_curse') {
                            dmg = dmg * 3;
                            player.currentHealth -= Math.floor(player.maxHealth * 0.05);
                            updatePlayerHealthBar();
                            if (player.currentHealth <= 0) { triggerGameOver(); return; }
                        }
                    }

                    if (target.skill === 'armor' && !(innateTrigger && (hero.innateSkill.type === 'mage_arcane' || hero.innateSkill.type === 'cleric_smite'))) {
                        dmg = Math.floor(dmg * 0.70);
                    }

                    target.hp -= dmg;
                    animateHit(target.id, dmg, isCrit);

                    // Post-damage Innate Logic
                    if (innateTrigger) {
                        if (hero.innateSkill.type === 'warrior_splash') {
                            activeEnemies.forEach(e => { if (e.id !== target.id && e.hp > 0) { e.hp -= dmg; animateHit(e.id, dmg, false); } });
                        } else if (hero.innateSkill.type === 'mage_arcane') {
                            activeEnemies.forEach(e => { if (e.id !== target.id && e.hp > 0) { e.hp -= dmg; animateHit(e.id, dmg, false); } });
                        } else if (hero.innateSkill.type === 'paladin_heal') {
                            let hAmt = Math.floor(player.maxHealth * 0.20);
                            player.currentHealth = Math.min(player.maxHealth, player.currentHealth + hAmt);
                            spawnFloatingText('player-combat-area', `+${hAmt}`, 'float-heal');
                            updatePlayerHealthBar();
                        } else if (hero.innateSkill.type === 'rogue_steal') {
                            addCurrency('gold', 5);
                            spawnLootDrop(`enemy-${target.id}`, 'gold');
                        } else if (hero.innateSkill.type === 'necro_summon') {
                            let d = Math.floor(dmg * 0.5);
                            activeEnemies.forEach(e => { if (e.hp > 0) { e.hp -= d; animateHit(e.id, d, false); } });
                            player.currentHealth = Math.min(player.maxHealth, player.currentHealth + d);
                            updatePlayerHealthBar();
                            if (d > 0) spawnFloatingText('player-combat-area', `+${d}`, 'float-heal');
                        } else if (hero.innateSkill.type === 'beast_bite') {
                            let biteDmg = Math.floor(dmg * 1.5);
                            target.hp -= biteDmg;
                            animateHit(target.id, biteDmg, false);
                        } else if (hero.innateSkill.type === 'monk_combo') {
                            // Extra strikes processed immediately without recursive setTimeouts to avoid complex state tracking
                            target.hp -= dmg; animateHit(target.id, dmg, false);
                            target.hp -= dmg; animateHit(target.id, dmg, false);
                        } else if (hero.innateSkill.type === 'bard_song') {
                            runStats.runes += 1;
                            spawnLootDrop('player-combat-area', 'rune');
                            spawnFloatingText('in-run-currency', '+1', 'float-rune');
                        } else if (hero.innateSkill.type === 'druid_roots') {
                            let d = Math.floor(dmg * 0.5);
                            activeEnemies.forEach(e => { if (e.id !== target.id && e.hp > 0) { e.hp -= d; animateHit(e.id, d, false); } });
                        }
                    }

                    if (runStats.lifesteal > 0) {
                        let healAmount = Math.floor(dmg * runStats.lifesteal);
                        if (healAmount > 0) {
                            player.currentHealth = Math.min(player.maxHealth, player.currentHealth + healAmount);
                            updatePlayerHealthBar();
                            spawnFloatingText('player-combat-area', `+${healAmount}`, 'float-heal');
                        }
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

                    let stats = getPlayerStats();
                    let incomingDmg = e.damage;

                    if (e.skill === 'crit' && Math.random() < 0.25) { incomingDmg = Math.floor(incomingDmg * 2); spawnFloatingText(`enemy-${e.id}`, "BOSS CRIT!", "float-enemy-dmg"); }
                    if (e.skill !== 'magic' && Math.random() < stats.evasion) { spawnFloatingText('player-combat-area', "MISS!", "float-miss"); return; }

                    if (e.skill !== 'magic') {
                        // Enemy deals physical damage, subtract player P.Def
                        incomingDmg = Math.max(1, incomingDmg - stats.pDef);
                    }
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
            if (gemsEarned > 0) addCurrency('gem', gemsEarned);

            let expGainedThisWave = isBoss ? (100 * waveManager.wave) : (15 * waveManager.wave * packSize);
            runStats.expGained += expGainedThisWave;

            updateCombatStatsPanel();

            // Build shop pool
            let shopPool = [];
            window.currentShopPool = shopPool;

            // Add Common (Free, scaling)
            commonUpgradesData.forEach(u => {
                let count = runStats.commonUpgradeCounts[u.id] || 0;
                let scaleMult = count + 1; // Level 1 is 1x, Level 2 is 2x, etc.
                let newEffect = {};
                let newDesc = "";
                if (u.id === 'heal') {
                    newEffect.heal = 25 * scaleMult;
                    newDesc = `Heal ${newEffect.heal} HP`;
                } else if (u.id === 'gold') {
                    newEffect.gold = 50 * scaleMult;
                    newDesc = `Gain ${newEffect.gold} Gold`;
                } else if (u.id === 'temp_atk') {
                    newEffect.atk = 5 * scaleMult;
                    newDesc = `+${newEffect.atk} Base Attack`;
                }
                shopPool.push({ ...u, rarity: 'common', cost: 0, effect: newEffect, desc: newDesc });
            });

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
                if(upgrade.id === 'p_atk') runStats.pAtk += 10;
                if(upgrade.id === 'm_atk') runStats.mAtk += 10;
                if(upgrade.id === 'spd') { runStats.atkSpd += 0.10; startPlayerAutoAttack(); }
                if(upgrade.id === 'splash') runStats.splashDmg += 0.10;
                if(upgrade.id === 'double') runStats.doubleHitChance += 0.10;
                if(upgrade.id === 'crit') runStats.crit += 0.10;
                if(upgrade.id === 'lifesteal') runStats.lifesteal += 0.05;
                if(upgrade.id === 'evasion') runStats.evasion += 0.05;
                if(upgrade.id === 'p_def') runStats.pDef += 10;
                if(upgrade.id === 'm_def') runStats.mDef += 10;
            } else if (upgrade.rarity === 'common') {
                runStats.commonUpgradeCounts[upgrade.id]++;
                if (upgrade.effect.heal) { player.currentHealth = Math.min(player.maxHealth, player.currentHealth + upgrade.effect.heal); updatePlayerHealthBar(); }
                if (upgrade.effect.gold) addCurrency('gold', upgrade.effect.gold);
                if (upgrade.effect.atk) { runStats.pAtk += upgrade.effect.atk; runStats.mAtk += upgrade.effect.atk; }
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
            player.exp += runStats.expGained;

            let leveledUp = false;
            while(player.exp >= player.expNeeded) {
                player.level++; player.exp -= player.expNeeded; player.expNeeded = Math.floor(player.expNeeded * 1.5);
                player.talentPoints++; player.maxHealth += 25; player.currentHealth = player.maxHealth;
                leveledUp = true;
            }
            if(leveledUp) showNotification("🎉 You Leveled Up from that run!");

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
             setActiveHero('warrior');
        }

        // Initialize heroSkillLevels
        for (let h in heroData) {
            if (player.heroSkillLevels[h] === undefined) {
                player.heroSkillLevels[h] = 0;
            }
        }
        renderHeroSelection();
    } catch (error) {
        console.error("Failed to load game data:", error);
    }
}

// Ensure initGame is called
initGame();
