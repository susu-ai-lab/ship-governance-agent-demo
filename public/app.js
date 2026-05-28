const storeKeys = {
  tasks: "shipRag.tasks",
  cases: "shipRag.cases",
  metrics: "shipRag.metrics",
  logs: "shipRag.logs",
  activeStep: "shipRag.activeStep",
  selectedTaskId: "shipRag.selectedTaskId",
  draftRaw: "shipRag.draftRaw",
  knowledgeCase: "shipRag.knowledgeCase",
  ragDocs: "shipRag.ragDocs",
  approvalFilter: "shipRag.approvalFilter",
  selectedApprovalIds: "shipRag.selectedApprovalIds",
  selectedReviewer: "shipRag.selectedReviewer"
};

const pages = {
  dashboard: "治理驾驶舱",
  ingest: "数据接入",
  workbench: "AI治理工作台",
  rag: "知识库/RAG检索",
  agent: "Agent应用与知识运营"
};

const mainRecord = "压载泵启动以后震得厉害，轴承位置温度也高，后来换了轴承，重新找正后正常。";

const scenarioSamples = {
  equipment: {
    label: "设备故障",
    title: "压载泵异常振动与轴承温升治理任务",
    source: "ODS_维修工单",
    raw: mainRecord
  },
  quality: {
    label: "质量异常",
    title: "焊缝RT/UT探伤不合格治理任务",
    source: "ODS_NDT检测报告",
    raw: "分段B12环缝拍片没过，UT也有回波异常，焊工返修后等复检。"
  },
  defect: {
    label: "现场缺陷",
    title: "管路安装干涉治理任务",
    source: "ODS_现场NCR",
    raw: "压载水管路现场安装时和电缆托架打架，偏差约30mm，按新版图纸改管后待复核。"
  }
};

const defaultGovernanceTasks = [
  scenarioSamples.equipment.raw,
  "压载泵运行时有明显抖动，轴承座摸着发烫，补了润滑油后仍不稳定。",
  "2号压载泵试车时温度升得快，怀疑联轴器没找正，现场要求补测振动值。",
  scenarioSamples.quality.raw,
  "船体分段A08对接焊缝RT片子不合格，有夹渣迹象，返修方案待确认。",
  scenarioSamples.defect.raw,
  "消防管穿舱件安装偏差，和风管支架冲突，现场照片已上传但缺图纸版本。"
];

const ragSampleDocs = [
  { id: "DOC-SOP-001", title: "压载泵检修SOP", type: "SOP", status: "待解析" },
  { id: "DOC-CASE-001", title: "压载泵异常振动历史案例", type: "历史维修案例", status: "待解析" },
  { id: "DOC-RULE-001", title: "泵类设备振动排查规范", type: "通用规范", status: "待解析" }
];

const ingestSampleAssets = [
  ["Excel设备台账", "1号压载泵台账.xlsx", "表格识别：设备=1号压载泵，系统=压载水系统，型号=BW-150，编码=EQ-BW-PUMP-001。"],
  ["PDF检修SOP", "压载泵检修SOP.pdf", "文档解析：抽取轴承检查、联轴器找正、温升复验等SOP步骤。"],
  ["现场图片", "轴承座温升照片.jpg", "视觉识别：疑似泵轴承座温度标识，关联压载泵异常温升场景。"],
  ["维修音频", "一线报修语音.m4a", "语音转写：压载泵启动后抖得厉害，轴承位置有点烫，需要复查。"],
  ["现场视频", "压载泵试车振动视频.mp4", "视频理解：画面中泵体运行振动明显，建议补充振动测量值。"]
];

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
  { id: "identify", label: "AI识别" },
  { id: "extract", label: "字段抽取" },
  { id: "standardize", label: "术语标准化" },
  { id: "master", label: "主数据匹配" },
  { id: "quality", label: "数据质量校验" },
  { id: "confirm", label: "人工确认" },
  { id: "dwd", label: "写入DWD明细" },
  { id: "knowledge", label: "生成知识卡片" }
];

const detailStages = [
  { id: "ods", label: "ODS原始数据" },
  { id: "extract", label: "AI字段抽取结果" },
  { id: "standardize", label: "术语标准化结果" },
  { id: "master", label: "主数据候选匹配" },
  { id: "quality", label: "数据质量校验" },
  { id: "confirm", label: "人工复核意见" },
  { id: "dwd", label: "DWD标准明细" },
  { id: "knowledge", label: "标准知识卡片" }
];

const taskStatusFlow = [
  "待AI处理",
  "AI已识别",
  "已标准化",
  "主数据待确认",
  "主数据已匹配",
  "待人工复核",
  "需补充数据",
  "人工复核通过",
  "已驳回",
  "写入DWD标准明细",
  "已发布知识"
];

const ruleDocs = [
  ["字段抽取规则", "从ODS原文中抽取设备、系统、部件、故障现象、处理措施、结果、来源；不补写原文没有的信息。"],
  ["术语标准化规则", "将口语表达映射到标准字典，必须保留原词、标准词、字典编码、置信度和映射原因。"],
  ["主数据匹配规则", "综合设备名称相似度、所属系统、历史工单关联、部件/现象共现关系；低于85%进入人工确认。"],
  ["数据质量校验规则", "检查设备型号、检测值、物料编码、验收人等关键字段；缺失项进入补字段队列。"],
  ["人工复核规则", "可通过、驳回、要求补充字段或修改主数据匹配；人工动作会改变任务状态。"],
  ["入库规则", "只有人工复核通过并写入DWD标准明细后，才允许生成知识卡片和RAG chunk。"]
];

const ruleFiles = [
  ["rules/field_extraction.yaml", "字段抽取规则", "定义设备、系统、部件、现象、措施、结果、来源等字段的抽取 schema 和必填约束。"],
  ["rules/term_standardization.json", "术语标准化规则", "维护“震得厉害→异常振动”“温度高→温度异常升高”等别名映射。"],
  ["rules/master_data_match.yaml", "主数据匹配规则", "配置名称相似度、系统一致性、历史工单关联度、共现关系和85%复核阈值。"],
  ["rules/data_quality_check.yaml", "数据质量校验规则", "定义缺失字段、低置信推断、是否允许案例级入库和补字段策略。"],
  ["rules/human_review_policy.md", "人工复核规则", "约束通过、驳回、补充字段、修改主数据匹配四类复核动作。"],
  ["rules/knowledge_publish.yaml", "知识入库规则", "定义DWD明细生成知识卡片、RAG chunk、embedding和图谱关系的发布条件。"]
];

const approvalGroups = [
  {
    id: "ai",
    label: "AI待审批",
    desc: "等待AI自动识别、抽取、标准化和初检的任务。",
    statuses: ["待AI处理", "AI已识别", "已标准化"]
  },
  {
    id: "review",
    label: "人工复核",
    desc: "AI已处理，等待业务人员确认主数据、低置信项和入库结论。",
    statuses: ["AI已处理待人工复核", "待人工复核", "主数据待确认", "主数据已匹配"]
  },
  {
    id: "problem",
    label: "有问题",
    desc: "缺字段、证据不足或已驳回，需要补数、重跑或关闭。",
    statuses: ["需补充数据", "已驳回"]
  }
];

const reviewers = [
  { id: "ai-bot", name: "AI治理助手", role: "自动预审", scope: "字段抽取/标准化/质量初检" },
  { id: "equip-lead", name: "设备主管", role: "人工复核", scope: "设备故障/主数据确认" },
  { id: "quality-eng", name: "质量工程师", role: "人工复核", scope: "焊缝RT/UT质量异常" },
  { id: "site-tech", name: "现场工艺员", role: "问题处理", scope: "管路干涉/安装偏差" }
];

