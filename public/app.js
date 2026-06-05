const storageKey = "shipGovernance.lab.v1";

const sourceConfigs = [
  { system: "EAM设备管理系统", type: "维修工单", method: "API同步", status: "正常" },
  { system: "QMS质量系统", type: "检测报告/不合格记录", method: "数据库同步", status: "正常" },
  { system: "MES生产系统", type: "现场施工记录", method: "数据库同步", status: "延迟" },
  { system: "PLM文档库", type: "图纸/SOP/技术文件", method: "文档解析", status: "待配置" },
  { system: "Excel历史台账", type: "历史故障记录", method: "文件上传", status: "正常" },
  { system: "手工录入", type: "现场补充记录", method: "表单录入", status: "正常" }
];

const layers = ["ODS原始数据层", "AI治理任务池", "DWD标准明细层", "知识卡片库"];
const statuses = ["已接入", "待AI处理", "AI处理中", "待人工复核", "有问题待补充", "已通过", "可生成知识卡片"];
const issueTypes = ["缺设备编码", "缺温度值", "缺振动值", "缺关键字段", "主数据不确定", "描述过于模糊", "术语不标准"];
const structures = ["结构化数据", "半结构化数据", "非结构化数据"];
const systemFields = ["equipment_name", "equipment_code", "system", "component", "fault_symptom", "repair_action", "repair_result", "temperature_value", "vibration_value", "ignore"];

const flowNodes = [
  ["企业数据源", "EAM、QMS、MES、PLM、Excel和手工录入产生业务数据。"],
  ["数据接入层", "通过API、数据库同步、文件上传、文档解析和表单录入模拟接入。"],
  ["ODS原始数据层", "保留原始文本、来源单号和接入时间，便于追溯。"],
  ["AI治理任务池", "按数据结构选择规则、模型或人机协同策略。"],
  ["AI治理流程", "执行结构识别、字段抽取、术语归一、主数据匹配和质量检查。"],
  ["人工复核", "确认AI不确定字段，补充缺失值，修正标准数据。"],
  ["DWD标准明细层", "沉淀结构化、标准化、可分析的明细数据。"],
  ["知识卡片库", "复核后的典型案例沉淀为可复用知识。"],
  ["RAG向量库", "后续再做知识切块、向量化和检索。"],
  ["Agent应用层", "后续Agent基于可信知识引用生成业务建议。"]
];

const seedRecords = [
  rec("REC-001", "压载泵振动温升完整记录", "压载泵启动以后震得厉害，轴承位置温度也高，后来换了轴承，重新找正后正常。", 0, "EAM-WO-2026-0001", "2026-06-05 08:12:21", "待AI处理"),
  rec("REC-002", "1号泵抖动对中记录", "1号泵运行时抖动明显，重新对中后试车正常。", 4, "XLS-FAULT-2019-0148", "2026-06-05 08:18:04", "待人工复核"),
  rec("REC-003", "消防泵地脚松动记录", "消防泵启动后声音大，检查发现地脚螺栓松动，紧固后恢复正常。", 2, "MES-SITE-2026-0322", "2026-06-05 08:25:36", "已接入"),
  rec("REC-004", "海水冷却泵润滑不足记录", "海水冷却泵轴承发热，润滑脂不足，补充润滑后温度下降。", 1, "QMS-NCR-2026-0086", "2026-06-05 08:31:52", "待AI处理"),
  rec("REC-005", "泵异常低质量记录", "泵运行异常，后来处理好了。", 5, "MANUAL-2026-0007", "2026-06-05 08:43:10", "有问题待补充"),
  rec("REC-006", "2号压载泵振动偏大", "2号压载泵试车时振动偏大，现场说泵抖得厉害，未记录振动值。", 0, "EAM-WO-2026-0006", "2026-06-05 09:02:44", "待AI处理"),
  rec("REC-007", "压载泵轴承温升", "压载泵轴承温度升高到78℃，更换润滑脂后复测下降。", 0, "EAM-WO-2026-0007", "2026-06-05 09:06:11", "已通过"),
  rec("REC-008", "消防泵地脚螺栓复紧", "消防泵运行异响，地脚螺栓有松动，复紧后试车正常。", 2, "MES-SITE-2026-0340", "2026-06-05 09:09:34", "待AI处理"),
  rec("REC-009", "海水冷却泵轴承发热", "海水冷却泵发热，现场补充润滑脂后温度降下来，缺验收人。", 1, "QMS-NCR-2026-0091", "2026-06-05 09:15:05", "待人工复核"),
  rec("REC-010", "阀门泄漏维修", "压载水阀门法兰处渗漏，更换密封垫后不漏了。", 0, "EAM-WO-2026-0010", "2026-06-05 09:18:27", "待AI处理"),
  rec("REC-011", "阀门关不严", "消防水阀门关不严，有轻微泄漏，处理后好了。", 5, "MANUAL-2026-0011", "2026-06-05 09:23:44", "有问题待补充"),
  rec("REC-012", "管路安装偏差", "压载水管路安装偏差约30mm，和电缆托架干涉，调整管路后待复核。", 2, "MES-SITE-2026-0361", "2026-06-05 09:28:52", "待人工复核"),
  rec("REC-013", "管子打架现场记录", "现场说管子和支架打架，改了一下位置，没写图纸版本。", 5, "MANUAL-2026-0013", "2026-06-05 09:35:09", "有问题待补充"),
  rec("REC-014", "焊缝RT不合格", "B12分段环缝拍片没过，返修后等复检。", 1, "QMS-NDT-2026-014", "2026-06-05 09:41:16", "待AI处理"),
  rec("REC-015", "焊缝UT回波异常", "A08分段焊缝UT有回波异常，疑似未熔合，返修方案待确认。", 1, "QMS-NDT-2026-015", "2026-06-05 09:48:30", "待人工复核"),
  rec("REC-016", "电机过热", "压载泵电机运行后过热，清理通风口后温度下降。", 0, "EAM-WO-2026-0016", "2026-06-05 09:53:01", "待AI处理"),
  rec("REC-017", "电机温度高缺测量值", "电机温度高，现场说烫手，后来降负荷运行。", 5, "MANUAL-2026-0017", "2026-06-05 09:59:43", "有问题待补充"),
  rec("REC-018", "主数据缺失泵记录", "某泵运行声音异常，换了个件后好了。", 4, "XLS-FAULT-2018-018", "2026-06-05 10:04:20", "有问题待补充"),
  rec("REC-019", "压载泵联轴器找正", "1号压载泵启动振动，联轴器重新找正，试车正常。", 0, "EAM-WO-2026-0019", "2026-06-05 10:11:08", "可生成知识卡片"),
  rec("REC-020", "压载泵振动值完整", "1号压载泵振动值7.8mm/s，轴承温度76℃，更换泵轴承后试车正常。", 0, "EAM-WO-2026-0020", "2026-06-05 10:15:44", "已通过"),
  rec("REC-021", "SOP文档解析样例", "压载泵检修SOP包含轴承检查、联轴器找正、温升复验步骤。", 3, "PLM-SOP-BW-2026-001", "2026-06-05 10:20:19", "已接入"),
  rec("REC-022", "图纸版本缺失记录", "管路按旧图施工导致安装偏差，现场要求按新版图纸整改。", 3, "PLM-DWG-2026-022", "2026-06-05 10:27:36", "待人工复核"),
  rec("REC-023", "阀门泄漏缺设备编码", "阀门漏水，换了密封，未写阀门编号。", 4, "XLS-FAULT-2017-023", "2026-06-05 10:31:04", "待AI处理"),
  rec("REC-024", "消防泵噪声", "消防泵启动声音大，检查轴承间隙偏大，调整后恢复正常。", 0, "EAM-WO-2026-0024", "2026-06-05 10:35:40", "已通过"),
  rec("REC-025", "海水冷却泵流量异常", "海水冷却泵流量偏低，滤网堵塞，清理滤网后正常。", 2, "MES-SITE-2026-0405", "2026-06-05 10:39:55", "待AI处理"),
  rec("REC-026", "焊缝RT/UT双不合格", "C03分段焊缝RT片子不合格，UT也有缺陷回波，返修后复检合格。", 1, "QMS-NDT-2026-026", "2026-06-05 10:45:18", "可生成知识卡片"),
  rec("REC-027", "描述过于模糊", "设备不好使，师傅处理了一下，现在差不多。", 5, "MANUAL-2026-0027", "2026-06-05 10:51:47", "有问题待补充"),
  rec("REC-028", "术语不标准泵记录", "泵抖得厉害，轴承那块有点烫，重新对了一下中心。", 5, "MANUAL-2026-0028", "2026-06-05 10:57:02", "待AI处理"),
  rec("REC-029", "主数据不确定历史台账", "老台账写泵振动异常，没写船号和设备编码。", 4, "XLS-FAULT-2016-029", "2026-06-05 11:02:39", "待人工复核"),
  rec("REC-030", "电机过热完整记录", "压载泵电机温度82℃，检查冷却风道堵塞，清理后验收正常。", 0, "EAM-WO-2026-0030", "2026-06-05 11:08:05", "已通过")
];

function rec(id, title, raw, sourceIndex, sourceId, ingestTime, initialStatus) {
  const source = sourceConfigs[sourceIndex];
  return {
    id,
    title,
    raw,
    sourceSystem: source.system,
    sourceType: source.type,
    sourceId,
    ingestMethod: source.method,
    ingestTime,
    initialStatus,
    rowData: null
  };
}

