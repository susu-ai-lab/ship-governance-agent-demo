const storeKeys = {
  tasks: "shipRag.tasks",
  cases: "shipRag.cases",
  metrics: "shipRag.metrics",
  logs: "shipRag.logs",
  activeStep: "shipRag.activeStep"
};

const pages = {
  dashboard: "治理驾驶舱",
  ingest: "数据接入",
  workbench: "AI治理工作台",
  rag: "知识库/RAG检索",
  agent: "Agent应用与知识运营"
};

const mainRecord = "压载泵启动以后震得厉害，轴承位置温度也高，后来换了轴承，重新找正后正常。";

const scenarioCards = [
  {
    name: "主场景",
    title: "压载泵异常振动 + 轴承温度升高",
    mode: "完整闭环",
    desc: "从原始口语化记录开始，跑通 AI 识别、标准化、主数据匹配、人工确认、知识入库、RAG 检索和 Agent 应用。"
  },
  {
    name: "辅助场景",
    title: "焊缝 RT/UT 探伤不合格",
    mode: "扩展证明",
    desc: "证明同一治理框架可扩展到质量异常数据，但不在本 Demo 中展开完整闭环。"
  },
  {
    name: "辅助场景",
    title: "管路安装干涉 / 安装偏差",
    mode: "扩展证明",
    desc: "证明同一知识库与 Agent 模式可扩展到现场缺陷治理，只展示能力边界。"
  }
];

const governanceSteps = [
  { id: "identify", label: "AI识别业务对象" },
  { id: "extract", label: "字段抽取" },
  { id: "standardize", label: "术语标准化" },
  { id: "master", label: "主数据候选匹配" },
  { id: "quality", label: "数据质量校验" },
  { id: "confirm", label: "人工确认并入库" }
];

const stepResults = {
  identify: {
    title: "AI识别业务对象",
    rows: [
      ["设备对象", "压载泵", "从“压载泵启动以后”识别设备类型"],
      ["部件对象", "轴承位置", "从“轴承位置温度也高”识别关键部件"],
      ["故障现象", "异常振动、温度异常升高", "从“震得厉害、温度也高”识别现象"],
      ["处理动作", "更换泵轴承、联轴器找正", "从“换了轴承、重新找正”识别措施"],
      ["结果状态", "处理后正常", "从“后正常”识别验收状态"]
    ]
  },
  extract: {
    title: "字段抽取结果",
    rows: [
      ["设备名称", "压载泵", "待匹配主数据"],
      ["故障现象", "震得厉害；轴承位置温度也高", "原始口语字段"],
      ["维修措施", "换了轴承；重新找正", "来自维修过程描述"],
      ["处置结果", "正常", "可作为验收状态"],
      ["数据来源", "维修工单/一线记录", "模拟历史记录"]
    ]
  },
  standardize: {
    title: "术语标准化建议",
    rows: [
      ["震得厉害", "异常振动", "故障征兆字典 EQP_VIB_HIGH"],
      ["温度高", "温度异常升高", "故障征兆字典 EQP_TEMP_HIGH"],
      ["换轴承", "更换泵轴承", "维修动作字典 MAINT_BRG_REPLACE"],
      ["重新找正", "联轴器找正", "维修动作字典 MAINT_COUPLING_ALIGN"]
    ]
  },
  master: {
    title: "主数据候选匹配",
    rows: [
      ["1号压载泵", "EQ-BW-PUMP-001", "匹配度 91%"],
      ["冷却水泵", "EQ-CW-PUMP-003", "匹配度 42%"],
      ["舱底水泵", "EQ-BILGE-PUMP-002", "匹配度 35%"]
    ]
  },
  quality: {
    title: "数据质量校验",
    rows: [
      ["缺失字段", "设备型号", "影响备件和SOP精准匹配"],
      ["缺失字段", "振动测量值", "影响故障等级判断"],
      ["缺失字段", "轴承温度值", "影响阈值校验"],
      ["缺失字段", "物料编码", "影响备件追溯"],
      ["缺失字段", "验收人", "影响闭环审计"],
      ["低置信度项", "轴承磨损属于推断，需要人工复核", "不能直接作为确定根因"]
    ]
  },
  confirm: {
    title: "人工确认并入库",
    rows: [
      ["知识案例", "压载泵异常振动与温升案例", "已生成标准案例"],
      ["主数据", "1号压载泵 EQ-BW-PUMP-001", "人工确认匹配"],
      ["图谱关系", "6条三元组", "设备、部件、现象、措施、结果已关联"],
      ["发布状态", "已发布", "可被RAG检索和Agent引用"],
      ["反馈回流", "形成字段补全清单", "进入知识运营指标"]
    ]
  }
};

