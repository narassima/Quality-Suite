document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // QFD State Management
    // ----------------------------------------------------
    let qfdState = {
        whats: [],
        hows: [],
        relations: {},      // key: "whatId_howId", value: 9 | 3 | 1 | 0
        roof: {},           // key: "howIdA_howIdB", value: '++', '+', '-', '--', ''
        benchmark: {},      // key: "whatId", value: { us: 3, compA: 3, compB: 3 }
        techTargets: {}     // key: "howId", value: { target: '', compA: '', compB: '' }
    };

    // ----------------------------------------------------
    // Default Case Study Data (SecuTech Smart IoT Lock)
    // ----------------------------------------------------
    const defaultWhats = [
        { id: 'w1', text: 'Long battery lifespan', importance: 5 },
        { id: 'w2', text: 'Instant mobile synchronization', importance: 4 },
        { id: 'w3', text: 'Robust physically secure chassis', importance: 5 },
        { id: 'w4', text: 'Simple weatherproofing for outdoors', importance: 3 },
        { id: 'w5', text: 'Intuitive guest access setup', importance: 4 }
    ];

    const defaultHows = [
        { id: 'h1', text: 'Standby current consumption', unit: 'mA', direction: 'minimize' },
        { id: 'h2', text: 'BT/Wi-Fi chip TX power settings', unit: 'dBm', direction: 'maximize' },
        { id: 'h3', text: 'Enclosure material shear strength', unit: 'MPa', direction: 'maximize' },
        { id: 'h4', text: 'Rubber gasket ingress sealing level', unit: 'IP rating', direction: 'maximize' },
        { id: 'h5', text: 'API response sync latency', unit: 'ms', direction: 'minimize' }
    ];

    const defaultRelations = {
        'w1_h1': 9, 'w1_h2': 3,
        'w2_h2': 9, 'w2_h5': 9,
        'w3_h3': 9,
        'w4_h4': 9, 'w4_h3': 3,
        'w5_h5': 3
    };

    const defaultRoof = {
        'h1_h2': '--', // standy current vs transmission power
        'h2_h5': '++', // transmission power vs sync latency
        'h3_h4': '+'   // material strength vs weather sealing
    };

    const defaultBenchmark = {
        'w1': { us: 4, compA: 3, compB: 5 },
        'w2': { us: 3, compA: 4, compB: 5 },
        'w3': { us: 5, compA: 4, compB: 3 },
        'w4': { us: 4, compA: 4, compB: 4 },
        'w5': { us: 3, compA: 5, compB: 4 }
    };

    const defaultTechTargets = {
        'h1': { target: '< 0.05', compA: '0.08', compB: '0.03' },
        'h2': { target: '+4', compA: '+2', compB: '+8' },
        'h3': { target: '> 250', compA: '200', compB: '150' },
        'h4': { target: 'IP66', compA: 'IP65', compB: 'IP54' },
        'h5': { target: '< 150', compA: '220', compB: '100' }
    };

    // ----------------------------------------------------
    // Knowledge Base / RAG Content
    // ----------------------------------------------------
    const qfdKnowledge = {
        general: {
            title: "QFD & House of Quality Fundamentals",
            content: "Quality Function Deployment (QFD) was established in 1966 by Yoji Akao in Japan. It converts qualitative customer expectations (WHATs) into quantitative engineering target specifications (HOWs). The iconic 'House of Quality' structure helps cross-functional design teams identify key trade-offs early in the design stage, thereby eliminating late-stage engineering changes."
        },
        guruQuotes: [
            { guru: "Yoji Akao", quote: "QFD is a method for developing a design quality aimed at satisfying the consumer and then translating the consumer's demand into design targets." },
            { guru: "Clausing & Hauser", quote: "The House of Quality is a kind of conceptual map that provides the means for inter-functional planning and communication." },
            { guru: "Noriaki Kano", quote: "Ensure you distinguish between 'Must-Be' quality elements (which customers expect as standard) and 'Attractive' quality elements (which surprise and delight them)." }
        ]
    };

    // ----------------------------------------------------
    // Initializer
    // ----------------------------------------------------
    function init() {
        initNavigation();
        initWorkspaceSelector();
        initStepEditors();
        initAdvisor();
        initPDFExporters();
        
        // Auto-load KaTeX expressions on first page
        try {
            renderMathInElement(document.body, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\[', display: true }
                ],
                throwOnError: false
            });
        } catch (e) {
            console.warn("KaTeX loading skipped or failed", e);
        }
    }

    // ----------------------------------------------------
    // Sidebar Navigation
    // ----------------------------------------------------
    function initNavigation() {
        const steps = document.querySelectorAll('.nav-step');
        const sections = document.querySelectorAll('.display-section');

        steps.forEach(step => {
            step.addEventListener('click', (e) => {
                e.preventDefault();
                const targetStep = step.getAttribute('data-step');

                // Toggle active link
                steps.forEach(s => s.classList.remove('active'));
                step.classList.add('active');

                // Toggle display section
                sections.forEach(sec => sec.classList.remove('active'));
                
                if (targetStep === 'welcome') {
                    document.getElementById('sec-welcome').classList.add('active');
                } else if (targetStep === 'matrix-view') {
                    document.getElementById('sec-matrix-view').classList.add('active');
                    renderMasterVisualHoQ();
                } else if (targetStep === 'advisor') {
                    document.getElementById('sec-advisor').classList.add('active');
                } else {
                    const sec = document.getElementById(`sec-${targetStep}`);
                    if (sec) sec.classList.add('active');
                }
            });
        });
    }

    // ----------------------------------------------------
    // Welcome / Workspace Selection
    // ----------------------------------------------------
    function initWorkspaceSelector() {
        const welcomeLoadBtn = document.getElementById('welcome-load-default-btn');
        const welcomeClearBtn = document.getElementById('welcome-clear-custom-btn');
        const mainLoadBtn = document.getElementById('load-template-btn');

        const loadDefaultAction = () => {
            qfdState.whats = JSON.parse(JSON.stringify(defaultWhats));
            qfdState.hows = JSON.parse(JSON.stringify(defaultHows));
            qfdState.relations = JSON.parse(JSON.stringify(defaultRelations));
            qfdState.roof = JSON.parse(JSON.stringify(defaultRoof));
            qfdState.benchmark = JSON.parse(JSON.stringify(defaultBenchmark));
            qfdState.techTargets = JSON.parse(JSON.stringify(defaultTechTargets));

            // UI feedback
            document.getElementById('case-study-guide').scrollIntoView({ behavior: 'smooth' });
            document.getElementById('guide-body-content').classList.remove('collapsed');
            document.getElementById('guide-chevron').className = 'fa-solid fa-chevron-up';

            refreshAllViews();
            alert("Default SecuTech Smart IoT Lock Case loaded! Complete matrix priorities, benchmarking, and roof tradeoffs populated.");
        };

        const clearWorkspaceAction = () => {
            if (confirm("Are you sure you want to clear all data? This will flush the current House of Quality.")) {
                qfdState.whats = [];
                qfdState.hows = [];
                qfdState.relations = {};
                qfdState.roof = {};
                qfdState.benchmark = {};
                qfdState.techTargets = {};

                document.getElementById('guide-body-content').classList.add('collapsed');
                document.getElementById('guide-chevron').className = 'fa-solid fa-chevron-down';

                refreshAllViews();
                alert("QFD matrix parameters cleared! You can now start building your own House of Quality.");
            }
        };

        if (welcomeLoadBtn) welcomeLoadBtn.addEventListener('click', loadDefaultAction);
        if (mainLoadBtn) mainLoadBtn.addEventListener('click', loadDefaultAction);
        if (welcomeClearBtn) welcomeClearBtn.addEventListener('click', clearWorkspaceAction);
    }

    // ----------------------------------------------------
    // Step Data Population
    // ----------------------------------------------------
    function refreshAllViews() {
        renderWhatsTable();
        renderHowsTable();
        renderRelationshipMatrix();
        renderRoofEditor();
        renderBenchmarkGrid();
        renderTechTargetsGrid();
        renderMasterVisualHoQ();
    }

    function initStepEditors() {
        // Step 1: WHATs buttons
        document.getElementById('add-what-btn').addEventListener('click', () => {
            const newId = 'w_' + Date.now();
            qfdState.whats.push({ id: newId, text: 'New Requirement', importance: 3 });
            renderWhatsTable();
            renderRelationshipMatrix();
            renderBenchmarkGrid();
        });

        // Step 2: HOWs buttons
        document.getElementById('add-how-btn').addEventListener('click', () => {
            const newId = 'h_' + Date.now();
            qfdState.hows.push({ id: newId, text: 'New Engineering Characteristic', unit: 'TBD', direction: 'maximize' });
            renderHowsTable();
            renderRelationshipMatrix();
            renderRoofEditor();
            renderTechTargetsGrid();
        });
    }

    // --- Render Step 1 ---
    function renderWhatsTable() {
        const tbody = document.getElementById('whats-tbody');
        tbody.innerHTML = '';

        qfdState.whats.forEach((what, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input type="text" class="form-control" value="${what.text}" data-id="${what.id}" onchange="updateWhatText('${what.id}', this.value)">
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <input type="number" class="form-control" style="width: 80px; display: inline-block; text-align: center;" step="0.1" min="1" max="5" value="${what.importance}" onchange="updateWhatImportance('${what.id}', this.value, this)">
                    <i class="fa-solid fa-circle-info" style="color: var(--primary); cursor: pointer; margin-left: 5px;" onclick="showQfdFieldInfo('importance')" title="Importance Info"></i>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="deleteWhat('${what.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.updateWhatText = (id, val) => {
        const what = qfdState.whats.find(w => w.id === id);
        if (what) what.text = val;
    };

    window.updateWhatImportance = (id, val, inputEl) => {
        let numeric = parseFloat(val);
        if (isNaN(numeric) || numeric < 1.0 || numeric > 5.0) {
            alert("Invalid value! Importance must be a number between 1.0 and 5.0.");
            const what = qfdState.whats.find(w => w.id === id);
            inputEl.value = what ? what.importance : 3.0;
            return;
        }
        const what = qfdState.whats.find(w => w.id === id);
        if (what) what.importance = numeric;
        refreshAllViews();
    };

    window.deleteWhat = (id) => {
        qfdState.whats = qfdState.whats.filter(w => w.id !== id);
        delete qfdState.benchmark[id];
        qfdState.hows.forEach(how => {
            delete qfdState.relations[`${id}_${how.id}`];
        });
        refreshAllViews();
    };

    // --- Render Step 2 ---
    function renderHowsTable() {
        const tbody = document.getElementById('hows-tbody');
        tbody.innerHTML = '';

        qfdState.hows.forEach((how) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input type="text" class="form-control" value="${how.text}" onchange="updateHowText('${how.id}', this.value)">
                </td>
                <td>
                    <input type="text" class="form-control" value="${how.unit}" onchange="updateHowUnit('${how.id}', this.value)">
                </td>
                <td style="text-align: center;">
                    <select class="form-control" onchange="updateHowDirection('${how.id}', this.value)">
                        <option value="maximize" ${how.direction === 'maximize' ? 'selected' : ''}>Maximize (↑)</option>
                        <option value="minimize" ${how.direction === 'minimize' ? 'selected' : ''}>Minimize (↓)</option>
                        <option value="target" ${how.direction === 'target' ? 'selected' : ''}>Target (⊙)</option>
                    </select>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="deleteHow('${how.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.updateHowText = (id, val) => {
        const how = qfdState.hows.find(h => h.id === id);
        if (how) how.text = val;
    };

    window.updateHowUnit = (id, val) => {
        const how = qfdState.hows.find(h => h.id === id);
        if (how) how.unit = val;
    };

    window.updateHowDirection = (id, val) => {
        const how = qfdState.hows.find(h => h.id === id);
        if (how) how.direction = val;
    };

    window.deleteHow = (id) => {
        qfdState.hows = qfdState.hows.filter(h => h.id !== id);
        delete qfdState.techTargets[id];
        qfdState.whats.forEach(what => {
            delete qfdState.relations[`${what.id}_${id}`];
        });
        // Remove correlations involving this HOW
        for (let key in qfdState.roof) {
            if (key.startsWith(id + '_') || key.endsWith('_' + id)) {
                delete qfdState.roof[key];
            }
        }
        refreshAllViews();
    };

    // --- Render Step 3 ---
    function renderRelationshipMatrix() {
        const table = document.getElementById('relationship-grid');
        table.innerHTML = '';

        if (qfdState.whats.length === 0 || qfdState.hows.length === 0) {
            table.innerHTML = `<tr><td style="padding: 20px; color: var(--text-secondary);">Please define Customer Requirements (WHATs) and Design Specs (HOWs) first.</td></tr>`;
            return;
        }

        // Header Row
        let headerRow = `<tr><th>Customer Needs \\ Engineering Specs</th>`;
        qfdState.hows.forEach(how => {
            headerRow += `<th style="max-width: 140px; word-wrap: break-word;">${how.text} (${how.unit})</th>`;
        });
        headerRow += `</tr>`;
        table.innerHTML += headerRow;

        // Data Rows
        qfdState.whats.forEach(what => {
            let rowHtml = `<tr><td class="row-header">${what.text} <span class="step-tag" style="background: rgba(30,136,229,0.1); color: var(--primary-light);">Weight: ${what.importance}</span></td>`;
            qfdState.hows.forEach(how => {
                const key = `${what.id}_${how.id}`;
                const activeVal = qfdState.relations[key] || 0;
                rowHtml += `
                    <td style="white-space: nowrap;">
                        <input type="number" class="form-control" style="width: 75px; display: inline-block; text-align: center;" step="0.5" min="0" max="10" value="${activeVal}" onchange="updateRelationCoefficient('${key}', this.value, this)">
                        <i class="fa-solid fa-circle-info" style="color: var(--primary); cursor: pointer; margin-left: 4px;" onclick="showQfdFieldInfo('relationship')" title="Relationship Info"></i>
                    </td>`;
            });
            rowHtml += `</tr>`;
            table.innerHTML += rowHtml;
        });
    }

    window.updateRelationCoefficient = (key, val, inputEl) => {
        let numeric = parseFloat(val);
        if (isNaN(numeric) || numeric < 0.0 || numeric > 10.0) {
            alert("Invalid value! Relationship value must be a number between 0.0 and 10.0.");
            inputEl.value = qfdState.relations[key] || 0;
            return;
        }
        qfdState.relations[key] = numeric;
        refreshAllViews();
    };

    // --- Render Step 4 ---
    function renderRoofEditor() {
        const tbody = document.getElementById('roof-editor-tbody');
        tbody.innerHTML = '';

        if (qfdState.hows.length < 2) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">Define at least 2 Technical Specs to configure roof correlations.</td></tr>`;
            return;
        }

        // Create pairs (i, j) where i < j
        for (let i = 0; i < qfdState.hows.length; i++) {
            for (let j = i + 1; j < qfdState.hows.length; j++) {
                const howA = qfdState.hows[i];
                const howB = qfdState.hows[j];
                const key = `${howA.id}_${howB.id}`;
                const val = qfdState.roof[key] || '';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 500;">${howA.text}</td>
                    <td style="font-weight: 500;">${howB.text}</td>
                    <td>
                        <select class="form-control" style="text-align-last: center;" onchange="updateRoofCorrelation('${key}', this.value)">
                            <option value="" ${val === '' ? 'selected' : ''}>No Correlation</option>
                            <option value="++" ${val === '++' ? 'selected' : ''}>++ Strong Positive</option>
                            <option value="+" ${val === '+' ? 'selected' : ''}>+ Positive</option>
                            <option value="-" ${val === '-' ? 'selected' : ''}>- Negative</option>
                            <option value="--" ${val === '--' ? 'selected' : ''}>-- Strong Negative</option>
                        </select>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        }
    }

    window.updateRoofCorrelation = (key, val) => {
        qfdState.roof[key] = val;
    };

    // --- Render Step 5 ---
    function renderBenchmarkGrid() {
        const table = document.getElementById('benchmark-grid');
        table.innerHTML = '';

        if (qfdState.whats.length === 0) {
            table.innerHTML = `<tr><td style="padding: 20px; color: var(--text-secondary);">Define Customer Requirements first.</td></tr>`;
            return;
        }

        let headerRow = `<tr>
            <th style="text-align: left;">Customer Requirement</th>
            <th>Our Performance (1.0 - 5.0)</th>
            <th>Competitor A (1.0 - 5.0)</th>
            <th>Competitor B (1.0 - 5.0)</th>
        </tr>`;
        table.innerHTML += headerRow;

        qfdState.whats.forEach(what => {
            const data = qfdState.benchmark[what.id] || { us: 3.0, compA: 3.0, compB: 3.0 };
            qfdState.benchmark[what.id] = data; // ensures state integrity

            let rowHtml = `<tr>
                <td style="text-align: left; font-weight: 500;">${what.text}</td>
                <td style="white-space: nowrap;">
                    <input type="number" class="form-control" style="width: 75px; display: inline-block; text-align: center;" step="0.1" min="1" max="5" value="${data.us}" onchange="updateBenchmarkValue('${what.id}', 'us', this.value, this)">
                    <i class="fa-solid fa-circle-info" style="color: var(--primary); cursor: pointer; margin-left: 4px;" onclick="showQfdFieldInfo('benchmark')" title="Benchmark Info"></i>
                </td>
                <td style="white-space: nowrap;">
                    <input type="number" class="form-control" style="width: 75px; display: inline-block; text-align: center;" step="0.1" min="1" max="5" value="${data.compA}" onchange="updateBenchmarkValue('${what.id}', 'compA', this.value, this)">
                    <i class="fa-solid fa-circle-info" style="color: var(--primary); cursor: pointer; margin-left: 4px;" onclick="showQfdFieldInfo('benchmark')" title="Benchmark Info"></i>
                </td>
                <td style="white-space: nowrap;">
                    <input type="number" class="form-control" style="width: 75px; display: inline-block; text-align: center;" step="0.1" min="1" max="5" value="${data.compB}" onchange="updateBenchmarkValue('${what.id}', 'compB', this.value, this)">
                    <i class="fa-solid fa-circle-info" style="color: var(--primary); cursor: pointer; margin-left: 4px;" onclick="showQfdFieldInfo('benchmark')" title="Benchmark Info"></i>
                </td>
            </tr>`;
            table.innerHTML += rowHtml;
        });
    }

    window.updateBenchmarkValue = (whatId, field, val, inputEl) => {
        let numeric = parseFloat(val);
        if (isNaN(numeric) || numeric < 1.0 || numeric > 5.0) {
            alert("Invalid value! Benchmark rating must be a number between 1.0 and 5.0.");
            inputEl.value = qfdState.benchmark[whatId] ? qfdState.benchmark[whatId][field] : 3.0;
            return;
        }
        if (!qfdState.benchmark[whatId]) qfdState.benchmark[whatId] = { us: 3.0, compA: 3.0, compB: 3.0 };
        qfdState.benchmark[whatId][field] = numeric;
        refreshAllViews();
    };

    // --- Render Step 6 ---
    function renderTechTargetsGrid() {
        const table = document.getElementById('tech-targets-grid');
        table.innerHTML = '';

        if (qfdState.hows.length === 0) {
            table.innerHTML = `<tr><td style="padding: 20px; color: var(--text-secondary);">Define Design Specs first.</td></tr>`;
            return;
        }

        let headerRow = `<tr>
            <th style="text-align: left;">Design Spec</th>
            <th>Unit</th>
            <th>Our Target Spec</th>
            <th>Competitor A Score</th>
            <th>Competitor B Score</th>
        </tr>`;
        table.innerHTML += headerRow;

        qfdState.hows.forEach(how => {
            const data = qfdState.techTargets[how.id] || { target: '', compA: '', compB: '' };
            qfdState.techTargets[how.id] = data; // integrity

            let rowHtml = `<tr>
                <td style="text-align: left; font-weight: 500;">${how.text}</td>
                <td><span class="step-tag">${how.unit}</span></td>
                <td><input type="text" class="form-control" value="${data.target}" placeholder="e.g. < 50" onchange="updateTechTargetValue('${how.id}', 'target', this.value)"></td>
                <td><input type="text" class="form-control" value="${data.compA}" placeholder="Score" onchange="updateTechTargetValue('${how.id}', 'compA', this.value)"></td>
                <td><input type="text" class="form-control" value="${data.compB}" placeholder="Score" onchange="updateTechTargetValue('${how.id}', 'compB', this.value)"></td>
            </tr>`;
            table.innerHTML += rowHtml;
        });
    }

    window.updateTechTargetValue = (howId, field, val) => {
        if (!qfdState.techTargets[howId]) qfdState.techTargets[howId] = { target: '', compA: '', compB: '' };
        qfdState.techTargets[howId][field] = val;
    };

    // ----------------------------------------------------
    // Step 7: Master Visual House of Quality Rendering
    // ----------------------------------------------------
    function renderMasterVisualHoQ() {
        const wrapper = document.getElementById('hoq-visual-wrapper');
        wrapper.innerHTML = '';

        if (qfdState.whats.length === 0 || qfdState.hows.length === 0) {
            wrapper.innerHTML = `<p style="padding: 30px; color: var(--text-secondary);">Please load default case or enter parameters in steps 1-6.</p>`;
            return;
        }

        // Calculate priorities
        let absWeights = {};
        let sumAbs = 0;
        qfdState.hows.forEach(how => {
            let score = 0;
            qfdState.whats.forEach(what => {
                const w = qfdState.relations[`${what.id}_${how.id}`] || 0;
                score += (w * what.importance);
            });
            absWeights[how.id] = score;
            sumAbs += score;
        });

        // Let's render a clean structured layout table
        let tableHtml = `<table class="hoq-table" style="border: 2px solid var(--border);">`;

        // 1. Build the Correlation Roof Header section (Flat grid representation of the roof for maximum readability)
        tableHtml += `<thead>
            <tr style="background: #f1f5f9; color: var(--text-primary);">
                <th colspan="2" style="border: 1px solid var(--border); font-family: var(--font-heading); text-align: left; padding: 10px;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Roof Correlations
                </th>`;
        
        qfdState.hows.forEach((how, idx) => {
            tableHtml += `<th style="border: 1px solid var(--border); font-size: 11px; font-weight: 700;">HOW ${idx+1}</th>`;
        });
        tableHtml += `<th colspan="3" style="border: 1px solid var(--border);">WHAT Benchmarks</th></tr>`;

        // Inner roof row details
        qfdState.hows.forEach((howA, idxA) => {
            tableHtml += `<tr>
                <td colspan="2" style="border: 1px solid var(--border); text-align: left; font-size: 11px; padding: 5px 10px; color: var(--text-secondary);">
                    Interactions with <strong>HOW ${idxA+1}</strong>
                </td>`;
            qfdState.hows.forEach((howB, idxB) => {
                if (idxA === idxB) {
                    tableHtml += `<td style="border: 1px solid var(--border); background-color: var(--border);">--</td>`;
                } else {
                    const key = idxA < idxB ? `${howA.id}_${howB.id}` : `${howB.id}_${howA.id}`;
                    const val = qfdState.roof[key] || '';
                    let color = '';
                    if (val === '++' || val === '+') color = 'color: #1976d2;';
                    if (val === '--' || val === '-') color = 'color: var(--danger);';
                    tableHtml += `<td style="border: 1px solid var(--border); font-weight: bold; ${color}">${val || '·'}</td>`;
                }
            });
            tableHtml += `<td colspan="3" style="border: 1px solid var(--border); background: var(--bg-card);"></td></tr>`;
        });

        // Main headers mapping
        tableHtml += `<tr style="background: #e2e8f0; color: var(--text-primary);">
            <th style="border: 1px solid var(--border); width: 220px; text-align: left; padding: 10px;">Customer Requirements (WHATs)</th>
            <th style="border: 1px solid var(--border); width: 60px;">Imp</th>`;
        qfdState.hows.forEach((how, idx) => {
            tableHtml += `<th style="border: 1px solid var(--border); font-size: 12px; padding: 10px; min-width: 100px;">
                <strong>HOW ${idx+1}</strong><br>
                <span style="font-size: 10px; color: var(--text-secondary);">${how.text}</span>
            </th>`;
        });
        tableHtml += `
            <th style="border: 1px solid var(--border); font-size: 11px; width: 60px;">Us</th>
            <th style="border: 1px solid var(--border); font-size: 11px; width: 60px;">Comp A</th>
            <th style="border: 1px solid var(--border); font-size: 11px; width: 60px;">Comp B</th>
        </tr></thead><tbody>`;

        // Relationship core
        qfdState.whats.forEach(what => {
            const bm = qfdState.benchmark[what.id] || { us: 3, compA: 3, compB: 3 };
            tableHtml += `<tr>
                <td style="border: 1px solid var(--border); text-align: left; padding: 10px; font-weight: 500;">${what.text}</td>
                <td style="border: 1px solid var(--border); font-weight: bold; color: var(--primary-light);">${what.importance}</td>`;
            
            qfdState.hows.forEach(how => {
                const key = `${what.id}_${how.id}`;
                const val = qfdState.relations[key] || 0;
                let text = '';
                let bg = '';
                if (val === 9) { text = '🔴 9'; bg = 'background-color: rgba(211,47,47,0.08);'; }
                if (val === 3) { text = '🟡 3'; bg = 'background-color: rgba(251,192,45,0.08);'; }
                if (val === 1) { text = '🟢 1'; bg = 'background-color: rgba(56,142,60,0.08);'; }
                tableHtml += `<td style="border: 1px solid var(--border); ${bg} font-weight: 600;">${text || '·'}</td>`;
            });

            tableHtml += `
                <td style="border: 1px solid var(--border); font-weight: 600; background: rgba(30,136,229,0.05);">${bm.us}</td>
                <td style="border: 1px solid var(--border); color: var(--text-secondary);">${bm.compA}</td>
                <td style="border: 1px solid var(--border); color: var(--text-secondary);">${bm.compB}</td>
            </tr>`;
        });

        // Absolute Importance row
        tableHtml += `<tr style="background: rgba(30, 136, 229, 0.05); font-weight: bold;">
            <td colspan="2" style="border: 1px solid var(--border); text-align: left; padding: 10px;">Absolute Importance</td>`;
        qfdState.hows.forEach(how => {
            tableHtml += `<td style="border: 1px solid var(--border); color: var(--primary-light);">${absWeights[how.id]}</td>`;
        });
        tableHtml += `<td colspan="3" style="border: 1px solid var(--border); background: var(--bg-card);"></td></tr>`;

        // Relative Weight row
        tableHtml += `<tr style="background: rgba(0, 121, 107, 0.05); font-weight: bold;">
            <td colspan="2" style="border: 1px solid var(--border); text-align: left; padding: 10px;">Relative Priority (%)</td>`;
        qfdState.hows.forEach(how => {
            const rel = sumAbs > 0 ? ((absWeights[how.id] / sumAbs) * 100).toFixed(1) : '0.0';
            tableHtml += `<td style="border: 1px solid var(--border); color: var(--accent-light);">${rel}%</td>`;
        });
        tableHtml += `<td colspan="3" style="border: 1px solid var(--border); background: var(--bg-card);"></td></tr>`;

        // Directions
        tableHtml += `<tr>
            <td colspan="2" style="border: 1px solid var(--border); text-align: left; padding: 10px; font-weight: bold;">Improvement Direction</td>`;
        qfdState.hows.forEach(how => {
            let symbol = '';
            if (how.direction === 'maximize') symbol = 'Maximize (↑)';
            if (how.direction === 'minimize') symbol = 'Minimize (↓)';
            if (how.direction === 'target') symbol = 'Target (⊙)';
            tableHtml += `<td style="border: 1px solid var(--border); font-size: 11px; font-weight: 500;">${symbol}</td>`;
        });
        tableHtml += `<td colspan="3" style="border: 1px solid var(--border); background: var(--bg-card);"></td></tr>`;

        // Engineering Target Specifications
        tableHtml += `<tr>
            <td colspan="2" style="border: 1px solid var(--border); text-align: left; padding: 10px; font-weight: bold;">Target Specification</td>`;
        qfdState.hows.forEach(how => {
            const tg = qfdState.techTargets[how.id] || { target: '', compA: '', compB: '' };
            tableHtml += `<td style="border: 1px solid var(--border); font-weight: 600; color: #fff;">${tg.target || '·'}</td>`;
        });
        tableHtml += `<td colspan="3" style="border: 1px solid var(--border); background: var(--bg-card);"></td></tr>`;

        // Competitor Specifications
        tableHtml += `<tr>
            <td colspan="2" style="border: 1px solid var(--border); text-align: left; padding: 10px; color: var(--text-secondary);">Competitor A Specs</td>`;
        qfdState.hows.forEach(how => {
            const tg = qfdState.techTargets[how.id] || { target: '', compA: '', compB: '' };
            tableHtml += `<td style="border: 1px solid var(--border); font-size: 12px; color: var(--text-secondary);">${tg.compA || '·'}</td>`;
        });
        tableHtml += `<td colspan="3" style="border: 1px solid var(--border); background: var(--bg-card);"></td></tr>`;

        tableHtml += `<tr>
            <td colspan="2" style="border: 1px solid var(--border); text-align: left; padding: 10px; color: var(--text-secondary);">Competitor B Specs</td>`;
        qfdState.hows.forEach(how => {
            const tg = qfdState.techTargets[how.id] || { target: '', compA: '', compB: '' };
            tableHtml += `<td style="border: 1px solid var(--border); font-size: 12px; color: var(--text-secondary);">${tg.compB || '·'}</td>`;
        });
        tableHtml += `<td colspan="3" style="border: 1px solid var(--border); background: var(--bg-card);"></td></tr>`;

        tableHtml += `</tbody></table>`;
        wrapper.innerHTML = tableHtml;
    }

    // ----------------------------------------------------
    // Step 8: RAG Decision Engine & Knowledge Synthesis
    // ----------------------------------------------------
    function initAdvisor() {
        const syncBtn = document.getElementById('advisor-sync-btn');
        const synthesizeBtn = document.getElementById('advisor-synthesize-btn');

        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                if (qfdState.whats.length === 0 || qfdState.hows.length === 0) {
                    alert("Please define requirements and specifications before syncing active workspace.");
                    return;
                }
                alert("Data synced successfully from active workspace session!");
                document.getElementById('advisor-results').classList.remove('hidden');
                synthesizeQFDRecommendations();
            });
        }

        if (synthesizeBtn) {
            synthesizeBtn.addEventListener('click', () => {
                document.getElementById('advisor-results').classList.remove('hidden');
                synthesizeQFDRecommendations();
            });
        }
    }

    function synthesizeQFDRecommendations() {
        const adviceConflicts = document.getElementById('advice-conflicts');
        const adviceBenchmarks = document.getElementById('advice-benchmarks');
        const adviceTheory = document.getElementById('advice-theory');
        const adviceChecklist = document.getElementById('advice-checklist');

        // 1. Trace Trade-off Conflicts (Negative roof relations between high weight engineering Specs)
        let conflictsList = [];
        let absWeights = {};
        let sumAbs = 0;
        
        qfdState.hows.forEach(how => {
            let score = 0;
            qfdState.whats.forEach(what => {
                const w = qfdState.relations[`${what.id}_${how.id}`] || 0;
                score += (w * what.importance);
            });
            absWeights[how.id] = score;
            sumAbs += score;
        });

        // Loop through roof keys
        for (let key in qfdState.roof) {
            const val = qfdState.roof[key];
            if (val === '-' || val === '--') {
                const [idA, idB] = key.split('_');
                const howA = qfdState.hows.find(h => h.id === idA);
                const howB = qfdState.hows.find(h => h.id === idB);
                
                if (howA && howB) {
                    const priorityA = sumAbs > 0 ? ((absWeights[howA.id] / sumAbs) * 100).toFixed(1) : 0;
                    const priorityB = sumAbs > 0 ? ((absWeights[howB.id] / sumAbs) * 100).toFixed(1) : 0;
                    
                    if (parseFloat(priorityA) > 10 || parseFloat(priorityB) > 10) {
                        conflictsList.push(`
                            <div style="margin-bottom: 12px; border-bottom: 1px dashed var(--border-light); padding-bottom: 8px;">
                                🔴 <strong>Design Collision</strong>: <strong>${howA.text}</strong> (${priorityA}% priority) and <strong>${howB.text}</strong> (${priorityB}% priority) are in conflict (${val}).
                                <br><small style="color: var(--text-muted);"><i class="fa-solid fa-lightbulb"></i> <strong>TRIZ Principle Recommendation</strong>: Use <em>Parameter Decoupling</em> or <em>Segmentation</em>. For example, modularize firmware/hardware loops or apply smart power-throttling states so the Bluetooth chip doesn't drain maximum current during standby.</small>
                            </div>
                        `);
                    }
                }
            }
        }

        if (conflictsList.length === 0) {
            adviceConflicts.innerHTML = `No critical negative engineering tradeoffs detected. If any arise, list them as (-) or (--) correlations in Step 4 to prompt decoupling rules.`;
        } else {
            adviceConflicts.innerHTML = `<div>${conflictsList.join('')}</div>`;
        }

        // 2. Trace Benchmarking Gaps
        let gapsList = [];
        qfdState.whats.forEach(what => {
            const bm = qfdState.benchmark[what.id];
            if (bm) {
                if (what.importance >= 4 && (bm.compA > bm.us || bm.compB > bm.us)) {
                    const betterComp = bm.compA > bm.us ? (bm.compB > bm.us ? 'Competitors A & B' : 'Competitor A') : 'Competitor B';
                    const diff = Math.max(bm.compA, bm.compB) - bm.us;
                    gapsList.push(`
                        <li style="margin-bottom: 10px;">
                            ⚠️ <strong>Performance Lag on Critical Need</strong>: <strong>"${what.text}"</strong> (Importance: ${what.importance}/5). 
                            Competitor leads by <strong>+${diff.toFixed(1)}</strong> points. 
                            <br><small style="color: var(--text-muted);"><i class="fa-solid fa-arrow-right"></i> <strong>Strategic Fix</strong>: Audit relationship cells for this row. Strengthen the target specifications of design variables linking directly to this need.</small>
                        </li>
                    `);
                }
            }
        });

        if (gapsList.length === 0) {
            adviceBenchmarks.innerHTML = `All critical customer requirements are adequately addressed. Competitor benchmarking values match or excel our values.`;
        } else {
            adviceBenchmarks.innerHTML = `<ul>${gapsList.join('')}</ul>`;
        }

        // 3. Matrix Completeness & Priorities Audit (New RAG Module)
        let matrixAuditHtml = '';
        let emptyWhats = [];
        qfdState.whats.forEach(what => {
            let sum = 0;
            qfdState.hows.forEach(how => {
                sum += (qfdState.relations[`${what.id}_${how.id}`] || 0);
            });
            if (sum === 0) emptyWhats.push(what.text);
        });

        let emptyHows = [];
        qfdState.hows.forEach(how => {
            let sum = 0;
            qfdState.whats.forEach(what => {
                sum += (qfdState.relations[`${what.id}_${how.id}`] || 0);
            });
            if (sum === 0) emptyHows.push(how.text);
        });

        if (emptyWhats.length > 0) {
            matrixAuditHtml += `<p style="color: var(--danger); margin-bottom: 8px;"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Unmapped Voice</strong>: The customer requirements <em>"${emptyWhats.join(', ')}"</em> have no relationship mapping. They are unaddressed in design!</p>`;
        }
        if (emptyHows.length > 0) {
            matrixAuditHtml += `<p style="color: #fb8c00; margin-bottom: 8px;"><i class="fa-solid fa-circle-question"></i> <strong>Redundant Engineering Spec</strong>: The design parameters <em>"${emptyHows.join(', ')}"</em> do not map to any customer needs. Verify if they are adding unnecessary cost.</p>`;
        }

        // Add ranking specs
        let rankedSpecs = [];
        qfdState.hows.forEach(how => {
            const rel = sumAbs > 0 ? ((absWeights[how.id] / sumAbs) * 100).toFixed(1) : '0.0';
            rankedSpecs.push({ text: how.text, rel: parseFloat(rel), id: how.id });
        });
        rankedSpecs.sort((a, b) => b.rel - a.rel);

        if (matrixAuditHtml === '' && rankedSpecs.length > 0) {
            matrixAuditHtml = `<p style="color: var(--accent-light);"><i class="fa-solid fa-circle-check"></i> Matrix passes completeness audit. All customer requirements link to engineering specifications.</p>`;
        }

        // Render ranked list
        let rankingHtml = `<div style="margin-top: 15px;">
            <h5>Ranked Engineering Specification Leverage:</h5>
            <ol style="margin-left: 20px; margin-top: 5px;">
                ${rankedSpecs.map(rs => `<li><strong>${rs.text}</strong>: ${rs.rel}% of total customer impact.</li>`).join('')}
            </ol>
        </div>`;

        const randomQuote = qfdKnowledge.guruQuotes[Math.floor(Math.random() * qfdKnowledge.guruQuotes.length)];
        adviceTheory.innerHTML = `
            <div class="advice-block" style="border-left: 4px solid var(--accent); background: var(--bg-card); padding: 15px; margin-bottom: 15px;">
                <p><strong>System Diagnostics</strong>:</p>
                <div style="font-size: 13px; line-height: 1.5; margin-top: 8px;">
                    ${matrixAuditHtml}
                    ${rankingHtml}
                </div>
            </div>
            <p><strong>Methodological Foundation</strong>: ${qfdKnowledge.general.content}</p>
            <blockquote style="border-left: 3px solid var(--accent); padding-left: 10px; margin-top: 10px; font-style: italic; color: var(--text-secondary); font-size: 13px;">
                "${randomQuote.quote}" — <strong>${randomQuote.guru}</strong>
            </blockquote>
        `;

        // 4. Action checklist
        let checklistHtml = `
            <li><i class="fa-solid fa-circle-check"></i> <strong>Confirm Customer Weights</strong>: Cross-verify weights (1.0 - 5.0) via surveys to ensure they represent verified field voices.</li>
            <li><i class="fa-solid fa-circle-check"></i> <strong>Execute TRIZ Decoupling</strong>: For all roof trade-off conflicts, initiate design reviews to evaluate parameter decoupling (such as hardware separation or software state loops).</li>
            <li><i class="fa-solid fa-circle-check"></i> <strong>Optimize Spec Targets</strong>: Set spec targets for top ranked specs (e.g. <em>"${rankedSpecs[0] ? rankedSpecs[0].text : 'TBD'}"</em>) to match or beat competitor technical scores.</li>
            <li><i class="fa-solid fa-circle-check"></i> <strong>Conduct Failure Modes Audit (FMEA)</strong>: Ensure high absolute priority design Specs are covered in the FMEA matrix.</li>
        `;
        adviceChecklist.innerHTML = checklistHtml;
    }

    // ----------------------------------------------------
    // PDF Manual and Exporter
    // ----------------------------------------------------
    function initPDFExporters() {
        const manualBtn = document.getElementById('manual-download-btn');
        const exportBtn = document.getElementById('pdf-export-btn');

        if (manualBtn) {
            manualBtn.addEventListener('click', () => {
                manualBtn.innerText = "Generating PDF...";
                manualBtn.disabled = true;

                // Load Practitioner manual template inside hidden container
                const container = document.getElementById('manual-template-container');
                container.innerHTML = `
                    <div style="padding: 30px; font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.7; font-size: 13.5px;">
                        <h1 style="font-family: 'Outfit', sans-serif; color: #0f172a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-top: 10px; font-size: 26px;">
                            Quality Function Deployment (QFD) &amp; House of Quality (HoQ) Manual
                        </h1>
                        <p style="margin-top: 10px; font-size: 1.25rem; font-weight: bold; color: #475569; font-family: 'Outfit', sans-serif;">
                            The Complete Practice Guide for Cross-Functional Design and Strategic Quality Engineering
                        </p>
                        
                        <h2 style="margin-top: 30px; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; font-family: 'Outfit', sans-serif; font-size: 18px;">1. Principles of QFD (Quality Function Deployment)</h2>
                        <p><strong>Quality Function Deployment (QFD)</strong> is a comprehensive system designed to translate qualitative customer requirements into quantitative engineering target specifications. Conceived in Japan by pioneers <strong>Yoji Akao</strong> and <strong>Shigeru Mizuno</strong> in 1966, QFD was developed to address a critical industry vulnerability: the historic disconnect between customer research, design engineering, and manufacturing planning.</p>
                        
                        <h3 style="color: #1565c0; margin-top: 18px; font-family: 'Outfit', sans-serif; font-size: 15px;">Historical Context &amp; Purpose</h3>
                        <p>The methodology was first implemented at Mitsubishi Heavy Industries' Kobe Shipyards. Prior to QFD, engineering teams designed products based on technological capabilities, while sales teams gathered customer feedback. Because there was no systematic translation mechanism, products often failed to satisfy customer expectations or required expensive late-stage design modifications. QFD addresses this by enforcing a formal translation pipeline from the customer voice to assembly-line Quality Control SOPs.</p>

                        <h3 style="color: #1565c0; margin-top: 18px; font-family: 'Outfit', sans-serif; font-size: 15px;">The 4-Phase QFD Waterfall Model</h3>
                        <p>In mature product development organizations, QFD deploys quality targets across four sequential phases:</p>
                        <ol style="margin-left: 20px; margin-bottom: 15px;">
                            <li style="margin-bottom: 8px;"><strong>Phase 1: Product Planning (The House of Quality)</strong>: Translates customer requirements (WHATs) into technical engineering specs (HOWs). This stage identifies key conflicts, prioritizes specs, and compares competitor performance.</li>
                            <li style="margin-bottom: 8px;"><strong>Phase 2: Parts Deployment</strong>: Translates the highest priority engineering specifications (HOWs) into critical part characteristics (e.g., specific tolerances, raw materials, or component assemblies).</li>
                            <li style="margin-bottom: 8px;"><strong>Phase 3: Process Planning</strong>: Maps critical part characteristics directly to manufacturing processes, establishing key routing steps, tooling requirements, and temperature/pressure parameters.</li>
                            <li style="margin-bottom: 8px;"><strong>Phase 4: Production Planning</strong>: Establishes operator operating procedures, quality audits, SPC control charts, and mistake-proofing (Poka-Yoke) systems.</li>
                        </ol>

                        <h2 style="margin-top: 35px; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; font-family: 'Outfit', sans-serif; font-size: 18px;">2. Anatomy of the House of Quality (HoQ) &amp; Its "Rooms"</h2>
                        <p>The House of Quality is the foundational planning matrix of Phase 1. It is styled like a house with intersecting "rooms" that integrate customer and engineering vectors:</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <h4 style="margin-top: 0; color: #1565c0; font-family: 'Outfit', sans-serif; font-size: 14px;"><i class="fa-solid fa-arrow-left"></i> Room 1: Customer Requirements (WHATs - Left Wall)</h4>
                            <p>This room documents the qualitative customer needs. These needs are gathered via Voice of Customer (VoC) methods such as focus groups, interviews, and warranty data analysis. Each requirement is assigned an <strong>Importance Weight (1.0 - 5.0)</strong>, representing the customer's priority. A score of 5.0 indicates a critical, non-negotiable need; a score of 1.0 represents a nice-to-have delight feature.</p>
                        </div>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <h4 style="margin-top: 0; color: #1565c0; font-family: 'Outfit', sans-serif; font-size: 14px;"><i class="fa-solid fa-arrow-up"></i> Room 2: Engineering Characteristics (HOWs - Attic / Ceiling)</h4>
                            <p>This section translates customer desires into measurable engineering parameters. For example, the customer requirement "lightweight chassis" maps to the design spec "chassis mass (kg)". Each characteristic has a target direction of improvement: Maximize (\\uparrow), Minimize (\\downarrow), or Target Nominal (\\odot).</p>
                        </div>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <h4 style="margin-top: 0; color: #1565c0; font-family: 'Outfit', sans-serif; font-size: 14px;"><i class="fa-solid fa-table-cells"></i> Room 3: Inter-Relationship Matrix (The Main Room)</h4>
                            <p>The central grid where the product design team maps the strength of the relationship between WHATs and HOWs. Values range from <strong>[0.0 - 10.0]</strong>. Standard weights are:
                            <ul>
                                <li>🔴 Strong Relationship (9.0): Highly significant direct impact.</li>
                                <li>🟡 Medium Relationship (3.0): Indirect or secondary impact.</li>
                                <li>🟢 Weak Relationship (1.0): Minor or possible impact.</li>
                                <li>None (0.0): No impact.</li>
                            </ul>
                            </p>
                        </div>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <h4 style="margin-top: 0; color: #1565c0; font-family: 'Outfit', sans-serif; font-size: 14px;"><i class="fa-solid fa-caret-up"></i> Room 4: Correlation Matrix (The Roof)</h4>
                            <p>A triangular matrix that maps the physical interactions between different engineering specifications (HOWs vs. HOWs). It identifies synergies (marked as <code>++</code> or <code>+</code>) and conflicts (marked as <code>-</code> or <code>--</code>). Resolving negative conflicts (such as using TRIZ parameter separation or modular design) is the core engineering value of QFD.</p>
                        </div>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <h4 style="margin-top: 0; color: #1565c0; font-family: 'Outfit', sans-serif; font-size: 14px;"><i class="fa-solid fa-chart-bar"></i> Room 5: Market Assessment &amp; Benchmarking (Right Wall)</h4>
                            <p>Compares customer perception of your product vs. competitors on a scale of <strong>[1.0 - 5.0]</strong>. This is analyzed alongside the <strong>Kano Model</strong> (Basic Needs, Performance Needs, and Delighter Features) to establish strategic focus areas.</p>
                        </div>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <h4 style="margin-top: 0; color: #1565c0; font-family: 'Outfit', sans-serif; font-size: 14px;"><i class="fa-solid fa-bullseye"></i> Room 6: Technical Targets &amp; Priorities (The Foundation)</h4>
                            <p>The basement compiles computed engineering priorities, absolute importance weights, and relative priority percentages. It also logs competitor physical spec measurements and sets final engineering design targets.</p>
                        </div>

                        <h2 style="margin-top: 35px; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; font-family: 'Outfit', sans-serif; font-size: 18px;">3. Mathematical Prioritization Formulations</h2>
                        <p>To identify the "Vital Few" design characteristics, the HoQ uses weighted linear formulations to calculate priorities:</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #1565c0;">
                            <strong>Absolute Engineering Importance Score:</strong>
                            \\[W_{abs, j} = \\sum_{i=1}^{n} (R_{i,j} \\times I_i)\\]
                            <p style="margin-top: 10px; margin-bottom: 10px; font-size: 12.5px; color: var(--text-secondary);">
                                Where \\(I_i\\) is the customer importance weight for requirement \\(i\\), and \\(R_{i,j}\\) is the inter-relationship coefficient between requirement \\(i\\) and engineering spec \\(j\\).
                            </p>
                            <strong>Relative Engineering Priority (%):</strong>
                            \\[W_{rel, j} = \\frac{W_{abs, j}}{\\sum_{k=1}^{m} W_{abs, k}} \\times 100\\%\\]
                        </div>
                        <p>Using these equations, the product development team can prioritize engineering specifications that yield the highest customer satisfaction impact.</p>
                    </div>
                `;

                // Compile math formulas
                try {
                    renderMathInElement(container, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '\\[', right: '\\[', display: true }
                        ],
                        throwOnError: false
                    });
                } catch (e) {
                    console.warn(e);
                }

                // Generate PDF download
                const opt = {
                    margin: 0.5,
                    filename: 'QFD_House_of_Quality_Practitioner_Manual.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                setTimeout(() => {
                    html2pdf().set(opt).from(container).save().then(() => {
                        manualBtn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> QFD Manual`;
                        manualBtn.disabled = false;
                        container.innerHTML = '';
                    }).catch(err => {
                        console.error(err);
                        alert("Error compiling manual. Try opening browser printing tools instead.");
                        manualBtn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> QFD Manual`;
                        manualBtn.disabled = false;
                    });
                }, 500);
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const element = document.getElementById('print-content');
                const opt = {
                    margin: 0.25,
                    filename: 'QFD_House_of_Quality_Matrix_Report.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
                };

                html2pdf().set(opt).from(element).save();
            });
        }
    }

    // Toggle default guide visibility
    window.toggleCaseGuide = () => {
        const body = document.getElementById('guide-body-content');
        const chevron = document.getElementById('guide-chevron');
        if (body.classList.contains('collapsed')) {
            body.classList.remove('collapsed');
            chevron.className = 'fa-solid fa-chevron-up';
        } else {
            body.classList.add('collapsed');
            chevron.className = 'fa-solid fa-chevron-down';
        }
    };

    // Modal Control Functions
    window.closeModal = () => {
        document.getElementById('info-modal').classList.add('hidden');
    };

    const fieldInfoDefinitions = {
        'importance': {
            title: 'Customer Importance Weight',
            desc: 'The Importance rating represents the user\'s priority for a customer need.<br><br><strong>Range:</strong> [1.0 - 5.0]<br><strong>Standard Values:</strong> 5.0 (Critical / Mandatory), 3.0 (Medium priority), 1.0 (Low priority/nice-to-have). Decimals are fully supported.'
        },
        'relationship': {
            title: 'Inter-Relationship Coefficients',
            desc: 'The Inter-Relationship Coefficient maps how strongly an engineering spec (HOW) satisfies a customer need (WHAT).<br><br><strong>Range:</strong> [0.0 - 10.0]<br><strong>Standard scale matches:</strong> 9.0 (🔴 Strong impact), 3.0 (🟡 Medium impact), 1.0 (🟢 Weak impact), 0.0 (None). Decimals are accepted.'
        },
        'benchmark': {
            title: 'Competitor Performance Benchmark',
            desc: 'Market benchmarking measures how customers perceive your company\'s performance vs. core competitors on each WHAT.<br><br><strong>Range:</strong> [1.0 - 5.0]<br><strong>Standard scale:</strong> 5.0 (World-class leader), 3.0 (Average/parity), 1.0 (Significantly lagging).'
        },
        'step1': {
            title: 'Step 1: Customer Needs & Importance',
            desc: 'Define the "Voice of the Customer" (WHATs) and rate their relative significance. This inputs priorities directly into the absolute calculations.'
        },
        'step2': {
            title: 'Step 2: Technical Design Characteristics',
            desc: 'Identify measurable engineering characteristics (HOWs) that resolve the customer requirements. Specify target units and the direction of improvement.'
        },
        'step3': {
            title: 'Step 3: Relationship Coefficients Matrix',
            desc: 'Estimate the correlation impact of design specs against customer requirements. High scores indicate that the specification has high leverage on customer satisfaction.'
        },
        'step4': {
            title: 'Step 4: Correlation Roof Matrix',
            desc: 'Verify correlations between design specs. Positive interactions indicate synergistic elements. Negative interactions indicate trade-offs requiring design compromises.'
        },
        'step5': {
            title: 'Step 5: Market Benchmarking Room',
            desc: 'Benchmark your product\'s customer perception against competitors A & B to prioritize target improvements.'
        },
        'step6': {
            title: 'Step 6: Engineering Specs targets',
            desc: 'Establish final design parameters and measure competitor technical specifications to lock in your engineering milestones.'
        },
        'step7': {
            title: 'Step 7: The Synthesized House of Quality',
            desc: 'Check the consolidated House of Quality visual matrix. Pay attention to Absolute and Relative Priorities to guide your resources.'
        }
    };

    window.showQfdFieldInfo = (key) => {
        const modal = document.getElementById('info-modal');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        
        if (modal && titleEl && bodyEl && fieldInfoDefinitions[key]) {
            titleEl.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${fieldInfoDefinitions[key].title}`;
            bodyEl.innerHTML = `<p>${fieldInfoDefinitions[key].desc}</p>`;
            modal.classList.remove('hidden');
        }
    };

    window.showQfdInfo = (key) => {
        window.showQfdFieldInfo(key);
    };

    // Run app init
    init();
});