const defaultFilters = {
  sourceSystem: "全部",
  currentStatus: "全部",
  issueType: "全部",
  currentLayer: "全部",
  needsReview: "全部",
  confidence: "全部",
  dataStructure: "全部"
};

const defaultState = {
  page: "dashboard",
  selectedRecordId: "REC-001",
  drawerOpen: false,
  helpPanel: "",
  filters: defaultFilters,
  taskStates: {},
  userRecords: [],
  csvPreview: null,
  uploadResult: null,
  logs: []
};

let state = loadState();
let aiTimer = null;

const pageContent = document.querySelector("#pageContent");
const pageTitle = document.querySelector("#pageTitle");
const stateStatus = document.querySelector("#stateStatus");
const nav = document.querySelector("#sideNav");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    return {
      ...defaultState,
      ...saved,
      drawerOpen: false,
      helpPanel: "",
      filters: { ...defaultFilters, ...(saved.filters || {}) },
      taskStates: { ...defaultTaskStates([...seedRecords, ...(saved.userRecords || [])]), ...(saved.taskStates || {}) }
    };
  } catch {
    return { ...defaultState, filters: { ...defaultFilters }, taskStates: defaultTaskStates(seedRecords) };
  }
}

function allRecords() {
  return [...seedRecords, ...(state.userRecords || [])];
}

function defaultTaskStates(recordList) {
  return Object.fromEntries(recordList.map((record) => {
    const analysis = analyzeRecord(record);
    return [record.id, {
      currentStatus: record.initialStatus,
      currentLayer: layerByStatus(record.initialStatus),
      completedSteps: ["已通过", "可生成知识卡片"].includes(record.initialStatus)
        ? ["structure", "rule", "model", "quality", "route"]
        : [],
      currentStep: "structure",
      aiRunning: false,
      ragReady: record.initialStatus === "可生成知识卡片",
      confidence: analysis.confidence,
      humanCorrections: {},
      uploadMapping: record.uploadMapping || null,
      history: [
        { time: record.ingestTime, status: "已接入", detail: "模拟接入到ODS原始数据层" },
        ...(record.initialStatus !== "已接入" ? [{ time: record.ingestTime, status: record.initialStatus, detail: `进入${layerByStatus(record.initialStatus)}` }] : [])
      ]
    }];
  }));
}

function layerByStatus(status) {
  if (status === "已接入") return "ODS原始数据层";
  if (status === "已通过") return "DWD标准明细层";
  if (status === "可生成知识卡片") return "知识卡片库";
  return "AI治理任务池";
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  const selected = taskView(selectedRecord());
  stateStatus.textContent = `已保存：${selected.id}｜${selected.dataStructure}｜${selected.currentStatus}`;
}

function selectedRecord() {
  return allRecords().find((record) => record.id === state.selectedRecordId) || allRecords()[0];
}

function taskState(recordId) {
  if (!state.taskStates[recordId]) state.taskStates[recordId] = defaultTaskStates(allRecords())[recordId];
  return state.taskStates[recordId];
}

function taskView(record) {
  const analysis = analyzeRecord(record);
  const runtime = taskState(record.id);
  const corrected = applyHumanCorrections(analysis.finalData, runtime.humanCorrections || {});
  const qualityAfterHuman = qualityCheck(corrected, analysis);
  return {
    ...record,
    ...analysis,
    finalData: corrected,
    qualityAfterHuman,
    currentStatus: runtime.currentStatus,
    currentLayer: runtime.currentLayer,
    confidence: runtime.confidence ?? analysis.confidence,
    completedSteps: runtime.completedSteps || [],
    currentStep: runtime.currentStep || "structure",
    aiRunning: runtime.aiRunning || false,
    ragReady: runtime.ragReady || false,
    humanCorrections: runtime.humanCorrections || {},
    history: runtime.history || [],
    needsReview: ["待人工复核", "有问题待补充"].includes(runtime.currentStatus) || analysis.needsReview || qualityAfterHuman.missing.length > 0
  };
}

function dataStructure(record) {
  if (record.sourceSystem === "Excel历史台账" || record.sourceSystem === "CSV上传实验") return "半结构化数据";
  if (["手工录入", "PLM文档库"].includes(record.sourceSystem)) return "非结构化数据";
  return "结构化数据";
}

function strategyFor(structure) {
  if (structure === "结构化数据") {
    return {
      name: "规则解析 Rule-based",
      steps: "字段映射、必填校验、格式校验、枚举值校验、主数据匹配",
      reason: "来源系统字段较完整，优先使用确定性规则，减少模型不稳定性。"
    };
  }
  if (structure === "半结构化数据") {
    return {
      name: "规则 + 模型",
      steps: "表头识别、字段映射、模型辅助判断、人工确认",
      reason: "Excel/CSV表头和字段名不统一，先用规则映射，歧义字段由模型占位能力辅助判断。"
    };
  }
  return {
    name: "模型抽取 + 规则校验 + 人工复核",
    steps: "业务对象识别、字段抽取、术语归一化、缺失字段识别",
    reason: "自然语言描述没有固定字段，需要模型抽取候选，再用规则校验并交给人工确认。"
  };
}

function analyzeRecord(record) {
  const structure = dataStructure(record);
  const strategy = strategyFor(structure);
  const ruleResult = ruleParse(record);
  const modelResult = mockModelExtract(record, ruleResult);
  const merged = mergeResults(ruleResult, modelResult);
  const candidates = masterCandidates(merged.equipment_name || "未明确设备", merged.system || "未知系统");
  const standard = {
    ...merged,
    fault_symptom: standardSymptom(merged.fault_symptom || ""),
    repair_action: standardAction(merged.repair_action || ""),
    repair_result: standardResult(merged.repair_result || "")
  };
  const issueList = detectIssues(record, standard, candidates[0].score);
  const quality = qualityCheck(standard, { issueList });
  const confidence = Math.max(38, Math.min(96, 94 - issueList.length * 8 - (issueList.includes("描述过于模糊") ? 16 : 0) - (candidates[0].score < 70 ? 8 : 0)));
  return {
    dataStructure: structure,
    strategy,
    ruleResult,
    modelResult,
    candidates,
    issueList,
    confidence,
    finalData: {
      ...standard,
      equipment_code: standard.equipment_code || (candidates[0].score >= 85 ? candidates[0].code : "")
    },
    quality,
    needsReview: confidence < 85 || issueList.length > 0 || quality.missing.length > 0,
    effect: effectSummary(ruleResult, modelResult, {}, quality)
  };
}

function ruleParse(record) {
  const fromRow = normalizeRowData(record.rowData || {});
  const raw = record.raw || "";
  const equipment = fromRow.equipment_name || detectDevice(raw);
  const symptom = fromRow.fault_symptom || detectSymptoms(raw).join("；");
  const action = fromRow.repair_action || detectActions(raw).join("；");
  return compactObject({
    equipment_name: equipment !== "未明确设备" ? equipment : "",
    equipment_code: fromRow.equipment_code || (raw.match(/EQ-[A-Z-0-9]+|PIPE-[A-Z-0-9]+|WELD-[A-Z-0-9]+/)?.[0] || ""),
    system: fromRow.system || detectSystem(equipment, raw),
    component: fromRow.component || detectComponent(raw),
    fault_symptom: symptom,
    repair_action: action,
    repair_result: fromRow.repair_result || detectResult(raw),
    temperature_value: fromRow.temperature_value || (raw.match(/\d+℃|[0-9]+度/)?.[0] || ""),
    vibration_value: fromRow.vibration_value || (raw.match(/[0-9]+\.?[0-9]*mm\/s/)?.[0] || "")
  });
}

function mockModelExtract(record, ruleResult) {
  const raw = record.raw || "";
  return compactObject({
    equipment_name: ruleResult.equipment_name || detectDevice(raw),
    component: ruleResult.component || detectComponent(raw),
    fault_symptom: ruleResult.fault_symptom || detectSymptoms(raw).join("；"),
    repair_action: ruleResult.repair_action || detectActions(raw).join("；"),
    repair_result: ruleResult.repair_result || detectResult(raw),
    model_placeholder: "MockModelPlaceholder：后续可替换为真实大模型抽取接口"
  });
}

function mergeResults(ruleResult, modelResult) {
  return { ...modelResult, ...ruleResult };
}

function normalizeRowData(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined && value !== ""));
}