const ragKnowledge = [
  {
    title: "压载泵异常振动历史案例",
    reason: "命中设备：压载泵；命中现象：异常振动、温度异常升高；命中措施：更换轴承、联轴器找正。",
    trust: "高",
    published: "已发布"
  },
  {
    title: "压载泵检修SOP",
    reason: "主数据 EQ-BW-PUMP-001 关联到泵类检修SOP，覆盖轴承、联轴器、地脚、润滑检查。",
    trust: "高",
    published: "已发布"
  },
  {
    title: "泵类设备振动排查规范",
    reason: "问题包含振动与温升，规范可补充测量值、阈值和排查顺序。",
    trust: "中高",
    published: "已发布"
  }
];

const graphTriples = [
  ["1号压载泵 EQ-BW-PUMP-001", "出现故障现象", "异常振动"],
  ["1号压载泵 EQ-BW-PUMP-001", "出现故障现象", "温度异常升高"],
  ["异常振动", "关联部件", "泵轴承"],
  ["异常振动", "可能关联", "联轴器不对中"],
  ["更换泵轴承", "处置", "轴承位置温升"],
  ["联轴器找正", "处置结果", "运行正常"]
];

const defaultMetrics = {
  pending: 7,
  objects: 5,
  masterRate: 91,
  reviewRate: 86,
  citationRate: 72,
  similarRate: 78,
  adoptionRate: 70,
  fieldFillRate: 61,
  gaps: 3
};

const defaultCases = [];
const defaultLogs = [
  { time: "09:10:12", action: "初始化Demo", detail: "加载压载泵异常振动与温升主案例", type: "system" }
];

const state = {
  page: "dashboard",
  activeStep: localStorage.getItem(storeKeys.activeStep) || "identify",
  ragRan: false,
  ragQuery: "压载泵振动升温怎么排查？",
  agentRan: false,
  agentQuestion: "某船压载泵启动后异常振动，并伴随轴承位置温度升高，应该怎么排查？",
  tasks: load(storeKeys.tasks, [createMainTask()]),
  cases: load(storeKeys.cases, defaultCases),
  metrics: load(storeKeys.metrics, defaultMetrics),
  logs: load(storeKeys.logs, defaultLogs)
};

const pageContent = document.querySelector("#pageContent");
const pageTitle = document.querySelector("#pageTitle");
const stateStatus = document.querySelector("#stateStatus");

hydrateMainCase();

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(storeKeys.tasks, JSON.stringify(state.tasks));
  localStorage.setItem(storeKeys.cases, JSON.stringify(state.cases));
  localStorage.setItem(storeKeys.metrics, JSON.stringify(state.metrics));
  localStorage.setItem(storeKeys.logs, JSON.stringify(state.logs));
  localStorage.setItem(storeKeys.activeStep, state.activeStep);
  stateStatus.textContent = `已保存 ${state.tasks.length} 条治理任务`;
}

