const storeKeys = {
  tasks: "shipQuality.tasks",
  uploads: "shipQuality.uploads",
  aliases: "shipQuality.aliases",
  cases: "shipQuality.cases"
};

const pages = {
  dashboard: "总览驾驶舱",
  assets: "数据资产目录",
  dictionary: "标准字典/主数据",
  workflow: "数据治理任务流",
  graph: "知识库/知识图谱",
  agents: "Agent 应用",
  audit: "评测与审计"
};

const scenarios = {
  quality: {
    label: "质量异常",
    agent: "质量异常 Agent",
    problem: "焊缝 RT/UT 探伤不合格、压力试验异常、返修复验闭环",
    inputs: ["RT/UT 报告", "试压记录", "焊缝台账", "WPS", "返修单"],
    standards: ["缺陷类型字典", "NDT 评级规则", "焊缝主数据", "返修复验流程"],
    graph: ["焊缝-缺陷-工艺-人员-返修-复验"],
    output: "原因判断、证据链、返修建议、复验策略、需补字段",
    process: ["抽取焊缝号/报告号/缺陷描述", "匹配 RT/UT 标准字典", "关联焊工、WPS、返修历史", "输出复验和闭环建议"],
    fit: "探伤不合格、压力试验异常、焊接缺陷聚类、返修复验追踪",
    notFit: "纯设备机械故障、无质量边界的普通巡检问题"
  },
  field: {
    label: "现场缺陷",
    agent: "现场缺陷 Agent",
    problem: "管路安装干涉、安装偏差、图纸版本和现场整改闭环",
    inputs: ["现场 NCR", "照片/视频", "图纸版本", "三维模型", "整改记录"],
    standards: ["现场缺陷字典", "位置主数据", "系统/管段主数据", "设计变更规则"],
    graph: ["管段-区域-干涉对象-图纸版本-整改措施"],
    output: "干涉类型、责任工序、整改路径、冻结范围、复核项",
    process: ["识别区域/系统/管段", "提取干涉对象和偏差值", "对齐图纸版本和设计变更", "推荐整改与复核范围"],
    fit: "管路/支架/电缆等现场安装干涉、偏差、物料错发",
    notFit: "探伤评级、泵轴承温升等非现场安装类问题"
  },
  equipment: {
    label: "设备故障",
    agent: "设备故障 Agent",
    problem: "压载泵异常振动、温度升高、联调时设备状态异常",
    inputs: ["IoT 时序", "点检记录", "EAM 工单", "备件台账", "设备说明书"],
    standards: ["故障征兆字典", "设备主数据", "报警阈值", "维修动作字典"],
    graph: ["设备-征兆-原因-备件-工单-验收"],
    output: "根因 Top3、风险等级、检修建议、备件建议、验收关注点",
    process: ["读取振动/温度/负载", "匹配故障征兆标准码", "召回相似工单", "输出检修优先级和备件"],
    fit: "泵、阀、风机、电机等设备异常、趋势预警、维修闭环",
    notFit: "仅由图纸版本导致的安装空间干涉"
  }
};

const agents = [
  {
    id: "orchestrator",
    name: "治理编排 Agent",
    subtitle: "识别问题场景并调度子 Agent",
    problem: "跨场景问题识别、任务拆解、证据聚合和统一整改方案输出",
    inputs: ["用户问题", "治理任务", "知识库案例", "图谱实体", "评测反馈"],
    standards: ["意图识别规则", "场景路由规则", "证据可信度规则", "输出模板"],
    graph: ["系统-场景-子任务-Agent-证据-整改方案"],
    output: "子任务列表、调度结果、合并风险等级、统一处理建议、入库计划",
    process: ["识别问题包含的业务对象", "拆分质量/现场/设备子任务", "调用对应子 Agent", "合并冲突结论和补全字段"],
    fit: "跨部门、跨系统、跨专业联调问题",
    notFit: "单条字段清洗或不需要业务推理的普通录入"
  },
  { id: "quality", name: scenarios.quality.agent, subtitle: "焊缝 RT/UT 探伤不合格", ...scenarios.quality },
  { id: "field", name: scenarios.field.agent, subtitle: "管路安装干涉/安装偏差", ...scenarios.field },
  { id: "equipment", name: scenarios.equipment.agent, subtitle: "压载泵异常振动 + 温度升高", ...scenarios.equipment }
];

const baseAliases = [
  ["拍片没过", "RT探伤不合格", "质量异常", "QA_DEF_RT_FAIL"],
  ["焊口没过", "焊缝探伤不合格", "质量异常", "QA_WELD_NDT_FAIL"],
  ["压力掉得快", "压力试验异常", "质量异常", "QA_PRESS_TEST_ABN"],
  ["管子打架", "管路安装干涉", "现场缺陷", "SITE_PIPE_CLASH"],
  ["装不上", "安装偏差", "现场缺陷", "SITE_INSTALL_OFFSET"],
  ["支架顶住", "结构干涉", "现场缺陷", "SITE_STRUCT_CLASH"],
  ["泵抖得厉害", "异常振动", "设备故障", "EQP_VIB_HIGH"],
  ["轴承热", "温度升高", "设备故障", "EQP_TEMP_HIGH"],
  ["对中不好", "联轴器不对中", "设备故障", "EQP_MISALIGN"]
];

const baseTasks = [
  createTask({
    id: "T-2401",
    scenario: "quality",
    source: "RT 报告 PDF / MES 返修单",
    raw: "RT-26-0511：B3左34# 纵缝，片位 08，见 LOF/未融合，二级不合格；返修后补拍，焊工写 W-1027。",
    issues: "焊缝号、缺陷类型、返修动作待复核",
    score: 62
  }),
  createTask({
    id: "T-2402",
    scenario: "field",
    source: "现场 NCR / 照片 OCR / 三维模型",
    raw: "泵舱2D，P-BW2207 装不上，支架顶纵梁，现场偏左约 25，照片标牌模糊，模型 M17.4。",
    issues: "管段号、干涉对象、模型版本待复核",
    score: 57
  }),
  createTask({
    id: "T-2403",
    scenario: "equipment",
    source: "IoT 时序 / 点检记录 / EAM 工单",
    raw: "BP02 码头联调，驱动端温度 82℃，振动 RMS 9.8mm/s，班组备注：泵有抖动，对中可能不好。",
    issues: "设备主数据、振动阈值、备件型号待复核",
    score: 68
  })
];

const baseCases = [
  {
    id: "KB-1001",
    title: "B3 分段纵缝 RT 未熔合返修案例",
    scenario: "quality",
    risk: "高",
    triples: [["焊缝 W-B3-P-034-08", "发现缺陷", "未熔合"], ["未熔合", "处置", "清根补焊"], ["返修单 RW-8841", "复验", "RT 合格"]]
  },
  {
    id: "KB-1002",
    title: "压载水管段支架与纵梁干涉整改案例",
    scenario: "field",
    risk: "中高",
    triples: [["管段 P-BW-2207", "发生缺陷", "管路安装干涉"], ["管路安装干涉", "干涉对象", "支架 S-884"], ["支架 S-884", "整改措施", "调整孔位"]]
  },
  {
    id: "KB-1003",
    title: "压载泵 BP-02 振动温升联动故障案例",
    scenario: "equipment",
    risk: "高",
    triples: [["压载泵 BP-02", "出现征兆", "异常振动"], ["异常振动", "伴随", "温度升高"], ["异常振动", "疑似原因", "联轴器不对中"]]
  }
];

const governanceStages = [
  ["接入", "保留原始快照，生成来源血缘", "数据工程"],
  ["登记", "识别资产类型、场景、责任域", "数据治理"],
  ["抽取", "从脏数据中抽取对象、现象、位置、动作", "抽取 Agent"],
  ["标准化", "匹配企业字典和行业术语", "标准管理员"],
  ["主数据", "对齐焊缝、管段、设备、人员、备件", "主数据管理员"],
  ["质量校验", "检查完整性、唯一性、置信度、业务规则", "规则引擎"],
  ["复核", "专家确认低置信和冲突字段", "业务专家"],
  ["入库", "写入案例库、图谱和评测样本", "知识运营"]
];

const companyGovernance = [
  ["华东船舶制造", "MES / NDT / EAM / PLM", 86, 78, 72, 64, "焊接质量与现场整改闭环较好，设备故障数据仍分散"],
  ["南方修船基地", "EAM / NCR / IoT", 72, 61, 58, 49, "历史工单积压多，主数据编码不统一"],
  ["海工装备分公司", "PLM / 三维模型 / NCR", 79, 68, 66, 57, "现场缺陷和设计变更链路清晰，NDT 数据接入不足"],
  ["动力系统事业部", "IoT / EAM / 备件", 74, 54, 63, 52, "设备数据量大，但标准故障模式库覆盖不足"]
];