function compactObject(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function detectDevice(raw) {
  if (raw.includes("2号压载泵")) return "2号压载泵";
  if (raw.includes("压载泵") || raw.includes("1号泵")) return "1号压载泵";
  if (raw.includes("消防泵")) return "消防泵";
  if (raw.includes("海水冷却泵")) return "海水冷却泵";
  if (raw.includes("阀门")) return "阀门";
  if (raw.includes("管路") || raw.includes("管子")) return "压载水管路";
  if (raw.includes("焊缝") || raw.includes("分段")) return "船体焊缝";
  if (raw.includes("电机")) return "压载泵电机";
  if (raw.includes("泵")) return "泵类设备";
  return "未明确设备";
}

function detectSystem(device, raw) {
  if (device.includes("压载") || raw.includes("压载水")) return "压载水系统";
  if (device.includes("消防")) return "消防水系统";
  if (device.includes("海水冷却")) return "海水冷却系统";
  if (device.includes("焊缝")) return "船体结构";
  if (device.includes("阀门")) return raw.includes("消防") ? "消防水系统" : "压载水系统";
  return "";
}

function detectComponent(raw) {
  if (raw.includes("轴承")) return "轴承";
  if (raw.includes("地脚螺栓")) return "地脚螺栓";
  if (raw.includes("联轴器") || raw.includes("对中") || raw.includes("找正") || raw.includes("中心")) return "联轴器";
  if (raw.includes("密封") || raw.includes("法兰")) return "密封/法兰";
  if (raw.includes("滤网")) return "滤网";
  if (raw.includes("电机")) return "电机";
  if (raw.includes("焊缝")) return "焊缝";
  if (raw.includes("管路") || raw.includes("管子")) return "管路";
  return "";
}

function detectSymptoms(raw) {
  const items = [];
  if (raw.match(/震|抖|振动/)) items.push(raw.includes("抖得") ? "泵抖得厉害" : "异常振动");
  if (raw.match(/温度|发热|过热|烫/)) items.push(raw.includes("烫") ? "有点烫" : "温度升高");
  if (raw.match(/声音大|异响|噪声/)) items.push("异常噪声");
  if (raw.match(/泄漏|渗漏|漏水|不漏/)) items.push("泄漏");
  if (raw.match(/偏差|干涉|打架/)) items.push(raw.includes("打架") ? "管子打架" : "安装偏差/干涉");
  if (raw.match(/RT|UT|拍片|探伤|回波/)) items.push("RT/UT探伤不合格");
  if (raw.match(/异常|不好使|关不严/)) items.push("运行异常");
  if (raw.match(/流量偏低/)) items.push("流量偏低");
  return [...new Set(items)];
}

function detectActions(raw) {
  const items = [];
  if (raw.match(/换.*轴承|更换泵轴承/)) items.push("换轴承");
  if (raw.match(/找正|对中|中心|调了一下/)) items.push("重新找正/对中");
  if (raw.match(/紧固|复紧/)) items.push("紧固地脚螺栓");
  if (raw.match(/润滑脂|补充润滑/)) items.push("补充润滑脂");
  if (raw.match(/更换密封|密封垫/)) items.push("更换密封垫");
  if (raw.match(/调整管路|改.*位置|整改/)) items.push("调整管路");
  if (raw.match(/返修|复检/)) items.push("焊缝返修复检");
  if (raw.match(/清理|滤网|通风口|风道/)) items.push("清理堵塞部位");
  if (raw.match(/处理好了|处理了一下/)) items.push("维修处理");
  return [...new Set(items)];
}

function detectResult(raw) {
  if (raw.match(/试车正常|验收正常|恢复正常|后正常|复检合格|好了/)) return "试运行正常";
  if (raw.match(/温度下降|降下来/)) return "温度下降";
  if (raw.match(/待复核|待确认/)) return "待复核";
  if (raw.match(/差不多/)) return "结果描述模糊";
  return "";
}

function standardSymptom(value) {
  if (!value) return "";
  return value.split("；").map((item) => {
    if (item.match(/抖|振动|震/)) return "异常振动";
    if (item.match(/温度|发热|烫/)) return "温度异常升高";
    if (item.match(/噪声|声音/)) return "异常噪声";
    if (item.match(/泄漏|漏/)) return "泄漏";
    if (item.match(/干涉|偏差|打架/)) return "管路安装干涉/安装偏差";
    if (item.match(/探伤|RT|UT|拍片/)) return "RT/UT探伤不合格";
    if (item.match(/流量/)) return "流量异常";
    return "运行异常";
  }).filter(Boolean).join("；");
}

function standardAction(value) {
  if (!value) return "";
  return value.split("；").map((item) => {
    if (item.includes("轴承")) return "更换泵轴承";
    if (item.match(/找正|对中|中心/)) return "联轴器找正";
    if (item.includes("紧固")) return "紧固地脚螺栓";
    if (item.includes("润滑")) return "补充润滑脂";
    if (item.includes("密封")) return "更换密封垫";
    if (item.includes("管路")) return "调整管路安装位置";
    if (item.includes("返修")) return "焊缝返修并复检";
    if (item.includes("清理")) return "清理堵塞部位";
    return "维修处理";
  }).filter(Boolean).join("；");
}

function standardResult(value) {
  if (!value) return "";
  if (value.match(/正常|恢复|好了|合格/)) return "试运行正常";
  if (value.match(/下降|降低/)) return "温度下降";
  return value;
}

function masterCandidates(device, system) {
  const map = {
    "1号压载泵": [["1号压载泵", "EQ-BW-PUMP-001", 91], ["2号压载泵", "EQ-BW-PUMP-002", 72], ["冷却水泵", "EQ-CW-PUMP-003", 42]],
    "2号压载泵": [["2号压载泵", "EQ-BW-PUMP-002", 90], ["1号压载泵", "EQ-BW-PUMP-001", 68], ["舱底水泵", "EQ-BILGE-PUMP-002", 38]],
    "消防泵": [["消防泵", "EQ-FS-PUMP-002", 89], ["消防增压泵", "EQ-FS-PUMP-003", 63]],
    "海水冷却泵": [["海水冷却泵", "EQ-SW-PUMP-004", 90], ["冷却水泵", "EQ-CW-PUMP-003", 66]],
    "压载泵电机": [["1号压载泵电机", "EQ-BW-MOTOR-001", 86], ["2号压载泵电机", "EQ-BW-MOTOR-002", 71]],
    "阀门": [["压载水阀门", "EQ-BW-VALVE-011", 76], ["消防水阀门", "EQ-FS-VALVE-008", 62]],
    "压载水管路": [["压载水管路", "PIPE-BW-001", 84], ["消防管路", "PIPE-FS-008", 38]],
    "船体焊缝": [["船体分段焊缝", "WELD-HULL-SEG", 88], ["管系焊缝", "WELD-PIPE-GEN", 46]],
    "泵类设备": [["1号压载泵", "EQ-BW-PUMP-001", 51], ["消防泵", "EQ-FS-PUMP-002", 46], ["海水冷却泵", "EQ-SW-PUMP-004", 44]],
    "未明确设备": [["未匹配", "UNKNOWN", 20]]
  };
  return (map[device] || map["未明确设备"]).map(([name, code, score]) => ({
    name,
    code,
    system,
    score,
    reason: score >= 85 ? "设备名称、系统和故障现象匹配度较高" : "同类或近似对象，缺少唯一主数据证据"
  }));
}

function detectIssues(record, finalData, topScore) {
  const issues = [];
  const raw = record.raw || "";
  if (!finalData.equipment_code) issues.push("缺设备编码");
  if (raw.match(/温度|发热|过热|烫/) && !finalData.temperature_value) issues.push("缺温度值");
  if (raw.match(/震|抖|振动/) && !finalData.vibration_value) issues.push("缺振动值");
  if (topScore < 85) issues.push("主数据不确定");
  if (raw.match(/不好使|处理好了|处理了一下|差不多|某泵|设备/) || !finalData.equipment_name) issues.push("描述过于模糊");
  if (raw.match(/震得厉害|抖得厉害|管子打架|拍片没过|烫手|不漏了|改了一下/)) issues.push("术语不标准");
  return [...new Set(issues)];
}

function qualityCheck(finalData, analysis) {
  const missing = [];
  ["equipment_name", "equipment_code", "fault_symptom", "repair_action", "repair_result"].forEach((field) => {
    if (!finalData[field]) missing.push(field);
  });
  if ((analysis.issueList || []).includes("缺温度值") && !finalData.temperature_value) missing.push("temperature_value");
  if ((analysis.issueList || []).includes("缺振动值") && !finalData.vibration_value) missing.push("vibration_value");
  return {
    missing: [...new Set(missing)],
    passed: missing.length === 0 && !(analysis.issueList || []).includes("描述过于模糊")
  };
}

function applyHumanCorrections(finalData, corrections) {
  return { ...finalData, ...compactObject(corrections) };
}

function effectSummary(ruleResult, modelResult, humanCorrections, quality) {
  const ruleFields = Object.keys(ruleResult).filter((key) => key !== "model_placeholder").length;
  const modelFields = Object.keys(modelResult).filter((key) => key !== "model_placeholder").length;
  const humanFields = Object.keys(compactObject(humanCorrections || {})).length;
  return {
    autoFields: new Set([...Object.keys(ruleResult), ...Object.keys(modelResult)]).size,
    ruleFields,
    modelFields,
    humanFields,
    missingFields: quality.missing.length,
    canEnterDwd: quality.passed,
    canGenerateKnowledge: quality.passed && humanFields >= 0
  };
}

function problemAdvice(issue) {
  const map = {
    "缺设备编码": "建议通过主数据候选匹配，无法唯一确认则人工复核。",
    "缺温度值": "不能编造，进入待补充字段。",
    "缺振动值": "不能计算故障等级，建议补充检测值。",
    "主数据不确定": "展示候选设备并要求人工确认。",
    "描述过于模糊": "标记有问题待补充，不允许生成知识卡片。",
    "术语不标准": "根据标准词表做归一化。"
  };
  return map[issue] || "进入人工复核。";
}

function filteredTasks() {
  return allRecords().map(taskView).filter((task) => {
    const f = state.filters;
    if (f.sourceSystem !== "全部" && task.sourceSystem !== f.sourceSystem) return false;
    if (f.currentStatus !== "全部" && task.currentStatus !== f.currentStatus) return false;
    if (f.currentLayer !== "全部" && task.currentLayer !== f.currentLayer) return false;
    if (f.issueType === "缺关键字段" && !task.issueList.some((issue) => ["缺设备编码", "缺温度值", "缺振动值"].includes(issue))) return false;
    if (!["全部", "缺关键字段"].includes(f.issueType) && !task.issueList.includes(f.issueType)) return false;
    if (f.needsReview !== "全部" && (task.needsReview ? "是" : "否") !== f.needsReview) return false;
    if (f.dataStructure !== "全部" && task.dataStructure !== f.dataStructure) return false;
    if (f.confidence === ">=85" && task.confidence < 85) return false;
    if (f.confidence === "70-84" && (task.confidence < 70 || task.confidence > 84)) return false;
    if (f.confidence === "<70" && task.confidence >= 70) return false;
    return true;
  });
}

function metrics() {
  const tasks = allRecords().map(taskView);
  return [
    ["今日模拟接入总量", tasks.length],
    ["结构化/半结构化/非结构化", `${tasks.filter((t) => t.dataStructure === "结构化数据").length}/${tasks.filter((t) => t.dataStructure === "半结构化数据").length}/${tasks.filter((t) => t.dataStructure === "非结构化数据").length}`],
    ["待AI处理数量", tasks.filter((task) => task.currentStatus === "待AI处理").length],
    ["待人工复核数量", tasks.filter((task) => task.currentStatus === "待人工复核").length],
    ["有问题待补充数量", tasks.filter((task) => task.currentStatus === "有问题待补充").length],
    ["已通过数量", tasks.filter((task) => task.currentStatus === "已通过").length],
    ["可生成知识卡片数量", tasks.filter((task) => task.currentStatus === "可生成知识卡片").length],
    ["已进入RAG准备区数量", tasks.filter((task) => task.ragReady).length]
  ];
}

function dashboardStats() {
  const tasks = allRecords().map(taskView);
  const completedAi = tasks.filter((task) => task.completedSteps.includes("route") || ["待人工复核", "有问题待补充", "已通过", "可生成知识卡片"].includes(task.currentStatus));
  const autoPassed = tasks.filter((task) => task.currentStatus === "已通过" && !task.needsReview);
  const humanPassed = tasks.filter((task) => task.currentStatus === "已通过" && task.needsReview);
  const dwd = tasks.filter((task) => task.currentLayer === "DWD标准明细层");
  const knowledge = tasks.filter((task) => task.currentStatus === "可生成知识卡片" || task.currentLayer === "知识卡片库");
  const ragReady = tasks.filter((task) => task.ragReady);
  return [
    ["今日已接入数据量", tasks.length],
    ["已完成 AI 处理数量", completedAi.length],
    ["已自动通过数量", autoPassed.length],
    ["已人工复核通过数量", humanPassed.length],
    ["已进入 DWD 标准层数量", dwd.length],
    ["已生成知识卡片数量", knowledge.length],
    ["已进入 RAG 准备区数量", ragReady.length],
    ["自动处理通过率", completedAi.length ? `${Math.round((autoPassed.length / completedAi.length) * 100)}%` : "0%"]
  ];
}

function todoItems() {
  const tasks = allRecords().map(taskView);
  return [
    ["待 AI 处理", tasks.filter((task) => task.currentStatus === "待AI处理").length, "status:待AI处理", "等待进入AI治理任务池的数据。"],
    ["AI 处理中", tasks.filter((task) => task.currentStatus === "AI处理中").length, "status:AI处理中", "正在执行结构识别、规则处理或模型抽取的数据。"],
    ["待人工复核", tasks.filter((task) => task.currentStatus === "待人工复核").length, "status:待人工复核", "AI无法完全确定，需要业务人员确认的数据。"],
    ["有问题待补充", tasks.filter((task) => task.currentStatus === "有问题待补充").length, "status:有问题待补充", "描述过于模糊或关键字段缺失的数据。"],
    ["主数据不确定", tasks.filter((task) => task.issueList.includes("主数据不确定")).length, "issue:主数据不确定", "设备候选无法唯一确认的数据。"],
    ["缺关键字段", tasks.filter((task) => task.issueList.some((issue) => ["缺设备编码", "缺温度值", "缺振动值"].includes(issue))).length, "issue:缺关键字段", "缺设备编码、温度值或振动值的数据。"],
    ["可生成知识卡片但未生成", tasks.filter((task) => task.currentStatus === "已通过").length, "status:已通过", "已进入DWD标准层但尚未沉淀知识卡片的数据。"]
  ];
}

function dashboardMetricItems() {
  return dashboardStats().map(([label, value]) => {
    const actionMap = {
      "今日已接入数据量": "all:全部",
      "已完成 AI 处理数量": "processed:全部",
      "已自动通过数量": "status:已通过",
      "已人工复核通过数量": "status:已通过",
      "已进入 DWD 标准层数量": "layer:DWD标准明细层",
      "已生成知识卡片数量": "status:可生成知识卡片",
      "已进入 RAG 准备区数量": "status:可生成知识卡片",
      "自动处理通过率": "status:已通过"
    };
    return [label, value, actionMap[label] || "all:全部"];
  });
}

function sourceBreakdown() {
  return sourceConfigs.map((source) => {
    const tasks = allRecords().map(taskView).filter((task) => task.sourceSystem === source.system);
    const processed = tasks.filter((task) => ["待人工复核", "有问题待补充", "已通过", "可生成知识卡片"].includes(task.currentStatus) || task.completedSteps.includes("route"));
    const autoPassed = tasks.filter((task) => task.currentStatus === "已通过" && !task.needsReview);
    const humanPassed = tasks.filter((task) => task.currentStatus === "已通过" && task.needsReview);
    const abnormal = tasks.filter((task) => task.currentStatus === "有问题待补充" || task.issueList.length > 0);
    const knowledge = tasks.filter((task) => task.currentStatus === "可生成知识卡片" || task.ragReady);
    const success = tasks.length ? Math.round(((autoPassed.length + humanPassed.length + knowledge.length) / tasks.length) * 100) : 0;
    const times = tasks.map((task) => task.ingestTime).sort();
    return {
      ...source,
      total: tasks.length,
      processed: processed.length,
      autoPassed: autoPassed.length,
      humanPassed: humanPassed.length,
      abnormal: abnormal.length,
      knowledge: knowledge.length,
      success,
      recent: times[times.length - 1] || "-"
    };
  });
}

function issueDistribution() {
  const tasks = allRecords().map(taskView);
  const defs = [
    ["缺设备编码", (task) => task.issueList.includes("缺设备编码"), "issue:缺设备编码"],
    ["主数据不确定", (task) => task.issueList.includes("主数据不确定"), "issue:主数据不确定"],
    ["缺温度值/振动值", (task) => task.issueList.includes("缺温度值") || task.issueList.includes("缺振动值"), "issue:缺关键字段"],
    ["描述过于模糊", (task) => task.issueList.includes("描述过于模糊"), "issue:描述过于模糊"],
    ["术语不标准", (task) => task.issueList.includes("术语不标准"), "issue:术语不标准"],
    ["疑似重复", (task) => task.raw.includes("重复") || task.sourceId.includes("DUP"), "issue:疑似重复"],
    ["处理结果缺失", (task) => !task.finalData.repair_result, "issue:处理结果缺失"]
  ];
  return defs.map(([label, predicate, action]) => [label, tasks.filter(predicate).length, action]);
}

function recentProcessedRecords() {
  return allRecords()
    .map(taskView)
    .filter((task) => ["已通过", "可生成知识卡片", "有问题待补充"].includes(task.currentStatus))
    .sort((a, b) => String(b.ingestTime).localeCompare(String(a.ingestTime)))
    .slice(0, 8);
}

function passMethod(task) {
  if (task.currentStatus === "有问题待补充") return "不入库";
  if (task.needsReview && task.currentStatus === "已通过") return "人工复核通过";
  if (task.dataStructure === "结构化数据" && task.currentStatus === "已通过") return "规则校验通过";
  if (task.currentStatus === "已通过") return "AI自动通过";
  if (task.currentStatus === "可生成知识卡片") return task.needsReview ? "人工复核通过" : "AI自动通过";
  return "-";
}

function addHistory(recordId, status, detail) {
  const runtime = taskState(recordId);
  runtime.history = runtime.history || [];
  runtime.history.unshift({
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
    status,
    detail
  });
  runtime.history = runtime.history.slice(0, 8);
}

function addLog(action, recordId = state.selectedRecordId) {
  state.logs.unshift({
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    action,
    record: recordId
  });
  state.logs = state.logs.slice(0, 10);
}

const flowSteps = [
  { id: "structure", label: "数据结构识别" },
  { id: "rule", label: "规则处理" },
  { id: "model", label: "模型抽取占位" },
  { id: "quality", label: "质量检查" },
  { id: "route", label: "分流判断" }
];

function runAi(recordId) {
  const runtime = taskState(recordId);
  if (runtime.aiRunning) return;
  state.selectedRecordId = recordId;
  state.drawerOpen = true;
  runtime.aiRunning = true;
  runtime.currentStatus = "AI处理中";
  runtime.currentLayer = "AI治理任务池";
  runtime.currentStep = "structure";
  runtime.completedSteps = [];
  addHistory(recordId, "AI处理中", "开始按数据结构选择解析策略");
  addLog("启动AI治理实验", recordId);
  saveState();
  render();

  let index = 0;
  clearInterval(aiTimer);
  aiTimer = setInterval(() => {
    const live = taskState(recordId);
    if (index >= flowSteps.length) {
      const task = taskView(allRecords().find((record) => record.id === recordId));
      const next = routeStatus(task);
      live.currentStatus = next;
      live.currentLayer = layerByStatus(next);
      live.aiRunning = false;
      live.confidence = task.confidence;
      addHistory(recordId, next, routeDecision(task));
      addLog("AI治理实验完成并分流", recordId);
      clearInterval(aiTimer);
      saveState();
      render();
      return;
    }
    live.currentStep = flowSteps[index].id;
    live.completedSteps = [...new Set([...(live.completedSteps || []), flowSteps[index].id])];
    addHistory(recordId, "AI处理中", `完成${flowSteps[index].label}`);
    index += 1;
    saveState();
    render();
  }, 420);
}

function routeStatus(task) {
  if (task.issueList.includes("描述过于模糊") || task.confidence < 55) return "有问题待补充";
  if (task.qualityAfterHuman?.passed) return "已通过";
  if (task.issueList.length || task.confidence < 85) return "待人工复核";
  return "已通过";
}

function routeDecision(task) {
  if (task.issueList.includes("描述过于模糊") || task.confidence < 55) return "原始描述过于模糊或置信度低，进入有问题待补充。";
  if (task.issueList.length || task.confidence < 85) return "缺少关键字段、主数据不确定或术语不标准，进入待人工复核。";
  return "字段完整、置信度高、主数据匹配较唯一，可进入已通过。";
}

function reviewPass(recordId) {
  const task = taskView(allRecords().find((record) => record.id === recordId));
  const runtime = taskState(recordId);
  if (!task.qualityAfterHuman.passed) {
    runtime.currentStatus = "有问题待补充";
    runtime.currentLayer = "AI治理任务池";
    addHistory(recordId, "有问题待补充", "关键字段仍缺失，暂不能通过复核");
  } else {
    runtime.currentStatus = "已通过";
    runtime.currentLayer = "DWD标准明细层";
    addHistory(recordId, "已通过", "人工复核通过，写入DWD标准明细层");
  }
  runtime.aiRunning = false;
  addLog("人工复核处理", recordId);
  saveState();
  render();
}

function markProblem(recordId) {
  const runtime = taskState(recordId);
  runtime.currentStatus = "有问题待补充";
  runtime.currentLayer = "AI治理任务池";
  runtime.aiRunning = false;
  addHistory(recordId, "有问题待补充", "人工要求补充字段或澄清原始描述");
  addLog("要求补充字段", recordId);
  saveState();
  render();
}

function rejectRerun(recordId) {
  const runtime = taskState(recordId);
  runtime.currentStatus = "待AI处理";
  runtime.currentLayer = "AI治理任务池";
  runtime.completedSteps = [];
  runtime.currentStep = "structure";
  runtime.aiRunning = false;
  addHistory(recordId, "待AI处理", "人工驳回，退回AI重跑");
  addLog("驳回重跑", recordId);
  saveState();
  render();
}

function generateKnowledge(recordId) {
  const runtime = taskState(recordId);
  runtime.currentStatus = "可生成知识卡片";
  runtime.currentLayer = "知识卡片库";
  runtime.ragReady = true;
  addHistory(recordId, "可生成知识卡片", "DWD标准数据生成知识卡片，进入RAG准备区");
  addLog("生成知识卡片", recordId);
  saveState();
  render();
}

function openWorkbenchTodo(action) {
  const [type, value] = action.split(":");
  state.page = "workbench";
  state.drawerOpen = false;
  state.helpPanel = "";
  state.filters = { ...defaultFilters };
  if (type === "all") {
    addLog("从驾驶舱进入工作台：全部数据");
    saveState();
    render();
    return;
  }
  if (type === "status") state.filters.currentStatus = value;
  if (type === "issue") state.filters.issueType = value;
  if (type === "layer") state.filters.currentLayer = value;
  if (type === "source") state.filters.sourceSystem = value;
  if (type === "processed") state.filters.currentStatus = "全部";
  addLog(`从驾驶舱进入工作台：${value}`);
  saveState();
  render();
}

function openDashboardDetail(recordId) {
  state.selectedRecordId = recordId;
  state.drawerOpen = true;
  state.helpPanel = "";
  addLog(`从驾驶舱打开记录详情：${recordId}`, recordId);
  saveState();
  render();
}

function saveCorrections(form) {
  const recordId = form.recordId.value;
  const runtime = taskState(recordId);
  runtime.humanCorrections = {
    equipment_name: form.equipment_name.value.trim(),
    equipment_code: form.equipment_code.value.trim(),
    system: form.system.value.trim(),
    component: form.component.value.trim(),
    fault_symptom: form.fault_symptom.value.trim(),
    repair_action: form.repair_action.value.trim(),
    repair_result: form.repair_result.value.trim(),
    temperature_value: form.temperature_value.value.trim(),
    vibration_value: form.vibration_value.value.trim()
  };
  const task = taskView(allRecords().find((record) => record.id === recordId));
  runtime.currentStatus = task.qualityAfterHuman.passed ? "已通过" : "有问题待补充";
  runtime.currentLayer = task.qualityAfterHuman.passed ? "DWD标准明细层" : "AI治理任务池";
  addHistory(recordId, runtime.currentStatus, `人工保存修正字段 ${Object.keys(compactObject(runtime.humanCorrections)).length} 项`);
  addLog("保存人工修正", recordId);
  saveState();
  render();
}

function addManualRecord(text) {
  const id = `MAN-${Date.now().toString().slice(-6)}`;
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const record = {
    id,
    title: "手工录入维修描述",
    raw: text,
    sourceSystem: "手工录入",
    sourceType: "现场补充记录",
    sourceId: `MANUAL-${Date.now().toString().slice(-6)}`,
    ingestMethod: "表单录入",
    ingestTime: now,
    initialStatus: "待AI处理",
    rowData: null
  };
  state.userRecords.unshift(record);
  state.taskStates[id] = defaultTaskStates([record])[id];
  state.selectedRecordId = id;
  state.drawerOpen = true;
  addLog("新增手工录入治理任务", id);
  saveState();
  render();
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0] || "");
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
  return { headers, rows };
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuote = false;
  for (const char of line) {
    if (char === "\"") {
      inQuote = !inQuote;
    } else if (char === "," && !inQuote) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function recommendMapping(headers) {
  const map = {};
  headers.forEach((header) => {
    const h = header.toLowerCase();
    if (header.match(/泵名|设备|equipment|设备名称/)) map[header] = "equipment_name";
    else if (header.match(/编码|编号|code/)) map[header] = "equipment_code";
    else if (header.match(/系统|system/)) map[header] = "system";
    else if (header.match(/部件|component/)) map[header] = "component";
    else if (header.match(/异常|故障|现象|symptom|fault/)) map[header] = "fault_symptom";
    else if (header.match(/修理|处理|措施|办法|action|repair/)) map[header] = "repair_action";
    else if (header.match(/好了|结果|result/)) map[header] = "repair_result";
    else if (header.match(/温度|temperature/)) map[header] = "temperature_value";
    else if (header.match(/振动|vibration/)) map[header] = "vibration_value";
    else map[header] = "ignore";
    if (h.includes("temp")) map[header] = "temperature_value";
  });
  return map;
}

function csvStats(rows, mapping) {
  const recognized = Object.values(mapping).filter((field) => field !== "ignore").length;
  const rowSignatures = new Set();
  let missingCode = 0;
  let missingResult = 0;
  let duplicate = 0;
  rows.forEach((row) => {
    const normalized = rowToSystemFields(row, mapping);
    if (!normalized.equipment_code) missingCode += 1;
    if (!normalized.repair_result) missingResult += 1;
    const signature = JSON.stringify(normalized);
    if (rowSignatures.has(signature)) duplicate += 1;
    rowSignatures.add(signature);
  });
  return {
    totalRows: rows.length,
    recognizedFields: recognized,
    unrecognizedFields: Object.keys(mapping).length - recognized,
    missingCode,
    missingResult,
    duplicate,
    aiPool: rows.length,
    problemRows: rows.filter((row) => {
      const normalized = rowToSystemFields(row, mapping);
      return !normalized.equipment_name || !normalized.repair_result || !normalized.equipment_code;
    }).length
  };
}

function rowToSystemFields(row, mapping) {
  const normalized = {};
  Object.entries(mapping).forEach(([header, field]) => {
    if (field !== "ignore") normalized[field] = row[header] || "";
  });
  return normalized;
}

function loadCsvSample() {
  const sample = "泵名,异常情况,修理办法,是否好了\n1号压载泵,泵抖得厉害,重新找正,正常\n海水冷却泵,轴承发热,补充润滑脂,温度下降\n某泵,运行异常,处理了一下,";
  const parsed = parseCsv(sample);
  state.csvPreview = {
    fileName: "样例历史台账.csv",
    headers: parsed.headers,
    rows: parsed.rows,
    mapping: recommendMapping(parsed.headers)
  };
  addLog("加载CSV样例，进入字段映射确认", "CSV-SAMPLE");
  saveState();
  render();
}

function confirmCsvMapping() {
  if (!state.csvPreview) return;
  const mapping = state.csvPreview.mapping;
  const rows = state.csvPreview.rows;
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const newRecords = rows.map((row, index) => {
    const rowData = rowToSystemFields(row, mapping);
    const id = `CSV-${Date.now().toString().slice(-5)}-${index + 1}`;
    const raw = Object.entries(row).map(([key, value]) => `${key}:${value}`).join("；");
    return {
      id,
      title: `CSV上传历史台账 ${index + 1}`,
      raw,
      sourceSystem: "CSV上传实验",
      sourceType: "历史故障记录",
      sourceId: `CSV-UP-${Date.now().toString().slice(-6)}-${index + 1}`,
      ingestMethod: "文件上传",
      ingestTime: now,
      initialStatus: "待AI处理",
      rowData,
      uploadMapping: mapping
    };
  });
  state.userRecords.unshift(...newRecords);
  Object.assign(state.taskStates, defaultTaskStates(newRecords));
  state.uploadResult = csvStats(rows, mapping);
  state.csvPreview = null;
  addLog(`CSV映射确认并生成 ${newRecords.length} 条治理任务`, newRecords[0]?.id || "CSV");
  saveState();
  render();
}

function render() {
  pageTitle.textContent = state.page === "dashboard" ? "治理驾驶舱" : "船舶 AI 数据治理实验台";
  nav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.page === state.page));
  if (state.page === "dashboard") {
    pageContent.innerHTML = `
      ${renderDashboard()}
      ${state.drawerOpen ? renderDrawer(taskView(selectedRecord())) : ""}
    `;
    saveState();
    return;
  }
  pageContent.innerHTML = `
    <section class="enterprise-page">
      ${renderHero()}
      ${renderMetrics()}
      ${renderLabIngest()}
      ${renderIngestOverview()}
      ${renderWorkbench()}
      ${state.drawerOpen ? renderDrawer(taskView(selectedRecord())) : ""}
      ${state.helpPanel ? renderHelpPanel(state.helpPanel) : ""}
    </section>
  `;
  saveState();
}