function createMainTask() {
  return {
    id: "TASK-BW-PUMP-001",
    scenario: "主场景",
    title: "压载泵异常振动与轴承温升治理任务",
    source: "维修工单/一线口语记录",
    raw: mainRecord,
    status: "待AI识别",
    stage: 0,
    completed: [],
    createdAt: new Date().toLocaleString("zh-CN")
  };
}

function hydrateMainCase() {
  if (!state.tasks.some((task) => task.id === "TASK-BW-PUMP-001")) {
    state.tasks.unshift(createMainTask());
  }
}

function mainTask() {
  return state.tasks.find((task) => task.id === "TASK-BW-PUMP-001") || state.tasks[0];
}

function logAction(action, detail, type = "operation") {
  state.logs.unshift({
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    action,
    detail,
    type
  });
  state.logs = state.logs.slice(0, 30);
}

function switchPage(page) {
  state.page = page;
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  render();
  window.scrollTo(0, 0);
}

function render() {
  pageTitle.textContent = pages[state.page];
  const renderers = {
    dashboard: renderDashboard,
    ingest: renderIngest,
    workbench: renderWorkbench,
    rag: renderRag,
    agent: renderAgent
  };
  pageContent.innerHTML = renderers[state.page]();
}

function renderDashboard() {
  return `
    <section class="panel hero-solution">
      <div>
        <p class="eyebrow">Main Storyline</p>
        <h2>AI辅助数据治理 → 高质量知识库 → RAG检索 → Agent业务应用 → 知识运营反馈</h2>
        <p>Demo 只纵向跑通一个主场景：压载泵异常振动 + 轴承温度升高。焊缝探伤和管路干涉作为扩展证明，不展开为独立系统。</p>
      </div>
      <button class="primary-btn" data-page-link="workbench" type="button">进入主案例治理</button>
    </section>
    ${metricsGrid([
      ["待治理数据", state.metrics.pending, "localStorage任务"],
      ["AI识别对象数", state.metrics.objects, "设备/部件/现象/动作/结果"],
      ["主数据匹配成功率", `${state.metrics.masterRate}%`, "1号压载泵"],
      ["人工复核通过率", `${state.metrics.reviewRate}%`, "专家确认"],
      ["知识库有效引用率", `${state.metrics.citationRate}%`, "RAG引用"],
      ["相似案例命中率", `${state.metrics.similarRate}%`, "案例召回"]
    ])}
    <section class="panel">
      <div class="section-heading compact"><div><p class="eyebrow">Operating Model</p><h2>落地闭环主线</h2></div></div>
      <div class="solution-flow">
        ${["AI辅助数据治理", "高质量知识库", "RAG检索", "Agent业务应用", "知识运营反馈"].map((item, index) => `
          <article><span>${index + 1}</span><strong>${item}</strong><p>${flowNote(index)}</p></article>
        `).join("")}
      </div>
    </section>
    <section class="panel">
      <div class="section-heading compact"><div><p class="eyebrow">Scenarios</p><h2>1个主场景 + 2个辅助场景</h2></div></div>
      <div class="scenario-focus">
        ${scenarioCards.map((item, index) => `
          <article class="${index === 0 ? "primary" : ""}">
            <span>${item.name}</span>
            <strong>${item.title}</strong>
            <em>${item.mode}</em>
            <p>${item.desc}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function flowNote(index) {
  return [
    "把口语化维修记录转成结构化事实。",
    "只沉淀经过标准化和复核的可信知识。",
    "按主数据、案例、SOP和规范召回知识。",
    "生成带引用依据和低置信提示的业务建议。",
    "采纳、补字段、知识缺口回流到治理。"
  ][index];
}

function renderIngest() {
  return `
    <section class="content-grid">
      <article class="panel span-7">
        <div class="section-heading compact"><div><p class="eyebrow">Historical Import</p><h2>历史数据导入</h2></div></div>
        <form id="uploadForm" class="form-panel">
          <label>数据来源
            <select name="source">
              <option>维修工单</option>
              <option>设备台账</option>
              <option>SOP</option>
              <option>检测报告</option>
              <option>现场图片</option>
              <option>音频记录</option>
            </select>
          </label>
          <label>模拟上传文件
            <input name="files" type="file" multiple accept=".xls,.xlsx,.csv,.pdf,.doc,.docx,image/*,audio/*,video/*" />
          </label>
          <p class="hint">支持维修工单、设备台账、SOP、检测报告、图片、音频等模拟上传。文件不真实解析，只生成治理任务。</p>
        </form>
        <div class="access-kinds">
          ${["Excel/CSV设备台账", "PDF/Word检修SOP", "维修工单", "检测报告", "现场图片", "音频记录"].map((item) => `<span>${item}</span>`).join("")}
        </div>
      </article>
      <article class="panel span-5">
        <div class="section-heading compact"><div><p class="eyebrow">New Record</p><h2>新增设备故障记录</h2></div></div>
        <form id="faultForm" class="form-panel">
          <label>船舶/项目<input name="ship" value="某船压载水系统联调" /></label>
          <label>设备<input name="device" value="1号压载泵" /></label>
          <label>故障现象<input name="symptom" value="启动后异常振动，轴承位置温度升高" /></label>
          <label>处理措施<input name="action" value="更换轴承，重新找正" /></label>
          <label>验收结果<input name="result" value="运行正常" /></label>
          <button class="primary-btn" type="submit">提交并生成治理任务</button>
        </form>
      </article>
      <article class="panel span-12">
        <div class="section-heading compact"><div><p class="eyebrow">Task Queue</p><h2>接入后治理任务</h2></div><span class="status-pill">${state.tasks.length} 条</span></div>
        <div class="task-list-compact">
          ${state.tasks.slice().reverse().map((task) => `
            <button data-open-task="${task.id}" type="button">
              <strong>${task.title}</strong>
              <span>${task.source}｜${task.status}</span>
              <p>${task.raw}</p>
            </button>
          `).join("")}
        </div>
      </article>
    </section>
  `;
}

function renderWorkbench() {
  const task = mainTask();
  return `
    <section class="workbench-layout">
      <aside class="panel">
        <div class="section-heading compact"><div><p class="eyebrow">Main Case</p><h2>主案例原始记录</h2></div></div>
        <div class="raw-record">
          <span>固定主案例</span>
          <p>${mainRecord}</p>
        </div>
        <div class="step-rail">
          ${governanceSteps.map((step, index) => `
            <button class="${state.activeStep === step.id ? "active" : ""} ${task.completed.includes(step.id) ? "done" : ""}" data-step="${step.id}" type="button">
              <span>${index + 1}</span>
              <strong>${step.label}</strong>
              <em>${task.completed.includes(step.id) ? "已执行" : "待执行"}</em>
            </button>
          `).join("")}
        </div>
      </aside>
      <section class="panel">
        <div class="section-heading compact">
          <div><p class="eyebrow">AI Governance Workbench</p><h2>${stepResults[state.activeStep].title}</h2></div>
          <span class="status-pill">${task.status}</span>
        </div>
        <div class="action-row">
          ${governanceSteps.map((step) => `<button class="secondary-btn" data-run-step="${step.id}" type="button">${step.label}</button>`).join("")}
        </div>
        ${renderStepResult(task)}
        <div class="workbench-note">
          <strong>治理原则</strong>
          <p>AI 只生成结构化建议；涉及根因推断、低置信关系、关键主数据匹配时必须人工确认后才能入库和被 Agent 引用。</p>
        </div>
      </section>
    </section>
  `;
}

function renderStepResult(task) {
  const step = state.activeStep;
  const isDone = task.completed.includes(step);
  const rows = isDone ? stepResults[step].rows : [["等待执行", `点击“${stepResults[step].title}”按钮后生成结果`, "前端mock，不调用真实模型"]];
  return `
    <div class="result-panel">
      ${rows.map(([label, value, note]) => `
        <article>
          <span>${label}</span>
          <strong>${value}</strong>
          <p>${note}</p>
        </article>
      `).join("")}
    </div>
    ${task.completed.includes("confirm") ? renderIngestedSummary() : ""}
  `;
}

function renderIngestedSummary() {
  return `
    <div class="ingested-summary">
      <strong>已生成知识库案例和图谱关系</strong>
      <p>案例：压载泵异常振动与温升案例；主数据：1号压载泵 EQ-BW-PUMP-001；三元组：${graphTriples.length} 条。</p>
    </div>
  `;
}

function renderRag() {
  const hasCase = state.cases.some((item) => item.id === "KB-BW-PUMP-001");
  return `
    <section class="content-grid">
      <article class="panel span-5">
        <div class="section-heading compact"><div><p class="eyebrow">Knowledge Case</p><h2>治理后标准案例</h2></div><span class="status-pill">${hasCase ? "已入库" : "待入库"}</span></div>
        <div class="knowledge-card">
          <strong>压载泵异常振动与温升案例</strong>
          <p>原始记录经 AI 识别、字段抽取、术语标准化、主数据匹配、质量校验和人工确认后形成。</p>
          <dl>
            <div><dt>关联主数据</dt><dd>1号压载泵 EQ-BW-PUMP-001</dd></div>
            <div><dt>关联SOP</dt><dd>压载泵检修SOP</dd></div>
            <div><dt>发布状态</dt><dd>${hasCase ? "已发布" : "待人工确认入库"}</dd></div>
          </dl>
        </div>
        <div class="triple-mini">
          ${graphTriples.map(([s, p, o]) => `<div><span>${s}</span><strong>${p}</strong><span>${o}</span></div>`).join("")}
        </div>
      </article>
      <article class="panel span-7">
        <div class="section-heading compact"><div><p class="eyebrow">RAG Retrieval</p><h2>RAG检索模拟</h2></div></div>
        <div class="rag-search">
          <label>用户问题<textarea id="ragInput">${state.ragQuery}</textarea></label>
          <button class="primary-btn" data-run-rag type="button">运行RAG检索</button>
        </div>
        ${state.ragRan ? renderRagResults() : `<p class="hint">点击运行后展示命中的案例、SOP和规范，以及匹配原因、可信等级和发布状态。</p>`}
      </article>
    </section>
  `;
}

function renderRagResults() {
  return `
    <div class="rag-results">
      ${ragKnowledge.map((item) => `
        <article>
          <div><strong>${item.title}</strong><span>可信等级：${item.trust}</span></div>
          <p>${item.reason}</p>
          <em>${item.published}</em>
        </article>
      `).join("")}
    </div>
  `;
}

function renderAgent() {
  return `
    <section class="agent-layout focused-agent">
      <div class="panel">
        <div class="section-heading compact"><div><p class="eyebrow">Agent Chain</p><h2>Agent调用链</h2></div></div>
        <div class="agent-chain">
          ${["用户问题", "意图识别", "主数据匹配", "RAG检索", "图谱查询", "数据质量检查", "生成业务建议", "引用依据", "反馈回流"].map((item, index) => `
            <article><span>${index + 1}</span><strong>${item}</strong></article>
          `).join("")}
        </div>
        <div class="rag-search">
          <label>Agent示例问题<textarea id="agentInput">${state.agentQuestion}</textarea></label>
          <button class="primary-btn" data-run-agent type="button">运行Agent应用</button>
        </div>
        ${state.agentRan ? renderAgentOutput() : `<p class="hint">点击运行后展示标准设备识别、相似案例、可能原因、排查步骤、推荐SOP和低置信度提示。</p>`}
      </div>
      <aside class="panel drawer-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Trusted Evidence</p><h2>可信依据</h2></div></div>
        ${evidenceBlock("引用主数据", ["1号压载泵 EQ-BW-PUMP-001"])}
        ${evidenceBlock("引用知识案例", ["压载泵异常振动与温升案例"])}
        ${evidenceBlock("引用SOP", ["压载泵检修SOP"])}
        ${evidenceBlock("引用图谱关系", [`${graphTriples.length}条：设备-现象-部件-措施-结果`])}
        ${evidenceBlock("低置信度项", ["轴承磨损，需要人工复核"])}
      </aside>
      <section class="panel span-full">
        <div class="section-heading compact"><div><p class="eyebrow">Knowledge Ops</p><h2>知识运营指标</h2></div></div>
        ${metricsGrid([
          ["知识库有效引用率", `${state.metrics.citationRate}%`, "RAG引用"],
          ["相似案例命中率", `${state.metrics.similarRate}%`, "案例召回"],
          ["人工复核通过率", `${state.metrics.reviewRate}%`, "治理质量"],
          ["答案采纳率", `${state.metrics.adoptionRate}%`, "业务反馈"],
          ["字段补全率", `${state.metrics.fieldFillRate}%`, "数据回流"],
          ["知识缺口发现数", state.metrics.gaps, "运营待办"]
        ])}
        <div class="operation-log compact-log">
          ${state.logs.slice(0, 6).map((log) => `<article class="${log.type}"><span>${log.time}</span><strong>${log.action}</strong><p>${log.detail}</p></article>`).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderAgentOutput() {
  return `
    <div class="agent-output-grid">
      ${[
        ["标准设备识别", "1号压载泵 EQ-BW-PUMP-001，匹配度91%。"],
        ["相似案例", "命中“压载泵异常振动与温升案例”，症状和处置高度相似。"],
        ["可能原因", "轴承磨损或润滑异常、联轴器不对中、地脚松动、入口工况波动。"],
        ["排查步骤", "先测振动和轴承温度，再查润滑和地脚，随后检查联轴器找正，最后按SOP复验。"],
        ["推荐SOP", "压载泵检修SOP；泵类设备振动排查规范。"],
        ["需补全字段", "设备型号、振动测量值、轴承温度值、物料编码、验收人。"],
        ["低置信度提示", "轴承磨损属于推断，需要人工复核后才能作为根因入库。"]
      ].map(([title, body]) => `<article><strong>${title}</strong><p>${body}</p></article>`).join("")}
    </div>
  `;
}

function evidenceBlock(title, rows) {
  return `<details class="fold-card" open><summary>${title}</summary><ul>${rows.map((row) => `<li>${row}</li>`).join("")}</ul></details>`;
}

function metricsGrid(rows) {
  return `<section class="metric-grid solution-metrics">${rows.map(([label, value, note]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><em>${note}</em></article>`).join("")}</section>`;
}

function inferFileType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx")) return "设备台账/Excel";
  if (name.endsWith(".pdf")) return "PDF检测报告/SOP";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "Word SOP";
  if (file.type.startsWith("image/")) return "现场图片";
  if (file.type.startsWith("audio/")) return "音频记录";
  if (file.type.startsWith("video/")) return "视频记录";
  return "历史资料";
}

function addTask({ source, raw, title = "压载泵故障数据治理任务" }) {
  const task = {
    id: `TASK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
    scenario: "主场景",
    title,
    source,
    raw,
    status: "待AI识别",
    stage: 0,
    completed: [],
    createdAt: new Date().toLocaleString("zh-CN")
  };
  state.tasks.push(task);
  state.metrics.pending += 1;
  logAction("生成治理任务", `${task.id} 来自 ${source}`, "operation");
  save();
  return task;
}

function runStep(stepId) {
  const task = mainTask();
  if (!task.completed.includes(stepId)) task.completed.push(stepId);
  task.stage = Math.max(task.stage, governanceSteps.findIndex((step) => step.id === stepId) + 1);
  task.status = stepId === "confirm" ? "已人工确认并入库" : stepResults[stepId].title;
  state.activeStep = stepId;

  if (stepId === "identify") state.metrics.objects = 5;
  if (stepId === "master") state.metrics.masterRate = 91;
  if (stepId === "confirm") {
    state.metrics.pending = Math.max(0, state.metrics.pending - 1);
    state.metrics.reviewRate = 92;
    state.metrics.citationRate = Math.max(state.metrics.citationRate, 84);
    state.metrics.similarRate = Math.max(state.metrics.similarRate, 88);
    createKnowledgeCase();
  }

  logAction(stepResults[stepId].title, `主案例状态更新为：${task.status}`, stepId === "confirm" ? "ingest" : "governance");
  save();
  render();
}

function createKnowledgeCase() {
  if (state.cases.some((item) => item.id === "KB-BW-PUMP-001")) return;
  state.cases.push({
    id: "KB-BW-PUMP-001",
    title: "压载泵异常振动与温升案例",
    masterData: "1号压载泵 EQ-BW-PUMP-001",
    sop: "压载泵检修SOP",
    triples: graphTriples,
    published: true,
    sourceTask: "TASK-BW-PUMP-001"
  });
}

document.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page], [data-page-link]");
  if (pageButton) {
    switchPage(pageButton.dataset.page || pageButton.dataset.pageLink);
    return;
  }

  const stepButton = event.target.closest("[data-step]");
  if (stepButton) {
    state.activeStep = stepButton.dataset.step;
    save();
    render();
    return;
  }

  const runButton = event.target.closest("[data-run-step]");
  if (runButton) {
    runStep(runButton.dataset.runStep);
    return;
  }

  const openTask = event.target.closest("[data-open-task]");
  if (openTask) {
    state.activeStep = "identify";
    switchPage("workbench");
    return;
  }

  if (event.target.closest("[data-run-rag]")) {
    state.ragQuery = document.querySelector("#ragInput")?.value || state.ragQuery;
    state.ragRan = true;
    state.metrics.citationRate = Math.max(state.metrics.citationRate, 86);
    state.metrics.similarRate = Math.max(state.metrics.similarRate, 90);
    logAction("RAG检索", `问题：${state.ragQuery}`, "rag");
    save();
    render();
    return;
  }

  if (event.target.closest("[data-run-agent]")) {
    state.agentQuestion = document.querySelector("#agentInput")?.value || state.agentQuestion;
    state.agentRan = true;
    state.metrics.adoptionRate = Math.max(state.metrics.adoptionRate, 82);
    state.metrics.fieldFillRate = Math.max(state.metrics.fieldFillRate, 73);
    logAction("Agent应用", "生成带引用依据、低置信提示和字段补全项的排查建议", "agent");
    save();
    render();
    return;
  }
});

document.addEventListener("change", (event) => {
  if (!event.target.matches("#uploadForm input[type='file']")) return;
  const form = event.target.closest("form");
  const source = form.source.value || "历史数据导入";
  [...event.target.files].forEach((file) => {
    const fileType = inferFileType(file);
    addTask({
      source: `${source} / ${fileType}`,
      title: `${fileType}接入治理任务`,
      raw: `${file.name} 已模拟识别为压载泵相关资料，进入AI治理工作台。`
    });
  });
  event.target.value = "";
  render();
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id !== "faultForm") return;
  const form = new FormData(event.target);
  const raw = [
    `船舶/项目:${form.get("ship")}`,
    `设备:${form.get("device")}`,
    `故障现象:${form.get("symptom")}`,
    `处理措施:${form.get("action")}`,
    `验收结果:${form.get("result")}`
  ].join("；");
  addTask({ source: "新增设备故障记录表单", raw, title: "新增压载泵故障记录治理任务" });
  switchPage("workbench");
});

document.querySelector("#rerunBtn").addEventListener("click", () => {
  stateStatus.textContent = "模拟流程已刷新";
  render();
});

render();