const batchGovernance = [
  ["NDT 历史报告治理批次", "12,480 条", "质量异常", "68%", "自动清洗 61% / 人工复核 39%", "缺陷类型和焊缝号标准化"],
  ["现场 NCR 照片与缺陷单批次", "5,260 条", "现场缺陷", "54%", "自动清洗 47% / 人工复核 53%", "照片点位、图纸版本、责任工序"],
  ["压载泵 EAM+IoT 故障批次", "3,840 条", "设备故障", "71%", "自动清洗 66% / 人工复核 34%", "设备位号、阈值、备件主数据"]
];

const frontlineScenarios = [
  ["拍照/上传", "现场照片、报告、点检截图自动识别区域、对象和现象"],
  ["一句话记录", "“BP02 抖得厉害还有点烫”自动映射异常振动、温度升高"],
  ["少填表单", "主数据候选、标准缺陷类型、处置措施自动推荐"],
  ["即时收益", "提交后返回相似案例、补充项、整改建议和是否升级"]
];

const roleProfiles = {
  group: {
    label: "集团",
    title: "集团治理驾驶舱",
    subtitle: "看清下属公司治理成熟度、治理进度、数据质量和业务价值。",
    focus: "监管 / 排名 / 督办 / 价值复盘"
  },
  subsidiary: {
    label: "子公司",
    title: "二三级公司治理工作台",
    subtitle: "管理历史批次、新增数据、复核工作量、规则复用和知识入库。",
    focus: "批次治理 / 规则沉淀 / 专家复核 / 价值闭环"
  },
  frontline: {
    label: "一线",
    title: "一线轻量采集助手",
    subtitle: "少填字段，自动识别，直接返回相似案例、补充项和整改建议。",
    focus: "拍照上传 / 一句话记录 / 自动推荐 / 即时收益"
  }
};

const state = {
  page: "dashboard",
  orgView: "group",
  assetTab: "import",
  collectScenario: "quality",
  dictScenario: "quality",
  selectedTaskId: "T-2401",
  taskTab: "extract",
  selectedAgentId: "orchestrator",
  collabRan: false,
  collabQuestion: "压载水系统联调时发现管路干涉，整改后压力试验异常，同时压载泵振动升温。",
  tasks: load(storeKeys.tasks, baseTasks),
  uploads: load(storeKeys.uploads, []),
  aliases: load(storeKeys.aliases, baseAliases),
  cases: load(storeKeys.cases, baseCases)
};

hydrateDefaults();

const pageContent = document.querySelector("#pageContent");
const pageTitle = document.querySelector("#pageTitle");
const stateStatus = document.querySelector("#stateStatus");