function renderDashboard() {
  return `
    <section class="dashboard-page">
      <div class="enterprise-hero panel">
        <div>
          <p class="eyebrow">Governance Dashboard</p>
          <h2>治理驾驶舱</h2>
          <p class="dashboard-desc">用于查看船舶多来源数据治理进展、已处理成果和当前待办任务。</p>
        </div>
      </div>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Processed Overview</p><h2>已处理成果总览</h2></div>
          <span class="status-pill">成果汇总</span>
        </div>
        <div class="dashboard-metric-grid">
          ${dashboardMetricItems().map(([label, value, action]) => `
            <article data-dashboard-drill="${action}">
              <span>${label}</span>
              <strong>${value}</strong>
              <em>查看明细</em>
            </article>
          `).join("")}
        </div>
      </article>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Source Breakdown</p><h2>来源系统处理情况</h2></div>
          <span class="status-pill">按来源拆解</span>
        </div>
        <div class="dashboard-table-wrap">
          <table class="enterprise-table dashboard-source-table">
            <thead>
              <tr>
                <th>来源系统</th><th>数据类型</th><th>今日接入量</th><th>已处理数量</th><th>自动通过数量</th><th>人工复核通过数量</th><th>异常/待补充数量</th><th>已生成知识卡片数量</th><th>处理成功率</th><th>最近同步时间</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${sourceBreakdown().map((source) => `
                <tr>
                  <td><strong>${source.system}</strong></td>
                  <td>${source.type}</td>
                  <td>${source.total}</td>
                  <td>${source.processed}</td>
                  <td>${source.autoPassed}</td>
                  <td>${source.humanPassed}</td>
                  <td>${source.abnormal}</td>
                  <td>${source.knowledge}</td>
                  <td>${source.success}%</td>
                  <td>${source.recent}</td>
                  <td><button class="table-link-btn" data-dashboard-source="${source.system}" type="button">查看明细</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Issue Distribution</p><h2>异常/待补充问题分布</h2></div>
          <span class="status-pill">点击下钻</span>
        </div>
        <div class="issue-distribution-grid">
          ${issueDistribution().map(([label, count, action]) => `
            <button data-dashboard-issue="${action}" type="button">
              <span>${label}</span>
              <strong>${count}</strong>
              <em>查看问题数据</em>
            </button>
          `).join("")}
        </div>
      </article>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Recent Processed Records</p><h2>最近已处理记录</h2></div>
          <span class="status-pill">${recentProcessedRecords().length} 条</span>
        </div>
        <div class="dashboard-table-wrap">
          <table class="enterprise-table dashboard-recent-table">
            <thead>
              <tr>
                <th>记录ID</th><th>来源系统</th><th>来源单号</th><th>原始摘要</th><th>处理结果</th><th>通过方式</th><th>当前层级</th><th>是否生成知识卡片</th><th>处理时间</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${recentProcessedRecords().map((task) => `
                <tr>
                  <td><strong>${task.id}</strong></td>
                  <td>${task.sourceSystem}</td>
                  <td>${task.sourceId}</td>
                  <td class="summary-cell">${task.raw}</td>
                  <td><span class="state-badge ${badgeClass(task.currentStatus)}">${task.currentStatus === "有问题待补充" ? "待补充" : task.currentStatus}</span></td>
                  <td>${passMethod(task)}</td>
                  <td>${destination(task)}</td>
                  <td>${task.currentStatus === "可生成知识卡片" || task.ragReady ? "是" : "否"}</td>
                  <td>${task.history?.[0]?.time || task.ingestTime}</td>
                  <td><button class="table-link-btn" data-dashboard-detail="${task.id}" type="button">查看详情</button></td>
                </tr>
              `).join("") || `<tr><td colspan="10" class="empty-row">暂无已处理记录。</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Todo Center</p><h2>待办中心</h2></div>
          <span class="status-pill">点击进入工作台</span>
        </div>
        <div class="todo-grid">
          ${todoItems().map(([label, count, action, desc]) => `
            <button data-dashboard-todo="${action}" type="button">
              <span>${label}</span>
              <strong>${count}</strong>
              <p>${desc}</p>
              <em>查看任务</em>
            </button>
          `).join("")}
        </div>
      </article>
    </section>
  `;
}

function renderHero() {
  return `
    <div class="enterprise-hero panel">
      <div>
        <p class="eyebrow">Mock + localStorage / 模型结果由 MockModelPlaceholder 模拟</p>
        <h2>AI 数据治理实验台：亲手体验结构化、半结构化、非结构化数据如何被清洗、标准化与复核</h2>
      </div>
      <div class="help-actions">
        <button class="secondary-btn" data-help="flow" type="button">系统流程图</button>
        <button class="secondary-btn" data-help="rules" type="button">流转规则</button>
        <button class="secondary-btn" data-help="guide" type="button">使用说明</button>
      </div>
    </div>
  `;
}

function renderMetrics() {
  return `
    <section class="metric-grid enterprise-metrics">
      ${metrics().map(([label, value]) => `
        <article>
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `).join("")}
    </section>
  `;
}

function renderLabIngest() {
  return `
    <section class="lab-grid">
      <article class="panel enterprise-card">
        <div class="section-heading compact"><div><p class="eyebrow">Manual Experiment</p><h2>手工录入实验</h2></div></div>
        <form id="manualForm" class="manual-form">
          <label>
            <span>维修描述</span>
            <textarea name="manualText" rows="4" placeholder="例如：泵运行的时候抖得厉害，后来师傅调了一下就好了。">泵运行的时候抖得厉害，后来师傅调了一下就好了。</textarea>
          </label>
          <button class="primary-btn" type="submit">生成非结构化治理任务</button>
        </form>
      </article>
      <article class="panel enterprise-card">
        <div class="section-heading compact"><div><p class="eyebrow">CSV Upload Experiment</p><h2>Excel/CSV 上传实验</h2></div><span class="status-pill">先支持CSV</span></div>
        <label class="upload-experiment">
          <span>选择 CSV 文件</span>
          <input id="csvUpload" type="file" accept=".csv,text/csv">
        </label>
        <button class="secondary-btn" data-load-csv-sample type="button">加载CSV样例并进入映射确认</button>
        ${state.uploadResult ? renderUploadStats(state.uploadResult) : `<p class="hint">上传后会先识别表头、推荐字段映射，确认映射后再生成治理任务。</p>`}
      </article>
    </section>
    ${state.csvPreview ? renderCsvMapping() : ""}
  `;
}

function renderUploadStats(stats) {
  return `
    <div class="upload-stats">
      ${[
        ["总行数", stats.totalRows],
        ["成功识别字段数", stats.recognizedFields],
        ["未识别字段数", stats.unrecognizedFields],
        ["缺设备编码数量", stats.missingCode],
        ["缺处理结果数量", stats.missingResult],
        ["疑似重复数量", stats.duplicate],
        ["进入AI治理任务池数量", stats.aiPool],
        ["有问题待补充数量", stats.problemRows]
      ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("")}
    </div>
  `;
}

function renderCsvMapping() {
  return `
    <article class="panel enterprise-card mapping-card">
      <div class="section-heading compact"><div><p class="eyebrow">Field Mapping</p><h2>字段映射确认</h2></div><span class="status-pill">${state.csvPreview.rows.length} 行待生成</span></div>
      <div class="mapping-grid">
        ${state.csvPreview.headers.map((header) => `
          <label>
            <span>${header}</span>
            <select data-mapping="${header}">
              ${systemFields.map((field) => `<option value="${field}" ${state.csvPreview.mapping[header] === field ? "selected" : ""}>${field}</option>`).join("")}
            </select>
          </label>
        `).join("")}
      </div>
      ${renderUploadStats(csvStats(state.csvPreview.rows, state.csvPreview.mapping))}
      <div class="mapping-actions">
        <button class="primary-btn" data-confirm-mapping type="button">确认映射并生成治理任务</button>
        <button class="secondary-btn" data-cancel-mapping type="button">取消上传</button>
      </div>
    </article>
  `;
}

function renderIngestOverview() {
  return `
    <article class="panel enterprise-card">
      <div class="section-heading compact">
        <div><p class="eyebrow">Data Ingestion Overview</p><h2>数据接入纵览</h2></div>
        <span class="status-pill">模拟接入，未真实打通企业系统</span>
      </div>
      <div class="ingest-table-wrap">
        <table class="enterprise-table ingest-table">
          <thead>
            <tr>
              <th>模拟数据源</th><th>数据类型</th><th>模拟接入方式</th><th>今日模拟接入量</th><th>待AI治理数量</th><th>异常/缺失数据数量</th><th>最近接入时间</th><th>接入状态</th>
            </tr>
          </thead>
          <tbody>
            ${sourceOverview().map((source) => `
              <tr>
                <td><strong>${source.system}</strong></td>
                <td>${source.type}</td>
                <td>${source.method}</td>
                <td>${source.total}</td>
                <td>${source.pendingAi}</td>
                <td>${source.abnormal}</td>
                <td>${source.recent}</td>
                <td><span class="state-badge ${badgeClass(source.status)}">${source.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function sourceOverview() {
  return sourceConfigs.map((source) => {
    const sourceTasks = allRecords().map(taskView).filter((task) => task.sourceSystem === source.system);
    const times = sourceTasks.map((task) => task.ingestTime).sort();
    return {
      ...source,
      total: sourceTasks.length,
      pendingAi: sourceTasks.filter((task) => ["待AI处理", "AI处理中", "待人工复核", "有问题待补充"].includes(task.currentStatus)).length,
      abnormal: sourceTasks.filter((task) => task.issueList.length > 0).length,
      recent: times[times.length - 1] || "-"
    };
  });
}

function renderWorkbench() {
  const tasks = filteredTasks();
  return `
    <article class="panel enterprise-card">
      <div class="section-heading compact">
        <div><p class="eyebrow">AI Governance Lab</p><h2>AI治理工作台</h2></div>
        <span class="status-pill">${tasks.length} / ${allRecords().length} 条</span>
      </div>
      ${renderFilters()}
      <div class="task-table-wrap">
        <table class="enterprise-table task-table lab-table">
          <thead>
            <tr>
              <th>记录ID</th><th>来源系统</th><th>数据结构</th><th>解析策略</th><th>来源单号</th><th>数据类型</th><th>原始摘要</th><th>当前层级</th><th>当前状态</th><th>问题类型</th><th>置信度</th><th>需复核</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map((task) => `
              <tr>
                <td><strong>${task.id}</strong></td>
                <td>${task.sourceSystem}</td>
                <td><span class="state-badge">${task.dataStructure}</span></td>
                <td>${task.strategy.name}</td>
                <td>${task.sourceId}</td>
                <td>${task.sourceType}</td>
                <td class="summary-cell">${task.raw}</td>
                <td>${task.currentLayer}</td>
                <td><span class="state-badge ${badgeClass(task.currentStatus)}">${task.currentStatus}</span></td>
                <td class="issue-cell">${task.issueList.length ? task.issueList.map((issue) => `<em>${issue}</em>`).join("") : "<span>无明显问题</span>"}</td>
                <td><b class="${task.confidence < 70 ? "low-score" : ""}">${task.confidence}%</b></td>
                <td>${task.needsReview ? "是" : "否"}</td>
                <td>
                  <div class="row-actions">
                    <button data-open="${task.id}" type="button">查看详情</button>
                    <button data-ai="${task.id}" type="button">${task.aiRunning ? "处理中" : "AI处理"}</button>
                    <button data-review-open="${task.id}" type="button">复核</button>
                  </div>
                </td>
              </tr>
            `).join("") || `<tr><td colspan="13" class="empty-row">当前筛选条件下暂无任务。</td></tr>`}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderFilters() {
  return `
    <div class="filter-bar lab-filter">
      ${selectFilter("sourceSystem", "来源系统", ["全部", ...sourceConfigs.map((source) => source.system), "CSV上传实验"])}
      ${selectFilter("dataStructure", "数据结构", ["全部", ...structures])}
      ${selectFilter("currentStatus", "当前状态", ["全部", ...statuses])}
      ${selectFilter("issueType", "问题类型", ["全部", ...issueTypes])}
      ${selectFilter("currentLayer", "当前层级", ["全部", ...layers])}
      ${selectFilter("needsReview", "是否复核", ["全部", "是", "否"])}
      ${selectFilter("confidence", "置信度区间", ["全部", ">=85", "70-84", "<70"])}
      <button class="secondary-btn" data-reset-filters type="button">重置筛选</button>
    </div>
  `;
}

function selectFilter(key, label, options) {
  return `
    <label>
      <span>${label}</span>
      <select data-filter="${key}">
        ${options.map((option) => `<option value="${option}" ${state.filters[key] === option ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderDrawer(task) {
  return `
    <div class="drawer-mask" data-close-drawer></div>
    <aside class="detail-drawer lab-drawer">
      <div class="drawer-head">
        <div>
          <p class="eyebrow">${task.id} / ${task.sourceSystem}</p>
          <h2>${task.title}</h2>
        </div>
        <button class="icon-btn" data-close-drawer type="button">×</button>
      </div>
      <div class="drawer-body">
        ${drawerSection("数据结构识别与解析策略", [
          ["数据结构类型", task.dataStructure],
          ["推荐解析策略", task.strategy.name],
          ["处理步骤", task.strategy.steps],
          ["为什么这样处理", task.strategy.reason]
        ])}
        ${renderAiProcess(task)}
        ${renderCleanCompare(task)}
        ${renderProblemAdvice(task)}
        ${renderEffectSummary(task)}
        ${renderCorrectionForm(task)}
        ${renderHistory(task)}
        ${renderDrawerActions(task)}
      </div>
    </aside>
  `;
}

function drawerSection(title, rows) {
  return `
    <section class="drawer-section">
      <h3>${title}</h3>
      <dl>
        ${rows.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("")}
      </dl>
    </section>
  `;
}

function renderAiProcess(task) {
  return `
    <section class="drawer-section">
      <h3>AI治理步骤</h3>
      <div class="mini-flow">
        ${flowSteps.map((step, index) => `
          <div class="${task.completedSteps.includes(step.id) ? "done" : ""} ${task.currentStep === step.id ? "active" : ""}">
            <span>${index + 1}</span>
            <strong>${step.label}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCleanCompare(task) {
  const rows = [
    ["原始数据", "source", { raw: task.raw, sourceSystem: task.sourceSystem, sourceId: task.sourceId }],
    ["规则处理结果", "rule", task.ruleResult],
    ["模型抽取结果", "model", task.modelResult],
    ["数据质量检查结果", "quality", { issues: task.issueList.join("；") || "无", missing: task.quality.missing.join("；") || "无", confidence: `${task.confidence}%` }],
    ["人工修正结果", "human", task.humanCorrections],
    ["最终标准数据", "final", task.finalData]
  ];
  return `
    <section class="drawer-section">
      <h3>清洗前后对比</h3>
      <div class="compare-chain">
        ${rows.map(([title, tag, data]) => `
          <article>
            <span>${tag}</span>
            <strong>${title}</strong>
            ${objectTable(data)}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function objectTable(obj) {
  const entries = Object.entries(obj || {}).filter(([, value]) => value !== "");
  if (!entries.length) return `<p class="hint">暂无。</p>`;
  return `<dl>${entries.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
}

function renderProblemAdvice(task) {
  return `
    <section class="drawer-section">
      <h3>问题诊断与解决建议</h3>
      <div class="advice-list">
        ${task.issueList.length ? task.issueList.map((issue) => `
          <article>
            <strong>${issue}</strong>
            <p>${problemAdvice(issue)}</p>
          </article>
        `).join("") : `<article><strong>无明显问题</strong><p>可进入复核或DWD标准明细层。</p></article>`}
      </div>
    </section>
  `;
}

function renderEffectSummary(task) {
  const summary = effectSummary(task.ruleResult, task.modelResult, task.humanCorrections, task.qualityAfterHuman);
  return `
    <section class="drawer-section">
      <h3>处理效果总结</h3>
      <div class="effect-grid">
        ${[
          ["本次自动识别字段数", summary.autoFields],
          ["规则命中字段数", summary.ruleFields],
          ["模型抽取字段数", summary.modelFields],
          ["人工补充字段数", summary.humanFields],
          ["仍缺失字段数", summary.missingFields],
          ["是否可进入DWD标准明细层", summary.canEnterDwd ? "是" : "否"],
          ["是否可生成知识卡片", task.currentStatus === "已通过" || task.currentStatus === "可生成知识卡片" ? "是" : "否"]
        ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("")}
      </div>
    </section>
  `;
}

function renderCorrectionForm(task) {
  const data = task.finalData;
  return `
    <section class="drawer-section">
      <h3>人工修正体验</h3>
      <form id="correctionForm" class="correction-form">
        <input type="hidden" name="recordId" value="${task.id}">
        ${correctionInput("设备名称", "equipment_name", data.equipment_name)}
        ${correctionInput("设备编码", "equipment_code", data.equipment_code)}
        ${correctionInput("所属系统", "system", data.system)}
        ${correctionInput("部件", "component", data.component)}
        ${correctionInput("故障现象", "fault_symptom", data.fault_symptom)}
        ${correctionInput("处理措施", "repair_action", data.repair_action)}
        ${correctionInput("处理结果", "repair_result", data.repair_result)}
        ${correctionInput("温度值", "temperature_value", data.temperature_value)}
        ${correctionInput("振动值", "vibration_value", data.vibration_value)}
        <button class="primary-btn" type="submit">保存人工修正并重新计算状态</button>
      </form>
    </section>
  `;
}

function correctionInput(label, name, value = "") {
  return `<label><span>${label}</span><input name="${name}" value="${value || ""}" placeholder="可人工补充或修改"></label>`;
}

function renderHistory(task) {
  return `
    <section class="drawer-section">
      <h3>状态流转记录</h3>
      <div class="history-list">
        ${(task.history || []).map((item) => `
          <div><span>${item.time}</span><strong>${item.status}</strong><p>${item.detail}</p></div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderDrawerActions(task) {
  return `
    <section class="drawer-section">
      <h3>处理结果与去向 / 人工复核操作</h3>
      <div class="disposition-box">
        <article><span>AI初审结果</span><strong>${task.confidence < 55 ? "不通过" : task.needsReview ? "需人工复核" : "通过"}</strong></article>
        <article><span>下一步动作</span><strong>${nextAction(task)}</strong></article>
        <article><span>数据去向</span><strong>${destination(task)}</strong></article>
      </div>
      <div class="drawer-actions">
        <button class="secondary-btn" data-ai="${task.id}" type="button">AI处理</button>
        <button class="primary-btn" data-review-pass="${task.id}" type="button">复核通过</button>
        <button class="secondary-btn" data-mark-problem="${task.id}" type="button">补充字段</button>
        <button class="secondary-btn danger" data-reject="${task.id}" type="button">驳回重跑</button>
        <button class="secondary-btn" data-knowledge="${task.id}" type="button" ${task.currentStatus === "已通过" ? "" : "disabled"}>生成知识卡片</button>
      </div>
    </section>
  `;
}

function nextAction(task) {
  if (task.currentStatus === "可生成知识卡片") return "进入RAG准备区，后续供Agent调用";
  if (task.currentStatus === "已通过") return "生成知识卡片";
  if (task.currentStatus === "有问题待补充") return "补充字段或澄清原始描述";
  if (task.currentStatus === "待人工复核") return "人工确认AI不确定字段";
  return "AI处理或进入人工复核";
}

function destination(task) {
  if (task.currentStatus === "可生成知识卡片") return "知识卡片库 / RAG准备区";
  if (task.currentStatus === "已通过") return "DWD标准明细层";
  if (task.currentStatus === "有问题待补充") return "有问题队列";
  return task.currentLayer;
}

function renderHelpPanel(type) {
  const titleMap = { flow: "系统流程图", rules: "流转规则", guide: "使用说明" };
  return `
    <div class="drawer-mask" data-close-help></div>
    <aside class="help-panel">
      <div class="drawer-head">
        <div><p class="eyebrow">Help Center</p><h2>${titleMap[type]}</h2></div>
        <button class="icon-btn" data-close-help type="button">×</button>
      </div>
      <div class="drawer-body">
        ${type === "flow" ? renderHelpFlow() : type === "rules" ? renderHelpRules() : renderHelpGuide()}
      </div>
    </aside>
  `;
}

function renderHelpFlow() {
  return `<div class="help-flow">${flowNodes.map(([title, desc], index) => `<article><span>${index + 1}</span><strong>${title}</strong><p>${desc}</p></article>`).join("")}</div>`;
}

function renderHelpRules() {
  const rules = [
    "新接入数据进入 ODS原始数据层。",
    "系统先识别数据结构：结构化、半结构化、非结构化。",
    "结构化数据优先用规则解析和校验，减少模型不稳定性。",
    "半结构化数据先做表头识别和字段映射，再用模型辅助判断。",
    "非结构化数据使用模型抽取 + 规则校验 + 人工复核。",
    "缺少关键字段、主数据不确定、置信度低的数据进入待人工复核。",
    "描述过于模糊的数据进入有问题待补充，不允许直接生成知识卡片。",
    "人工修正后关键字段齐全，才允许进入DWD标准明细层和知识卡片库。"
  ];
  return `<div class="rule-list">${rules.map((rule) => `<article><strong>${rule}</strong></article>`).join("")}</div>`;
}

function renderHelpGuide() {
  const guide = [
    "本阶段目标是模拟真实企业数据治理过程。",
    "这个 Demo 当前是 mock + localStorage，不是真实企业系统接入。",
    "系统不会把所有数据都直接交给大模型。",
    "结构化数据优先用规则。",
    "半结构化数据使用规则 + 模型辅助。",
    "非结构化数据使用模型抽取 + 规则校验 + 人工复核。",
    "当前大模型结果由 MockModelPlaceholder 模拟，后续可替换为真实模型接口。",
    "这个阶段重点是体验AI数据治理流程，不是生产级系统。"
  ];
  return `<div class="guide-list">${guide.map((item) => `<article><p>${item}</p></article>`).join("")}</div>`;
}

function badgeClass(value) {
  if (["正常", "已通过", "可生成知识卡片"].includes(value)) return "ok";
  if (["延迟", "待人工复核", "待AI处理", "AI处理中"].includes(value)) return "warn";
  if (["待配置", "有问题待补充"].includes(value)) return "bad";
  return "";
}

document.addEventListener("click", (event) => {
  const dashboardDrill = event.target.closest("[data-dashboard-drill]");
  if (dashboardDrill) return openWorkbenchTodo(dashboardDrill.dataset.dashboardDrill);

  const dashboardTodo = event.target.closest("[data-dashboard-todo]");
  if (dashboardTodo) return openWorkbenchTodo(dashboardTodo.dataset.dashboardTodo);

  const dashboardSource = event.target.closest("[data-dashboard-source]");
  if (dashboardSource) return openWorkbenchTodo(`source:${dashboardSource.dataset.dashboardSource}`);

  const dashboardIssue = event.target.closest("[data-dashboard-issue]");
  if (dashboardIssue) return openWorkbenchTodo(dashboardIssue.dataset.dashboardIssue);

  const dashboardDetail = event.target.closest("[data-dashboard-detail]");
  if (dashboardDetail) return openDashboardDetail(dashboardDetail.dataset.dashboardDetail);

  const open = event.target.closest("[data-open], [data-review-open]");
  if (open) {
    state.selectedRecordId = open.dataset.open || open.dataset.reviewOpen;
    state.drawerOpen = true;
    saveState();
    render();
    return;
  }
  const aiButton = event.target.closest("[data-ai]");
  if (aiButton) return runAi(aiButton.dataset.ai);
  const passButton = event.target.closest("[data-review-pass]");
  if (passButton) return reviewPass(passButton.dataset.reviewPass);
  const problemButton = event.target.closest("[data-mark-problem]");
  if (problemButton) return markProblem(problemButton.dataset.markProblem);
  const rejectButton = event.target.closest("[data-reject]");
  if (rejectButton) return rejectRerun(rejectButton.dataset.reject);
  const knowledgeButton = event.target.closest("[data-knowledge]");
  if (knowledgeButton) return generateKnowledge(knowledgeButton.dataset.knowledge);
  if (event.target.closest("[data-close-drawer]")) {
    state.drawerOpen = false;
    saveState();
    return render();
  }
  const helpButton = event.target.closest("[data-help]");
  if (helpButton) {
    state.helpPanel = helpButton.dataset.help;
    saveState();
    return render();
  }
  if (event.target.closest("[data-close-help]")) {
    state.helpPanel = "";
    saveState();
    return render();
  }
  if (event.target.closest("[data-reset-filters]")) {
    state.filters = { ...defaultFilters };
    saveState();
    return render();
  }
  if (event.target.closest("[data-confirm-mapping]")) return confirmCsvMapping();
  if (event.target.closest("[data-load-csv-sample]")) return loadCsvSample();
  if (event.target.closest("[data-cancel-mapping]")) {
    state.csvPreview = null;
    saveState();
    return render();
  }
  const navButton = event.target.closest("[data-page]");
  if (navButton) {
    state.page = navButton.dataset.page === "dashboard" ? "dashboard" : "workbench";
    state.drawerOpen = false;
    state.helpPanel = "";
    saveState();
    render();
  }
});

document.addEventListener("change", (event) => {
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.filters[filter.dataset.filter] = filter.value;
    saveState();
    return render();
  }
  const mapping = event.target.closest("[data-mapping]");
  if (mapping && state.csvPreview) {
    state.csvPreview.mapping[mapping.dataset.mapping] = mapping.value;
    saveState();
    return render();
  }
  if (event.target.matches("#csvUpload")) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ""));
      state.csvPreview = {
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping: recommendMapping(parsed.headers)
      };
      event.target.value = "";
      saveState();
      render();
    };
    reader.readAsText(file);
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "manualForm") {
    const text = event.target.manualText.value.trim();
    if (text) addManualRecord(text);
  }
  if (event.target.id === "correctionForm") saveCorrections(event.target);
});

document.querySelector("#rerunBtn").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  clearInterval(aiTimer);
  state = { ...defaultState, filters: { ...defaultFilters }, taskStates: defaultTaskStates(seedRecords), userRecords: [], logs: [] };
  addLog("重置AI数据治理实验台");
  saveState();
  render();
});

render();