const stepResults = {
  ods: {
    title: "ODS原始数据",
    rows: [
      ["数据层", "ODS_RAW_MAINT_RECORD", "保留原始维修记录，不做业务结论"],
      ["原始文本", mainRecord, "一线口语化记录"],
      ["来源", "ODS_维修工单", "模拟历史维修工单"],
      ["脏数据问题", "口语化表达、缺设备编码、缺检测值", "需要AI治理"]
    ]
  },
  identify: {
    title: "AI识别业务对象",
    rows: [
      ["设备对象", "压载泵", "从“压载泵启动以后”识别设备类型"],
      ["部件对象", "轴承", "从“轴承位置温度也高”识别关键部件"],
      ["故障现象", "震得厉害、温度高", "保留原始口语表达，等待标准化"],
      ["处理动作", "换轴承、重新找正", "保留原始维修动作，等待标准化"],
      ["结果状态", "正常", "从“后正常”识别验收状态"]
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
      ["重新找正", "联轴器找正", "维修动作字典 MAINT_COUPLING_ALIGN"],
      ["正常", "试运行正常", "验收结果字典 ACCEPT_TRIAL_OK"]
    ]
  },
  master: {
    title: "主数据候选匹配",
    rows: [
      ["1号压载泵", "EQ-BW-PUMP-001", "匹配度91%，推荐绑定"],
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
    title: "人工确认",
    rows: [
      ["确认主数据", "1号压载泵 EQ-BW-PUMP-001", "人工确认推荐绑定"],
      ["确认标准术语", "异常振动、温度异常升高、更换泵轴承、联轴器找正", "进入DWD标准明细"],
      ["确认低置信度", "轴承磨损仅作为可能原因", "保留为低置信提示"],
      ["入库结论", "允许生成知识卡片", "满足最低入库条件"]
    ]
  },
  dwd: {
    title: "DWD标准明细",
    rows: [
      ["设备", "1号压载泵 EQ-BW-PUMP-001", "主数据已确认"],
      ["系统", "压载水系统", "系统主数据"],
      ["部件", "泵轴承", "标准部件"],
      ["故障现象", "异常振动；温度异常升高", "标准故障术语"],
      ["处理措施", "更换泵轴承；联轴器找正", "标准维修动作"],
      ["结果", "试运行正常", "标准验收结果"],
      ["来源", "ODS_维修工单", "已保留血缘"],
      ["可信等级", "高", "人工复核后生成"]
    ]
  },
  knowledge: {
    title: "生成知识卡片",
    rows: [
      ["知识案例", "压载泵异常振动与温升案例", "已生成标准案例"],
      ["DWD标准明细", "DWD_EQUIP_FAULT_DETAIL", "标准字段可被检索和复用"],
      ["RAG Chunk", "3个chunk", "案例摘要、排查步骤、质量缺口"],
      ["Embedding", "已生成", "写入模拟向量库"],
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
    displayTitle: "压载泵异常振动与温升案例",
    reason: "包含异常振动、温度升高、更换轴承",
    trust: "高",
    published: "已发布知识",
    sourceType: "历史维修案例"
  },
  {
    title: "压载泵检修SOP",
    displayTitle: "压载泵检修SOP",
    reason: "设备主数据一致，故障类型相关",
    trust: "高",
    published: "已发布SOP",
    sourceType: "SOP"
  },
  {
    title: "泵类设备振动排查规范",
    displayTitle: "泵类设备振动排查规范",
    reason: "命中异常振动故障现象",
    trust: "中",
    published: "已发布规范",
    sourceType: "通用规范"
  }
];

const stepMeta = {
  ods: {
    basis: "ODS只保存原始文本、来源、接入方式和脏数据标记。",
    rule: "ODS层不改写业务语义，作为治理血缘和审计依据。",
    confidence: "原始记录",
    uncertain: "缺少结构化字段，需要进入AI抽取。"
  },
  identify: {
    basis: "根据设备词、部件词、故障现象词和处置动词做实体识别。",
    rule: "业务对象必须至少命中设备或系统；现象和动作保留原始表达。",
    confidence: "88%",
    uncertain: "未出现设备编号，暂不能直接绑定到1号压载泵。"
  },
  extract: {
    basis: "从ODS原始记录中抽取设备、部件、现象、措施、结果和来源。",
    rule: "抽取字段进入AI暂存层，不能直接写DWD。",
    confidence: "86%",
    uncertain: "缺少发生时间、检测值、验收人。"
  },
  standardize: {
    basis: "用术语字典把口语表达映射到标准故障和维修动作。",
    rule: "别名映射必须保留原词、标准词、字典编码和置信度。",
    confidence: "92%",
    uncertain: "“温度高”缺少具体阈值，只能标准化为温度异常升高。"
  },
  master: {
    basis: "设备名称相似度、所属系统一致性、历史工单关联度、部件/现象共现关系。",
    rule: "置信度低于85%进入人工复核；最高候选仍需业务确认。",
    confidence: "91%",
    uncertain: "记录未写设备编号，因此冷却水泵、舱底水泵仍作为低分候选保留。"
  },
  quality: {
    basis: "按设备故障知识入库规则检查必填字段、检测值和低置信推断。",
    rule: "缺少关键测量值时允许入库为案例，但必须带补字段清单和低置信提示。",
    confidence: "76%",
    uncertain: "轴承磨损属于推断，不能作为确定根因。"
  },
  confirm: {
    basis: "人工确认主数据、标准术语、低置信项和是否允许入库。",
    rule: "人工确认后才能从AI暂存结果写入DWD标准明细。",
    confidence: "人工确认",
    uncertain: "缺失字段进入反馈回流，不阻断案例级知识入库。"
  },
  dwd: {
    basis: "人工确认后的标准术语、主数据和质量校验结果写入DWD。",
    rule: "DWD必须包含设备、系统、部件、故障、措施、结果、来源和可信等级。",
    confidence: "高",
    uncertain: "测量值字段仍为空，作为补字段任务回流。"
  },
  knowledge: {
    basis: "从DWD标准明细生成知识卡片、RAG chunk、embedding和图谱关系。",
    rule: "只有已发布知识卡片的chunk才允许被RAG和Agent引用。",
    confidence: "95%",
    uncertain: "后续需要一线补充振动值和温度值以提升诊断可信度。"
  }
};

const graphTriples = [
  ["1号压载泵 EQ-BW-PUMP-001", "出现故障现象", "异常振动"],
  ["1号压载泵 EQ-BW-PUMP-001", "出现故障现象", "温度异常升高"],
  ["异常振动", "关联部件", "泵轴承"],
  ["异常振动", "可能关联", "联轴器不对中"],
  ["更换泵轴承", "处置", "轴承位置温升"],
  ["联轴器找正", "处置结果", "运行正常"]
];

const defaultMetrics = {
  pending: 0,
  objects: 0,
  masterRate: 0,
  reviewRate: 0,
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
  selectedTaskId: localStorage.getItem(storeKeys.selectedTaskId) || "",
  selectedScenario: localStorage.getItem("shipRag.selectedScenario") || "equipment",
  draftRaw: localStorage.getItem(storeKeys.draftRaw) || "",
  dashboardMetric: "",
  showRules: false,
  approvalFilter: localStorage.getItem(storeKeys.approvalFilter) || "ai",
  selectedApprovalIds: load(storeKeys.selectedApprovalIds, []),
  selectedReviewer: localStorage.getItem(storeKeys.selectedReviewer) || "equip-lead",
  ingestNotice: "",
  ragRan: false,
  ragQuery: "压载泵振动升温怎么排查？",
  agentRan: false,
  agentQuestion: "某船压载泵启动后异常振动，并伴随轴承位置温度升高，应该怎么排查？",
  tasks: load(storeKeys.tasks, []),
  cases: load(storeKeys.cases, defaultCases),
  knowledgeCase: load(storeKeys.knowledgeCase, null),
  ragDocs: load(storeKeys.ragDocs, []),
  metrics: load(storeKeys.metrics, defaultMetrics),
  logs: load(storeKeys.logs, defaultLogs)
};

const pageContent = document.querySelector("#pageContent");
const pageTitle = document.querySelector("#pageTitle");
const stateStatus = document.querySelector("#stateStatus");

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
  localStorage.setItem(storeKeys.knowledgeCase, JSON.stringify(state.knowledgeCase));
  localStorage.setItem(storeKeys.ragDocs, JSON.stringify(state.ragDocs));
  localStorage.setItem(storeKeys.activeStep, state.activeStep);
  localStorage.setItem(storeKeys.selectedTaskId, state.selectedTaskId);
  localStorage.setItem(storeKeys.draftRaw, state.draftRaw);
  localStorage.setItem(storeKeys.approvalFilter, state.approvalFilter);
  localStorage.setItem(storeKeys.selectedApprovalIds, JSON.stringify(state.selectedApprovalIds));
  localStorage.setItem(storeKeys.selectedReviewer, state.selectedReviewer);
  localStorage.setItem("shipRag.selectedScenario", state.selectedScenario);
  stateStatus.textContent = `已保存 ${state.tasks.length} 条治理任务`;
}

function createMainTask() {
  const sample = scenarioSamples[state.selectedScenario] || scenarioSamples.equipment;
  const raw = state?.draftRaw || sample.raw;
  return {
    id: `TASK-BW-PUMP-${Date.now().toString().slice(-6)}`,
    scenario: sample.label,
    scenarioKey: state.selectedScenario,
    title: sample.title,
    source: sample.source,
    raw,
    ods: {
      layer: "ODS_RAW_MAINT_RECORD",
      source: sample.source,
      originalText: raw,
      ingestMode: "手工录入/样例加载",
      dirtyFlags: ["口语化表达", "缺少设备编码", "缺少检测值"]
    },
    status: "待AI处理",
    flowStatus: "待治理",
    stage: 0,
    completed: [],
    createdAt: new Date().toLocaleString("zh-CN")
  };
}

function mainTask() {
  return state.tasks.find((task) => task.id === state.selectedTaskId) || state.tasks[0] || null;
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

function seedDemoBacklog() {
  if (localStorage.getItem("shipRag.seededBacklogV2")) return;
  const pendingCount = state.tasks.filter((task) => task.status !== "已入库").length;
  const needed = Math.max(0, 7 - pendingCount);
  for (let index = 0; index < needed; index += 1) {
    const raw = defaultGovernanceTasks[index % defaultGovernanceTasks.length];
    const key = raw.includes("焊缝") || raw.includes("RT") ? "quality" : raw.includes("管路") || raw.includes("偏差") ? "defect" : "equipment";
    const sample = scenarioSamples[key];
    state.tasks.push({
      id: `TASK-DEMO-${String(index + 1).padStart(2, "0")}`,
      scenario: sample.label,
      scenarioKey: key,
      title: sample.title,
      source: sample.source,
      raw,
      ods: {
        layer: "ODS_RAW_MAINT_RECORD",
        source: sample.source,
        originalText: raw,
        ingestMode: "内置待治理样例",
        dirtyFlags: ["口语化表达", "字段缺失", "未绑定主数据"]
      },
      status: "待AI处理",
      flowStatus: "待治理",
      stage: 0,
      completed: [],
      createdAt: new Date().toLocaleString("zh-CN")
    });
  }
  if (!state.selectedTaskId && state.tasks[0]) state.selectedTaskId = state.tasks[0].id;
  localStorage.setItem("shipRag.seededBacklogV2", "true");
  save();
}

function normalizeDemoTaskStatuses() {
  const demoStatuses = [
    { status: "待AI处理", flowStatus: "待治理", completed: [] },
    { status: "AI已处理待人工复核", flowStatus: "待复核", completed: ["identify", "extract", "standardize", "master", "quality"] },
    { status: "已发布知识", flowStatus: "已生成知识", completed: ["identify", "extract", "standardize", "master", "quality", "confirm", "dwd", "knowledge"] },
    { status: "需补充数据", flowStatus: "待复核", completed: ["identify", "extract", "standardize", "quality"] },
    { status: "主数据待确认", flowStatus: "已匹配主数据", completed: ["identify", "extract", "standardize", "master"] },
    { status: "待AI处理", flowStatus: "待治理", completed: [] },
    { status: "已驳回", flowStatus: "待复核", completed: ["identify", "extract", "standardize", "quality"] }
  ];
  const needsVariedStatuses = state.tasks.length >= 7 && !state.tasks.some((task) => ["AI已处理待人工复核", "主数据待确认", "需补充数据", "已驳回"].includes(task.status));
  if (!needsVariedStatuses && localStorage.getItem("shipRag.variedStatusesV3")) return;
  state.tasks.slice(0, 7).forEach((task, index) => {
    const preset = demoStatuses[index] || demoStatuses[0];
    task.status = preset.status;
    task.flowStatus = preset.flowStatus;
    task.completed = [...preset.completed];
    task.stage = task.completed.length;
  });
  if (!state.selectedTaskId && state.tasks[0]) state.selectedTaskId = state.tasks[0].id;
  localStorage.setItem("shipRag.variedStatusesV1", "true");
  localStorage.setItem("shipRag.variedStatusesV2", "true");
  localStorage.setItem("shipRag.variedStatusesV3", "true");
  if (!state.knowledgeCase && state.tasks.some((task) => task.status === "已发布知识")) {
    const publishedTask = state.tasks.find((task) => task.status === "已发布知识");
    state.selectedTaskId = publishedTask.id;
    createKnowledgeCase();
    state.knowledgeCase.chunkBuilt = false;
    state.knowledgeCase.embeddingWritten = false;
  }
  save();
}

function currentMetrics() {
  const pending = state.tasks.filter((task) => !["已发布知识", "已驳回"].includes(task.status)).length;
  const identified = state.tasks.filter((task) => task.completed?.includes("identify")).length;
  const mastered = state.tasks.filter((task) => task.completed?.includes("master")).length;
  const confirmed = state.tasks.filter((task) => task.completed?.includes("confirm")).length;
  const total = Math.max(1, state.tasks.length);
  return {
    ...state.metrics,
    pending,
    objects: identified * 5,
    masterRate: Math.round((mastered / total) * 100),
    reviewRate: Math.round((confirmed / total) * 100)
  };
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
  const metrics = currentMetrics();
  return `
    <section class="panel hero-solution">
      <div>
        <p class="eyebrow">Main Storyline</p>
        <h2>AI辅助数据治理 → 高质量知识库 → RAG检索 → Agent业务应用 → 知识运营反馈</h2>
        <p>Demo 只纵向跑通一个主场景：压载泵异常振动 + 轴承温度升高。焊缝探伤和管路干涉作为扩展证明，不展开为独立系统。</p>
      </div>
      <button class="primary-btn" data-page-link="workbench" type="button">进入主案例治理</button>
    </section>
    ${dashboardMetricsGrid([
      ["pending", "待治理数据", metrics.pending, "点击查看任务列表"],
      ["objects", "AI识别对象数", metrics.objects, "设备/部件/现象/动作/结果"],
      ["master", "主数据匹配成功率", `${metrics.masterRate}%`, "已匹配任务占比"],
      ["review", "人工复核通过率", `${metrics.reviewRate}%`, "人工确认任务占比"],
      ["citation", "知识库有效引用率", `${metrics.citationRate}%`, "RAG引用"],
      ["similar", "相似案例命中率", `${metrics.similarRate}%`, "案例召回"]
    ])}
    ${state.dashboardMetric ? renderMetricDrawer() : ""}
    <section class="panel solution-architecture-card">
      <div class="section-heading compact"><div><p class="eyebrow">Solution Architecture</p><h2>解决方案架构卡片</h2></div></div>
      <div class="solution-flow architecture-flow">
        ${["业务数据来源", "AI辅助数据治理", "高质量知识库/主数据/知识图谱", "RAG检索", "Agent工具编排", "业务建议输出", "评测与反馈回流"].map((item, index) => `
          <article><span>${index + 1}</span><strong>${item}</strong><p>${architectureNote(index)}</p></article>
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

function dashboardMetricsGrid(rows) {
  return `<section class="metric-grid solution-metrics clickable-metrics">${rows.map(([id, label, value, note]) => `
    <button class="metric-card" data-metric="${id}" type="button">
      <span>${label}</span>
      <strong>${value}</strong>
      <em>${note}</em>
    </button>
  `).join("")}</section>`;
}

function renderMetricDrawer() {
  const pendingTasks = state.tasks.filter((task) => !["已发布知识", "已驳回"].includes(task.status)).slice(0, 7);
  const metricTitles = {
    pending: "待治理数据任务列表",
    objects: "AI识别对象明细",
    master: "主数据匹配明细",
    review: "人工复核明细",
    citation: "知识引用明细",
    similar: "相似案例命中明细"
  };
  if (state.dashboardMetric === "pending") {
    return `
      <section class="panel metric-drawer">
        <div class="section-heading compact">
          <div><p class="eyebrow">Drill Down</p><h2>${metricTitles.pending}</h2></div>
          <button class="icon-btn" data-close-metric type="button">×</button>
        </div>
        <div class="task-list-compact metric-task-list">
          ${pendingTasks.map((task) => `
            <button data-open-task="${task.id}" type="button">
              <strong>${task.title}</strong>
              <span>${task.scenario}｜${task.status}｜${task.source}</span>
              <p>${task.raw}</p>
              <em>下一步：${nextTaskAction(task)}</em>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }
  const metrics = currentMetrics();
  const valueMap = {
    objects: metrics.objects,
    master: `${metrics.masterRate}%`,
    review: `${metrics.reviewRate}%`,
    citation: `${metrics.citationRate}%`,
    similar: `${metrics.similarRate}%`
  };
  const rows = metricDetailRows(state.dashboardMetric);
  return `
    <section class="panel metric-drawer">
      <div class="section-heading compact">
        <div><p class="eyebrow">Drill Down</p><h2>${metricTitles[state.dashboardMetric] || "指标明细"}</h2></div>
        <button class="icon-btn" data-close-metric type="button">×</button>
      </div>
      <div class="result-panel">
        <article><span>当前值</span><strong>${valueMap[state.dashboardMetric] ?? "已计算"}</strong><p>指标来自 localStorage 中的任务状态、RAG命中和反馈记录。</p></article>
        <article><span>联动规则</span><strong>随流程推进变化</strong><p>执行AI识别、主数据匹配、人工确认、RAG检索和反馈按钮后会更新。</p></article>
      </div>
      <div class="metric-detail-grid">
        ${rows.map(([title, value, note]) => `<article><span>${title}</span><strong>${value}</strong><p>${note}</p></article>`).join("")}
      </div>
    </section>
  `;
}

function metricDetailRows(metric) {
  const identifiedTasks = state.tasks.filter((task) => task.completed?.includes("identify"));
  const masteredTasks = state.tasks.filter((task) => task.completed?.includes("master"));
  const reviewedTasks = state.tasks.filter((task) => task.completed?.includes("confirm"));
  const caseTitle = state.knowledgeCase?.title || "压载泵异常振动与温升案例";
  const rows = {
    objects: [
      ["设备对象", `${identifiedTasks.length} 条任务`, "压载泵、焊缝、管路等业务对象已被AI识别。"],
      ["部件对象", `${identifiedTasks.length} 批`, "轴承、焊缝、托架等部件从原文抽取。"],
      ["故障/缺陷现象", `${identifiedTasks.length * 2} 个`, "异常振动、温升、RT不合格、管路干涉等。"],
      ["处理动作", `${identifiedTasks.length} 组`, "更换轴承、联轴器找正、返修、改管等。"]
    ],
    master: [
      ["推荐主数据", "1号压载泵 EQ-BW-PUMP-001", "最高匹配度91%，超过85%阈值但仍需人工确认。"],
      ["已匹配任务", `${masteredTasks.length} 条`, "进入主数据候选匹配或已确认状态。"],
      ["低分候选", "冷却水泵42% / 舱底水泵35%", "保留候选用于解释和复核。"]
    ],
    review: [
      ["复核通过", `${reviewedTasks.length} 条`, "人工确认主数据、标准术语和低置信提示。"],
      ["待复核/补字段", `${state.tasks.filter((task) => ["AI已处理待人工复核", "需补充数据"].includes(task.status)).length} 条`, "需补充检测值或复核根因推断。"],
      ["已驳回", `${state.tasks.filter((task) => task.status === "已驳回").length} 条`, "证据不足或识别不可信。"]
    ],
    citation: [
      ["引用知识案例", caseTitle, "Agent回答引用已发布知识卡片。"],
      ["引用SOP", "压载泵检修SOP", "RAG命中设备主数据关联SOP。"],
      ["引用图谱关系", `${graphTriples.length} 条`, "设备-现象-部件-措施-结果关系。"]
    ],
    similar: [
      ["Top1相似案例", caseTitle, "设备、现象、措施三类字段相似。"],
      ["命中原因", "异常振动 + 温度异常升高 + 更换轴承", "与问题语义和元数据均匹配。"],
      ["召回来源", "历史维修案例 / SOP / 通用规范", "混合召回后重排序。"]
    ]
  };
  return rows[metric] || [];
}

function architectureNote(index) {
  return [
    "维修工单、设备台账、SOP、检测报告、图片和音频进入接入层。",
    "把口语化维修记录转成结构化事实。",
    "沉淀经过标准化和复核的案例、主数据、SOP与图谱关系。",
    "按主数据、案例、SOP和规范召回知识。",
    "按意图调用主数据、RAG、图谱和质量检查工具。",
    "生成带引用依据和低置信提示的业务建议。",
    "采纳、补字段、知识缺口回流到治理。"
  ][index];
}

function nextTaskAction(task) {
  const actions = {
    "待AI处理": "运行AI识别",
    "AI已识别": "术语标准化",
    "已标准化": "主数据匹配",
    "主数据待确认": "人工确认主数据",
    "主数据已匹配": "数据质量校验",
    "AI已处理待人工复核": "人工复核决策",
    "待人工复核": "人工复核决策",
    "需补充数据": "补充缺失字段",
    "人工复核通过": "写入DWD标准明细",
    "写入DWD标准明细": "生成知识卡片",
    "已发布知识": "RAG检索/Agent调用",
    "已驳回": "结束或重新接入"
  };
  return actions[task.status] || "继续治理";
}

function renderIngest() {
  return `
    <section class="content-grid">
      <article class="panel span-7">
        <div class="section-heading compact"><div><p class="eyebrow">Historical Work Order</p><h2>历史工单接入</h2></div></div>
        <div class="sample-loader">
          <label>选择场景
            <select id="scenarioSelect">
              ${Object.entries(scenarioSamples).map(([key, sample]) => `<option value="${key}" ${state.selectedScenario === key ? "selected" : ""}>${sample.label}</option>`).join("")}
            </select>
          </label>
          <label>原始工单文本<textarea id="sampleRaw" placeholder="点击加载样例历史工单，或手动输入一条设备故障脏数据">${state.draftRaw}</textarea></label>
          <div class="intake-actions">
            <button class="secondary-btn" data-load-sample type="button">加载样例历史工单</button>
            <button class="primary-btn" data-generate-task type="button">生成治理任务</button>
          </div>
          <label>模拟上传多模态资料
            <input id="ingestUpload" type="file" multiple accept=".xls,.xlsx,.csv,.pdf,.doc,.docx,image/*,audio/*,video/*" />
          </label>
          <p class="hint">选择设备故障、质量异常或现场缺陷后，可加载样例或手工录入ODS原始记录。点击生成后写入 localStorage，任务状态为“待治理”。</p>
          ${state.ingestNotice ? `<div class="ingest-notice"><strong>${state.ingestNotice}</strong><p>任务已写入 localStorage，可在下方任务列表查看，也可点击任务进入AI治理工作台。</p></div>` : ""}
        </div>
        <div class="access-kinds">
          ${["ODS原始记录", "手工录入", "场景样例", "待AI治理"].map((item) => `<span>${item}</span>`).join("")}
        </div>
      </article>
      <article class="panel span-5">
        <div class="section-heading compact"><div><p class="eyebrow">Sample Library</p><h2>样例库/多模态识别</h2></div></div>
        <div class="sample-asset-grid">
          ${ingestSampleAssets.map(([type, filename, result], index) => `
            <button data-load-asset="${index}" type="button">
              <span>${type}</span>
              <strong>${filename}</strong>
              <p>${result}</p>
            </button>
          `).join("")}
        </div>
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
  if (!task) {
    return `
      <section class="panel empty-workbench">
        <div class="section-heading compact"><div><p class="eyebrow">AI Governance Workbench</p><h2>还没有治理任务</h2></div></div>
        <p class="hint">请先到“数据接入”页面加载样例历史工单，并点击“生成治理任务”。</p>
        <button class="primary-btn" data-page-link="ingest" type="button">去数据接入</button>
      </section>
    `;
  }
  return `
    <section class="workbench-layout">
      <aside class="panel">
        <div class="section-heading compact"><div><p class="eyebrow">Task Queue</p><h2>治理任务队列</h2></div><span class="status-pill">${state.tasks.length} 条</span></div>
        ${renderApprovalPanel()}
        <div class="task-list-compact workbench-queue">
          ${state.tasks.slice().reverse().map((item) => `
            <button class="${item.id === task.id ? "active" : ""}" data-select-task="${item.id}" type="button">
              <strong>${item.title}</strong>
              <span>${item.id}｜${item.status}</span>
              <p>${item.raw}</p>
              <em>下一步：${nextTaskAction(item)}</em>
            </button>
          `).join("")}
        </div>
      </aside>
      <section class="panel">
        <div class="section-heading compact">
          <div><p class="eyebrow">Current Task</p><h2>${task.title}</h2></div>
          <div class="heading-actions"><span class="status-pill">${task.status}</span><button class="secondary-btn" data-open-rules type="button">功能说明/规则说明</button></div>
        </div>
        ${statusFlow(task)}
        ${renderDataLayerBoard(task)}
        ${renderAiValuePanel(task)}
        <div class="section-heading compact">
          <div><p class="eyebrow">AI Governance Workbench</p><h2>${stepResults[state.activeStep]?.title || stepResults.extract.title}</h2></div>
        </div>
        ${renderStateActions(task)}
        ${state.showRules ? renderRuleDrawer() : ""}
        <div class="step-rail horizontal-steps detail-steps">
          ${detailStages.map((step, index) => `
            <button class="${state.activeStep === step.id ? "active" : ""} ${isStageDone(task, step.id) ? "done" : ""}" data-step="${step.id}" type="button">
              <span>${index + 1}</span>
              <strong>${step.label}</strong>
              <em>${isStageDone(task, step.id) ? "已生成" : "待生成"}</em>
            </button>
          `).join("")}
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

function getApprovalGroup() {
  return approvalGroups.find((group) => group.id === state.approvalFilter) || approvalGroups[0];
}

function approvalTasks() {
  const group = getApprovalGroup();
  return state.tasks.filter((task) => group.statuses.includes(task.status));
}

function approvalActionLabel(groupId) {
  if (groupId === "ai") return "AI自动预审";
  if (groupId === "review") return "人工批量复核";
  return "问题批量处理";
}

function renderApprovalPanel() {
  const group = getApprovalGroup();
  const filteredTasks = approvalTasks();
  const reviewer = reviewers.find((item) => item.id === state.selectedReviewer) || reviewers[1];
  return `
    <div class="approval-panel">
      <div class="approval-head">
        <div>
          <span>流程分类审批</span>
          <strong>${approvalActionLabel(group.id)}</strong>
        </div>
        <em>${filteredTasks.length} 条</em>
      </div>
      <div class="approval-tabs">
        ${approvalGroups.map((item) => {
          const count = state.tasks.filter((task) => item.statuses.includes(task.status)).length;
          return `<button class="${state.approvalFilter === item.id ? "active" : ""}" data-approval-filter="${item.id}" type="button">${item.label}<span>${count}</span></button>`;
        }).join("")}
      </div>
      <p class="approval-desc">${group.desc}</p>
      <label class="reviewer-select">
        <span>处理人/复核人</span>
        <select id="reviewerSelect">
          ${reviewers.map((item) => `<option value="${item.id}" ${item.id === reviewer.id ? "selected" : ""}>${item.name}｜${item.role}</option>`).join("")}
        </select>
        <em>${reviewer.scope}</em>
      </label>
      <div class="approval-actions">
        <button class="secondary-btn" data-approval-select-all type="button">全选当前类</button>
        ${group.id === "ai" ? `<button class="primary-btn" data-batch-approval="ai-precheck" type="button">批量AI预审</button>` : ""}
        ${group.id === "review" ? `
          <button class="primary-btn" data-batch-approval="approve" type="button">批量通过</button>
          <button class="secondary-btn" data-batch-approval="supplement" type="button">要求补充</button>
          <button class="secondary-btn" data-batch-approval="rematch" type="button">改主数据</button>
        ` : ""}
        ${group.id === "problem" ? `
          <button class="primary-btn" data-batch-approval="restart" type="button">重新AI处理</button>
          <button class="secondary-btn" data-batch-approval="close" type="button">标记关闭</button>
        ` : ""}
      </div>
      <div class="approval-list">
        ${filteredTasks.length ? filteredTasks.map((item) => `
          <label class="${state.selectedApprovalIds.includes(item.id) ? "checked" : ""}">
            <input type="checkbox" data-approval-check="${item.id}" ${state.selectedApprovalIds.includes(item.id) ? "checked" : ""}>
            <div>
              <strong>${item.title}</strong>
              <span>${item.status}｜${item.scenario || "设备故障"}</span>
              <p>${item.raw}</p>
              <em>下一步：${nextTaskAction(item)}</em>
            </div>
          </label>
        `).join("") : `<div class="approval-empty">当前分类暂无任务，可以切换分类或从数据接入新增任务。</div>`}
      </div>
    </div>
  `;
}

function statusFlow(task) {
  const statuses = ["待AI处理", "AI已识别", "已标准化", "主数据", "质量校验", "人工复核", "DWD明细", "已发布知识"];
  const derivedStatus = task.flowStatus || (task.completed.includes("knowledge") && "已生成知识")
    || (task.completed.includes("confirm") && "已确认")
    || (task.completed.includes("quality") && "待复核")
    || (task.completed.includes("master") && "已匹配主数据")
    || (task.completed.includes("standardize") && "已标准化")
    || (task.completed.includes("extract") && "已抽取")
    || (task.completed.includes("identify") && "已识别")
    || task.status;
  const currentIndex = Math.max(0, task.completed?.includes("knowledge") ? 7
    : task.completed?.includes("dwd") ? 6
      : task.completed?.includes("confirm") ? 5
        : task.completed?.includes("quality") ? 4
          : task.completed?.includes("master") ? 3
            : task.completed?.includes("standardize") ? 2
              : task.completed?.includes("extract") || task.completed?.includes("identify") ? 1
                : 0);
  return `
    <div class="status-flow">
      ${statuses.map((status, index) => `
        <button class="${index < currentIndex ? "done" : ""} ${index === currentIndex ? "active" : ""}" data-step="${detailStages[index]?.id || "ods"}" type="button">
          <span>${index + 1}</span>
          <strong>${status}</strong>
        </button>
      `).join("")}
    </div>
  `;
}

function renderStateActions(task) {
  const actionsByStatus = {
    "待AI处理": [["run", "identify", "运行AI识别"]],
    "AI已识别": [["run", "standardize", "术语标准化"]],
    "已标准化": [["run", "master", "执行主数据匹配"]],
    "主数据待确认": [["review", "confirm-master", "确认主数据"], ["review", "reject", "驳回"]],
    "主数据已匹配": [["run", "quality", "数据质量校验"]],
    "AI已处理待人工复核": [["review", "pass", "通过"], ["review", "reject", "驳回"], ["review", "supplement", "要求补充字段"], ["review", "rematch", "修改主数据匹配"]],
    "待人工复核": [["review", "pass", "通过"], ["review", "reject", "驳回"], ["review", "supplement", "要求补充字段"], ["review", "rematch", "修改主数据匹配"]],
    "需补充数据": [["review", "fill-fields", "补充字段并复核"]],
    "人工复核通过": [["run", "dwd", "写入DWD标准明细"]],
    "写入DWD标准明细": [["run", "knowledge", "生成知识卡片"]],
    "已发布知识": [["page", "rag", "进入RAG检索"], ["page", "agent", "运行Agent"]],
    "已驳回": [["review", "restart", "重新进入AI处理"]]
  };
  const actions = actionsByStatus[task.status] || [["run", "identify", "继续治理"]];
  return `
    <div class="state-action-panel">
      <div>
        <span>当前状态</span>
        <strong>${task.status}</strong>
        <p>下一步动作：${nextTaskAction(task)}</p>
      </div>
      <div class="action-row">
        <button class="secondary-btn" data-ai-auto-current type="button">AI一键治理当前任务</button>
        <button class="secondary-btn" data-ai-batch type="button">批量AI预处理待AI任务</button>
        ${actions.map(([type, value, label]) => `<button class="${type === "run" ? "primary-btn" : "secondary-btn"}" data-state-action="${type}:${value}" type="button">${label}</button>`).join("")}
      </div>
    </div>
  `;
}

function renderAiValuePanel(task) {
  const processed = task.completed?.length || 0;
  const trace = task.aiTrace || [
    ["输入", "ODS原始文本/上传资料"],
    ["AI处理", processed ? "字段抽取、术语标准化、主数据候选、质量校验" : "等待运行AI一键治理"],
    ["输出", processed ? "结构化字段、置信度、不确定项、补字段清单" : "暂无AI输出"]
  ];
  return `
    <div class="ai-value-panel">
      <article><span>AI处理效率</span><strong>${processed ? "约12秒/条" : "待运行"}</strong><p>模拟替代人工阅读、字段摘录、术语映射和质检。</p></article>
      <article><span>字段抽取准确率</span><strong>${task.completed?.includes("extract") ? "92%" : "--"}</strong><p>设备、部件、现象、措施、结果五类对象。</p></article>
      <article><span>标准化命中率</span><strong>${task.completed?.includes("standardize") ? "89%" : "--"}</strong><p>别名词映射到标准故障/维修动作字典。</p></article>
      <article><span>质量评测</span><strong>${task.completed?.includes("quality") ? "76分" : "--"}</strong><p>缺测量值会降分，但允许案例级入库并触发补字段。</p></article>
    </div>
    <div class="ai-effect-trace">
      <div><strong>AI在这里起作用</strong><p>不是简单录入，而是把非结构化ODS记录自动变成可复核、可入库、可被RAG/Agent调用的结构化结果。</p></div>
      ${trace.map(([title, body]) => `<article><span>${title}</span><strong>${body}</strong></article>`).join("")}
    </div>
  `;
}

function renderRuleDrawer() {
  return `
    <div class="rule-drawer">
      <div class="section-heading compact"><div><p class="eyebrow">Rules</p><h2>功能说明/规则说明</h2></div><button class="icon-btn" data-close-rules type="button">×</button></div>
      ${ruleDocs.map(([title, body]) => `<article><strong>${title}</strong><p>${body}</p></article>`).join("")}
      <div class="rule-file-grid">
        ${ruleFiles.map(([file, title, body]) => `
          <article>
            <span>${file}</span>
            <strong>${title}</strong>
            <p>${body}</p>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDataLayerBoard(task) {
  const aiReady = task.completed.includes("identify") || task.completed.includes("extract");
  const dwdReady = task.completed.includes("standardize") || task.completed.includes("master") || task.completed.includes("quality") || task.completed.includes("confirm") || task.completed.includes("knowledge");
  return `
    <div class="layer-board">
      <article>
        <span>ODS 原始数据</span>
        <strong>${task.ods?.layer || "ODS_RAW_MAINT_RECORD"}</strong>
        <p>${task.raw}</p>
        <em>${task.ods?.dirtyFlags?.join(" / ") || "口语化表达 / 字段缺失 / 未绑定主数据"}</em>
      </article>
      <article class="${aiReady ? "ready" : ""}">
        <span>AI抽取结果</span>
        <strong>${aiReady ? "AI_TMP_EXTRACT_RESULT" : "等待AI识别"}</strong>
        <p>${aiReady ? "设备=压载泵；部件=轴承；现象=震得厉害、温度高；措施=换轴承、重新找正。" : "点击AI识别和字段抽取后生成结构化暂存结果。"}</p>
        <em>${aiReady ? "置信度86%-88%，仍有不确定项" : "未执行"}</em>
      </article>
      <article class="${dwdReady ? "ready" : ""}">
        <span>DWD 标准明细</span>
        <strong>${dwdReady ? "DWD_EQUIP_FAULT_DETAIL" : "等待标准化"}</strong>
        <p>${dwdReady ? "设备=1号压载泵；故障=异常振动+温度异常升高；措施=更换泵轴承+联轴器找正；结果=试运行正常。" : "点击术语标准化、主数据匹配和人工确认后写入DWD。"}</p>
        <em>${dwdReady ? "可生成知识卡片/RAG chunk/图谱关系" : "未写入"}</em>
      </article>
    </div>
  `;
}

function isStageDone(task, stepId) {
  if (stepId === "ods") return true;
  if (stepId === "dwd") return task.completed.includes("dwd") || task.completed.includes("knowledge");
  return task.completed.includes(stepId);
}

function renderStepResult(task) {
  const step = state.activeStep;
  const isDone = isStageDone(task, step);
  const result = stepResults[step] || stepResults.extract;
  const rows = isDone ? result.rows : [["等待执行", `点击“${result.title}”按钮后生成结果`, "前端mock，不调用真实模型"]];
  return `
    ${renderStepMeta(step, isDone)}
    <div class="result-panel">
      ${rows.map(([label, value, note]) => `
        <article>
          <span>${label}</span>
          <strong>${value}</strong>
          <p>${note}</p>
        </article>
      `).join("")}
    </div>
    ${step === "master" && isDone ? masterRuleBlock() : ""}
    ${step === "master" && isDone ? renderMasterConfirmation() : ""}
    ${step === "quality" && isDone ? renderQualityGate() : ""}
    ${step === "dwd" ? renderDwdCard(isDone) : ""}
    ${step === "knowledge" && isDone ? renderKnowledgePipeline() : ""}
    ${task.completed.includes("knowledge") ? renderIngestedSummary() : ""}
  `;
}

function renderStepMeta(step, isDone) {
  const meta = stepMeta[step] || stepMeta.extract;
  const reviewNeeded = step === "master" || step === "quality" || (step === "confirm" && !isDone);
  return `
    <div class="ai-meta-grid">
      <article><span>AI判断依据</span><strong>${isDone ? meta.basis : "等待执行"}</strong></article>
      <article><span>匹配规则</span><strong>${isDone ? meta.rule : "点击步骤按钮后展示规则"}</strong></article>
      <article><span>置信度</span><strong>${isDone ? meta.confidence : "--"}</strong></article>
      <article><span>不确定项</span><strong>${isDone ? meta.uncertain : "尚未识别"}</strong></article>
      <article><span>是否需要人工复核</span><strong>${isDone ? (reviewNeeded ? "需要" : "不需要") : "待判断"}</strong></article>
    </div>
  `;
}

function masterRuleBlock() {
  return `
    <details class="rule-card master-rule" open>
      <summary>主数据匹配规则说明</summary>
      <ul>
        <li>设备名称相似度</li>
        <li>所属系统一致性</li>
        <li>历史工单关联度</li>
        <li>部件/现象共现关系</li>
        <li>置信度低于85%进入人工复核</li>
      </ul>
    </details>
  `;
}

function renderMasterConfirmation() {
  return `
    <div class="master-confirm">
      <div>
        <strong>人工确认入口</strong>
        <p>推荐绑定：1号压载泵 EQ-BW-PUMP-001。由于原始记录缺少设备编号，仍保留低分候选用于人工复核。</p>
      </div>
      <button class="secondary-btn" data-run-step="confirm" type="button">确认主数据与标准术语</button>
    </div>
  `;
}

function renderQualityGate() {
  return `
    <div class="quality-gate">
      <article><span>是否允许入库</span><strong>允许案例级入库</strong><p>缺少测量值不阻断案例沉淀，但必须生成补字段清单。</p></article>
      <article><span>缺失字段</span><strong>设备型号、振动测量值、轴承温度值、物料编码、验收人</strong><p>进入知识运营反馈。</p></article>
      <article><span>低置信度项</span><strong>轴承磨损属于推断</strong><p>Agent回答时必须展示人工复核提示。</p></article>
    </div>
  `;
}

function renderDwdCard(isDone) {
  const fields = [
    ["设备", "1号压载泵 EQ-BW-PUMP-001"],
    ["系统", "压载水系统"],
    ["部件", "泵轴承"],
    ["故障现象", "异常振动；温度异常升高"],
    ["处理措施", "更换泵轴承；联轴器找正"],
    ["结果", "试运行正常"],
    ["来源", "ODS_维修工单"],
    ["可信等级", "高"]
  ];
  return `
    <div class="dwd-card">
      <div class="section-heading compact"><div><p class="eyebrow">DWD Detail</p><h2>DWD标准明细卡片</h2></div><span class="status-pill">${isDone ? "可入知识库" : "待写入"}</span></div>
      <div>
        ${fields.map(([label, value]) => `<article><span>${label}</span><strong>${isDone ? value : "待人工确认后写入"}</strong></article>`).join("")}
      </div>
    </div>
  `;
}

function renderKnowledgePipeline() {
  return `
    <div class="knowledge-pipeline">
      ${[
        ["知识卡片", "压载泵异常振动与温升案例", "已发布"],
        ["RAG Chunk", "案例摘要 / 排查步骤 / 质量缺口", "3个chunk"],
        ["Embedding", "text-embedding mock vector", "已生成"],
        ["向量库", "ship_fault_vector_index", "已写入"],
        ["图谱关系", "设备-现象-部件-措施-结果", "6条"]
      ].map(([title, body, tag]) => `<article><span>${title}</span><strong>${body}</strong><em>${tag}</em></article>`).join("")}
    </div>
  `;
}

function renderIngestedSummary() {
  return `
    <div class="ingested-summary">
      <strong>已生成知识卡片、RAG chunk、embedding和图谱关系</strong>
      <p>案例：压载泵异常振动与温升案例；主数据：1号压载泵 EQ-BW-PUMP-001；chunk：3 个；三元组：${graphTriples.length} 条。</p>
    </div>
  `;
}

function renderRag() {
  const knowledgeCase = state.knowledgeCase || state.cases.find((item) => item.id === "KB-BW-PUMP-001");
  const hasCase = Boolean(knowledgeCase);
  return `
    <section class="content-grid">
      <article class="panel span-12">
        <div class="section-heading compact"><div><p class="eyebrow">RAG Indexing Pipeline</p><h2>建库流程</h2></div></div>
        <div class="rag-pipeline">
          ${["上传/选择文档", "文档解析", "清洗去噪", "结构识别", "生成Chunk", "生成Embedding", "写入向量库", "模拟RAG检索"].map((item, index) => `
            <button class="${ragPipelineDone(index) ? "done" : ""}" type="button">${index + 1}. ${item}</button>
          `).join("")}
        </div>
        <div class="rag-doc-actions">
          <button class="secondary-btn" data-load-rag-samples type="button">加载SOP样例</button>
          <label class="upload-btn">上传模拟文档<input id="ragUpload" type="file" multiple hidden /></label>
        </div>
        ${renderRagDocs()}
      </article>
      <article class="panel span-5">
        <div class="section-heading compact"><div><p class="eyebrow">Knowledge Case</p><h2>治理后标准案例</h2></div><span class="status-pill">${hasCase ? "已入库" : "未入库"}</span></div>
        ${hasCase ? `
          <div class="knowledge-card">
            <strong>${knowledgeCase.title}</strong>
            <p>原始记录经 AI 识别、字段抽取、术语标准化、主数据匹配、质量校验和人工确认后形成。</p>
            <dl>
              <div><dt>关联主数据</dt><dd>${knowledgeCase.masterData}</dd></div>
              <div><dt>关联SOP</dt><dd>${knowledgeCase.sop}</dd></div>
              <div><dt>DWD明细</dt><dd>${knowledgeCase.dwdTable || "DWD_EQUIP_FAULT_DETAIL"}</dd></div>
              <div><dt>可信等级</dt><dd>${knowledgeCase.trust || "高"}</dd></div>
              <div><dt>发布状态</dt><dd>已发布</dd></div>
            </dl>
          </div>
          ${renderRagChunkProcess(knowledgeCase)}
          <div class="triple-mini">
            ${(knowledgeCase.triples || graphTriples).map(([s, p, o]) => `<div><span>${s}</span><strong>${p}</strong><span>${o}</span></div>`).join("")}
          </div>
        ` : `
          <div class="empty-knowledge">
            <strong>还没有可检索的治理知识</strong>
            <p>请先在 AI治理工作台完成“人工确认并入库”。RAG 只检索已发布知识，不直接使用未复核的脏数据。</p>
            <button class="primary-btn" data-page-link="workbench" type="button">去AI治理工作台</button>
          </div>
        `}
      </article>
      <article class="panel span-7">
        <div class="section-heading compact"><div><p class="eyebrow">RAG Retrieval</p><h2>RAG检索模拟</h2></div></div>
        <div class="rag-search">
          <label>用户问题<textarea id="ragInput">${state.ragQuery}</textarea></label>
          <button class="primary-btn" data-run-rag type="button">${hasCase && knowledgeCase.embeddingWritten ? "模拟RAG检索" : hasCase ? "等待向量库" : "等待知识入库"}</button>
        </div>
        ${hasCase
          ? (state.ragRan ? renderRagResults() : `<p class="hint">点击“模拟RAG检索”后，展示命中的案例、SOP和规范，以及匹配原因、可信等级、状态和来源类型。</p>`)
          : `<p class="hint">当前 knowledgeCase 不存在。完成治理入库后，这里才会显示案例并允许 RAG 命中。</p>`}
      </article>
    </section>
  `;
}

function ragPipelineDone(index) {
  if (index < 4) return state.ragDocs.length > 0;
  if (index === 4) return Boolean(state.knowledgeCase?.chunkBuilt);
  if (index === 5 || index === 6) return Boolean(state.knowledgeCase?.embeddingWritten);
  return state.ragRan;
}

function renderRagDocs() {
  if (!state.ragDocs.length) return `<p class="hint">请先加载SOP样例或上传模拟文档，文档会进入解析、清洗、结构识别流程。</p>`;
  return `
    <div class="rag-doc-list">
      ${state.ragDocs.map((doc) => `
        <article>
          <span>${doc.id}</span>
          <strong>${doc.title}</strong>
          <p>${doc.type}｜${doc.status}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderRagChunkProcess(knowledgeCase) {
  const chunks = knowledgeCase.chunks?.length ? knowledgeCase.chunks : defaultKnowledgeChunks();
  const chunkBuilt = Boolean(knowledgeCase.chunkBuilt);
  const embeddingWritten = Boolean(knowledgeCase.embeddingWritten);
  return `
    <div class="chunk-process">
      <div class="section-heading compact"><div><p class="eyebrow">RAG Build</p><h2>知识卡片 → RAG Chunk → Embedding</h2></div></div>
      <div class="rag-build-actions">
        <button class="secondary-btn" data-build-chunk type="button">生成RAG Chunk</button>
        <button class="secondary-btn" data-write-vector type="button">生成Embedding / 写入向量库</button>
      </div>
      <div class="build-status-grid">
        <article><span>Chunk状态</span><strong>${chunkBuilt ? "已生成" : "待生成"}</strong></article>
        <article><span>Embedding状态</span><strong>${embeddingWritten ? "已生成" : "待生成"}</strong></article>
        <article><span>向量库状态</span><strong>${embeddingWritten ? "已写入 ship_fault_vector_index" : "待写入"}</strong></article>
      </div>
      ${chunkBuilt ? chunks.map((chunk) => `
        <article>
          <span>${chunk.id}</span>
          <strong>${chunk.title}</strong>
          <p>${chunk.content}</p>
          <dl>
            <div><dt>设备</dt><dd>${chunk.metadata.equipment}</dd></div>
            <div><dt>故障</dt><dd>${chunk.metadata.fault}</dd></div>
            <div><dt>知识类型</dt><dd>${chunk.metadata.type}</dd></div>
            <div><dt>状态</dt><dd>${chunk.metadata.status}</dd></div>
            <div><dt>可信等级</dt><dd>${chunk.metadata.trust}</dd></div>
          </dl>
        </article>
      `).join("") : `<div class="vector-status"><strong>等待生成RAG Chunk</strong><p>点击“生成RAG Chunk”后，会从知识卡片拆出案例摘要、排查步骤和质量缺口三个chunk。</p></div>`}
      <div class="vector-status">
        <strong>Embedding已生成</strong>
        <p>${knowledgeCase.embedding?.model || "mock-embedding-v1"}｜维度 ${knowledgeCase.embedding?.dimension || 768}｜向量库：${knowledgeCase.embedding?.vectorIndex || "ship_fault_vector_index"}｜状态：${embeddingWritten ? "已写入" : "待写入"}</p>
      </div>
    </div>
  `;
}

function renderRagResults() {
  const knowledgeCase = state.knowledgeCase || state.cases.find((item) => item.id === "KB-BW-PUMP-001");
  const chunks = knowledgeCase?.chunks?.length ? knowledgeCase.chunks : defaultKnowledgeChunks();
  return `
    ${renderRagTrace()}
    <div class="rag-results">
      ${chunks.map((chunk) => `
        <article>
          <div><strong>${chunk.title}</strong><span>可信等级：${chunk.metadata.trust}</span></div>
          <p>命中原因：问题包含“压载泵 / 振动 / 升温”，与chunk中的设备、故障和处置过程匹配。</p>
          <p>${chunk.content}</p>
          <div class="rag-meta"><em>${chunk.metadata.status}</em><em>${chunk.metadata.type}</em><em>${chunk.id}</em><em>${chunk.metadata.status === "已发布" ? "已发布" : "未发布"}</em></div>
        </article>
      `).join("")}
      ${ragKnowledge.slice(1).map((item) => `
        <article>
          <div><strong>${item.displayTitle}</strong><span>可信等级：${item.trust}</span></div>
          <p>命中原因：${item.reason}</p>
          <div class="rag-meta"><em>${item.published}</em><em>${item.sourceType}</em></div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderRagTrace() {
  const trace = [
    ["问题理解", state.ragQuery, "设备故障排查问题"],
    ["主数据识别", "压载泵", "1号压载泵 EQ-BW-PUMP-001"],
    ["查询改写", "压载泵振动升温怎么排查", "压载泵 异常振动 温度异常升高 轴承 排查"],
    ["向量检索", "query embedding", "召回3个chunk"],
    ["关键词/元数据过滤", "压载泵、异常振动、温升", "过滤到设备故障知识"],
    ["重排序", "设备一致性+故障相似度+发布状态", "案例chunk排序第1"],
    ["Top3命中结果", "已发布chunk/SOP/规范", "可供Agent引用"]
  ];
  return `
    <div class="rag-trace">
      ${trace.map(([title, input, output], index) => `
        <article>
          <span>${index + 1}</span>
          <strong>${title}</strong>
          <p>输入：${input}</p>
          <p>输出：${output}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderAgent() {
  const hasCase = Boolean(state.knowledgeCase || state.cases.find((item) => item.id === "KB-BW-PUMP-001"));
  return `
    <section class="agent-layout focused-agent">
      <div class="panel">
        <div class="section-heading compact"><div><p class="eyebrow">RAG + Agent Chain</p><h2>RAG + Agent 调用链</h2></div></div>
        ${state.agentRan ? renderAgentChain() : `
          <div class="agent-ready">
            <strong>等待设备故障 Agent 调用可信知识</strong>
            <p>Agent 不直接“编答案”，而是先识别意图，再绑定主数据，调用已发布知识库、SOP和图谱关系，最后输出带引用依据的排查建议。</p>
          </div>
        `}
        ${hasCase && state.agentRan ? `<div class="rag-hit-strip">
          <div class="section-heading compact"><div><p class="eyebrow">RAG Hits</p><h2>RAG命中结果</h2></div></div>
          <div>
            ${ragKnowledge.map((item) => `
              <article>
                <strong>${item.displayTitle}</strong>
                <p>${item.reason}</p>
                <span>${item.trust}｜${item.published}｜${item.sourceType}</span>
              </article>
            `).join("")}
          </div>
        </div>` : ""}
        <div class="rag-search">
          <label>Agent示例问题<textarea id="agentInput">${state.agentQuestion}</textarea></label>
          <button class="primary-btn" data-run-agent type="button">${hasCase ? "运行设备故障Agent" : "等待知识入库"}</button>
        </div>
        ${hasCase
          ? (state.agentRan ? renderAgentOutput() : `<p class="hint">点击运行后展示标准设备识别、相似案例、可能原因、排查步骤、推荐SOP、需补全字段和低置信度提示。</p>`)
          : `<p class="hint">当前还没有已入库的 knowledgeCase。请先完成 AI治理工作台的“人工确认”和“生成知识卡片”。</p>`}
      </div>
      <aside class="panel drawer-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Trusted Evidence</p><h2>可信依据</h2></div></div>
        ${state.agentRan ? `
          ${evidenceBlock("引用主数据", ["1号压载泵 EQ-BW-PUMP-001"])}
          ${evidenceBlock("引用知识案例", ["压载泵异常振动与温升案例"])}
          ${evidenceBlock("引用SOP", ["压载泵检修SOP"])}
          ${evidenceBlock("引用图谱关系", [`${graphTriples.length}条：设备-现象-部件-措施-结果`])}
          ${evidenceBlock("低置信度项", ["轴承磨损，需要人工复核"])}
        ` : `<p class="hint">运行设备故障 Agent 后展示引用依据。</p>`}
      </aside>
      <section class="panel span-full">
        <div class="section-heading compact"><div><p class="eyebrow">Business Value</p><h2>业务价值指标</h2></div></div>
        ${metricsGrid([
          ["知识库有效引用率", `${state.metrics.citationRate}%`, "RAG引用"],
          ["相似案例命中率", `${state.metrics.similarRate}%`, "案例召回"],
          ["人工复核通过率", `${state.metrics.reviewRate}%`, "治理质量"],
          ["答案采纳率", `${state.metrics.adoptionRate}%`, "业务反馈"],
          ["字段补全率", `${state.metrics.fieldFillRate}%`, "数据回流"],
          ["知识缺口发现数", state.metrics.gaps, "运营待办"]
        ])}
        ${state.agentRan ? renderFeedbackPanel() : ""}
        <div class="operation-log compact-log">
          ${state.logs.slice(0, 6).map((log) => `<article class="${log.type}"><span>${log.time}</span><strong>${log.action}</strong><p>${log.detail}</p></article>`).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderAgentChain() {
  const chain = [
    ["意图识别", state.agentQuestion, "IntentClassifier", "设备故障排查", "完成"],
    ["主数据查询", "设备词=压载泵；系统=压载水系统", "MasterDataTool", "1号压载泵 EQ-BW-PUMP-001", "完成"],
    ["RAG检索", "query=压载泵 振动 升温 排查", "RAGRetriever", "命中案例chunk/SOP/规范", "完成"],
    ["图谱查询", "entity=1号压载泵；relation=现象/部件/措施", "GraphQueryTool", "返回设备-现象-部件-措施关系6条", "完成"],
    ["数据质量检查", "DWD_EQUIP_FAULT_DETAIL", "QualityCheckTool", "缺少振动值、温度值、物料编码、验收人", "需补全"],
    ["生成业务建议", "RAG证据+图谱关系+质量缺口", "AnswerComposer", "生成排查步骤、SOP和低置信提示", "完成"],
    ["反馈回流", "用户采纳/纠错/补字段", "FeedbackRecorder", "更新指标并形成运营记录", "等待反馈"]
  ];
  return `
    <div class="tool-call-chain">
      ${chain.map(([title, input, tool, output, status], index) => `
        <article>
          <span>${index + 1}</span>
          <strong>${title}</strong>
          <dl>
            <div><dt>输入</dt><dd>${input}</dd></div>
            <div><dt>调用工具</dt><dd>${tool}</dd></div>
            <div><dt>输出结果</dt><dd>${output}</dd></div>
            <div><dt>状态</dt><dd>${status}</dd></div>
          </dl>
        </article>
      `).join("")}
    </div>
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

function renderFeedbackPanel() {
  const feedbacks = [
    ["adopt", "采纳建议"],
    ["partial", "部分采纳"],
    ["wrong", "标记错误"],
    ["field", "补充字段"],
    ["gap", "形成知识缺口"]
  ];
  return `
    <div class="feedback-panel">
      <div>
        <strong>业务反馈回流</strong>
        <p>反馈会写入 localStorage 指标，用来模拟知识运营对 RAG 与 Agent 效果的持续评测。</p>
      </div>
      <div class="feedback-actions">
        ${feedbacks.map(([id, label]) => `<button class="secondary-btn" data-feedback="${id}" type="button">${label}</button>`).join("")}
      </div>
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

function mockUploadRecognition(file, fileType) {
  if (fileType.includes("Excel")) return `${file.name} 表格识别：设备=1号压载泵，系统=压载水系统，编码=EQ-BW-PUMP-001，需进入主数据校验。`;
  if (fileType.includes("PDF") || fileType.includes("Word")) return `${file.name} 文档解析：包含压载泵检修SOP、轴承检查、联轴器找正、温升复验步骤。`;
  if (fileType === "现场图片") return `${file.name} 图片识别：疑似泵轴承座温度标识和现场设备铭牌，需人工确认设备编号。`;
  if (fileType === "音频记录") return `${file.name} 语音转写：压载泵启动后抖得厉害，轴承位置温度高，建议补测振动值和温度值。`;
  if (fileType === "视频记录") return `${file.name} 视频理解：试车画面中泵体振动明显，建议关联压载泵异常振动治理流程。`;
  return `${file.name} 已模拟识别为船舶设备治理资料，等待AI字段抽取。`;
}

function addTask({ source, raw, title = "压载泵故障数据治理任务" }) {
  const task = {
    id: `TASK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
    scenario: "主场景",
    title,
    source,
    raw,
    status: "待AI处理",
    flowStatus: "待治理",
    stage: 0,
    completed: [],
    createdAt: new Date().toLocaleString("zh-CN")
  };
  state.tasks.push(task);
  state.selectedTaskId = task.id;
  state.metrics.pending += 1;
  logAction("生成治理任务", `${task.id} 来自 ${source}`, "operation");
  save();
  return task;
}

function runStep(stepId) {
  const task = mainTask();
  if (!task) return;
  if (stepId === "identify") {
    ["identify", "extract"].forEach((id) => {
      if (!task.completed.includes(id)) task.completed.push(id);
    });
  } else if (!task.completed.includes(stepId)) task.completed.push(stepId);
  task.stage = Math.max(task.stage, governanceSteps.findIndex((step) => step.id === stepId) + 1);
  const statusMap = {
    identify: ["AI已识别", "已抽取"],
    extract: ["AI已识别", "已抽取"],
    standardize: ["已标准化", "已标准化"],
    master: ["主数据待确认", "已匹配主数据"],
    quality: ["AI已处理待人工复核", "待复核"],
    confirm: ["人工复核通过", "已确认"],
    dwd: ["写入DWD标准明细", "已确认"],
    knowledge: ["已发布知识", "已生成知识"]
  };
  task.status = statusMap[stepId][0];
  task.flowStatus = statusMap[stepId][1];
  state.activeStep = stepId;

  if (stepId === "identify") state.metrics.objects = 5;
  if (stepId === "master") state.metrics.masterRate = 91;
  if (stepId === "confirm") {
    state.metrics.reviewRate = Math.max(state.metrics.reviewRate, 92);
  }
  if (stepId === "knowledge") {
    state.metrics.pending = Math.max(0, state.metrics.pending - 1);
    state.metrics.citationRate = Math.max(state.metrics.citationRate, 84);
    state.metrics.similarRate = Math.max(state.metrics.similarRate, 88);
    createKnowledgeCase();
  }

  logAction(stepResults[stepId].title, `任务状态更新为：${task.status}`, stepId === "confirm" ? "review" : "governance");
  save();
  render();
}

function applyReviewAction(action) {
  const task = mainTask();
  if (!task) return;
  const updates = {
    "confirm-master": () => {
      task.status = "主数据已匹配";
      task.flowStatus = "已匹配主数据";
      if (!task.completed.includes("master")) task.completed.push("master");
      logAction("确认主数据", "人工确认绑定1号压载泵 EQ-BW-PUMP-001", "review");
    },
    pass: () => {
      task.status = "人工复核通过";
      task.flowStatus = "已确认";
      if (!task.completed.includes("confirm")) task.completed.push("confirm");
      state.metrics.reviewRate = Math.max(state.metrics.reviewRate, 92);
      logAction("人工复核通过", "允许写入DWD标准明细", "review");
    },
    reject: () => {
      task.status = "已驳回";
      task.flowStatus = "待复核";
      task.rejectedReason = "证据不足或场景识别不可信";
      logAction("人工复核驳回", "任务已驳回，不进入知识库", "review");
    },
    supplement: () => {
      task.status = "需补充数据";
      task.flowStatus = "待复核";
      task.missingFields = ["振动测量值", "轴承温度值", "验收人"];
      logAction("要求补充字段", "缺少振动值、温度值和验收人", "review");
    },
    "fill-fields": () => {
      task.status = "AI已处理待人工复核";
      task.flowStatus = "待复核";
      task.completedFields = ["振动测量值=7.8mm/s", "轴承温度=78℃", "验收人=机装主管"];
      state.metrics.fieldFillRate = Math.min(99, state.metrics.fieldFillRate + 6);
      logAction("补充字段", "模拟补齐振动值、温度值和验收人，回到人工复核", "review");
    },
    rematch: () => {
      task.status = "主数据待确认";
      task.flowStatus = "已匹配主数据";
      task.completed = task.completed.filter((id) => !["quality", "confirm", "dwd", "knowledge"].includes(id));
      state.activeStep = "master";
      logAction("修改主数据匹配", "回到主数据候选匹配步骤", "review");
    },
    restart: () => {
      task.status = "待AI处理";
      task.flowStatus = "待治理";
      task.completed = [];
      state.activeStep = "ods";
      logAction("重新进入AI处理", "驳回任务重新进入状态机起点", "operation");
    }
  };
  updates[action]?.();
  save();
  render();
}

function aiAutoGovernTask(task, mode = "current") {
  if (!task || ["已发布知识", "已驳回"].includes(task.status)) return;
  ["identify", "extract", "standardize", "master", "quality"].forEach((step) => {
    if (!task.completed.includes(step)) task.completed.push(step);
  });
  task.status = "AI已处理待人工复核";
  task.flowStatus = "待复核";
  task.aiScore = {
    extractAccuracy: 92,
    standardHitRate: 89,
    qualityScore: 76,
    elapsed: "12秒"
  };
  task.aiTrace = [
    ["AI读入", `${task.ods?.source || task.source}：${task.raw.slice(0, 42)}...`],
    ["AI抽取", "设备=压载泵；部件=轴承；现象=震得厉害/温度高；措施=换轴承/重新找正"],
    ["AI标准化", "震得厉害→异常振动；温度高→温度异常升高；重新找正→联轴器找正"],
    ["AI质检", "缺振动测量值、轴承温度值、验收人；轴承磨损为低置信推断"]
  ];
  task.stage = Math.max(task.stage || 0, 5);
  if (mode === "current") {
    state.activeStep = "quality";
    logAction("AI一键治理", `${task.id} 已完成识别、抽取、标准化、主数据候选和质量校验`, "governance");
  }
}

function batchAiPreprocess() {
  const targets = state.tasks.filter((task) => task.status === "待AI处理").slice(0, 5);
  targets.forEach((task) => aiAutoGovernTask(task, "batch"));
  logAction("批量AI预处理", `${targets.length} 条待AI任务已推进到“AI已处理待人工复核”`, "governance");
  save();
  render();
}

function applyBatchApproval(action) {
  const groupTasks = approvalTasks();
  const selectedIds = state.selectedApprovalIds.filter((id) => groupTasks.some((task) => task.id === id));
  const targetIds = selectedIds.length ? selectedIds : groupTasks.map((task) => task.id);
  const reviewer = reviewers.find((item) => item.id === state.selectedReviewer) || reviewers[1];
  let changed = 0;

  targetIds.forEach((id) => {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.reviewer = reviewer.name;
    task.reviewRole = reviewer.role;
    task.reviewedAt = new Date().toLocaleString("zh-CN");

    if (action === "ai-precheck") {
      aiAutoGovernTask(task, "batch");
      task.reviewer = reviewer.name;
      changed += 1;
      return;
    }

    if (action === "approve") {
      task.status = "人工复核通过";
      task.flowStatus = "已确认";
      if (!task.completed.includes("confirm")) task.completed.push("confirm");
      task.reviewOpinion = `${reviewer.name} 批量复核通过，允许写入DWD标准明细。`;
      state.metrics.reviewRate = Math.max(state.metrics.reviewRate, 92);
      changed += 1;
      return;
    }

    if (action === "supplement") {
      task.status = "需补充数据";
      task.flowStatus = "待复核";
      task.missingFields = ["振动测量值", "轴承温度值", "验收人"];
      task.reviewOpinion = `${reviewer.name} 要求补充关键字段后再入库。`;
      changed += 1;
      return;
    }

    if (action === "rematch") {
      task.status = "主数据待确认";
      task.flowStatus = "已匹配主数据";
      task.completed = task.completed.filter((step) => !["quality", "confirm", "dwd", "knowledge"].includes(step));
      task.reviewOpinion = `${reviewer.name} 要求重新确认主数据候选。`;
      changed += 1;
      return;
    }

    if (action === "restart") {
      task.status = "待AI处理";
      task.flowStatus = "待治理";
      task.completed = [];
      task.reviewOpinion = `${reviewer.name} 将问题任务退回AI重新处理。`;
      changed += 1;
      return;
    }

    if (action === "close") {
      task.status = "已驳回";
      task.flowStatus = "待复核";
      task.rejectedReason = "批量关闭：资料不足或不满足入库规则";
      task.reviewOpinion = `${reviewer.name} 标记关闭，不进入知识库。`;
      changed += 1;
    }
  });

  if (targetIds[0]) state.selectedTaskId = targetIds[0];
  state.selectedApprovalIds = [];
  logAction("流程分类审批", `${reviewer.name} 执行 ${action}，处理 ${changed} 条任务`, "review");
  save();
  render();
}

function createKnowledgeCase() {
  const task = mainTask();
  if (!task) return;
  const knowledgeCase = {
    id: "KB-BW-PUMP-001",
    title: "压载泵异常振动与温升案例",
    masterData: "1号压载泵 EQ-BW-PUMP-001",
    sop: "压载泵检修SOP",
    dwdTable: "DWD_EQUIP_FAULT_DETAIL",
    knowledgeType: "设备故障案例",
    trust: "高",
    status: "已发布",
    chunks: defaultKnowledgeChunks(),
    embedding: { model: "mock-embedding-v1", status: "已生成", vectorIndex: "ship_fault_vector_index", dimension: 768 },
    chunkBuilt: false,
    embeddingWritten: false,
    triples: graphTriples,
    published: true,
    sourceTask: task.id
  };
  state.knowledgeCase = knowledgeCase;
  task.knowledgeCaseId = knowledgeCase.id;
  if (!state.cases.some((item) => item.id === knowledgeCase.id)) state.cases.push(knowledgeCase);
}

function defaultKnowledgeChunks() {
  return [
    {
      id: "CHUNK-BW-001",
      title: "压载泵异常振动与温升案例摘要",
      content: "压载泵启动后出现异常振动和轴承位置温度异常升高，处理措施为更换泵轴承并进行联轴器找正，试运行正常。",
      metadata: { equipment: "1号压载泵", fault: "异常振动+温度异常升高", type: "历史维修案例", status: "已发布", trust: "高" }
    },
    {
      id: "CHUNK-BW-002",
      title: "压载泵振动温升排查步骤",
      content: "先补充振动测量值和轴承温度值，再检查润滑、地脚、联轴器找正和轴承状态，按压载泵检修SOP复验。",
      metadata: { equipment: "1号压载泵", fault: "异常振动", type: "SOP片段", status: "已发布", trust: "高" }
    },
    {
      id: "CHUNK-BW-003",
      title: "数据质量缺口与低置信提示",
      content: "缺少设备型号、振动测量值、轴承温度值、物料编码、验收人。轴承磨损属于推断，需要人工复核。",
      metadata: { equipment: "1号压载泵", fault: "数据质量缺口", type: "治理规则", status: "已发布", trust: "中" }
    }
  ];
}

function hasKnowledgeCase() {
  return Boolean(state.knowledgeCase || state.cases.find((item) => item.id === "KB-BW-PUMP-001"));
}

function applyFeedback(type) {
  const feedbackMap = {
    adopt: {
      action: "采纳建议",
      detail: "答案采纳率、知识库有效引用率和相似案例命中率提升",
      update: () => {
        state.metrics.adoptionRate = Math.min(99, Math.max(state.metrics.adoptionRate, 82) + 3);
        state.metrics.citationRate = Math.min(99, Math.max(state.metrics.citationRate, 86) + 2);
        state.metrics.similarRate = Math.min(99, Math.max(state.metrics.similarRate, 90) + 2);
      }
    },
    partial: {
      action: "部分采纳",
      detail: "答案采纳率小幅提升，并产生后续人工复核记录",
      update: () => {
        state.metrics.adoptionRate = Math.min(99, Math.max(state.metrics.adoptionRate, 78) + 1);
        state.metrics.reviewRate = Math.min(99, Math.max(state.metrics.reviewRate, 92) + 1);
      }
    },
    wrong: {
      action: "标记错误",
      detail: "降低有效引用率，并形成一条知识运营待办",
      update: () => {
        state.metrics.citationRate = Math.max(0, state.metrics.citationRate - 3);
        state.metrics.gaps += 1;
      }
    },
    field: {
      action: "补充字段",
      detail: "补充振动值或温度值后，字段补全率提升",
      update: () => {
        state.metrics.fieldFillRate = Math.min(99, Math.max(state.metrics.fieldFillRate, 73) + 5);
      }
    },
    gap: {
      action: "形成知识缺口",
      detail: "新增一个待补充知识缺口，用于后续SOP或案例治理",
      update: () => {
        state.metrics.gaps += 1;
      }
    }
  };
  const feedback = feedbackMap[type];
  if (!feedback) return;
  feedback.update();
  logAction(feedback.action, feedback.detail, "review");
  save();
  render();
}

document.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page], [data-page-link]");
  if (pageButton) {
    state.dashboardMetric = "";
    switchPage(pageButton.dataset.page || pageButton.dataset.pageLink);
    return;
  }

  const metricButton = event.target.closest("[data-metric]");
  if (metricButton) {
    state.dashboardMetric = metricButton.dataset.metric;
    render();
    return;
  }

  if (event.target.closest("[data-close-metric]")) {
    state.dashboardMetric = "";
    render();
    return;
  }

  const approvalFilter = event.target.closest("[data-approval-filter]");
  if (approvalFilter) {
    state.approvalFilter = approvalFilter.dataset.approvalFilter;
    state.selectedApprovalIds = [];
    save();
    render();
    return;
  }

  if (event.target.closest("[data-approval-select-all]")) {
    const ids = approvalTasks().map((task) => task.id);
    const allSelected = ids.length > 0 && ids.every((id) => state.selectedApprovalIds.includes(id));
    state.selectedApprovalIds = allSelected ? [] : ids;
    save();
    render();
    return;
  }

  const batchApproval = event.target.closest("[data-batch-approval]");
  if (batchApproval) {
    applyBatchApproval(batchApproval.dataset.batchApproval);
    return;
  }

  const stateAction = event.target.closest("[data-state-action]");
  if (stateAction) {
    const [type, value] = stateAction.dataset.stateAction.split(":");
    if (type === "run") runStep(value);
    if (type === "review") applyReviewAction(value);
    if (type === "page") switchPage(value);
    return;
  }

  if (event.target.closest("[data-open-rules]")) {
    state.showRules = true;
    render();
    return;
  }

  if (event.target.closest("[data-close-rules]")) {
    state.showRules = false;
    render();
    return;
  }

  if (event.target.closest("[data-ai-auto-current]")) {
    aiAutoGovernTask(mainTask(), "current");
    save();
    render();
    return;
  }

  if (event.target.closest("[data-ai-batch]")) {
    batchAiPreprocess();
    return;
  }

  const assetButton = event.target.closest("[data-load-asset]");
  if (assetButton) {
    const asset = ingestSampleAssets[Number(assetButton.dataset.loadAsset)];
    if (asset) {
      state.selectedScenario = "equipment";
      state.draftRaw = asset[2];
      const task = createMainTask();
      task.title = `${asset[0]}识别治理任务`;
      task.source = `样例库 / ${asset[0]}`;
      task.raw = asset[2];
      task.ods.originalText = asset[2];
      task.ods.source = task.source;
      task.ods.ingestMode = "样例库多模态识别";
      task.ods.fileName = asset[1];
      state.tasks.push(task);
      state.selectedTaskId = task.id;
      state.activeStep = "ods";
      state.ingestNotice = `已新增：${task.title}`;
      logAction("样例库识别", `${asset[1]} 已模拟解析并生成治理任务`, "ingest");
      save();
      render();
    }
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
    state.selectedTaskId = openTask.dataset.openTask;
    state.activeStep = "identify";
    save();
    switchPage("workbench");
    return;
  }

  const selectTask = event.target.closest("[data-select-task]");
  if (selectTask) {
    state.selectedTaskId = selectTask.dataset.selectTask;
    state.activeStep = "identify";
    save();
    render();
    return;
  }

  if (event.target.closest("[data-load-sample]")) {
    const sample = scenarioSamples[state.selectedScenario] || scenarioSamples.equipment;
    state.draftRaw = sample.raw;
    save();
    render();
    return;
  }

  if (event.target.closest("[data-generate-task]")) {
    state.selectedScenario = document.querySelector("#scenarioSelect")?.value || state.selectedScenario;
    const sample = scenarioSamples[state.selectedScenario] || scenarioSamples.equipment;
    const raw = document.querySelector("#sampleRaw")?.value.trim() || sample.raw;
    state.draftRaw = raw;
    const task = createMainTask();
    task.raw = raw;
    task.status = "待AI处理";
    task.flowStatus = "待治理";
    state.tasks.push(task);
    state.selectedTaskId = task.id;
    state.activeStep = "identify";
    state.metrics.pending += 1;
    logAction("生成治理任务", `${task.id} 已写入 localStorage，状态：待AI处理`, "operation");
    state.ingestNotice = `已新增：${task.title}`;
    save();
    switchPage("workbench");
    return;
  }

  if (event.target.closest("[data-run-rag]")) {
    if (!hasKnowledgeCase()) {
      logAction("RAG检索拦截", "knowledgeCase 不存在，必须先完成治理入库", "review");
      save();
      render();
      return;
    }
    if (!state.knowledgeCase?.embeddingWritten) {
      logAction("RAG检索拦截", "向量库尚未写入，请先生成RAG Chunk和Embedding", "review");
      save();
      render();
      return;
    }
    state.ragQuery = document.querySelector("#ragInput")?.value || state.ragQuery;
    state.ragRan = true;
    state.metrics.citationRate = Math.max(state.metrics.citationRate, 86);
    state.metrics.similarRate = Math.max(state.metrics.similarRate, 90);
    logAction("RAG检索", `问题：${state.ragQuery}`, "rag");
    save();
    render();
    return;
  }

  if (event.target.closest("[data-load-rag-samples]")) {
    state.ragDocs = ragSampleDocs.map((doc) => ({
      ...doc,
      status: "已解析/已清洗/已结构识别"
    }));
    logAction("加载RAG样例文档", "压载泵检修SOP、异常振动历史案例、泵类振动排查规范已进入建库流程", "rag");
    save();
    render();
    return;
  }

  if (event.target.closest("[data-build-chunk]")) {
    if (state.knowledgeCase) {
      state.knowledgeCase.chunkBuilt = true;
      state.knowledgeCase.chunks = state.knowledgeCase.chunks?.length ? state.knowledgeCase.chunks : defaultKnowledgeChunks();
      logAction("生成RAG Chunk", "从知识卡片拆分为案例摘要、排查步骤、质量缺口3个chunk", "rag");
      save();
      render();
    }
    return;
  }

  if (event.target.closest("[data-write-vector]")) {
    if (state.knowledgeCase) {
      state.knowledgeCase.chunkBuilt = true;
      state.knowledgeCase.embeddingWritten = true;
      state.knowledgeCase.embedding = { model: "mock-embedding-v1", status: "已生成", vectorIndex: "ship_fault_vector_index", dimension: 768 };
      logAction("写入向量库", "chunk embedding 已写入 ship_fault_vector_index", "rag");
      save();
      render();
    }
    return;
  }

  if (event.target.closest("[data-run-agent]")) {
    if (!hasKnowledgeCase()) {
      logAction("Agent调用拦截", "没有已发布知识，设备故障 Agent 暂不生成业务建议", "review");
      save();
      render();
      return;
    }
    state.agentQuestion = document.querySelector("#agentInput")?.value || state.agentQuestion;
    state.agentRan = true;
    state.ragRan = true;
    state.metrics.citationRate = Math.max(state.metrics.citationRate, 88);
    state.metrics.similarRate = Math.max(state.metrics.similarRate, 90);
    state.metrics.adoptionRate = Math.max(state.metrics.adoptionRate, 82);
    state.metrics.fieldFillRate = Math.max(state.metrics.fieldFillRate, 73);
    logAction("设备故障Agent", "调用主数据、RAG命中、图谱关系和数据质量检查，生成可信排查建议", "agent");
    save();
    render();
    return;
  }

  const feedbackButton = event.target.closest("[data-feedback]");
  if (feedbackButton) {
    applyFeedback(feedbackButton.dataset.feedback);
    return;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("#reviewerSelect")) {
    state.selectedReviewer = event.target.value;
    save();
    render();
    return;
  }

  if (event.target.matches("[data-approval-check]")) {
    const id = event.target.dataset.approvalCheck;
    state.selectedApprovalIds = event.target.checked
      ? [...new Set([...state.selectedApprovalIds, id])]
      : state.selectedApprovalIds.filter((item) => item !== id);
    save();
    render();
    return;
  }

  if (event.target.matches("#scenarioSelect")) {
    state.selectedScenario = event.target.value;
    state.draftRaw = "";
    save();
    render();
    return;
  }

  if (event.target.matches("#ragUpload")) {
    const files = [...event.target.files];
    files.forEach((file, index) => {
      state.ragDocs.push({
        id: `DOC-UP-${Date.now().toString().slice(-5)}-${index + 1}`,
        title: file.name,
        type: inferFileType(file),
        status: "已解析/已清洗/已结构识别"
      });
    });
    logAction("上传模拟文档", `${files.length} 个文档进入RAG建库流程`, "rag");
    event.target.value = "";
    save();
    render();
    return;
  }

  if (event.target.matches("#ingestUpload")) {
    const files = [...event.target.files];
    files.forEach((file) => {
      const fileType = inferFileType(file);
      const task = createMainTask();
      task.title = `${fileType}模拟识别治理任务`;
      task.source = `本地上传 / ${fileType}`;
      task.raw = mockUploadRecognition(file, fileType);
      task.ods.originalText = task.raw;
      task.ods.source = task.source;
      task.ods.ingestMode = "本地文件模拟识别";
      task.ods.fileName = file.name;
      state.tasks.push(task);
      state.selectedTaskId = task.id;
    });
    logAction("上传识别", `${files.length} 个文件已按类型模拟识别并生成治理任务`, "ingest");
    state.ingestNotice = `已新增 ${files.length} 条上传识别任务`;
    event.target.value = "";
    save();
    render();
    return;
  }

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

seedDemoBacklog();
normalizeDemoTaskStatuses();
render();