function load(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function hydrateDefaults() {
  const aliasKeys = new Set(state.aliases.map((row) => `${row[0]}|${row[1]}|${row[2]}`));
  baseAliases.forEach((row) => {
    const key = `${row[0]}|${row[1]}|${row[2]}`;
    if (!aliasKeys.has(key)) state.aliases.push(row);
  });

  const caseIds = new Set(state.cases.map((item) => item.id));
  baseCases.forEach((item) => {
    if (!caseIds.has(item.id)) state.cases.push(item);
  });
}

function save() {
  localStorage.setItem(storeKeys.tasks, JSON.stringify(state.tasks));
  localStorage.setItem(storeKeys.uploads, JSON.stringify(state.uploads));
  localStorage.setItem(storeKeys.aliases, JSON.stringify(state.aliases));
  localStorage.setItem(storeKeys.cases, JSON.stringify(state.cases));
  stateStatus.textContent = `已保存 ${state.tasks.length} 个治理任务`;
}

function createTask({ id, scenario, source, raw, issues, score = 55, fileName = "", fileType = "", recognition = "" }) {
  return {
    id: id || `T-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
    scenario,
    source,
    raw,
    issues,
    score,
    fileName,
    fileType,
    recognition,
    status: "待接入",
    stage: 0,
    needsReview: true,
    extract: [],
    standard: [],
    master: [],
    missing: [],
    lowConfidence: [],
    triples: [],
    result: "尚未入库"
  };
}

function selectedTask() {
  return state.tasks.find((task) => task.id === state.selectedTaskId) || state.tasks[0];
}

function switchPage(page) {
  state.page = page;
  document.querySelectorAll("[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  render();
  window.scrollTo(0, 0);
}

function render() {
  syncRoleButtons();
  pageTitle.textContent = pages[state.page] === "总览驾驶舱"
    ? "船舶制造/修理质量-缺陷-故障知识库 Agent"
    : pages[state.page];

  const renderers = {
    dashboard: renderDashboard,
    assets: renderAssets,
    dictionary: renderDictionary,
    workflow: renderWorkflow,
    graph: renderGraph,
    agents: renderAgents,
    audit: renderAudit
  };
  pageContent.innerHTML = `${state.page === "dashboard" ? "" : roleContextBanner()}${renderers[state.page]()}`;
}

function syncRoleButtons() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.classList.toggle("active", button.dataset.role === state.orgView);
  });
}

function roleContextBanner() {
  const role = roleProfiles[state.orgView];
  const pageGuidance = {
    assets: {
      group: "集团关注各单位资产接入率、数据来源分布、历史数据治理批次规模。",
      subsidiary: "子公司关注批次导入、新增采集、复核工作量和规则复用。",
      frontline: "一线关注拍照/上传/一句话输入后能否自动带出字段并减少录入。"
    },
    dictionary: {
      group: "集团关注标准覆盖率、别名沉淀和跨单位口径统一。",
      subsidiary: "子公司关注本单位高频口语、历史写法和标准映射是否够用。",
      frontline: "一线不用背字典，系统应把口语自动推荐为标准项。"
    },
    workflow: {
      group: "集团关注任务积压、低质量单位、长期未复核和入库转化率。",
      subsidiary: "子公司关注每个批次怎么清洗、哪些要专家复核、哪些能自动入库。",
      frontline: "一线关注提交后系统是否自动补字段、提醒缺什么、返回可执行建议。"
    },
    graph: {
      group: "集团关注知识资产沉淀规模、跨单位复用和高发问题关系网。",
      subsidiary: "子公司关注本单位案例能否复用、图谱是否支撑相似问题召回。",
      frontline: "一线关注相似案例、整改措施和需要补充的证据。"
    },
    agents: {
      group: "集团关注 Agent 是否基于可信知识、采纳率和跨单位推广价值。",
      subsidiary: "子公司关注 Agent 是否减少查资料和专家重复判断。",
      frontline: "一线关注 Agent 是否直接给出处置建议、补充项和是否升级。"
    },
    audit: {
      group: "集团关注治理成熟度排名、价值指标和闭环审计。",
      subsidiary: "子公司关注复核效率、入库转化和规则优化。",
      frontline: "一线关注提交后是否被采纳、整改是否闭环。"
    }
  };
  return `
    <section class="role-context ${state.orgView}">
      <div>
        <span>${role.label}</span>
        <strong>${role.title}</strong>
        <p>${pageGuidance[state.page]?.[state.orgView] || role.subtitle}</p>
      </div>
      <em>${role.focus}</em>
    </section>
  `;
}

function renderDashboard() {
  const ingested = state.tasks.filter((task) => task.status === "已入库").length;
  const kpis = governanceKpis();
  const role = roleProfiles[state.orgView];
  return `
    <section class="hero-dashboard ${state.orgView}">
      <div class="hero-copy">
        <p class="eyebrow">Role Based Command Center</p>
        <h2>${role.title}</h2>
        <p>${role.subtitle}</p>
        <div class="hero-actions">
          <button class="primary-btn" data-demo-run type="button">一键演示治理闭环</button>
          <button class="secondary-btn" data-page-link="${state.orgView === "frontline" ? "assets" : state.orgView === "subsidiary" ? "workflow" : "audit"}" type="button">${state.orgView === "frontline" ? "进入采集助手" : state.orgView === "subsidiary" ? "进入治理任务" : "查看评测审计"}</button>
        </div>
      </div>
      <div class="hero-visual">
        <img src="assets/ship-governance-command.png" alt="船舶数据治理态势图" />
        <div class="scanline"></div>
        <div class="floating-stat stat-a"><span>标准命中</span><strong>${kpis.standardHit}%</strong></div>
        <div class="floating-stat stat-b"><span>图谱关系</span><strong>${state.cases.flatMap((item) => item.triples).length}</strong></div>
        <div class="floating-stat stat-c"><span>Agent证据</span><strong>${kpis.evidence}</strong></div>
      </div>
    </section>
    ${metrics(roleMetrics(kpis, ingested))}
    <section class="content-grid">
      <article class="panel span-12">
        <div class="section-heading compact"><div><p class="eyebrow">Role Dashboard</p><h2>${role.title}</h2></div><span class="status-pill">${role.focus}</span></div>
        ${renderOrgPerspective()}
      </article>
      <article class="panel span-12">
        <div class="section-heading compact">
          <div><p class="eyebrow">Demo Storyline</p><h2>端到端演示主线：压载水系统联调异常</h2></div>
          <button class="primary-btn" data-demo-run type="button">一键演示治理闭环</button>
        </div>
        <div class="storyline">
          ${[
            ["1", "历史/新增数据进入", "管路干涉、压力试验异常、压载泵振动升温被归并为同一联调事件"],
            ["2", "治理任务流处理", "字段抽取、标准化、主数据对齐、质量校验、人工确认、入库"],
            ["3", "知识库/图谱沉淀", "形成跨场景案例、主数据实体、关系三元组和可追溯证据链"],
            ["4", "编排 Agent 应用", "总控 Agent 拆分三类子任务并合并为业务处置单"]
          ].map(([num, title, desc]) => `<article><span>${num}</span><strong>${title}</strong><p>${desc}</p></article>`).join("")}
        </div>
      </article>
      <article class="panel span-7">
        <div class="section-heading compact"><div><p class="eyebrow">Agent Matrix</p><h2>治理编排 Agent + 三个业务子 Agent</h2></div></div>
        <div class="agent-mini-grid">
          ${agents.map((agent) => `<button data-jump-agent="${agent.id}" type="button"><strong>${agent.name}</strong><span>${agent.subtitle}</span></button>`).join("")}
        </div>
      </article>
      <article class="panel span-5">
        <div class="section-heading compact"><div><p class="eyebrow">Recent Queue</p><h2>最近治理任务</h2></div><button class="secondary-btn" data-page-link="workflow" type="button">进入任务流</button></div>
        <div class="compact-list">${state.tasks.slice(-4).reverse().map(taskLine).join("")}</div>
      </article>
      <article class="panel span-12">
        <div class="section-heading compact"><div><p class="eyebrow">Process</p><h2>数据治理业务闭环</h2></div></div>
        <div class="pipeline-grid small">${pipelineCards().join("")}</div>
      </article>
      <article class="panel span-12">
        <div class="section-heading compact"><div><p class="eyebrow">Governance Value</p><h2>治理价值指标</h2></div></div>
        <div class="value-grid">
          ${[
            ["字段完整率", "46%", `${kpis.completeness}%`, "缺失字段补齐、非结构化字段抽取"],
            ["标准化命中", "38%", `${kpis.standardHit}%`, "别名映射、术语统一、标准编码"],
            ["主数据对齐", "41%", `${kpis.masterAligned}%`, "焊缝/管段/设备唯一实体"],
            ["Agent 可引用证据", "18 条", `${kpis.evidence} 条`, "案例、三元组、规则和复核记录"]
          ].map(valueCard).join("")}
        </div>
      </article>
    </section>
  `;
}

function roleMetrics(kpis, ingested) {
  const map = {
    group: [
      ["子公司接入", "4 家", "治理监管"],
      ["平均成熟度", "73%", "资产/标准/主数据"],
      ["知识库案例", state.cases.length, `任务入库 ${ingested}`],
      ["风险预警", "6 项", "待督办"]
    ],
    subsidiary: [
      ["历史批次", "3 个", "治理项目"],
      ["自动清洗率", "58%", "规则复用"],
      ["字段完整率", `${kpis.completeness}%`, "治理后"],
      ["待复核", state.tasks.filter((task) => task.needsReview).length, "专家确认"]
    ],
    frontline: [
      ["少填字段", "60%", "自动带出"],
      ["标准推荐", `${kpis.standardHit}%`, "口语识别"],
      ["相似案例", state.cases.length, "即时返回"],
      ["需补充项", "5 类", "现场提醒"]
    ]
  };
  return map[state.orgView];
}

function renderOrgPerspective() {
  if (state.orgView === "group") {
    return `
      <div class="group-dashboard">
        <div class="maturity-grid">
          ${companyGovernance.map(([name, systems, asset, standard, master, value, note]) => `
            <article>
              <div><strong>${name}</strong><span>${systems}</span></div>
              ${maturityBar("资产登记", asset)}
              ${maturityBar("标准覆盖", standard)}
              ${maturityBar("主数据对齐", master)}
              ${maturityBar("价值闭环", value)}
              <p>${note}</p>
            </article>
          `).join("")}
        </div>
        <div class="group-radar">
          <article><strong>集团可看清什么</strong><p>各子公司资产接入、标准覆盖、主数据对齐、历史治理进度、新增数据合规、知识入库和 Agent 采纳情况。</p></article>
          <article><strong>集团能怎么管</strong><p>按业务域和单位定位短板，形成治理成熟度排名、整改督办和价值复盘。</p></article>
          <article><strong>集团最关心的预警</strong><p>长期未复核任务、标准未覆盖字段、主数据冲突、重复高发缺陷和低采纳 Agent 输出。</p></article>
        </div>
      </div>
    `;
  }

  if (state.orgView === "subsidiary") {
    return `
      <div class="batch-board">
        ${batchGovernance.map(([name, count, domain, progress, split, focus]) => `
          <article>
            <div><strong>${name}</strong><span>${domain}</span></div>
            <p>数据量：${count}</p>
            <div class="bar large"><i style="width:${progress}"></i></div>
            <p>治理进度：${progress}；${split}</p>
            <em>重点治理：${focus}</em>
          </article>
        `).join("")}
      </div>
      <div class="operation-grid">
        <article><strong>规则复用</strong><p>别名映射、字段抽取、主数据匹配和质量校验规则沉淀后，可复用于同类批次。</p></article>
        <article><strong>人工工作量</strong><p>只把低置信、多候选、业务冲突项交给专家复核，减少“全量人工清洗”。</p></article>
        <article><strong>价值闭环</strong><p>治理完成后沉淀案例、图谱、评测样本，支撑相似问题召回和 Agent 处置建议。</p></article>
      </div>
    `;
  }

  return `
    <div class="frontline-board">
      <div class="frontline-cards">
        ${frontlineScenarios.map(([title, desc]) => `<article><strong>${title}</strong><p>${desc}</p></article>`).join("")}
      </div>
      <div class="frontline-assistant">
        <strong>一线员工看到的不是“数据治理”，而是工作助手</strong>
        <p>输入一句话或上传照片/报告，系统自动带出标准字段、主数据候选、相似案例、补充项和整改建议。员工少填，平台多沉淀。</p>
        <div class="assistant-preview">
          <span>输入：BP02 抖得厉害还有点烫，刚改完 P-BW2207 后试压也掉压。</span>
          <span>识别：设备故障 + 质量异常 + 现场整改关联</span>
          <span>返回：建议降载点检、补压力曲线、核对 ECO 与管段整改时间线</span>
        </div>
      </div>
    </div>
  `;
}

function maturityBar(label, value) {
  return `<div class="maturity-line"><span>${label}</span><strong>${value}%</strong><div><i style="width:${value}%"></i></div></div>`;
}

function governanceKpis() {
  const total = Math.max(1, state.tasks.length);
  const extracted = state.tasks.filter((task) => task.extract.length).length;
  const standardized = state.tasks.filter((task) => task.standard.length).length;
  const mastered = state.tasks.filter((task) => task.master.length).length;
  const evidence = state.cases.flatMap((item) => item.triples).length + state.aliases.length + extracted * 3;
  return {
    completeness: Math.min(96, 58 + Math.round(extracted / total * 34)),
    standardHit: Math.min(95, 52 + Math.round(standardized / total * 35)),
    masterAligned: Math.min(93, 45 + Math.round(mastered / total * 38)),
    evidence
  };
}

function valueCard([label, before, after, note]) {
  return `
    <article class="value-card">
      <span>${label}</span>
      <div><strong>${before}</strong><em>→</em><strong>${after}</strong></div>
      <p>${note}</p>
    </article>
  `;
}

function metrics(rows) {
  return `<section class="metric-grid">${rows.map(([label, value, delta]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><em>${delta}</em></article>`).join("")}</section>`;
}

function renderAssets() {
  const isImport = state.assetTab === "import";
  return `
    <section class="panel">
      <div class="tabbar">
        <button class="${isImport ? "active" : ""}" data-asset-tab="import" type="button">历史数据导入</button>
        <button class="${!isImport ? "active" : ""}" data-asset-tab="collect" type="button">新增数据采集</button>
      </div>
      ${isImport ? renderImportTab() : renderCollectTab()}
    </section>
  `;
}

function renderImportTab() {
  return `
    <div class="asset-layout">
      <form id="uploadForm" class="form-panel">
        <label>数据来源<input name="source" value="历史归档/班组资料" /></label>
        <label>所属场景<select name="scenario">${scenarioOptions()}</select></label>
        <label>模拟上传文件<input name="files" type="file" multiple accept=".xls,.xlsx,.csv,.pdf,.doc,.docx,image/*,video/*,audio/*" /></label>
        <p class="hint">支持 Excel / CSV、PDF、Word、图片、视频、音频。文件不会真实解析，只生成待治理任务。</p>
      </form>
      <div class="table-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Upload Records</p><h2>上传记录</h2></div></div>
        ${state.uploads.length ? state.uploads.slice().reverse().map((item) => `
          <article class="upload-row">
            <strong>${item.fileName}</strong><span>${item.fileType}</span>
            <p>${item.source}｜${scenarios[item.scenario].label}｜${item.recognition}</p>
            <em>${item.needsReview ? "需要人工复核" : "可自动治理"}</em>
          </article>
        `).join("") : `<p class="empty-text">暂无上传记录</p>`}
      </div>
    </div>
  `;
}

function renderCollectTab() {
  return `
    <div class="asset-layout">
      <form id="collectForm" class="form-panel">
        <label>采集场景<select name="scenario" data-collect-scenario>${scenarioOptions(state.collectScenario)}</select></label>
        <div class="dynamic-fields">${collectFields(state.collectScenario)}</div>
        <button class="primary-btn" type="submit">提交并生成治理任务</button>
      </form>
      <div class="table-panel">
        <div class="section-heading compact"><div><p class="eyebrow">New Data</p><h2>新增采集说明</h2></div></div>
        <p class="hint">提交后会生成一条治理任务，可在「数据治理任务流」中继续执行字段抽取、标准化、主数据对齐、质量校验和入库。</p>
        <div class="compact-list">${state.tasks.slice(-5).reverse().map(taskLine).join("")}</div>
      </div>
    </div>
  `;
}

function collectFields(scenario) {
  const fields = {
    quality: ["项目/分段", "工序", "检测方式", "缺陷类型", "探伤报告编号", "返工措施", "复检结果"],
    field: ["区域", "系统", "缺陷类型", "干涉对象", "图纸版本", "责任工序", "现场照片", "整改措施"],
    equipment: ["船舶", "系统", "设备", "故障现象", "发生时间", "检测值", "处理措施", "更换物料", "验收结果"]
  }[scenario];
  return fields.map((field) => `<label>${field}<input name="${field}" placeholder="请输入${field}" /></label>`).join("");
}

function scenarioOptions(selected = "quality") {
  return Object.entries(scenarios).map(([key, item]) => `<option value="${key}" ${selected === key ? "selected" : ""}>${item.label}</option>`).join("");
}

function renderDictionary() {
  const rows = state.aliases.filter((row) => row[2] === scenarios[state.dictScenario].label);
  return `
    <section class="content-grid">
      <article class="panel span-4">
        <div class="section-heading compact"><div><p class="eyebrow">Dictionary Type</p><h2>三类标准字典</h2></div></div>
        <div class="vertical-tabs">
          ${Object.entries(scenarios).map(([key, item]) => `<button class="${state.dictScenario === key ? "active" : ""}" data-dict-scenario="${key}" type="button">${item.label}字典</button>`).join("")}
        </div>
        <form id="aliasForm" class="mini-form">
          <label>历史别名<input name="alias" placeholder="例如：泵抖得厉害" /></label>
          <label>标准名称<input name="standard" placeholder="例如：异常振动" /></label>
          <button class="primary-btn" type="submit">新增别名映射</button>
        </form>
      </article>
      <article class="panel span-8">
        <div class="section-heading compact"><div><p class="eyebrow">Master Data</p><h2>主数据与别名映射</h2></div><span class="status-pill">${rows.length} 条</span></div>
        <div class="dictionary-summary">
          <article><strong>标准域</strong><span>${scenarios[state.dictScenario].label}</span><p>${scenarios[state.dictScenario].standards.join(" / ")}</p></article>
          <article><strong>治理目标</strong><span>统一口径</span><p>把班组口语、历史写法、系统字段统一映射到标准编码和可检索实体。</p></article>
          <article><strong>复核策略</strong><span>人机协同</span><p>置信度低于 0.85 或一词多义时进入人工确认队列。</p></article>
        </div>
        <div class="data-table">
          <div class="table-head"><span>标准名称</span><span>标准编码</span><span>历史别名</span><span>所属系统/工序</span><span>匹配置信度</span><span>人工确认</span></div>
          ${rows.map(([alias, standard, type, code], index) => `
            <div><span>${standard}</span><span>${code}</span><span>${alias}</span><span>${type}</span><span>${Math.max(81, 96 - index * 4)}%</span><span>已确认</span></div>
          `).join("")}
        </div>
      </article>
    </section>
  `;
}

function renderWorkflow() {
  const task = selectedTask();
  return `
    <section class="workflow-layout">
      <aside class="panel task-left">
        <div class="section-heading compact"><div><p class="eyebrow">Governance Queue</p><h2>治理任务队列</h2></div><span class="status-pill">${state.tasks.length} 条</span></div>
        <div class="task-queue">${state.tasks.map(taskCard).join("")}</div>
      </aside>
      <section class="panel task-right">
        <div class="section-heading compact">
          <div><p class="eyebrow">Task Detail</p><h2>${task.id} 治理详情</h2></div>
          <span class="status-pill">${task.status}</span>
        </div>
        ${governanceProgress(task)}
        ${governancePlaybook(task)}
        ${beforeAfterBlock(task)}
        <div class="action-row">
          ${[
            ["extract", "字段抽取"],
            ["standard", "标准化匹配"],
            ["master", "主数据对齐"],
            ["quality", "数据质量校验"],
            ["confirm", "人工确认"],
            ["ingest", "入知识库/图谱"]
          ].map(([action, label]) => `<button class="secondary-btn" data-task-action="${action}" type="button">${label}</button>`).join("")}
        </div>
        <div class="tabbar compact-tabs">
          ${["extract", "standard", "master", "quality", "review", "graph", "result"].map((tab) => `<button class="${state.taskTab === tab ? "active" : ""}" data-task-tab="${tab}" type="button">${tabName(tab)}</button>`).join("")}
        </div>
        ${taskDetail(task)}
      </section>
    </section>
  `;
}

function governancePlaybook(task) {
  const scenario = scenarios[task.scenario].label;
  return `
    <div class="playbook-panel">
      <div>
        <span>治理作业规则</span>
        <strong>${scenario}任务不是简单改字段，而是形成可追溯事实</strong>
      </div>
      <ul>
        <li>先保留原始记录，再生成标准字段；任何自动建议都不覆盖原始证据。</li>
        <li>标准化必须命中字典或别名映射；无法命中的词进入待复核项。</li>
        <li>主数据对齐必须给出候选对象和置信度，低于 0.85 需要人工确认。</li>
        <li>只有通过质量校验和复核的事实，才能进入知识库/知识图谱并被 Agent 引用。</li>
      </ul>
    </div>
  `;
}

function governanceProgress(task) {
  return `
    <div class="governance-progress">
      ${governanceStages.map(([name, action, role], index) => `
        <article class="${index <= task.stage ? "done" : ""} ${index === task.stage ? "active" : ""}">
          <span>${index + 1}</span>
          <strong>${name}</strong>
          <p>${action}</p>
          <em>${role}</em>
        </article>
      `).join("")}
    </div>
    <div class="expert-board">
      <article><strong>数据血缘</strong><p>${task.source} → 原始记录 ${task.id} → 标准化事实 → 知识案例/图谱节点</p></article>
      <article><strong>规则校验</strong><p>${qualityRuleSummary(task)}</p></article>
      <article><strong>业务影响</strong><p>${impactSummary(task)}</p></article>
    </div>
  `;
}

function taskCard(task) {
  return `
    <button class="${task.id === state.selectedTaskId ? "active" : ""}" data-task-id="${task.id}" type="button">
      <div><strong>${task.id}</strong><span>${scenarios[task.scenario].label}</span></div>
      <p>${task.raw}</p>
      <dl>
        <div><dt>数据来源</dt><dd>${task.source}</dd></div>
        <div><dt>质量评分</dt><dd>${task.score}</dd></div>
        <div><dt>当前状态</dt><dd>${task.status}</dd></div>
        <div><dt>待处理问题</dt><dd>${task.issues}</dd></div>
      </dl>
    </button>
  `;
}

function taskDetail(task) {
  const blocks = {
    extract: detailBlock("原始脏数据", [task.raw]) + detailBlock("字段抽取结果", task.extract) + detailBlock("抽取证据", evidenceRows(task)),
    standard: detailBlock("标准化建议", task.standard) + detailBlock("命中字典", dictionaryRows(task)),
    master: detailBlock("主数据匹配候选", task.master) + detailBlock("实体对齐策略", masterStrategy(task)),
    quality: detailBlock("缺失字段", task.missing) + detailBlock("低置信度项", task.lowConfidence) + detailBlock("质量规则", qualityRows(task)),
    review: `<div class="review-box"><strong>人工复核区</strong><p>${task.needsReview ? "请确认低置信字段、主数据候选与标准化建议。" : "已人工确认，可进入入库环节。"}</p><textarea placeholder="填写专家复核意见">${task.reviewNote || ""}</textarea></div>`,
    graph: detailBlock("图谱三元组", task.triples.map((triple) => triple.join(" → "))) + graphPreview(task),
    result: detailBlock("入知识库结果", [task.result]) + detailBlock("回流动作", feedbackRows(task))
  };
  return `<div class="task-detail">${blocks[state.taskTab]}</div>`;
}

function tabName(tab) {
  return { extract: "抽取", standard: "标准化", master: "主数据", quality: "质量", review: "复核", graph: "图谱", result: "入库" }[tab];
}

function detailBlock(title, rows) {
  const safeRows = rows?.length ? rows : ["等待执行对应治理动作"];
  return `<article class="detail-block"><h3>${title}</h3><ul>${safeRows.map((row) => `<li>${row}</li>`).join("")}</ul></article>`;
}

function beforeAfterBlock(task) {
  return `
    <div class="before-after">
      <article>
        <span>治理前</span>
        <ul>
          <li>原始记录为自由文本，字段边界不清晰。</li>
          <li>对象名称和班组口语无法稳定检索。</li>
          <li>缺少主数据 ID，难以关联图纸、设备、工单和复验记录。</li>
          <li>Agent 只能给泛化建议，不能形成可审计证据链。</li>
        </ul>
      </article>
      <article>
        <span>治理后</span>
        <ul>
          <li>抽取出标准字段、置信度、证据片段和待复核项。</li>
          <li>别名映射到标准编码，支持跨系统统一查询。</li>
          <li>对齐焊缝/管段/设备等主数据实体，生成图谱三元组。</li>
          <li>Agent 可引用案例、规则、主数据和专家复核记录输出处置单。</li>
        </ul>
      </article>
    </div>
  `;
}

function qualityRuleSummary(task) {
  if (task.stage < 2) return "尚未抽取字段，无法执行完整质量规则。";
  if (task.stage < 5) return "已具备字段基础，待执行完整性、主数据一致性和置信度校验。";
  return `完整性 ${task.missing.length ? "待补" : "通过"}，低置信 ${task.lowConfidence.length} 项，综合评分 ${task.score}。`;
}

function impactSummary(task) {
  const map = {
    quality: "影响返修闭环、复验计划、焊工资质追溯和同类缺陷预防。",
    field: "影响现场安装节拍、设计改单、责任工序判定和相邻管段冻结范围。",
    equipment: "影响联调安全、设备停机风险、备件准备和验收策略。"
  };
  return map[task.scenario];
}

function evidenceRows(task) {
  const map = {
    quality: ["从报告号、片位、LOF/未融合、二级不合格中提取质量异常事实", "保留原文片段，支持专家回看证据"],
    field: ["从区域、管段号、支架顶纵梁、偏左 25 中提取现场缺陷事实", "照片/模型版本作为后续复核证据"],
    equipment: ["从温度、振动 RMS、班组备注中提取设备征兆事实", "时序阈值和点检备注作为判断证据"]
  };
  return map[task.scenario];
}

function dictionaryRows(task) {
  const type = scenarios[task.scenario].label;
  return state.aliases
    .filter((row) => row[2] === type)
    .slice(0, 4)
    .map(([alias, standard, , code]) => `${alias} → ${standard}（${code}）`);
}

function masterStrategy(task) {
  const map = {
    quality: ["优先用焊缝唯一号，其次用分段+舷侧+肋位+片位组合匹配", "焊工、WPS、返修单作为上下文实体"],
    field: ["优先用管段号和区域坐标匹配，图纸版本用于消歧", "干涉对象需要和支架/结构件主数据对齐"],
    equipment: ["优先用设备位号匹配，结合系统和船舶号消歧", "故障征兆需要绑定工况、备件和历史工单"]
  };
  return map[task.scenario];
}

function qualityRows(task) {
  return [
    `完整性：${task.missing.length ? `缺 ${task.missing.join("、")}` : "待执行或已通过"}`,
    `唯一性：${task.master.length ? "已有候选主数据，可人工确认唯一实体" : "等待主数据对齐"}`,
    `置信度：${task.lowConfidence.length ? task.lowConfidence.join("；") : "待执行置信度计算"}`,
    `业务规则：${impactSummary(task)}`
  ];
}

function graphPreview(task) {
  const triples = task.triples.length ? task.triples : scenarioTriples(task);
  return `
    <div class="mini-topology">
      ${triples.map(([s, p, o]) => `
        <div><span>${s}</span><strong>${p}</strong><span>${o}</span></div>
      `).join("")}
    </div>
  `;
}

function feedbackRows(task) {
  return [
    "写入案例库，用于后续相似案例召回",
    "写入图谱实体与关系，用于 Agent 证据链推理",
    "生成评测样本，记录专家是否采纳整改建议",
    `回流任务来源：${task.source}`
  ];
}

function renderGraph() {
  const topology = graphTopology();
  const knowledgeStats = knowledgeStructureStats();
  const triples = state.cases.flatMap((item) => item.triples);
  const task = selectedTask();
  return `
    <section class="content-grid">
      <article class="panel span-12">
        <div class="section-heading compact"><div><p class="eyebrow">How It Works</p><h2>知识图谱生成规则 / 使用说明</h2></div><span class="status-pill">从治理后的可信事实生成</span></div>
        ${graphRules()}
        ${graphGenerationPreview(task)}
      </article>
      <article class="panel span-12">
        <div class="section-heading compact"><div><p class="eyebrow">Knowledge Operation</p><h2>知识库结构</h2></div></div>
        <div class="knowledge-structure">
          ${knowledgeStats.map(([name, count, desc]) => `<article><strong>${name}</strong><span>${count}</span><p>${desc}</p></article>`).join("")}
        </div>
      </article>
      <article class="panel span-5">
        <div class="section-heading compact"><div><p class="eyebrow">Knowledge Base</p><h2>案例库</h2></div><span class="status-pill">${state.cases.length} 条</span></div>
        <div class="case-list">${state.cases.map((item) => `
          <article><strong>${item.title}</strong><span>${scenarios[item.scenario].label}｜风险 ${item.risk}</span><p>${item.triples.length} 条三元组已入图谱</p></article>
        `).join("")}</div>
      </article>
      <article class="panel span-7">
        <div class="section-heading compact"><div><p class="eyebrow">Graph Topology</p><h2>知识图谱拓扑</h2></div><span class="status-pill">${topology.nodes.length} 节点 / ${topology.links.length} 关系</span></div>
        <div class="topology-canvas">
          ${topology.nodes.map((node, index) => `
            <article class="topology-node node-pos-${index % 10} ${node.type}">
              <span>${node.typeLabel}</span>
              <strong>${node.label}</strong>
            </article>
          `).join("")}
          <div class="topology-core">压载水系统<br />质量-缺陷-故障知识域</div>
        </div>
      </article>
      <article class="panel span-12">
        <div class="section-heading compact"><div><p class="eyebrow">Relations</p><h2>图谱关系边 / 三元组</h2></div></div>
        <div class="triple-list">${triples.map(([s, p, o], index) => `<div data-triple-index="${index}"><span>${s}</span><strong>${p}</strong><span>${o}</span></div>`).join("")}</div>
      </article>
      <article class="panel span-7">
        <div class="section-heading compact"><div><p class="eyebrow">Evidence Chain</p><h2>当前图谱证据链</h2></div></div>
        <div class="evidence-chain">${evidenceChainCards().join("")}</div>
      </article>
      <article class="panel span-5">
        <div class="section-heading compact"><div><p class="eyebrow">Agent Usage</p><h2>Agent 引用记录</h2></div></div>
        <div class="agent-usage">${agentUsageRecords().join("")}</div>
      </article>
    </section>
  `;
}

function graphRules() {
  const rules = [
    ["实体生成规则", "只从已治理字段生成实体，不直接从脏文本生成。实体包括系统、区域、管段、焊缝、设备、缺陷、故障现象、原因、措施、报告、工单和专家复核记录。"],
    ["实体标准化规则", "同一对象必须先对齐主数据，例如 BP02、BP-02、压载泵2号统一到“压载泵 BP-02”。置信度低于 0.85 进入人工复核。"],
    ["关系生成规则", "关系由业务规则生成，例如“设备→出现征兆→异常振动”“管段→发生缺陷→管路安装干涉”“Agent→引用证据→案例”。"],
    ["入图谱门槛", "完成字段抽取、标准化匹配、主数据对齐、质量校验；关键字段完整；低置信项已处理；人工复核通过或达到自动入库阈值。"],
    ["置信度规则", "节点和关系都保留置信度来源：字段抽取置信度、主数据匹配置信度、规则命中、专家确认状态。低置信关系标记为待确认。"],
    ["证据链规则", "每条关系都能追溯来源任务、原始记录、标准字段、报告/工单/照片、专家复核和被 Agent 引用记录。"]
  ];
  return `<div class="rule-grid">${rules.map(([title, body]) => `<details class="rule-card" open><summary>${title}</summary><p>${body}</p></details>`).join("")}</div>`;
}

function graphGenerationPreview(task) {
  const triples = task.triples.length ? task.triples : scenarioTriples(task);
  const allowed = task.status === "已入库" || task.stage >= 7;
  const extractCount = task.extract.length || scenarioExtract(task).length;
  const standardCount = task.standard.length || scenarioStandard(task).length;
  const missingCount = task.missing.length || scenarioMissing(task).length;
  const steps = [
    ["原始记录冻结", task.raw, "保留来源、文件/工单/报告号，不修改原文"],
    ["字段抽取", `${extractCount} 个字段候选`, "把自由文本拆成对象、现象、位置、措施、结果"],
    ["标准化与主数据", `${standardCount} 条标准化建议`, "把别名、口语、旧编码映射到标准编码和主数据实体"],
    ["质量门禁", missingCount ? `${missingCount} 个缺失字段待补` : "关键字段完整", "检查完整性、一致性、唯一性、置信度和人工确认状态"],
    ["生成三元组", `${triples.length} 条候选关系`, allowed ? "允许入图并被 Agent 引用" : "当前仅为预览，需完成入库动作"]
  ];
  return `
    <div class="graph-preview">
      <div class="graph-preview-head">
        <div><span>生成过程预览</span><strong>以当前选中任务 ${task.id} 为例</strong></div>
        <em>${allowed ? "可入图" : "未入图，仅预览"}</em>
      </div>
      <div class="graph-step-grid">
        ${steps.map(([title, value, note], index) => `
          <article>
            <span>${index + 1}</span>
            <strong>${title}</strong>
            <p>${value}</p>
            <em>${note}</em>
          </article>
        `).join("")}
      </div>
      <div class="candidate-triples">
        ${triples.slice(0, 5).map(([s, p, o]) => `
          <div><span>${s}</span><strong>${p}</strong><span>${o}</span><em>${allowed ? "已入图/可引用" : "候选/待确认"}</em></div>
        `).join("")}
      </div>
    </div>
  `;
}

function evidenceChainCards() {
  const samples = [
    ["压载泵 BP-02 → 出现征兆 → 异常振动", "IoT-PUMP-2026-0511 / 点检记录 INS-8821 / 工单 WO-7712", "实体置信度 0.96；关系置信度 0.88；专家状态：待确认"],
    ["管段 P-BW-2207 → 发生缺陷 → 管路安装干涉", "SITE-NCR-884 / 现场照片 OCR / 图纸 M-17.4", "实体置信度 0.93；关系置信度 0.86；专家状态：已确认"],
    ["焊缝 W-B3-P-034-08 → 发现缺陷 → 未熔合", "RT-26-0511 / 返修单 RW-8841 / WPS-136-FCAW", "实体置信度 0.94；关系置信度 0.91；专家状态：已确认"]
  ];
  return samples.map(([relation, source, confidence]) => `
    <article>
      <strong>${relation}</strong>
      <p>${source}</p>
      <span>${confidence}</span>
    </article>
  `);
}

function agentUsageRecords() {
  const records = [
    ["治理编排 Agent", "引用压载水系统、P-BW-2207、BP-02 三类实体，拆分跨场景任务。", "输出：统一风险等级高，建议暂停连续联调。"],
    ["现场缺陷 Agent", "引用管段、支架、图纸版本和干涉案例。", "输出：核对 ECO 生效状态和相邻管段冻结范围。"],
    ["设备故障 Agent", "引用 BP-02、异常振动、温度升高、WO-7712。", "输出：降载点检，检查联轴器找正和润滑状态。"]
  ];
  return records.map(([agent, evidence, output]) => `
    <article>
      <strong>${agent}</strong>
      <p>${evidence}</p>
      <span>${output}</span>
    </article>
  `);
}

function knowledgeStructureStats() {
  const triples = state.cases.flatMap((item) => item.triples);
  return [
    ["案例库", `${state.cases.length} 条`, "质量、现场、设备案例，支持相似案例召回"],
    ["标准库", `${state.aliases.length} 条`, "缺陷/故障/处置动作别名映射到标准编码"],
    ["模式库", `${new Set(triples.map(([, p]) => p)).size} 类`, "缺陷模式、故障模式、关系模式"],
    ["整改措施库", `${triples.filter(([, p]) => p.includes("处置") || p.includes("整改")).length} 条`, "沉淀可复用整改动作"],
    ["主数据实体", `${graphTopology().nodes.filter((node) => node.type === "asset").length} 类`, "焊缝、管段、设备、支架、工单等实体"],
    ["专家经验库", `${state.tasks.filter((task) => !task.needsReview).length} 条`, "人工复核和采纳结果回流"]
  ];
}

function graphTopology() {
  const triples = state.cases.flatMap((item) => item.triples);
  const seedNodes = [
    { label: "压载水系统", type: "system", typeLabel: "系统" },
    { label: "质量异常Agent", type: "agent", typeLabel: "Agent" },
    { label: "现场缺陷Agent", type: "agent", typeLabel: "Agent" },
    { label: "设备故障Agent", type: "agent", typeLabel: "Agent" },
    { label: "管段 P-BW-2207", type: "asset", typeLabel: "主数据" },
    { label: "压载泵 BP-02", type: "asset", typeLabel: "主数据" },
    { label: "焊缝 W-B3-P-034-08", type: "asset", typeLabel: "主数据" }
  ];
  const dynamic = [...new Set(triples.flatMap(([s, , o]) => [s, o]))]
    .slice(0, 8)
    .map((label) => ({ label, type: "case", typeLabel: "案例实体" }));
  return { nodes: [...seedNodes, ...dynamic].slice(0, 15), links: triples };
}

function renderAgents() {
  const agent = agents.find((item) => item.id === state.selectedAgentId) || agents[0];
  return `
    <section class="agent-layout">
      <div class="panel">
        <div class="section-heading compact"><div><p class="eyebrow">Agent App</p><h2>Agent 应用</h2></div></div>
        ${agentOperatingRules()}
        <div class="agent-card-grid">
          ${agents.map((item) => `<button class="${item.id === agent.id ? "active" : ""}" data-agent-id="${item.id}" type="button"><strong>${item.name}</strong><span>${item.subtitle}</span></button>`).join("")}
        </div>
        <div class="collab-box">
          <label>跨场景问题输入<textarea id="collabInput">${state.collabQuestion}</textarea></label>
          <button class="primary-btn" data-run-collab type="button">运行编排 Agent</button>
        </div>
        ${collabResult()}
      </div>
      <aside class="panel drawer-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Agent Detail</p><h2>${agent.name}</h2></div></div>
        ${agentDetail(agent)}
      </aside>
    </section>
  `;
}

function agentOperatingRules() {
  const rules = [
    ["先治理后调用", "Agent 只把已抽取、已标准化、可追溯的数据作为高置信证据；脏数据只能作为待核查线索。"],
    ["总控先拆分", "跨场景问题先由治理编排 Agent 做意图识别、实体归并和任务路由，再调度三个子 Agent。"],
    ["子 Agent 有边界", "质量异常只处理检测/返修/复验，现场缺陷只处理安装/图纸/整改，设备故障只处理点检/监测/维修。"],
    ["输出必须可审计", "每条建议都带证据、风险等级、需补字段、是否可入库；置信度不足时提示人工复核。"]
  ];
  return `<div class="agent-rules">${rules.map(([title, text]) => `<article><strong>${title}</strong><p>${text}</p></article>`).join("")}</div>`;
}

function agentDetail(agent) {
  return `
    ${infoBlock("负责业务问题", [agent.problem])}
    ${infoBlock("输入数据类型", agent.inputs)}
    ${infoBlock("分析标准", agent.standards)}
    ${infoBlock("调用的知识库/图谱", agent.graph)}
    ${infoBlock("输出结果格式", [agent.output])}
    ${infoBlock("示例分析过程", agent.process)}
    ${trustedAgentBlock(agent)}
    ${infoBlock("适用场景", [agent.fit])}
    ${infoBlock("不适用场景", [agent.notFit])}
  `;
}

function trustedAgentBlock(agent) {
  const rows = [
    `检索案例：从 ${state.cases.length} 条知识案例中按场景、系统、实体召回`,
    `命中实体：${agent.id === "orchestrator" ? "压载水系统 / P-BW-2207 / BP-02" : agent.graph[0]}`,
    `引用标准：${agent.standards.slice(0, 2).join("、")}`,
    "不确定性：缺失字段或低置信项会进入人工复核，不直接给最终结论",
    "回流机制：专家采纳、整改结果、复验/复测结果进入评测集"
  ];
  return infoBlock("可信知识调用过程", rows);
}

function infoBlock(title, rows) {
  return `<details class="fold-card" open><summary>${title}</summary><ul>${rows.map((row) => `<li>${row}</li>`).join("")}</ul></details>`;
}

function collabResult() {
  if (!state.collabRan) return `<p class="hint">点击运行后展示总控 Agent 的拆分、三个子 Agent 的分析和合并输出。</p>`;
  return `
    <div class="orchestration-board">
      <article><span>1</span><strong>意图识别</strong><p>关键词命中：压载水系统、管路干涉、压力试验异常、泵振动升温。</p><em>跨场景置信度 0.91</em></article>
      <article><span>2</span><strong>实体归并</strong><p>系统统一为 BALLAST_WATER_SYSTEM，候选对象 P-BW-2207 / BP-02。</p><em>主数据待确认 2 项</em></article>
      <article><span>3</span><strong>并行调度</strong><p>把问题拆给现场缺陷、质量异常、设备故障三个子 Agent。</p><em>调度成功</em></article>
      <article><span>4</span><strong>证据聚合</strong><p>合并整改时间线、压力边界、泵运行工况和历史案例。</p><em>生成统一建议</em></article>
    </div>
    <div class="orchestrator-route">
      <article class="route-master"><strong>治理编排 Agent</strong><p>识别为压载水系统联调复合问题，拆分为现场缺陷、质量异常、设备故障三个子任务。</p></article>
      <article class="active"><span>现场缺陷 Agent</span><strong>管路干涉</strong><p>输入：现场 NCR、照片、图纸版本。输出：P-BW-2207 支架与纵梁干涉，核对 ECO 生效状态。</p><em>证据：SITE-NCR-884 / 图纸 M-17.4 / 支架 S-884</em></article>
      <article class="active"><span>质量异常 Agent</span><strong>压力试验异常</strong><p>输入：压力曲线、试压段、整改记录。输出：补充试压段、焊缝/法兰密封点和复验记录。</p><em>证据：压力下降趋势 / 返修后复验缺失</em></article>
      <article class="active"><span>设备故障 Agent</span><strong>泵振动升温</strong><p>输入：IoT 曲线、点检、工单。输出：BP-02 振动和温升同步异常，建议降载点检。</p><em>证据：RMS 9.8mm/s / 轴承温度 82℃ / WO-7712</em></article>
    </div>
    <div class="merged-output">
      <p>统一风险等级：高</p>
      <p>处理建议：暂停连续负载试验，先确认管路整改对泵入口工况和压力边界的影响。</p>
      <p>需补全字段：整改时间线、试压段编号、压力曲线、泵负载、ECO 状态、复验结果。</p>
      <p>是否入知识库：生成跨场景联调案例，待人工确认后入库。</p>
    </div>
    ${businessOrder()}
    <div class="decision-table">
      <div class="table-head"><span>判断项</span><span>结论</span><span>依据</span><span>下一步</span></div>
      <div><span>是否为单一问题</span><span>否</span><span>涉及安装、质量、设备三类对象</span><span>按子任务并行处理</span></div>
      <div><span>是否允许继续联调</span><span>暂缓</span><span>压力边界和设备状态均异常</span><span>完成复核后恢复</span></div>
      <div><span>是否入库</span><span>是，待确认</span><span>具备跨场景复用价值</span><span>形成 1 个总案例 + 3 个子案例</span></div>
    </div>
  `;
}

function businessOrder() {
  return `
    <div class="business-order">
      <div class="order-head">
        <div><span>智能业务处置单</span><strong>压载水系统联调复合异常</strong></div>
        <em>风险等级：高</em>
      </div>
      <div class="order-grid">
        <article><span>问题归类</span><p>现场安装干涉 + 压力边界异常 + 设备状态异常</p></article>
        <article><span>可能根因 Top3</span><p>管路整改改变系统阻力；试压段密封/焊缝复验不足；泵联轴器不对中或润滑不足。</p></article>
        <article><span>证据链</span><p>SITE-NCR-884、图纸 M-17.4、压力下降趋势、BP-02 RMS 9.8mm/s、轴承温度 82℃、WO-7712。</p></article>
        <article><span>建议处置</span><p>暂停连续联调，先复核管段整改和 ECO 状态，再做压力边界确认，同步安排 BP-02 降载点检。</p></article>
        <article><span>责任部门</span><p>舾装部、质量部、机电调试、数据治理办公室。</p></article>
        <article><span>需补充数据</span><p>整改时间线、试压段编号、压力曲线、泵负载、润滑状态、复验结果。</p></article>
      </div>
    </div>
  `;
}

function renderAudit() {
  const avgScore = Math.round(state.tasks.reduce((sum, item) => sum + item.score, 0) / Math.max(1, state.tasks.length));
  const kpis = governanceKpis();
  return `
    ${metrics([["平均质量评分", `${avgScore}%`, "动态计算"], ["字段完整率", `${kpis.completeness}%`, "治理价值"], ["主数据对齐", `${kpis.masterAligned}%`, "实体可信"], ["别名覆盖", state.aliases.length, "字典映射"]])}
    <section class="panel">
      <div class="section-heading compact"><div><p class="eyebrow">Evaluation</p><h2>评测与审计</h2></div></div>
      <div class="evaluation-grid">
        ${[["字段标准化准确率", 91, "基于标准字典和人工确认回流"], ["主数据匹配命中", 86, "候选实体相似度与专家确认"], ["Agent 采纳率", 78, "跨场景输出仍需专家复核"], ["审计可追溯", 94, "保留来源、动作、状态和入库结果"]].map(([label, value, note]) => `<article class="eval-card"><div><strong>${label}</strong><span>${value}%</span></div><div class="bar"><i style="width:${value}%"></i></div><p>${note}</p></article>`).join("")}
      </div>
    </section>
    <section class="panel">
      <div class="section-heading compact"><div><p class="eyebrow">Closed Loop</p><h2>闭环反馈记录</h2></div></div>
      <div class="feedback-grid">
        ${state.tasks.slice(-6).reverse().map((task) => `
          <article>
            <strong>${task.id}｜${scenarios[task.scenario].label}</strong>
            <p>状态：${task.status}；质量评分：${task.score}；人工复核：${task.needsReview ? "待确认" : "已确认"}</p>
            <span>${task.status === "已入库" ? "已生成新案例/三元组/评测样本" : "待回流现场处置与专家采纳结果"}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function pipelineCards() {
  return ["历史数据接入", "数据资产登记", "字段抽取", "标准字典匹配", "主数据对齐", "数据质量校验", "人工复核", "入知识库/知识图谱", "Agent 调用", "反馈回流"].map((step, index) => `
    <article class="pipeline-card"><div class="pipeline-head"><span>${index + 1}</span><strong>${step}</strong><em class="${index < 2 ? "ok" : index < 6 ? "running" : "pending"}">${index < 2 ? "完成" : index < 6 ? "可执行" : "待处理"}</em></div><dl><div><dt>输出结果</dt><dd>${step}节点数据进入后续流程</dd></div></dl></article>
  `);
}

function taskLine(task) {
  return `<button data-task-open="${task.id}" type="button"><strong>${task.id}</strong><span>${scenarios[task.scenario].label}</span><p>${task.status}｜${task.issues}</p></button>`;
}

function inferFileType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx")) return "Excel / CSV";
  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "Word";
  if (file.type.startsWith("image/")) return "图片";
  if (file.type.startsWith("video/")) return "视频";
  if (file.type.startsWith("audio/")) return "音频";
  return "未知文件";
}

function initialRecognition(type, scenario) {
  return `${type} 已识别为${scenarios[scenario].label}相关历史数据，建议进入字段抽取和人工复核`;
}

function runTaskAction(action) {
  const task = selectedTask();
  const templates = {
    extract: () => {
      task.extract = scenarioExtract(task);
      task.status = "字段已抽取";
      task.stage = 2;
      state.taskTab = "extract";
    },
    standard: () => {
      task.standard = scenarioStandard(task);
      task.status = "已标准化匹配";
      task.stage = 3;
      state.taskTab = "standard";
    },
    master: () => {
      task.master = scenarioMaster(task);
      task.status = "主数据已对齐";
      task.stage = 4;
      state.taskTab = "master";
    },
    quality: () => {
      task.missing = scenarioMissing(task);
      task.lowConfidence = ["位置/设备实体置信度低于 0.8", "处置结果字段需要人工确认"];
      task.score = Math.min(95, task.score + 12);
      task.status = "质量校验完成";
      task.stage = 5;
      state.taskTab = "quality";
    },
    confirm: () => {
      task.needsReview = false;
      task.status = "已人工确认";
      task.stage = 6;
      state.taskTab = "review";
    },
    ingest: () => {
      task.triples = scenarioTriples(task);
      task.result = "已生成案例卡片、标准字段、主数据映射和图谱三元组";
      task.status = "已入库";
      task.stage = 7;
      task.score = Math.max(task.score, 92);
      task.needsReview = false;
      state.taskTab = "result";
      addCaseFromTask(task);
    }
  };
  templates[action]();
  save();
  render();
}

function scenarioExtract(task) {
  const map = {
    quality: ["报告编号：RT-26-0511", "检测方式：RT/UT", "缺陷类型：未熔合/压力试验异常", "返工措施：清根补焊/复验"],
    field: ["区域：泵舱 2D", "系统：压载水系统", "缺陷类型：管路安装干涉", "干涉对象：支架/纵梁"],
    equipment: ["设备：压载泵 BP-02", "故障现象：异常振动 + 温度升高", "检测值：RMS 9.8mm/s / 82℃", "处理措施：降载点检"]
  };
  return map[task.scenario];
}

function scenarioStandard(task) {
  const map = {
    quality: ["拍片没过/LOF → RT探伤不合格", "未融合 → 未熔合 DEF_WELD_LOF", "复检 → 返修复验"],
    field: ["管子打架/支架顶纵梁 → 管路安装干涉", "偏左约 25 → X 向偏差 25mm", "泵舱2D → ER/PUMP_ROOM/DECK_2"],
    equipment: ["泵抖得厉害 → 异常振动", "轴承热/温度 82℃ → 温度升高", "对中不好 → 联轴器不对中"]
  };
  return map[task.scenario];
}

function scenarioMaster(task) {
  const map = {
    quality: ["焊缝 W-B3-P-034-08 相似度 0.94", "焊工 W1027 相似度 0.89", "WPS-136-FCAW 相似度 0.82"],
    field: ["管段 P-BW-2207 相似度 0.93", "支架 S-884 相似度 0.81", "图纸 M-17.4 相似度 0.86"],
    equipment: ["压载泵 BP-02 相似度 0.96", "工单 WO-7712 相似度 0.82", "备件 SP-BRG-6309 相似度 0.78"]
  };
  return map[task.scenario];
}

function scenarioMissing(task) {
  const map = {
    quality: ["预热记录", "焊机校验号", "复验报告附件"],
    field: ["照片拍摄点位", "ECO 生效状态", "整改后复测记录"],
    equipment: ["负载工况", "润滑状态", "地脚螺栓检查结果"]
  };
  return map[task.scenario];
}

function scenarioTriples(task) {
  const map = {
    quality: [["质量异常案例", "发现缺陷", "RT探伤不合格"], ["RT探伤不合格", "处置", "返工复检"], ["案例", "来源任务", task.id]],
    field: [["现场缺陷案例", "发生问题", "管路安装干涉"], ["管路安装干涉", "关联对象", "支架/纵梁"], ["案例", "来源任务", task.id]],
    equipment: [["设备故障案例", "出现征兆", "异常振动"], ["异常振动", "伴随", "温度升高"], ["案例", "来源任务", task.id]]
  };
  return map[task.scenario];
}

function addCaseFromTask(task) {
  if (state.cases.some((item) => item.sourceTask === task.id)) return;
  state.cases.push({
    id: `KB-${Date.now().toString().slice(-6)}`,
    sourceTask: task.id,
    title: `${scenarios[task.scenario].label}治理案例：${task.raw.slice(0, 24)}...`,
    scenario: task.scenario,
    risk: task.scenario === "field" ? "中高" : "高",
    triples: task.triples
  });
}

function runDemoMode() {
  const demoId = "T-DEMO-BALLAST";
  let task = state.tasks.find((item) => item.id === demoId);
  if (!task) {
    task = createTask({
      id: demoId,
      scenario: "field",
      source: "演示主线 / 压载水系统联调记录",
      raw: "压载水系统联调：泵舱2D 管段 P-BW-2207 与支架 S-884 干涉，整改后压力试验 30 分钟压降异常，同时压载泵 BP-02 振动 RMS 9.8mm/s、轴承温度 82℃。",
      issues: "跨场景实体归并、压力曲线、泵负载、ECO 生效状态待确认",
      score: 54
    });
    state.tasks.push(task);
  }

  task.extract = [
    "系统：压载水系统",
    "区域：泵舱 2D",
    "管段：P-BW-2207",
    "缺陷：管路安装干涉 / 压力试验异常",
    "设备：压载泵 BP-02",
    "检测值：RMS 9.8mm/s / 轴承温度 82℃"
  ];
  task.standard = [
    "管子打架 → 管路安装干涉（SITE_PIPE_CLASH）",
    "压力掉得快 → 压力试验异常（QA_PRESS_TEST_ABN）",
    "泵抖得厉害 → 异常振动（EQP_VIB_HIGH）",
    "轴承热 → 温度升高（EQP_TEMP_HIGH）"
  ];
  task.master = [
    "管段 P-BW-2207 相似度 0.93",
    "支架 S-884 相似度 0.81",
    "压载泵 BP-02 相似度 0.96",
    "压载水系统 BALLAST_WATER_SYSTEM 相似度 0.98"
  ];
  task.missing = ["整改时间线", "试压段编号", "压力曲线附件", "泵负载工况", "ECO 生效状态"];
  task.lowConfidence = ["压力试验异常与管路整改的因果关系需专家确认", "泵振动升温是否由入口工况变化触发需复测"];
  task.triples = [
    ["压载水系统联调案例", "包含问题", "管路安装干涉"],
    ["压载水系统联调案例", "包含问题", "压力试验异常"],
    ["压载水系统联调案例", "包含问题", "压载泵异常振动"],
    ["管段 P-BW-2207", "干涉对象", "支架 S-884"],
    ["压载泵 BP-02", "出现征兆", "温度升高"],
    ["治理编排 Agent", "调度", "现场缺陷 Agent"],
    ["治理编排 Agent", "调度", "质量异常 Agent"],
    ["治理编排 Agent", "调度", "设备故障 Agent"]
  ];
  task.status = "已入库";
  task.stage = 7;
  task.score = 94;
  task.needsReview = false;
  task.result = "演示主线已生成跨场景案例、8 条图谱关系、3 个子 Agent 任务和 1 份智能业务处置单";
  addCaseFromTask(task);

  state.selectedTaskId = demoId;
  state.taskTab = "result";
  state.collabRan = true;
  state.selectedAgentId = "orchestrator";
  save();
  switchPage("agents");
}

document.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page], [data-page-link]");
  if (pageButton) switchPage(pageButton.dataset.page || pageButton.dataset.pageLink);

  const roleButton = event.target.closest("[data-role]");
  if (roleButton) {
    state.orgView = roleButton.dataset.role;
    render();
  }

  const jumpAgent = event.target.closest("[data-jump-agent]");
  if (jumpAgent) {
    state.selectedAgentId = jumpAgent.dataset.jumpAgent;
    switchPage("agents");
  }

  const taskOpen = event.target.closest("[data-task-open]");
  if (taskOpen) {
    state.selectedTaskId = taskOpen.dataset.taskOpen;
    switchPage("workflow");
  }

  if (event.target.closest("[data-demo-run]")) {
    runDemoMode();
  }

  const assetTab = event.target.closest("[data-asset-tab]");
  if (assetTab) {
    state.assetTab = assetTab.dataset.assetTab;
    render();
  }

  const orgView = event.target.closest("[data-org-view]");
  if (orgView) {
    state.orgView = orgView.dataset.orgView;
    render();
  }

  const dictScenario = event.target.closest("[data-dict-scenario]");
  if (dictScenario) {
    state.dictScenario = dictScenario.dataset.dictScenario;
    render();
  }

  const taskButton = event.target.closest("[data-task-id]");
  if (taskButton) {
    state.selectedTaskId = taskButton.dataset.taskId;
    render();
  }

  const taskAction = event.target.closest("[data-task-action]");
  if (taskAction) runTaskAction(taskAction.dataset.taskAction);

  const taskTab = event.target.closest("[data-task-tab]");
  if (taskTab) {
    state.taskTab = taskTab.dataset.taskTab;
    render();
  }

  const agentButton = event.target.closest("[data-agent-id]");
  if (agentButton) {
    state.selectedAgentId = agentButton.dataset.agentId;
    render();
  }

  if (event.target.closest("[data-run-collab]")) {
    state.collabQuestion = document.querySelector("#collabInput")?.value || state.collabQuestion;
    state.collabRan = true;
    render();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-collect-scenario]")) {
    state.collectScenario = event.target.value;
    render();
  }

  if (event.target.matches("#uploadForm input[type='file']")) {
    const form = event.target.closest("form");
    const source = form.source.value || "历史数据导入";
    const scenario = form.scenario.value;
    [...event.target.files].forEach((file) => {
      const fileType = inferFileType(file);
      const recognition = initialRecognition(fileType, scenario);
      const upload = { fileName: file.name, fileType, source, scenario, recognition, needsReview: true };
      state.uploads.push(upload);
      state.tasks.push(createTask({
        scenario,
        source,
        raw: `${file.name}（${fileType}）导入记录：${recognition}`,
        issues: "文件解析结果、场景归属、关键字段待复核",
        score: 50,
        fileName: file.name,
        fileType,
        recognition
      }));
    });
    event.target.value = "";
    save();
    render();
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();

  if (event.target.id === "collectForm") {
    const form = new FormData(event.target);
    const scenario = form.get("scenario");
    const values = [...form.entries()].filter(([key]) => key !== "scenario" && String(form.get(key)).trim());
    const raw = values.map(([key, value]) => `${key}:${value}`).join("；") || `${scenarios[scenario].label}新增采集记录`;
    state.tasks.push(createTask({
      scenario,
      source: "新增数据采集表单",
      raw,
      issues: "新增记录字段完整性、标准化和主数据映射待校验",
      score: 70
    }));
    save();
    state.page = "workflow";
    state.selectedTaskId = state.tasks[state.tasks.length - 1].id;
    switchPage("workflow");
  }

  if (event.target.id === "aliasForm") {
    const form = new FormData(event.target);
    const alias = String(form.get("alias") || "").trim();
    const standard = String(form.get("standard") || "").trim();
    if (!alias || !standard) return;
    state.aliases.push([alias, standard, scenarios[state.dictScenario].label, `MD-${state.aliases.length + 100}`]);
    save();
    render();
  }
});

document.querySelector("#rerunBtn").addEventListener("click", () => {
  stateStatus.textContent = "模拟流程已刷新";
  render();
});

render();
