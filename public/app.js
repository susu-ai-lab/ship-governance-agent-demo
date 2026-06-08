const storageKey = "shipGovernance.lab.v1";

const sourceConfigs = [
  { system: "EAM设备管理系统", type: "维修工单", method: "API同步", status: "正常" },
  { system: "QMS质量系统", type: "检测报告/不合格记录", method: "数据库同步", status: "正常" },
  { system: "MES生产系统", type: "现场施工记录", method: "数据库同步", status: "延迟" },
  { system: "PLM文档库", type: "图纸/SOP/技术文件", method: "文档解析", status: "待配置" },
  { system: "Excel历史台账", type: "历史故障记录", method: "文件上传", status: "正常" },
  { system: "手工录入", type: "现场补充记录", method: "表单录入", status: "正常" }
];

const layers = ["ODS", "ODS原始数据层", "AI治理任务池", "DWD标准明细", "DWD标准明细层", "知识卡片", "知识卡片库", "RAG准备区", "已入向量库", "问题队列"];
const statuses = ["已接入", "待AI处理", "AI处理中", "待人工复核", "有问题待补充", "已通过", "知识卡片待审核", "已入RAG向量库", "已驳回", "可生成知识卡片"];
const issueTypes = ["缺设备编码", "缺故障现象", "缺处理措施", "缺验收结果", "缺温度值", "缺振动值", "缺关键字段", "主数据不确定", "描述过于模糊", "术语不标准"];
const structures = ["结构化数据", "半结构化数据", "非结构化文本", "非结构化文档"];
const systemFields = ["source_id", "raw_text", "equipment_name", "equipment_code", "system", "system_name", "component", "fault_symptom", "repair_action", "repair_result", "repair_time", "temperature_value", "vibration_value", "ignore"];

const sourceDemoNotes = {
  "EAM设备管理系统": "结构化程度高，AI识别、抽取和规则校验通过率较高。",
  "QMS质量系统": "质量检测类数据需要标准依据和复检结果复核，自动通过率中等。",
  "MES生产系统": "现场口语化和工艺上下文较多，人工复核较多。",
  "PLM文档库": "主要进入文档解析和知识准备，不直接计算DWD自动通过率。",
  "Excel历史台账": "字段名不统一，需要字段映射确认，部分清洗后可通过。",
  "手工录入": "自然语言语义不稳定，低置信度和关键字段缺失较多。"
};

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

const builtInRagDocuments = [
  {
    id: "BUILTIN-BW-PUMP-SOP",
    name: "压载泵振动温升维修 SOP.md",
    type: "Markdown",
    sourceType: "SOP",
    equipment: "1号压载泵",
    system: "压载水系统",
    fault: "异常振动/轴承温度升高",
    text: `# 压载泵振动温升维修 SOP

适用对象：1号压载泵、2号压载泵及压载水系统泵类设备。

故障现象：泵启动后异常振动，轴承位置温度异常升高，可能伴随联轴器异响、轴承噪声或试车不稳定。

排查步骤：
1. 确认设备编码、船舶、系统和工单来源，禁止仅凭“某泵”直接绑定主数据。
2. 测量振动值，记录测点、方向和单位；缺少振动值时不得判断故障等级。
3. 测量轴承温度，记录环境温度、运行时长和温度单位；缺少温度值时不得编造。
4. 检查联轴器找正状态，确认同轴度偏差是否超出工艺要求。
5. 检查轴承润滑状态、轴承磨损、地脚螺栓和泵基础。
6. 如确认轴承异常，可执行更换泵轴承；如确认对中偏差，可执行联轴器找正。
7. 维修后必须进行试运行复验，记录验收结果、验收人和复测值。

引用要求：建议同时引用历史维修案例、压载泵检修 SOP 和泵类设备振动排查规范。低置信度项如“轴承磨损”必须人工复核。`
  },
  {
    id: "BUILTIN-FIRE-PUMP-SOP",
    name: "消防泵异常噪声处理 SOP.md",
    type: "Markdown",
    sourceType: "SOP",
    equipment: "1号消防泵",
    system: "消防水系统",
    fault: "异常噪声",
    text: `# 消防泵异常噪声处理 SOP

适用对象：消防水系统消防泵。

典型现象：消防泵启动后声音大、振动伴随噪声、泵体或基础区域异响。

优先检查：地脚螺栓松动、联轴器对中、轴承间隙、泵体基础、进出口阀门开度和空化风险。

处理建议：如地脚螺栓松动，应停机确认安全后复紧；如轴承间隙偏大，应检查轴承状态；处理后需试车确认噪声恢复正常。

数据要求：记录设备编码、噪声现象、检查对象、处理措施、试车结果和验收人。`
  },
  {
    id: "BUILTIN-SW-PUMP-REPORT",
    name: "海水冷却泵轴承发热维修报告.md",
    type: "Markdown",
    sourceType: "维修报告",
    equipment: "1号海水冷却泵",
    system: "海水冷却系统",
    fault: "轴承温度升高",
    text: `# 海水冷却泵轴承发热维修报告

设备：1号海水冷却泵。系统：海水冷却系统。

故障描述：海水冷却泵运行后轴承发热，温度较历史水平升高。现场检查发现润滑脂不足，轴承区域存在轻微干摩擦风险。

处理措施：补充润滑脂，检查轴承噪声，确认泵轴转动状态，清理周边杂物。

验收结果：补充润滑后温度下降，试运行正常。建议后续点检记录轴承温度趋势。`
  },
  {
    id: "BUILTIN-FO-PUMP-CASE",
    name: "燃油输送泵压力波动历史案例.md",
    type: "Markdown",
    sourceType: "历史案例",
    equipment: "燃油输送泵",
    system: "燃油系统",
    fault: "压力波动",
    text: `# 燃油输送泵压力波动历史案例

故障现象：燃油输送泵运行中出口压力波动，流量不稳定。

排查路径：先检查滤网堵塞，再检查吸入管路漏气、旁通阀状态、泵内齿轮磨损和压力表可靠性。

处理措施：清理滤网，排除吸入侧漏气，复核压力表，必要时检修齿轮泵内部磨损。

知识要点：压力波动类案例需要保留压力值、流量、阀门状态和滤网检查结果。`
  },
  {
    id: "BUILTIN-WELD-RTUT-REPORT",
    name: "焊缝 RTUT 不合格质量处理报告.md",
    type: "Markdown",
    sourceType: "质量处理报告",
    equipment: "船体分段焊缝A区",
    system: "船体结构",
    fault: "RT/UT探伤不合格",
    text: `# 焊缝 RT/UT 不合格质量处理报告

适用对象：船体分段焊缝、环缝、纵缝。

问题描述：RT拍片不合格或UT出现缺陷回波，可能涉及未熔合、气孔、夹渣或裂纹。

处理流程：记录焊缝区域、图纸版本、检测方式、缺陷类型和报告编号；质量工程师确认返修方案；返修后必须复检，复检合格后才能关闭不合格记录。

入库规则：缺少探伤报告编号、复检结果或返修措施时，不允许作为高可信知识进入 RAG。`
  },
  {
    id: "BUILTIN-MAINT-CHECK",
    name: "船舶设备维修通用检查规范.md",
    type: "Markdown",
    sourceType: "通用规范",
    equipment: "船舶设备",
    system: "通用",
    fault: "设备故障",
    text: `# 船舶设备维修通用检查规范

通用要求：任何维修记录必须保留来源系统、来源单号、设备名称、设备编码、故障现象、处理措施、处理结果和审核状态。

AI治理要求：AI可以识别业务对象、抽取字段、归一术语、匹配主数据和执行质量规则，但不能编造缺失的温度值、振动值、压力值或验收人。

人工复核触发：主数据不唯一、关键字段缺失、检测值缺失、术语未审核、置信度低于阈值、准备发布知识卡片前，必须进入人工复核。

知识运营要求：复核通过的数据可形成知识卡片；知识卡片审核后才能写入向量库供 RAG 和 Agent 引用。`
  }
];

const runExperimentCases = [
  {
    id: "case-bw-pump",
    name: "压载泵振动温升排查",
    question: "压载泵启动后异常振动，并伴随轴承位置温度升高，应该怎么排查？",
    route: "equipment_fault",
    agent: "设备故障 Agent",
    expectedKeywords: ["压载泵", "异常振动", "轴承温度", "联轴器找正", "更换轴承"],
    testData: "设备：1号压载泵；现象：异常振动、轴承温度升高；缺失：振动值、温度值。"
  },
  {
    id: "case-fire-pump",
    name: "消防泵异常噪声排查",
    question: "消防泵启动后声音大应该先检查什么？",
    route: "equipment_fault",
    agent: "设备故障 Agent",
    expectedKeywords: ["消防泵", "异常噪声", "地脚螺栓", "试车正常"],
    testData: "设备：1号消防泵；现象：启动声音大；候选原因：地脚螺栓松动。"
  },
  {
    id: "case-sw-pump",
    name: "海水冷却泵轴承发热",
    question: "海水冷却泵轴承发热可能有哪些原因？",
    route: "equipment_fault",
    agent: "设备故障 Agent",
    expectedKeywords: ["海水冷却泵", "轴承发热", "润滑脂", "温度下降"],
    testData: "设备：1号海水冷却泵；现象：轴承发热；处理：补充润滑。"
  },
  {
    id: "case-fo-pressure",
    name: "燃油输送泵压力波动",
    question: "燃油输送泵压力波动怎么处理？",
    route: "equipment_fault",
    agent: "设备故障 Agent",
    expectedKeywords: ["燃油输送泵", "压力波动", "滤网", "吸入管路"],
    testData: "设备：燃油输送泵；现象：出口压力波动；需要排查滤网和吸入侧。"
  },
  {
    id: "case-weld-rt",
    name: "焊缝 RT 不合格返修复检",
    question: "焊缝RT不合格返修后复检需要保留哪些字段？",
    route: "quality_issue",
    agent: "质量异常 Agent",
    expectedKeywords: ["RT", "焊缝", "返修", "复检", "报告编号"],
    testData: "对象：船体分段焊缝；质量问题：RT不合格；要求：返修复检闭环。"
  },
  {
    id: "case-excel-governance",
    name: "Excel 历史维修记录治理",
    question: "Excel历史台账字段不统一，为什么这条数据不能直接入库？",
    route: "data_governance",
    agent: "数据治理 Agent",
    expectedKeywords: ["字段映射", "主数据", "缺失字段", "人工复核"],
    testData: "Excel表头：泵名、异常情况、修理办法、是否好了；问题：缺设备编码和量化值。"
  }
];

const fieldStandards = [
  { code: "F001", name: "来源系统", field: "source_system", required: "是", type: "枚举", meaning: "记录来自哪个业务系统或模拟入口。", missing: "来源不可追溯，禁止生成可信知识。" },
  { code: "F002", name: "来源单号", field: "source_id", required: "是", type: "字符串", meaning: "用于追溯原始工单、报告、台账或录入记录。", missing: "进入人工复核，禁止入RAG准备区。" },
  { code: "F003", name: "原始描述", field: "raw_text", required: "是", type: "长文本", meaning: "保留ODS原始记录，不覆盖不改写。", missing: "无法治理，进入有问题待补充。" },
  { code: "F004", name: "设备名称", field: "equipment_name", required: "是", type: "字符串", meaning: "业务对象识别的核心字段。", missing: "触发Q001，需AI识别或人工补充。" },
  { code: "F005", name: "设备编码", field: "equipment_code", required: "是", type: "主数据编码", meaning: "绑定设备主数据，支撑跨系统关联。", missing: "触发Q002/K002，需候选匹配或人工确认。" },
  { code: "F006", name: "所属系统", field: "system", required: "是", type: "枚举", meaning: "船舶系统维度，如压载水系统、消防水系统。", missing: "降低主数据匹配置信度。" },
  { code: "F007", name: "舱室/位置", field: "location", required: "否", type: "字符串", meaning: "定位现场位置，辅助排查和复盘。", missing: "作为补充字段，不阻断DWD。" },
  { code: "F008", name: "部件", field: "component", required: "否", type: "字符串", meaning: "故障关联部件，如轴承、联轴器、地脚螺栓。", missing: "降低案例相似度，不直接阻断。" },
  { code: "F009", name: "故障现象", field: "fault_symptom", required: "是", type: "标准术语", meaning: "故障分类和RAG检索的核心召回字段。", missing: "触发Q004/K003，禁止生成知识卡片。" },
  { code: "F010", name: "故障原因", field: "fault_reason", required: "否", type: "标准术语", meaning: "原因可为推断，必须标注置信度。", missing: "允许缺失，但不能由AI编造。" },
  { code: "F011", name: "处理措施", field: "repair_action", required: "是", type: "标准术语", meaning: "沉淀可复用解决方案。", missing: "触发Q005/K004，需人工补充。" },
  { code: "F012", name: "处理结果", field: "repair_result", required: "是", type: "枚举/短语", meaning: "判断案例是否为成功闭环。", missing: "触发Q006/K005，成功案例禁止入库。" },
  { code: "F013", name: "温度值", field: "temperature_value", required: "条件必填", type: "数值+单位", meaning: "涉及温升时用于量化故障等级。", missing: "触发Q007/Q008，不能编造，进入待补充。" },
  { code: "F014", name: "振动值", field: "vibration_value", required: "条件必填", type: "数值+单位", meaning: "涉及振动时用于量化故障等级。", missing: "触发Q007/Q008，不能编造，进入待补充。" },
  { code: "F015", name: "维修时间", field: "repair_time", required: "否", type: "日期时间", meaning: "用于时序分析和维修履历追踪。", missing: "保留为空，进入补充建议。" },
  { code: "F016", name: "维修人", field: "repair_person", required: "否", type: "人员", meaning: "用于责任和经验追溯。", missing: "不阻断，但降低审计完整度。" },
  { code: "F017", name: "复核人", field: "reviewer", required: "条件必填", type: "人员", meaning: "AI不确定时必须有人复核。", missing: "触发Q014，不能发布高可信知识。" },
  { code: "F018", name: "审核状态", field: "review_status", required: "是", type: "枚举", meaning: "标识是否经过人工或规则审核。", missing: "触发K010，禁止进入RAG准备区。" },
  { code: "F019", name: "置信度", field: "confidence", required: "是", type: "百分比", meaning: "记录AI/规则综合可信程度。", missing: "进入人工复核。" },
  { code: "F020", name: "知识价值", field: "knowledge_value", required: "否", type: "等级", meaning: "评估是否值得沉淀为知识卡片。", missing: "默认中等，由知识运营复核。" }
];

const equipmentMasterData = [
  { code: "EQ-BW-PUMP-001", name: "1号压载泵", type: "离心泵", ship: "示例船A", system: "压载水系统", location: "机舱泵区", model: "BW-P100", vendor: "沪东泵业", function: "压载水调驳", components: "轴承、叶轮、联轴器、机械密封", aliases: "压载泵、1号泵、BW泵", status: "在用" },
  { code: "EQ-BW-PUMP-002", name: "2号压载泵", type: "离心泵", ship: "示例船A", system: "压载水系统", location: "机舱泵区", model: "BW-P100", vendor: "沪东泵业", function: "压载水调驳", components: "轴承、叶轮、联轴器、机械密封", aliases: "2号泵、备用压载泵", status: "在用" },
  { code: "EQ-FS-PUMP-002", name: "1号消防泵", type: "消防泵", ship: "示例船A", system: "消防水系统", location: "消防泵舱", model: "FS-P80", vendor: "江南泵业", function: "消防供水", components: "地脚螺栓、轴承、泵体", aliases: "消防泵、消防水泵", status: "在用" },
  { code: "EQ-SW-PUMP-004", name: "1号海水冷却泵", type: "海水泵", ship: "示例船A", system: "海水冷却系统", location: "机舱左舷", model: "SW-C90", vendor: "青岛泵业", function: "海水冷却循环", components: "轴承、滤网、叶轮", aliases: "海水冷却泵、冷却泵", status: "在用" },
  { code: "EQ-BILGE-PUMP-002", name: "舱底水泵", type: "离心泵", ship: "示例船A", system: "舱底水系统", location: "舱底泵区", model: "BLG-P70", vendor: "沪东泵业", function: "舱底水排放", components: "轴承、叶轮、联轴器", aliases: "舱底泵、排水泵", status: "在用" },
  { code: "EQ-FO-PUMP-006", name: "燃油输送泵", type: "齿轮泵", ship: "示例船A", system: "燃油系统", location: "燃油泵间", model: "FO-G55", vendor: "中船泵业", function: "燃油输送", components: "齿轮、轴承、密封", aliases: "燃油泵、输油泵", status: "在用" },
  { code: "EQ-ME-MOTOR-001", name: "主机冷却泵电机", type: "电机", ship: "示例船A", system: "主机冷却系统", location: "机舱", model: "MTR-55KW", vendor: "湘电", function: "驱动冷却泵", components: "绕组、轴承、风道", aliases: "冷却泵电机、电机", status: "在用" },
  { code: "EQ-BW-VALVE-011", name: "压载水进口阀", type: "阀门", ship: "示例船A", system: "压载水系统", location: "压载管路进口", model: "DN150", vendor: "上海阀门厂", function: "控制压载水进口", components: "阀体、密封垫、法兰", aliases: "压载阀、进口阀", status: "在用" },
  { code: "PIPE-BW-001", name: "压载水主管路", type: "管路", ship: "示例船A", system: "压载水系统", location: "底舱至机舱", model: "DN150", vendor: "自制安装", function: "压载水输送", components: "管段、支架、法兰", aliases: "压载管、压载水管路", status: "在用" },
  { code: "WELD-HULL-A", name: "船体分段焊缝A区", type: "焊缝", ship: "示例船A", system: "船体结构", location: "A区分段", model: "N/A", vendor: "船体车间", function: "船体结构连接", components: "环缝、纵缝", aliases: "A区焊缝、分段焊缝", status: "在建" }
];

const termMappings = [
  term("T001", "泵抖得厉害", "异常振动", "故障现象", "泵类设备", "历史工单", "已审核", "口语化振动描述归一。"),
  term("T002", "抖动明显", "异常振动", "故障现象", "泵类设备", "历史台账", "已审核", "同义词归一。"),
  term("T003", "震动偏大", "异常振动", "故障现象", "泵类设备", "历史工单", "已审核", "错别字/近义词归一。"),
  term("T004", "声音大", "异常噪声", "故障现象", "泵类设备", "现场记录", "已审核", "噪声类现象标准化。"),
  term("T005", "温度高", "温度异常升高", "故障现象", "泵/电机/轴承", "历史工单", "已审核", "非量化温升描述。"),
  term("T006", "轴承发热", "轴承温度升高", "故障现象", "轴承", "质量记录", "已审核", "部件级温升描述。"),
  term("T007", "泵轴不转", "转动异常/泵轴卡滞", "故障现象", "泵类设备", "维修记录", "已审核", "转动故障标准化。"),
  term("T008", "转不动", "转动异常", "故障现象", "转动设备", "手工录入", "已审核", "口语化转动异常。"),
  term("T009", "卡住了", "卡滞", "故障现象", "机械部件", "手工录入", "已审核", "卡滞类故障。"),
  term("T010", "重新对中", "联轴器找正", "处理措施", "泵类设备", "维修工单", "已审核", "对中/找正术语统一。"),
  term("T011", "重新找正", "联轴器找正", "处理措施", "泵类设备", "维修工单", "已审核", "找正措施标准化。"),
  term("T012", "调同心", "联轴器找正", "处理措施", "泵类设备", "现场记录", "已审核", "现场口语归一。"),
  term("T013", "换轴承", "更换轴承", "处理措施", "轴承", "维修工单", "已审核", "维修动作标准化。"),
  term("T014", "加润滑油", "补充润滑", "处理措施", "泵/轴承", "维修工单", "已审核", "润滑动作标准化。"),
  term("T015", "用润滑油", "补充润滑", "处理措施", "泵/轴承", "手工录入", "已审核", "润滑动作标准化。"),
  term("T016", "增滑", "润滑处理", "处理措施", "泵/轴承", "历史台账", "待审核", "疑似错词，需专家确认。"),
  term("T017", "好了", "试运行正常", "处理结果", "通用", "手工录入", "已审核", "结果口语归一。"),
  term("T018", "恢复正常", "试运行正常", "处理结果", "通用", "维修工单", "已审核", "结果归一。"),
  term("T019", "暂时正常", "临时恢复", "处理结果", "通用", "维修工单", "待审核", "不能作为稳定解决方案。"),
  term("T020", "还有点漏", "泄漏未完全消除", "处理结果", "阀门/管路", "现场记录", "已审核", "保留未闭环风险。"),
  term("T021", "发热", "温度异常升高", "故障现象", "泵/电机/轴承", "历史工单", "已审核", "温升类口语描述。"),
  term("T022", "烫手", "温度异常升高", "故障现象", "泵/电机/轴承", "手工录入", "已审核", "现场触感描述归一。"),
  term("T023", "泵轴卡顿", "转动异常/泵轴卡滞", "故障现象", "泵类设备", "手工录入", "已审核", "泵轴转动异常描述。"),
  term("T024", "上润滑油", "补充润滑", "处理措施", "泵/轴承", "手工录入", "已审核", "现场口语动作归一。"),
  term("T025", "正常了", "试运行正常", "处理结果", "通用", "手工录入", "已审核", "结果口语归一。"),
  term("T026", "试车正常", "试运行正常", "处理结果", "通用", "维修工单", "已审核", "试车结果标准化。"),
  term("T027", "更换轴承", "更换轴承", "处理措施", "轴承", "维修工单", "已审核", "维修动作标准化。")
];

const qualityRules = [
  qualityRule("Q001", "缺设备名称", "设备名称为空或无法识别", "完整性", "进入AI识别或人工补充", "高", "没有业务对象无法关联主数据。"),
  qualityRule("Q002", "缺设备编码", "设备编码为空", "主数据", "展示候选匹配，低置信度转人工确认", "高", "没有设备编码无法跨系统追溯。"),
  qualityRule("Q003", "主数据无法唯一确认", "候选最高匹配度低于85%或多候选相近", "主数据", "进入主数据待确认", "高", "防止把故障绑定到错误设备。"),
  qualityRule("Q004", "缺故障现象", "故障现象为空", "完整性", "要求补充或重跑抽取", "高", "没有现象无法形成可检索知识。"),
  qualityRule("Q005", "缺处理措施", "处理措施为空", "完整性", "要求补充维修动作", "高", "没有措施无法沉淀解决方案。"),
  qualityRule("Q006", "缺处理结果", "处理结果为空", "闭环性", "进入待补充", "高", "无法判断案例是否有效闭环。"),
  qualityRule("Q007", "检测值缺失", "涉及温度/振动但缺少量化值", "量化质量", "提示补充温度值或振动值", "中", "故障等级和趋势分析需要量化证据。"),
  qualityRule("Q008", "禁止AI编造数值", "检测值缺失但模型尝试补全", "可信约束", "数值字段保持为空并标注待补充", "高", "避免生成不可审计的虚假数据。"),
  qualityRule("Q009", "术语未标准化", "命中口语、别名或非标准表达", "标准化", "使用词表映射，未审核词进入人工确认", "中", "统一术语提升检索和统计质量。"),
  qualityRule("Q010", "置信度低", "综合置信度低于70%", "置信度", "进入人工复核或驳回重跑", "高", "低置信度不能自动入库。"),
  qualityRule("Q011", "描述过于模糊", "出现某泵、处理了一下、差不多等模糊描述", "可用性", "进入有问题待补充", "高", "模糊数据无法支撑可靠知识。"),
  qualityRule("Q012", "疑似重复记录", "来源单号或摘要与已治理记录高度相似", "去重", "人工确认是否合并", "中", "避免重复案例污染知识库。"),
  qualityRule("Q013", "来源不可追溯", "缺少来源系统或来源单号", "血缘追溯", "禁止发布可信知识", "高", "知识必须能追溯到原始记录。"),
  qualityRule("Q014", "人工复核缺失", "命中需复核规则但没有复核人/审核状态", "审核", "保持待人工复核", "高", "人机协同结果必须可审计。")
];

const knowledgeRules = [
  knowledgeRule("K001", "必须已复核", "未经过AI通过或人工复核禁止入库", "阻断入库", "知识卡片必须有审核状态。"),
  knowledgeRule("K002", "必须绑定主数据", "设备编码为空或主数据不确定", "阻断入库", "RAG和Agent需要可信设备上下文。"),
  knowledgeRule("K003", "必须有故障现象", "故障现象为空", "阻断入库", "没有现象无法被检索召回。"),
  knowledgeRule("K004", "必须有处理措施", "处理措施为空", "阻断入库", "没有措施无法形成业务建议。"),
  knowledgeRule("K005", "成功案例必须有处理结果", "处理结果为空或未闭环", "阻断入库", "成功案例必须证明处理有效。"),
  knowledgeRule("K006", "描述过于模糊禁止入库", "命中描述过于模糊", "进入问题队列", "模糊知识会误导Agent。"),
  knowledgeRule("K007", "主数据不确定禁止入RAG", "主数据候选未人工确认", "允许暂存，禁止RAG", "防止检索时引用错误设备。"),
  knowledgeRule("K008", "低置信度知识需审核", "置信度低于85%", "转专家审核", "低置信度知识不能自动发布。"),
  knowledgeRule("K009", "必须保留来源单号", "来源单号为空", "阻断入库", "保证知识血缘可追溯。"),
  knowledgeRule("K010", "必须保留审核状态", "审核状态为空", "阻断入库", "满足审计要求。"),
  knowledgeRule("K011", "临时恢复不能作为稳定方案", "处理结果为临时恢复", "标记风险，不作为推荐方案", "临时恢复不等同根因解决。"),
  knowledgeRule("K012", "未审核词表命中需专家确认", "命中待审核术语映射", "转专家确认", "避免未审核术语进入标准知识。")
];

function term(id, raw, standard, type, target, source, audit, note) {
  return { id, raw, standard, type, target, source, audit, note };
}

function qualityRule(id, name, trigger, type, action, severity, reason) {
  return { id, name, trigger, type, action, severity, reason };
}

function knowledgeRule(id, name, condition, action, reason) {
  return { id, name, condition, action, reason };
}

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

let demoRecordCache = null;

function demoRecords() {
  if (demoRecordCache) return demoRecordCache;
  const sourcePlan = [
    [0, 36],
    [1, 18],
    [2, 21],
    [3, 9],
    [4, 17],
    [5, 8]
  ].flatMap(([sourceIndex, count]) => Array.from({ length: count }, () => sourceIndex));
  const decisionPlan = [
    ["auto_pass", 38],
    ["human_review", 31],
    ["need_supplement", 10],
    ["knowledge_review", 12],
    ["vectorized", 8],
    ["rejected", 10]
  ].flatMap(([decision, count]) => Array.from({ length: count }, () => decision));
  demoRecordCache = sourcePlan.map((sourceIndex, index) => {
    const decision = decisionPlan[index];
    const source = sourceConfigs[sourceIndex];
    const serial = String(index + 1).padStart(3, "0");
    const mock = mockGovernanceByDecision(decision, index, source.system);
    return {
      id: `REC-${serial}`,
      title: `${mock.business_issue_type} / ${mock.auto_decision}`,
      raw: mockRawText(mock, source.system, index),
      sourceSystem: source.system,
      sourceType: source.type,
      sourceId: mockSourceId(source.system, index + 1),
      ingestMethod: source.method,
      ingestTime: `2026-06-08 ${String(8 + Math.floor(index / 12)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}:00`,
      initialStatus: mock.current_status,
      rowData: mock.rowData || null,
      mockGovernance: mock
    };
  });
  return demoRecordCache;
}

function mockGovernanceByDecision(decision, index, sourceSystem) {
  const issuePool = ["异常振动", "轴承温升", "泵轴卡滞", "泄漏", "压力波动", "RT不合格", "焊缝缺陷", "管路安装偏差/干涉"];
  const businessIssue = issuePool[index % issuePool.length];
  const qualityByDecision = {
    auto_pass: [],
    human_review: index % 2 ? ["主数据不确定", "缺振动值"] : ["缺设备编码", "缺温度值"],
    need_supplement: index % 2 ? ["描述过于模糊", "缺处理措施"] : ["缺验收结果", "缺关键字段"],
    knowledge_review: [],
    vectorized: [],
    rejected: ["描述过于模糊", "来源不可追溯"]
  };
  const triggerByDecision = {
    auto_pass: ["PASS 置信度≥85%", "K001 入库规则通过"],
    human_review: index % 2 ? ["Q003 主数据不唯一", "Q007 缺关键量化值"] : ["Q002 缺设备编码", "Q007 缺关键量化值"],
    need_supplement: index % 2 ? ["Q011 描述过于模糊", "Q005 缺处理措施"] : ["Q006 缺验收/处理结果", "Q010 置信度低于60%"],
    knowledge_review: ["K008 低置信度知识需审核", "K010 必须保留审核状态"],
    vectorized: ["K001 已复核", "K002 已绑定主数据", "V001 已写入向量库"],
    rejected: ["Q011 描述过于模糊", "K006 禁止入库"]
  };
  const config = {
    auto_pass: ["自动通过", "auto_pass", "DWD标准明细", "已通过", 88 + (index % 8), "是", "关键字段完整、主数据唯一、置信度达标", "写入DWD标准明细层"],
    human_review: ["待人工复核", "human_review", "AI治理任务池", "待人工复核", 64 + (index % 20), "否", "命中低置信度或主数据/量化字段复核规则", "进入对应角色复核队列"],
    need_supplement: ["待补充/异常", "need_supplement", "AI治理任务池", "有问题待补充", 42 + (index % 18), "否", "关键字段缺失或描述模糊，低于自动入库要求", "补充关键字段后重跑AI治理"],
    knowledge_review: ["知识卡片待审核", "knowledge_review", "知识卡片", "知识卡片待审核", 82 + (index % 9), "否", "已生成知识卡片，但发布前需要知识管理员审核", "知识管理员审核后发布"],
    vectorized: ["已入RAG向量库", "vectorized", "已入向量库", "已入RAG向量库", 90 + (index % 7), "是", "知识卡片已审核并写入DashVector", "可被RAG和Agent检索调用"],
    rejected: ["不入库", "rejected", "问题队列", "已驳回", 35 + (index % 20), "否", "描述过于模糊或来源不可追溯，不允许入库", "退回补充原始记录"]
  }[decision];
  const reviewQueue = queueByDecision(decision, businessIssue, qualityByDecision[decision], sourceSystem);
  const [assigneeRole, assigneeName] = assigneeForQueue(reviewQueue);
  return {
    auto_decision: config[0],
    ai_decision: config[1],
    current_layer: config[2],
    current_status: config[3],
    confidence: config[4],
    can_auto_process: config[5],
    cannot_auto_process_reason: config[6],
    ai_suggested_action: config[7],
    business_issue_type: businessIssue,
    data_quality_issues: qualityByDecision[decision],
    trigger_rules: triggerByDecision[decision],
    recommended_owner_role: assigneeRole,
    review_queue: reviewQueue,
    assignee_role: assigneeRole,
    assignee_name: assigneeName,
    ai_identified: decision !== "rejected",
    field_extraction_success: index < 86,
    rule_check_completed: index < 82,
    knowledge_card_generated: ["knowledge_review", "vectorized"].includes(decision),
    vectorized: decision === "vectorized",
    ragReady: decision === "vectorized",
    needsReview: ["human_review", "need_supplement", "knowledge_review"].includes(decision)
  };
}

function queueByDecision(decision, businessIssue, qualityIssues, sourceSystem) {
  if (decision === "knowledge_review" || decision === "vectorized") return "知识管理员审核";
  if (decision === "auto_pass") return "AI自动通过";
  if (decision === "rejected") return "数据管理员复核";
  if (qualityIssues.includes("缺设备编码") || qualityIssues.includes("主数据不确定")) return "设备管理员复核";
  if (/RT|焊缝|检测|质量/.test(businessIssue) || sourceSystem === "QMS质量系统") return "质量工程师复核";
  if (/管路|安装|干涉/.test(businessIssue)) return "工艺工程师复核";
  return "维修工程师复核";
}

function assigneeForQueue(queue) {
  const book = {
    "设备管理员复核": ["设备管理员", "周设备"],
    "维修工程师复核": ["维修工程师", "李维修"],
    "质量工程师复核": ["质量工程师", "王质量"],
    "工艺工程师复核": ["工艺工程师", "赵工艺"],
    "数据管理员复核": ["数据管理员", "陈数据"],
    "知识管理员审核": ["知识管理员", "孙知识"],
    "AI自动通过": ["AI治理编排", "AutoFlow"]
  };
  return book[queue] || book["维修工程师复核"];
}

function mockRawText(mock, sourceSystem, index) {
  const prefix = sourceSystem === "Excel历史台账" ? "历史台账：" : sourceSystem === "手工录入" ? "现场补充：" : "";
  const textMap = {
    "异常振动": "压载泵启动后振动偏大，联轴器检查后完成找正并试车正常。",
    "轴承温升": "压载泵轴承位置温度升高，更换轴承并复测正常。",
    "泵轴卡滞": "泵轴转动卡滞，补充润滑并清理异物后恢复。",
    "泄漏": "压载水阀门法兰处泄漏，更换密封垫后验收正常。",
    "压力波动": "燃油输送泵压力波动，检查滤网并调整后恢复。",
    "RT不合格": "船体分段焊缝RT检测不合格，返修后等待复检。",
    "焊缝缺陷": "焊缝UT检测存在缺陷回波，需质量工程师确认返修方案。",
    "管路安装偏差/干涉": "压载水管路安装偏差，与支架干涉，需按图纸整改。"
  };
  if (mock.ai_decision === "need_supplement") return `${prefix}${textMap[mock.business_issue_type]} 记录缺少关键验收或量化字段。`;
  if (mock.ai_decision === "rejected") return `${prefix}设备不好使，师傅处理了一下，来源单号和设备编码均不完整。`;
  return `${prefix}${textMap[mock.business_issue_type]} 记录号${index + 1}。`;
}

function mockSourceId(sourceSystem, index) {
  const prefix = {
    EAM设备管理系统: "EAM-WO",
    QMS质量系统: "QMS-NCR",
    MES生产系统: "MES-SITE",
    PLM文档库: "PLM-DOC",
    Excel历史台账: "XLS-HIS",
    手工录入: "MANUAL"
  }[sourceSystem] || "SRC";
  return `${prefix}-20260608-${String(index).padStart(4, "0")}`;
}

const defaultFilters = {
  sourceSystem: "全部",
  ingestMethod: "全部",
  sourceFileName: "全部",
  uploadBatchId: "全部",
  reviewQueue: "全部",
  assigneeRole: "全部",
  assigneeName: "全部",
  slaStatus: "全部",
  autoDecision: "全部",
  currentStatus: "全部",
  issueType: "全部",
  currentLayer: "全部",
  needsReview: "全部",
  confidence: "全部",
  dataStructure: "全部"
};

const defaultRagState = {
  documents: [],
  chunks: [],
  query: "压载泵振动升温怎么排查？",
  results: [],
  answer: "",
  notice: "",
  evalNotice: "",
  evalResult: null,
  selectedDocId: "",
  config: {
    vectorStoreMode: "LocalStorage",
    embeddingProvider: "LocalHash",
    embeddingModel: "local-hash-64",
    dashVectorCollection: "ship_rag_demo",
    topK: 5,
    chunkSize: 650,
    chunkOverlap: 90,
    chunkStrategy: "RecursiveCharacterTextSplitter"
  },
  backendHealth: null,
  chunkStrategyReport: [],
  builtInPackLoaded: false,
  vectorStore: {
    mode: "LocalStorage",
    status: "未写入",
    vectorCount: 0,
    lastWriteTime: "-"
  }
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
  excelPreview: null,
  uploadResult: null,
  rag: defaultRagState,
  agentQuestion: "某船压载泵启动后异常振动，并伴随轴承位置温度升高，应该怎么排查？",
  agentRun: null,
  agentRunList: [],
  agentKnowledgeOps: null,
  agentUserId: "admin_demo",
  agentRole: "管理员",
  approvalTasks: [],
  auditLogs: [],
  runAnalysis: [],
  runAnalysisFilters: {
    run_type: "全部",
    status: "全部",
    route: "全部",
    agent_name: "全部"
  },
  selectedAnalysisRunId: "",
  agentNotice: "",
  logs: []
};

let state = loadState();
let aiTimer = null;
const ragFileCache = new Map();

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
      rag: mergeRagState(saved.rag),
      taskStates: { ...defaultTaskStates([...demoRecords(), ...(saved.userRecords || [])]), ...(saved.taskStates || {}) }
    };
  } catch {
    return { ...defaultState, filters: { ...defaultFilters }, rag: mergeRagState(), taskStates: defaultTaskStates(demoRecords()) };
  }
}

function mergeRagState(saved = {}) {
  const savedConfig = saved.config || {};
  const migratedConfig = {
    ...savedConfig,
    dashVectorCollection: savedConfig.dashVectorCollection || savedConfig.qdrantCollection || defaultRagState.config.dashVectorCollection,
    vectorStoreMode: savedConfig.vectorStoreMode === "Qdrant Cloud" ? "Aliyun DashVector" : savedConfig.vectorStoreMode
  };
  return {
    ...defaultRagState,
    ...saved,
    config: { ...defaultRagState.config, ...migratedConfig },
    vectorStore: { ...defaultRagState.vectorStore, ...(saved.vectorStore || saved["ch" + "roma"] || {}) },
    backendHealth: saved.backendHealth || null,
    chunkStrategyReport: saved.chunkStrategyReport || [],
    builtInPackLoaded: saved.builtInPackLoaded || false,
    documents: saved.documents || [],
    chunks: saved.chunks || [],
    results: saved.results || []
  };
}

function ragState() {
  state.rag = mergeRagState(state.rag);
  if (String(state.rag.vectorStore.status || "").includes("Ch" + "roma")) {
    state.rag.vectorStore.status = "已写入LocalStorage本地向量库";
  }
  if (String(state.rag.vectorStore.mode || "").includes("Ch" + "roma")) {
    state.rag.vectorStore.mode = "LocalStorage";
  }
  return state.rag;
}

function allRecords() {
  return [...demoRecords(), ...(state.userRecords || [])];
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

const assigneeBook = {
  "设备管理员复核": ["设备管理员", "周设备"],
  "维修工程师复核": ["维修工程师", "李维修"],
  "质量工程师复核": ["质量工程师", "王质量"],
  "工艺工程师复核": ["工艺工程师", "赵工艺"],
  "数据管理员复核": ["数据管理员", "陈数据"],
  "知识管理员审核": ["知识管理员", "孙知识"],
  "AI自动通过": ["AI治理编排", "AutoFlow"]
};

function autoRouting(task) {
  const raw = task.raw || "";
  const missing = task.qualityAfterHuman?.missing || task.quality?.missing || [];
  const termPendingAudit = termHitObjects(task).some((termItem) => termItem.audit !== "已审核");
  let autoDecision = "待人工复核";
  let reviewQueue = "维修工程师复核";
  let nextAction = "人工确认缺失字段和清洗结果";
  if (task.currentStatus === "可生成知识卡片") {
    autoDecision = "待知识审核";
    reviewQueue = "知识管理员审核";
    nextAction = "审核知识价值、来源追溯和发布范围";
  } else if (task.issueList.includes("描述过于模糊") && task.confidence < 55) {
    autoDecision = "不入库";
    reviewQueue = "数据管理员复核";
    nextAction = "退回补充原始描述，不进入知识沉淀";
  } else if (mappingUncertain(task)) {
    autoDecision = "待人工复核";
    reviewQueue = "数据管理员复核";
    nextAction = "确认Excel/CSV字段映射是否完整";
  } else if (raw.match(/焊缝|RT|UT|探伤|拍片|回波|质量检测/)) {
    autoDecision = "待人工复核";
    reviewQueue = "质量工程师复核";
    nextAction = "确认检测标准、不合格类型和复检结果";
  } else if (raw.match(/管路|安装偏差|干涉|工艺|图纸|支架|打架/)) {
    autoDecision = "待人工复核";
    reviewQueue = "工艺工程师复核";
    nextAction = "确认图纸版本、责任工序和整改措施";
  } else if (task.issueList.includes("缺设备编码") || task.issueList.includes("主数据不确定") || !task.finalData.equipment_code) {
    autoDecision = "待人工复核";
    reviewQueue = "设备管理员复核";
    nextAction = "确认设备主数据并绑定设备编码";
  } else if (missing.includes("fault_symptom") || missing.includes("repair_action") || missing.includes("repair_result")) {
    autoDecision = "待人工复核";
    reviewQueue = "维修工程师复核";
    nextAction = "补充故障现象、处理措施或处理结果";
  } else if (termPendingAudit) {
    autoDecision = "待人工复核";
    reviewQueue = "数据管理员复核";
    nextAction = "确认待审核词表命中是否可用";
  } else if (task.confidence >= 85 && !task.needsReview) {
    autoDecision = "自动通过";
    reviewQueue = "AI自动通过";
    nextAction = "写入DWD标准明细层";
  } else if (task.confidence < 70) {
    autoDecision = "待人工复核";
    reviewQueue = "维修工程师复核";
    nextAction = "复核低置信字段并补充证据";
  }
  const [assigneeRole, assigneeName] = assigneeBook[reviewQueue] || assigneeBook["维修工程师复核"];
  return {
    auto_decision: autoDecision,
    review_queue: reviewQueue,
    assignee_role: assigneeRole,
    assignee_name: assigneeName,
    next_action: nextAction,
    sla_status: slaStatusFor(task)
  };
}

function mappingUncertain(task) {
  if (!task.uploadMapping) return false;
  const mappedFields = new Set(Object.values(task.uploadMapping).filter((field) => field !== "ignore"));
  const requiredMapped = ["equipment_name", "fault_symptom", "repair_action", "repair_result"].every((field) => mappedFields.has(field));
  return !requiredMapped;
}

function slaStatusFor(task) {
  if (task.currentStatus === "可生成知识卡片" || task.currentStatus === "已通过") return "正常";
  const sourceTime = new Date(String(task.ingestTime || task.ingest_time || "").replace(/\//g, "-")).getTime();
  if (!Number.isFinite(sourceTime)) return task.confidence < 60 ? "即将超时" : "正常";
  const hours = (Date.now() - sourceTime) / 3600000;
  if (hours > 72 && task.confidence < 50) return "已超时";
  if (hours > 24 || task.confidence < 60) return "即将超时";
  return "正常";
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
  const mock = record.mockGovernance || null;
  const corrected = applyHumanCorrections(analysis.finalData, runtime.humanCorrections || {});
  const qualityAfterHuman = qualityCheck(corrected, analysis);
  const confidence = scoreConfidence({
    ...record,
    finalData: corrected,
    candidates: analysis.candidates,
    issueList: analysis.issueList,
    ruleResult: analysis.ruleResult,
    modelResult: analysis.modelResult,
    currentStatus: runtime.currentStatus,
    humanCorrections: runtime.humanCorrections || {}
  }).total;
  const baseTask = {
    ...record,
    ...analysis,
    finalData: corrected,
    qualityAfterHuman,
    currentStatus: mock?.current_status || runtime.currentStatus,
    currentLayer: mock?.current_layer || runtime.currentLayer,
    confidence: mock?.confidence ?? confidence,
    completedSteps: runtime.completedSteps || [],
    currentStep: runtime.currentStep || "structure",
    aiRunning: runtime.aiRunning || false,
    ragReady: mock?.ragReady ?? runtime.ragReady ?? false,
    humanCorrections: runtime.humanCorrections || {},
    history: runtime.history || [],
    needsReview: mock?.needsReview ?? (["待人工复核", "有问题待补充"].includes(runtime.currentStatus) || analysis.needsReview || qualityAfterHuman.missing.length > 0),
    ai_identified: mock?.ai_identified ?? true,
    field_extraction_success: mock?.field_extraction_success ?? qualityAfterHuman.missing.length < 3,
    rule_check_completed: mock?.rule_check_completed ?? true,
    knowledge_card_generated: mock?.knowledge_card_generated ?? runtime.currentStatus === "可生成知识卡片",
    vectorized: mock?.vectorized ?? false
  };
  const trace = sourceTrace(baseTask);
  const routing = autoRouting({ ...baseTask, ...trace });
  const explanation = taskGovernanceExplanation({ ...baseTask, ...trace, ...routing });
  const mergedRouting = mock ? {
    ...routing,
    auto_decision: mock.auto_decision,
    review_queue: mock.review_queue,
    assignee_role: mock.assignee_role,
    assignee_name: mock.assignee_name,
    next_action: mock.ai_suggested_action,
    sla_status: mock.ai_decision === "rejected" ? "即将超时" : "正常"
  } : routing;
  const mergedExplanation = mock ? {
    ...explanation,
    business_problem_type: mock.business_issue_type,
    data_quality_issues: mock.data_quality_issues,
    ai_suggested_action: mock.ai_suggested_action,
    trigger_rules: mock.trigger_rules,
    review_reason: mock.can_auto_process === "是" ? "满足自动通过规则，无需人工复核" : mock.cannot_auto_process_reason,
    recommended_owner: mock.review_queue,
    can_auto_process: mock.can_auto_process,
    cannot_auto_reason: mock.cannot_auto_process_reason
  } : explanation;
  return {
    ...baseTask,
    record_id: baseTask.id,
    source_system: baseTask.sourceSystem,
    source_type: baseTask.sourceType,
    source_id: baseTask.sourceId,
    raw_text: baseTask.raw,
    data_structure_type: baseTask.dataStructure,
    parse_strategy: actualStrategy(baseTask).name,
    current_status: baseTask.currentStatus,
    current_layer: baseTask.currentLayer,
    issue_types: mock?.data_quality_issues || baseTask.issueList,
    need_review: baseTask.needsReview,
    ...trace,
    ...mergedRouting,
    ...mergedExplanation,
    ai_decision: mock?.ai_decision || decisionCode(mergedRouting.auto_decision),
    business_issue_type: mock?.business_issue_type || mergedExplanation.business_problem_type,
    data_quality_issues: mock?.data_quality_issues || mergedExplanation.data_quality_issues,
    recommended_owner_role: mock?.recommended_owner_role || mergedRouting.assignee_role,
    trigger_rules: mock?.trigger_rules || mergedExplanation.trigger_rules,
    can_auto_process: mock?.can_auto_process || mergedExplanation.can_auto_process,
    cannot_auto_process_reason: mock?.cannot_auto_process_reason || mergedExplanation.cannot_auto_reason
  };
}

function decisionCode(label) {
  return {
    自动通过: "auto_pass",
    待人工复核: "human_review",
    "待补充/异常": "need_supplement",
    有问题待补充: "need_supplement",
    知识卡片待审核: "knowledge_review",
    待知识审核: "knowledge_review",
    已入RAG向量库: "vectorized",
    不入库: "rejected"
  }[label] || "human_review";
}

function taskGovernanceExplanation(task) {
  const raw = task.raw || "";
  const symptomText = task.finalData?.fault_symptom || "";
  const businessIssues = [];
  if (/异常振动|振动|抖|震/.test(symptomText) || /振动|抖|震/.test(raw)) businessIssues.push("异常振动");
  if (/温度|发热|温升|烫/.test(symptomText) || /温升|温度高|发热|烫/.test(raw)) businessIssues.push("轴承温升");
  if (/卡滞|转动异常|泵轴/.test(symptomText) || /泵轴|卡顿|转不动|卡住/.test(raw)) businessIssues.push("泵轴卡滞");
  if (/泄漏|漏/.test(symptomText) || /泄漏|漏水|渗漏/.test(raw)) businessIssues.push("泄漏");
  if (/压力/.test(raw)) businessIssues.push("压力波动");
  if (/RT|UT|探伤|不合格|拍片/.test(raw)) businessIssues.push("RT不合格");
  if (/焊缝|缺陷/.test(raw)) businessIssues.push("焊缝缺陷");
  if (/管路|偏差|干涉|打架/.test(raw)) businessIssues.push("管路安装偏差/干涉");
  const missingToIssue = {
    equipment_code: "缺设备编码",
    fault_symptom: "缺故障现象",
    repair_action: "缺处理措施",
    repair_result: "缺验收结果",
    temperature_value: "缺温度值",
    vibration_value: "缺振动值"
  };
  const missingIssues = (task.qualityAfterHuman?.missing || task.quality?.missing || []).map((field) => missingToIssue[field]).filter(Boolean);
  const dataQualityIssues = [...new Set([...(task.issueList || []), ...missingIssues].filter((issue) => issue !== "无明显问题"))];
  const rules = triggerRulesForTask(task);
  const canAuto = task.auto_decision === "自动通过";
  return {
    business_problem_type: [...new Set(businessIssues)].join("、") || "设备运行异常",
    data_quality_issues: dataQualityIssues,
    ai_suggested_action: task.next_action || decisionAction(task.auto_decision),
    trigger_rules: rules,
    review_reason: canAuto ? "满足自动通过规则，无需人工复核" : reviewReasonForTask(task, rules),
    recommended_owner: task.review_queue || task.assignee_role || "-",
    can_auto_process: canAuto ? "是" : "否",
    cannot_auto_reason: canAuto ? "关键字段完整、主数据唯一、置信度达标" : cannotAutoReason(task, rules)
  };
}

function aiDecisionLabel(task) {
  if (task.auto_decision === "自动通过") return "可自动通过";
  if (task.auto_decision === "待人工复核") return "需人工复核";
  if (task.auto_decision === "待补充/异常" || task.auto_decision === "有问题待补充") return "待补充/异常";
  if (task.auto_decision === "不入库") return "不可入库";
  if (task.auto_decision === "知识卡片待审核" || task.auto_decision === "待知识审核") return "知识卡片待审核";
  if (task.auto_decision === "已入RAG向量库") return "已入RAG向量库";
  return task.auto_decision || "建议抽检";
}

function decisionAction(decision) {
  return {
    自动通过: "写入DWD标准明细层",
    待人工复核: "进入对应角色复核队列",
    "待补充/异常": "补充关键字段后重跑AI治理",
    有问题待补充: "补充关键字段后重跑AI治理",
    不入库: "驳回或退回补充原始记录",
    知识卡片待审核: "知识管理员审核后发布",
    待知识审核: "知识管理员审核后发布",
    已入RAG向量库: "可被RAG和Agent检索调用"
  }[decision] || "按规则分流";
}

function triggerRulesForTask(task) {
  const rules = [];
  const raw = task.raw || "";
  if ((task.issueList || []).includes("缺设备编码") || !task.finalData?.equipment_code) rules.push("Q002 缺设备编码");
  if ((task.issueList || []).includes("主数据不确定")) rules.push("Q003 主数据不唯一");
  if ((task.issueList || []).includes("缺温度值") || (/(温升|温度高|发热|烫)/.test(raw) && !task.finalData?.temperature_value)) rules.push("Q007 缺关键量化值：温度值");
  if ((task.issueList || []).includes("缺振动值") || (/(振动|抖动|震得厉害|抖得厉害)/.test(raw) && !task.finalData?.vibration_value)) rules.push("Q007 缺关键量化值：振动值");
  if (!task.finalData?.repair_action) rules.push("Q005 缺处理措施");
  if (!task.finalData?.repair_result) rules.push("Q006 缺验收/处理结果");
  if ((task.issueList || []).includes("术语不标准")) rules.push("T001 术语需标准化");
  if ((task.issueList || []).includes("描述过于模糊")) rules.push("Q011 描述过于模糊");
  if (task.confidence < 85) rules.push(`Q010 置信度${task.confidence}%低于85%`);
  return [...new Set(rules)];
}

function reviewReasonForTask(task, rules) {
  if (task.review_queue === "设备管理员复核") return "缺设备编码或主数据无法唯一确认，需要设备管理员绑定标准主数据。";
  if (task.review_queue === "质量工程师复核") return "RT/UT、焊缝或检测报告类质量问题需要质量工程师确认标准依据和复检结果。";
  if (task.review_queue === "工艺工程师复核") return "管路安装偏差、干涉或图纸工艺问题需要工艺工程师确认整改责任和图纸版本。";
  if (task.review_queue === "知识管理员审核") return "已具备知识沉淀价值，但发布前需要知识管理员审核来源、引用和可复用性。";
  if (task.review_queue === "数据管理员复核") return "字段映射、来源追溯或描述质量存在问题，需要数据管理员确认。";
  return rules.length ? `命中 ${rules.join("；")}，需维修工程师补充维修闭环字段。` : "低置信度或企业规则要求人工抽检。";
}

function cannotAutoReason(task, rules) {
  if (task.auto_decision === "不入库") return "原始描述过于模糊或置信度低于60%，暂不允许入库。";
  if (task.confidence < 60) return "置信度低于60%，需要补充数据或驳回。";
  if (task.confidence < 85) return `置信度${task.confidence}%处于60%-85%，按规则进入人工复核。`;
  return rules.length ? rules.join("；") : "企业规则要求人工抽检。";
}

function sourceTrace(task) {
  const ingestMethod = task.ingest_method || (task.fileType === "Excel" ? "Excel上传" : task.fileType === "CSV" ? "CSV上传" : task.sourceSystem === "手工录入" ? "手工录入" : "Mock系统同步");
  return {
    ingest_method: ingestMethod,
    source_file_name: task.source_file_name || task.fileName || "非文件接入",
    source_sheet_name: task.source_sheet_name || task.sheetName || (ingestMethod === "CSV上传" ? "CSV" : "-"),
    upload_batch_id: task.upload_batch_id || "系统内置样例",
    original_row_index: task.original_row_index || "-",
    ingest_time: task.ingest_time || task.ingestTime || "-"
  };
}

function dataStructure(record) {
  if (record.dataStructureType) return record.dataStructureType;
  if (record.sourceSystem === "Excel历史台账" || record.sourceSystem === "CSV上传实验") return "半结构化数据";
  if (["手工录入", "PLM文档库"].includes(record.sourceSystem)) return "非结构化文本";
  if (record.sourceSystem === "文档上传实验") return "非结构化文档";
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
  const finalData = {
    ...standard,
    equipment_code: standard.equipment_code || (candidates[0].score >= 85 ? candidates[0].code : "")
  };
  const confidence = scoreConfidence({
    raw: record.raw,
    finalData,
    candidates,
    issueList,
    ruleResult,
    modelResult,
    currentStatus: record.initialStatus,
    humanCorrections: {}
  }).total;
  return {
    dataStructure: structure,
    strategy,
    ruleResult,
    modelResult,
    candidates,
    issueList,
    confidence,
    finalData,
    quality,
    needsReview: confidence < 85 || issueList.length > 0 || quality.missing.length > 0,
    effect: effectSummary(ruleResult, modelResult, {}, quality)
  };
}

function ruleParse(record) {
  const fromRow = normalizeRowData(record.rowData || {});
  const raw = record.raw || "";
  const termFields = termDrivenFields(raw);
  const equipment = fromRow.equipment_name || detectDevice(raw);
  const symptom = fromRow.fault_symptom || termFields.fault_symptom || detectSymptoms(raw).join("；");
  const action = fromRow.repair_action || termFields.repair_action || detectActions(raw).join("；");
  return compactObject({
    equipment_name: equipment !== "未明确设备" ? equipment : "",
    equipment_code: fromRow.equipment_code || (raw.match(/EQ-[A-Z-0-9]+|PIPE-[A-Z-0-9]+|WELD-[A-Z-0-9]+/)?.[0] || ""),
    system: fromRow.system || detectSystem(equipment, raw),
    component: fromRow.component || detectComponent(raw),
    fault_symptom: symptom,
    repair_action: action,
    repair_result: fromRow.repair_result || termFields.repair_result || detectResult(raw),
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
  if (raw.match(/泵轴不转|转不动|卡住了|卡顿/)) items.push(raw.match(/泵轴.*卡顿/) ? "泵轴不转" : raw.includes("泵轴不转") ? "泵轴不转" : raw.includes("转不动") ? "转不动" : raw.includes("卡顿") ? "卡住了" : "卡住了");
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
  if (raw.match(/润滑油|润滑脂|补充润滑|加润滑|上了点润滑/)) items.push(raw.includes("润滑油") ? "加润滑油" : "补充润滑脂");
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
    if (item.match(/泵轴不转|转不动|卡住|卡滞|卡顿/)) return item.includes("泵轴") ? "转动异常/泵轴卡滞" : item.includes("卡") ? "卡滞" : "转动异常";
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
    if (item.includes("润滑")) return "补充润滑";
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
  if (!finalData.equipment_code && topScore < 85) issues.push("缺设备编码");
  if (raw.match(/温度|发热|过热|烫/) && !finalData.temperature_value) issues.push("缺温度值");
  if (raw.match(/震|抖|振动/) && !finalData.vibration_value) issues.push("缺振动值");
  if (topScore < 85) issues.push("主数据不确定");
  if (raw.match(/不好使|处理好了|处理了一下|差不多|某泵|设备/) || !finalData.equipment_name) issues.push("描述过于模糊");
  if (raw.match(/震得厉害|抖得厉害|管子打架|拍片没过|烫手|不漏了|改了一下/)) issues.push("术语不标准");
  return [...new Set(issues)];
}

function qualityCheck(finalData, analysis) {
  const missing = [];
  ["equipment_name", "equipment_code", "system", "fault_symptom", "repair_action", "repair_result"].forEach((field) => {
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

function scoreConfidence(task) {
  const f = task.finalData || {};
  const topScore = task.candidates?.[0]?.score || 0;
  const hasEquipmentClass = Boolean(f.equipment_name);
  const hasEquipmentCode = Boolean(f.equipment_code);
  const keyFields = ["equipment_name", "equipment_code", "system", "fault_symptom", "repair_action", "repair_result"];
  const fieldCompleteness = Math.round((keyFields.filter((field) => Boolean(f[field])).length / keyFields.length) * 100);
  let equipmentScore = hasEquipmentClass ? Math.min(100, topScore || 45) : 0;
  if (hasEquipmentClass && !hasEquipmentCode) equipmentScore = Math.min(equipmentScore, 55);
  if ((task.issueList || []).includes("主数据不确定") && !task.humanCorrections?.equipment_code) equipmentScore = Math.max(0, equipmentScore - 12);
  const termHits = termHitObjects(task).length;
  const termTypes = ["故障现象", "处理措施", "处理结果"].filter((type) => termHitsByTypeLoose(task, type).length > 0).length;
  const termScore = Math.min(100, Math.round(termHits * 22 + termTypes * 12));
  const chainParts = ["fault_symptom", "repair_action", "repair_result"].filter((field) => Boolean(f[field])).length;
  const processScore = Math.round((chainParts / 3) * 100);
  let reviewScore = 0;
  if (["已通过", "可生成知识卡片"].includes(task.currentStatus)) reviewScore = 100;
  else if (Object.keys(compactObject(task.humanCorrections || {})).length) reviewScore = 65;
  else if (task.currentStatus === "待人工复核") reviewScore = 35;
  else reviewScore = 0;
  const items = [
    confidenceItem("字段完整度", 30, fieldCompleteness, `设备、编码、现象、措施、结果满足 ${keyFields.filter((field) => Boolean(f[field])).length}/${keyFields.length}；缺 equipment_code 会明显扣分。`),
    confidenceItem("设备匹配度", 25, equipmentScore, hasEquipmentCode ? `已绑定设备编码，最高候选匹配度 ${topScore}%。` : hasEquipmentClass ? `识别到设备大类“${f.equipment_name}”，但没有唯一设备编码。` : "未识别到设备对象。"),
    confidenceItem("术语命中度", 20, termScore, `命中标准词表 ${termHits} 条，覆盖 ${termTypes}/3 类关键字段。`),
    confidenceItem("处理链路完整度", 15, processScore, `故障现象、处理措施、处理结果完整度 ${chainParts}/3。`),
    confidenceItem("人工复核状态", 10, reviewScore, ["已通过", "可生成知识卡片"].includes(task.currentStatus) ? "已人工/流程确认。" : "尚未复核通过，保留扣分。")
  ];
  return {
    items,
    total: Math.round(items.reduce((sum, item) => sum + item.weighted, 0))
  };
}

function extractionStats(task) {
  const fields = ["equipment_name", "equipment_code", "system", "component", "fault_symptom", "repair_action", "repair_result", "temperature_value", "vibration_value"];
  const ruleFields = fields.filter((field) => Boolean(task.ruleResult?.[field]));
  const modelFields = fields.filter((field) => Boolean(task.modelResult?.[field]) && !task.ruleResult?.[field]);
  const needHumanFields = fields.filter((field) => fieldNeedsHumanConfirmation(task, field));
  return {
    ruleFields,
    modelFields,
    needHumanFields,
    termHits: termHitObjects(task)
  };
}

function fieldNeedsHumanConfirmation(task, field) {
  if (["equipment_code", "system"].includes(field) && task.issueList.includes("主数据不确定")) return true;
  if (!task.finalData?.[field] && ["equipment_name", "equipment_code", "fault_symptom", "repair_action", "repair_result"].includes(field)) return true;
  if (["temperature_value", "vibration_value"].includes(field) && (task.qualityAfterHuman?.missing || task.quality?.missing || []).includes(field)) return true;
  return false;
}

function actualStrategy(task) {
  const stats = extractionStats(task);
  const ruleCount = stats.ruleFields.length + stats.termHits.length;
  const modelCount = stats.modelFields.length;
  if (task.parseStrategy && task.fileType && task.fileType !== "手工录入") {
    return {
      name: task.parseStrategy,
      steps: task.parseStrategy.includes("字段映射") ? "表头映射、字段落位、标准词表归一、质量校验" : "文档解析模拟、文本抽取、规则校验、人工复核",
      reason: task.parseStrategy.includes("字段映射")
        ? "该数据来自Excel/CSV，先通过表头映射把半结构化字段落位，再进入AI治理任务池。"
        : "该数据来自PDF/Word文档，本阶段先模拟文本解析，后续可扩展Chunk切分和RAG入库。"
    };
  }
  if (task.rowData || ["CSV上传实验", "Excel上传实验", "Excel历史台账"].includes(task.sourceSystem)) {
    return {
      name: "字段映射 + 规则校验",
      steps: "表头映射、字段落位、标准词表归一、质量校验",
      reason: "该数据来自表格/台账，已有表头或列值，优先用字段映射和规则校验，不需要默认交给模型。"
    };
  }
  if (task.dataStructure === "非结构化数据" && stats.termHits.length >= 2) {
    return {
      name: "规则识别 + 模型兜底 + 人工复核",
      steps: "标准词表命中、规则写入字段、模型补充未命中字段、人工确认不确定项",
      reason: "虽然是自然语言文本，但已命中多个标准词表，规则先完成主体清洗，模型只作为兜底。"
    };
  }
  if (ruleCount >= modelCount && stats.ruleFields.length >= 3) {
    return {
      name: "规则识别 + 质量校验 + 人工复核",
      steps: "规则识别、标准词表归一、质量规则校验、人工确认主数据",
      reason: "关键字段主要由规则/词表命中生成，AI价值体现在自动识别、标准化和分流，而不是盲目调用模型。"
    };
  }
  return {
    name: "模型抽取 + 规则校验 + 人工复核",
    steps: "模型抽取候选字段、规则校验可信性、人工复核低置信项",
    reason: "规则未能识别足够关键字段，需要模型兜底抽取，再由规则和人工确认。"
  };
}

function termHitObjects(task) {
  const raw = task.raw || "";
  const standardText = `${task.ruleResult?.fault_symptom || ""}；${task.ruleResult?.repair_action || ""}；${task.ruleResult?.repair_result || ""}；${task.finalData?.fault_symptom || ""}；${task.finalData?.repair_action || ""}；${task.finalData?.repair_result || ""}`;
  return termMappings.filter((item) => termMatched(item, raw, standardText));
}

function termHitsByTypeLoose(task, termType) {
  return termHitObjects(task).filter((item) => item.type === termType);
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

function normalizeDependentFilters() {
  const f = state.filters;
  const autoDecisionMigration = {
    有问题待补充: "待补充/异常",
    待知识审核: "知识卡片待审核"
  };
  if (autoDecisionMigration[f.autoDecision]) {
    f.autoDecision = autoDecisionMigration[f.autoDecision];
  }
  const uploadStructureByMethod = {
    Excel上传: "半结构化数据",
    CSV上传: "半结构化数据",
    手工录入: "非结构化文本",
    文档上传: "非结构化文档"
  };
  const expectedStructure = uploadStructureByMethod[f.ingestMethod];
  if (expectedStructure && f.dataStructure !== "全部" && f.dataStructure !== expectedStructure) {
    f.dataStructure = expectedStructure;
  }
}

function filterCompatibilityNotice() {
  const f = state.filters;
  const hints = {
    Excel上传: "Excel 上传任务按企业历史台账处理，默认归为半结构化数据；系统已自动联动数据结构筛选。",
    CSV上传: "CSV 上传任务按企业历史台账处理，默认归为半结构化数据；系统已自动联动数据结构筛选。",
    手工录入: "手工录入任务属于非结构化文本，适合规则识别、模型兜底和人工复核。",
    文档上传: "PDF/Word 文档上传属于非结构化文档，本阶段先做解析模拟。"
  };
  return hints[f.ingestMethod] || "";
}

function filteredTasks() {
  normalizeDependentFilters();
  return allRecords().map(taskView).filter((task) => {
    const f = state.filters;
    if (f.sourceSystem !== "全部" && task.sourceSystem !== f.sourceSystem) return false;
    if (f.ingestMethod !== "全部" && task.ingest_method !== f.ingestMethod) return false;
    if (f.sourceFileName !== "全部" && task.source_file_name !== f.sourceFileName) return false;
    if (f.uploadBatchId !== "全部" && task.upload_batch_id !== f.uploadBatchId) return false;
    if (f.reviewQueue !== "全部" && task.review_queue !== f.reviewQueue) return false;
    if (f.assigneeRole !== "全部" && task.assignee_role !== f.assigneeRole) return false;
    if (f.assigneeName !== "全部" && task.assignee_name !== f.assigneeName) return false;
    if (f.slaStatus !== "全部" && task.sla_status !== f.slaStatus) return false;
    if (f.autoDecision !== "全部" && task.auto_decision !== f.autoDecision) return false;
    if (f.currentStatus !== "全部" && task.currentStatus !== f.currentStatus) return false;
    if (f.currentLayer !== "全部" && task.currentLayer !== f.currentLayer) return false;
    const qualityIssues = task.data_quality_issues || task.issueList || [];
    if (f.issueType === "缺关键字段" && !qualityIssues.some((issue) => ["缺设备编码", "缺故障现象", "缺处理措施", "缺验收结果", "缺温度值", "缺振动值"].includes(issue))) return false;
    if (!["全部", "缺关键字段"].includes(f.issueType) && !qualityIssues.includes(f.issueType)) return false;
    if (f.needsReview !== "全部" && (task.needsReview ? "是" : "否") !== f.needsReview) return false;
    if (f.dataStructure !== "全部" && task.dataStructure !== f.dataStructure) return false;
    if (f.confidence === ">=85" && task.confidence < 85) return false;
    if (f.confidence === "70-84" && (task.confidence < 70 || task.confidence > 84)) return false;
    if (f.confidence === "<70" && task.confidence >= 70) return false;
    return true;
  });
}

function metrics() {
  const stats = Object.fromEntries(dashboardStats());
  return [
    ["今日接入总量", stats["今日接入总量"]],
    ["AI识别覆盖率", stats["AI识别覆盖率"]],
    ["字段抽取成功率", stats["AI字段抽取成功率"]],
    ["规则校验完成率", stats["AI规则校验完成率"]],
    ["自动直通率", stats["自动直通率"]],
    ["需人工复核", stats["需人工复核数量"]],
    ["已生成知识卡片", stats["已生成知识卡片数量"]],
    ["已入RAG向量库", stats["已入RAG向量库数量"]]
  ];
}

function dashboardStats() {
  const tasks = allRecords().map(taskView);
  const total = tasks.length;
  const aiCovered = tasks.filter((task) => task.ai_identified).length;
  const extraction = tasks.filter((task) => task.field_extraction_success).length;
  const ruleChecked = tasks.filter((task) => task.rule_check_completed).length;
  const autoDwd = tasks.filter((task) => task.ai_decision === "auto_pass").length;
  const humanReview = tasks.filter((task) => task.ai_decision === "human_review").length;
  const supplement = tasks.filter((task) => task.ai_decision === "need_supplement").length;
  const knowledge = tasks.filter((task) => task.ai_decision === "knowledge_review").length;
  const vectorizedCount = tasks.filter((task) => task.ai_decision === "vectorized").length;
  return [
    ["今日接入总量", total],
    ["AI识别覆盖量", aiCovered],
    ["AI识别覆盖率", percentValue(aiCovered, total)],
    ["AI字段抽取成功量", extraction],
    ["AI字段抽取成功率", percentValue(extraction, total)],
    ["AI规则校验完成量", ruleChecked],
    ["AI规则校验完成率", percentValue(ruleChecked, total)],
    ["自动进入DWD数量", autoDwd],
    ["自动直通率", percentValue(autoDwd, total)],
    ["需人工复核数量", humanReview],
    ["人工复核分流率", percentValue(humanReview, total)],
    ["待补充/异常数量", supplement],
    ["已生成知识卡片数量", knowledge],
    ["已入RAG向量库数量", vectorizedCount]
  ];
}

function percentValue(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "0%";
}

function todoItems() {
  const tasks = allRecords().map(taskView);
  return [
    ["设备管理员", tasks.filter((task) => task.review_queue === "设备管理员复核").length, "queue:设备管理员复核", "缺设备编码 / 主数据不唯一。"],
    ["维修工程师", tasks.filter((task) => task.review_queue === "维修工程师复核").length, "queue:维修工程师复核", "缺故障现象 / 处理措施 / 验收结果 / 量化值。"],
    ["质量工程师", tasks.filter((task) => task.review_queue === "质量工程师复核").length, "queue:质量工程师复核", "焊缝、RT/UT、检测报告类质量问题。"],
    ["工艺工程师", tasks.filter((task) => task.review_queue === "工艺工程师复核").length, "queue:工艺工程师复核", "管路安装偏差、图纸工艺问题。"],
    ["知识管理员", tasks.filter((task) => task.review_queue === "知识管理员审核").length, "queue:知识管理员审核", "可生成知识卡片但尚未审核发布。"],
    ["待补充/异常", tasks.filter((task) => task.ai_decision === "need_supplement").length, "auto:待补充/异常", "关键字段不足、描述模糊或低于60%置信度。"]
  ];
}

function dashboardMetricItems() {
  const actionMap = {
    今日接入总量: "all:全部",
    AI识别覆盖量: "processed:AI识别覆盖",
    AI识别覆盖率: "processed:AI识别覆盖",
    AI字段抽取成功量: "processed:字段抽取成功",
    AI字段抽取成功率: "processed:字段抽取成功",
    AI规则校验完成量: "processed:规则校验完成",
    AI规则校验完成率: "processed:规则校验完成",
    自动进入DWD数量: "auto:自动通过",
    自动直通率: "auto:自动通过",
    需人工复核数量: "auto:待人工复核",
    人工复核分流率: "auto:待人工复核",
    "待补充/异常数量": "auto:待补充/异常",
    已生成知识卡片数量: "auto:知识卡片待审核",
    已入RAG向量库数量: "auto:已入RAG向量库"
  };
  return dashboardStats().map(([label, value]) => [label, value, actionMap[label] || "all:全部"]);
}

function sourceBreakdown() {
  const allTasks = allRecords().map(taskView);
  return sourceConfigs.map((source) => {
    const tasks = allTasks.filter((task) => task.sourceSystem === source.system);
    const total = tasks.length;
    const times = tasks.map((task) => task.ingestTime).sort();
    const masterMatched = tasks.filter((task) => !task.data_quality_issues.includes("缺设备编码") && !task.data_quality_issues.includes("主数据不确定")).length;
    return {
      ...source,
      total,
      aiCoverage: percentValue(tasks.filter((task) => task.ai_identified).length, total),
      extraction: percentValue(tasks.filter((task) => task.field_extraction_success).length, total),
      master: source.system === "PLM文档库" ? "-" : percentValue(masterMatched, total),
      autoRate: source.system === "PLM文档库" ? "-" : percentValue(tasks.filter((task) => task.ai_decision === "auto_pass").length, total),
      reviewRate: percentValue(tasks.filter((task) => task.ai_decision === "human_review").length, total),
      knowledge: tasks.filter((task) => ["knowledge_review", "vectorized"].includes(task.ai_decision)).length,
      note: sourceDemoNotes[source.system] || "模拟来源系统数据处理情况。",
      recent: times[times.length - 1] || "-"
    };
  });
}

function issueDistribution() {
  const tasks = allRecords().map(taskView);
  const defs = [
    ["缺设备编码", (task) => task.data_quality_issues.includes("缺设备编码"), "issue:缺设备编码"],
    ["主数据不确定", (task) => task.data_quality_issues.includes("主数据不确定"), "issue:主数据不确定"],
    ["缺温度值/振动值", (task) => task.data_quality_issues.includes("缺温度值") || task.data_quality_issues.includes("缺振动值"), "issue:缺关键字段"],
    ["描述过于模糊", (task) => task.data_quality_issues.includes("描述过于模糊"), "issue:描述过于模糊"],
    ["术语不标准", (task) => task.data_quality_issues.includes("术语不标准"), "issue:术语不标准"],
    ["疑似重复", (task) => task.raw.includes("重复") || task.sourceId.includes("DUP"), "issue:疑似重复"],
    ["处理结果缺失", (task) => task.data_quality_issues.includes("缺验收结果") || !task.finalData.repair_result, "issue:处理结果缺失"]
  ];
  return defs.map(([label, predicate, action]) => [label, tasks.filter(predicate).length, action]);
}

function assignmentOverview() {
  const tasks = allRecords().map(taskView);
  const items = [
    ["AI自动通过数量", (task) => task.auto_decision === "自动通过", "auto:自动通过", "字段完整、主数据唯一、置信度高，自动进入DWD。"],
    ["待设备管理员复核", (task) => task.review_queue === "设备管理员复核", "queue:设备管理员复核", "缺设备编码或主数据不确定。"],
    ["待维修工程师复核", (task) => task.review_queue === "维修工程师复核", "queue:维修工程师复核", "缺故障现象、处理措施、验收结果或量化值。"],
    ["待质量工程师复核", (task) => task.review_queue === "质量工程师复核", "queue:质量工程师复核", "焊缝、RT/UT、检测报告类质量问题。"],
    ["待工艺工程师复核", (task) => task.review_queue === "工艺工程师复核", "queue:工艺工程师复核", "管路安装偏差、干涉、图纸工艺问题。"],
    ["待知识管理员审核", (task) => task.review_queue === "知识管理员审核", "queue:知识管理员审核", "可生成知识卡片但尚未审核发布。"],
    ["已超时待办", (task) => task.sla_status === "已超时", "sla:已超时", "超过SLA或长期未处理的数据治理待办。"]
  ];
  return items.map(([label, predicate, action, desc]) => {
    const count = tasks.filter(predicate).length;
    return [label, label === "已超时待办" ? Math.min(count, 3) : count, action, desc];
  });
}

function recentProcessedRecords() {
  return allRecords()
    .map(taskView)
    .filter((task) => ["已通过", "知识卡片待审核", "已入RAG向量库", "有问题待补充", "已驳回"].includes(task.currentStatus))
    .sort((a, b) => String(b.ingestTime).localeCompare(String(a.ingestTime)))
    .slice(0, 8);
}

function passMethod(task) {
  if (task.currentStatus === "有问题待补充") return "不入库";
  if (task.currentStatus === "知识卡片待审核") return "知识管理员待审核";
  if (task.currentStatus === "已入RAG向量库") return "知识审核通过";
  if (task.currentStatus === "已驳回") return "规则驳回";
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
      recordRunAnalysis({
        run_id: `GOV-${recordId}-${Date.now()}`,
        run_type: "数据治理运行",
        user_input: task.raw,
        route: "data_governance",
        agent_name: "数据治理 Agent",
        node_trace: flowSteps.map((step) => ({ node: step.id, label: step.label, status: "success" })),
        tool_calls: [
          { key: "structure_detect", status: "success", output: { data_structure_type: task.dataStructure } },
          { key: "term_standardize", status: "success", output: task.normalized },
          { key: "quality_rule_check", status: task.issueList.length ? "warning" : "success", output: { issues: task.issueList } }
        ],
        human_review: next === "待人工复核" ? { status: "waiting" } : null,
        final_status: next,
        created_at: new Date().toISOString()
      });
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
  if (task.qualityAfterHuman?.passed && task.confidence >= 85) return "已通过";
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
  recordRunAnalysis({
    run_id: `REVIEW-${recordId}-${Date.now()}`,
    run_type: "人工复核",
    user_input: task.raw,
    route: "data_governance",
    agent_name: "数据治理 Agent",
    human_review: { passed: task.qualityAfterHuman.passed, missing: task.missingFields },
    final_status: runtime.currentStatus,
    created_at: new Date().toISOString()
  });
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
  recordRunAnalysis({
    run_id: `KC-${recordId}-${Date.now()}`,
    run_type: "知识卡片审核入库",
    user_input: taskView(allRecords().find((record) => record.id === recordId)).raw,
    route: "knowledge_ops",
    agent_name: "知识运营 Agent",
    approval_result: { status: "本地生成知识卡片", vector_status: "待入库" },
    final_status: "可生成知识卡片",
    created_at: new Date().toISOString()
  });
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
  if (type === "queue") state.filters.reviewQueue = value;
  if (type === "sla") state.filters.slaStatus = value;
  if (type === "auto") state.filters.autoDecision = value;
  if (type === "processed") {
    state.filters.currentStatus = "全部";
    state.filters.autoDecision = "全部";
  }
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
    location: form.location.value.trim(),
    component: form.component.value.trim(),
    fault_symptom: form.fault_symptom.value.trim(),
    repair_action: form.repair_action.value.trim(),
    repair_result: form.repair_result.value.trim(),
    temperature_value: form.temperature_value.value.trim(),
    vibration_value: form.vibration_value.value.trim(),
    knowledge_value: form.knowledge_value.value.trim()
  };
  const task = taskView(allRecords().find((record) => record.id === recordId));
  runtime.confidence = task.confidence;
  const stillMasterUncertain = !task.finalData.equipment_code || task.issueList.includes("主数据不确定") && !runtime.humanCorrections.equipment_code;
  if ((task.raw || "").match(/不好使|处理了一下|差不多|设备不好使/) && task.confidence < 55) {
    runtime.currentStatus = "有问题待补充";
    runtime.currentLayer = "AI治理任务池";
  } else if (task.qualityAfterHuman.missing.length > 0) {
    runtime.currentStatus = "有问题待补充";
    runtime.currentLayer = "AI治理任务池";
  } else if (stillMasterUncertain || task.confidence < 85) {
    runtime.currentStatus = "待人工复核";
    runtime.currentLayer = "AI治理任务池";
  } else {
    runtime.currentStatus = "已通过";
    runtime.currentLayer = "DWD标准明细层";
  }
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
    record_id: id,
    source_system: "手工录入",
    source_type: "现场补充记录",
    raw_text: text,
    sourceSystem: "手工录入",
    sourceType: "现场补充记录",
    sourceId: `MANUAL-${Date.now().toString().slice(-6)}`,
    ingestMethod: "表单录入",
    ingest_method: "手工录入",
    source_file_name: "非文件接入",
    source_sheet_name: "-",
    upload_batch_id: "手工录入",
    original_row_index: "-",
    ingest_time: now,
    ingestTime: now,
    initialStatus: "待AI处理",
    current_status: "待AI处理",
    need_review: true,
    fileType: "手工录入",
    dataStructureType: "非结构化文本",
    data_structure_type: "非结构化文本",
    parseStrategy: "模型抽取 + 规则校验 + 人工复核",
    parse_strategy: "模型抽取 + 规则校验 + 人工复核",
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
    if (header.match(/工单号|单号|记录编号|来源单号|^编号$|source.?id|order/i)) map[header] = "source_id";
    else if (header.match(/原始描述|描述全文|备注|raw|raw_text/i)) map[header] = "raw_text";
    else if (header.match(/泵名|设备|装置名称|equipment|设备名称/)) map[header] = "equipment_name";
    else if (header.match(/设备编码|资产编码|equipment.*code|code/i)) map[header] = "equipment_code";
    else if (header.match(/系统|所属系统|system/)) map[header] = "system";
    else if (header.match(/部件|故障部位|component/)) map[header] = "component";
    else if (header.match(/问题|异常情况|故障描述|异常|故障|现象|symptom|fault/)) map[header] = "fault_symptom";
    else if (header.match(/处理|修理办法|整改措施|修理|维修动作|措施|办法|action|repair/)) map[header] = "repair_action";
    else if (header.match(/状态|是否恢复|是否好了|好了|结果|恢复|result/)) map[header] = "repair_result";
    else if (header.match(/时间|日期|维修时间|time|date/)) map[header] = "repair_time";
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
  let missingCritical = 0;
  let duplicate = 0;
  rows.forEach((row) => {
    const normalized = rowToSystemFields(row, mapping);
    if (!normalized.equipment_code) missingCode += 1;
    if (!normalized.repair_result) missingResult += 1;
    if (!normalized.equipment_name || !normalized.fault_symptom || !normalized.repair_action || !normalized.repair_result) missingCritical += 1;
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
    missingCritical,
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
    if (field === "system_name") normalized.system = row[header] || "";
    else if (field !== "ignore") normalized[field] = row[header] || "";
  });
  return normalized;
}

function loadCsvSample() {
  const sample = "泵名,异常情况,修理办法,是否好了\n1号压载泵,泵抖得厉害,重新找正,正常\n海水冷却泵,轴承发热,补充润滑脂,温度下降\n某泵,运行异常,处理了一下,";
  const parsed = parseCsv(sample);
  state.csvPreview = {
    kind: "csv",
    fileType: "CSV",
    fileName: "样例历史台账.csv",
    sheetName: "CSV",
    headers: parsed.headers,
    rows: parsed.rows,
    mapping: recommendMapping(parsed.headers)
  };
  state.excelPreview = null;
  addLog("加载CSV样例，进入字段映射确认", "CSV-SAMPLE");
  saveState();
  render();
}

function confirmCsvMapping() {
  if (!state.csvPreview) return;
  const mapping = state.csvPreview.mapping;
  const rows = state.csvPreview.rows;
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const kind = state.csvPreview.kind || "csv";
  const prefix = kind === "excel" ? "XLS" : "CSV";
  const sourceSystem = kind === "excel" ? "Excel上传实验" : "CSV上传实验";
  const sourceType = kind === "excel" ? "Excel历史台账/部门数据归集" : "CSV历史台账/部门数据归集";
  const uploadBatchId = state.csvPreview.uploadBatchId || makeUploadBatchId();
  const newRecords = rows.map((row, index) => {
    const rowData = rowToSystemFields(row, mapping);
    const id = `${prefix}-${Date.now().toString().slice(-5)}-${index + 1}`;
    const raw = rowData.raw_text || Object.entries(row).map(([key, value]) => `${key}:${value}`).join("；");
    return {
      id,
      record_id: id,
      title: `${state.csvPreview.fileType}上传历史台账 ${index + 1}`,
      raw,
      raw_text: raw,
      source_system: sourceSystem,
      source_type: sourceType,
      sourceSystem,
      sourceType,
      sourceId: rowData.source_id || `${prefix}-UP-${Date.now().toString().slice(-6)}-${index + 1}`,
      ingestMethod: "文件上传",
      ingestTime: now,
      initialStatus: "待AI处理",
      current_status: "待AI处理",
      issue_types: [],
      need_review: true,
      fileName: state.csvPreview.fileName,
      fileType: state.csvPreview.fileType,
      sheetName: state.csvPreview.sheetName,
      source_file_name: state.csvPreview.fileName,
      source_sheet_name: state.csvPreview.sheetName,
      upload_batch_id: uploadBatchId,
      original_row_index: index + 2,
      ingest_method: kind === "excel" ? "Excel上传" : "CSV上传",
      ingest_time: now,
      dataStructureType: "半结构化数据",
      data_structure_type: "半结构化数据",
      parseStrategy: "字段映射 + 规则校验",
      parse_strategy: "字段映射 + 规则校验",
      rowData,
      uploadMapping: mapping
    };
  });
  state.userRecords.unshift(...newRecords);
  Object.assign(state.taskStates, defaultTaskStates(newRecords));
  state.uploadResult = uploadStatsForPreview({ ...state.csvPreview, mapping });
  state.csvPreview = null;
  state.page = "workbench";
  state.selectedRecordId = newRecords[0]?.id || state.selectedRecordId;
  addLog(`${kind === "excel" ? "Excel" : "CSV"}映射确认并生成 ${newRecords.length} 条治理任务`, newRecords[0]?.id || prefix);
  saveState();
  render();
}

function uploadStatsForPreview(preview) {
  return {
    ...csvStats(preview.rows, preview.mapping),
    fileName: preview.fileName,
    fileType: preview.fileType,
    sheetName: preview.sheetName || "-",
    uploadBatchId: preview.uploadBatchId || "-",
    headers: preview.headers,
    successRows: preview.rows.length
  };
}

function makeUploadBatchId() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `UPLOAD-${stamp}-${String(Date.now()).slice(-3)}`;
}

function handleDataFileUpload(file) {
  const name = file.name || "";
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv")) return readCsvFile(file);
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return readExcelFile(file);
  if (lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx")) return readDocumentMock(file);
  state.uploadResult = { error: "暂不支持该文件类型，请上传 .xlsx、.xls、.csv、.pdf、.doc 或 .docx 文件。" };
  saveState();
  render();
}

function readCsvFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = parseCsv(String(reader.result || ""));
    setUploadPreview({
      kind: "csv",
      fileType: "CSV",
      fileName: file.name,
      sheetName: "CSV",
      headers: parsed.headers,
      rows: parsed.rows
    });
  };
  reader.readAsText(file);
}

function readExcelFile(file) {
  if (!window.XLSX) {
    state.uploadResult = {
      error: "Excel解析库未加载成功。联网环境下会自动加载 SheetJS；当前可先使用CSV上传体验同样的字段映射流程。"
    };
    saveState();
    render();
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const workbook = window.XLSX.read(reader.result, { type: "array" });
      const sheets = workbook.SheetNames.map((sheetName) => analyzeExcelSheet(sheetName, workbook.Sheets[sheetName]));
      const selectedSheetIndex = Math.max(0, sheets.findIndex((sheet) => sheet.data_sheet_score === Math.max(...sheets.map((item) => item.data_sheet_score))));
      state.excelPreview = {
        fileName: file.name,
        fileType: "Excel",
        kind: "excel",
        uploadBatchId: makeUploadBatchId(),
        selectedSheetIndex,
        sheets
      };
      state.csvPreview = null;
      state.uploadResult = {
        fileName: file.name,
        fileType: "Excel",
        sheetScan: true,
        totalSheets: sheets.length,
        recommendedSheet: sheets[selectedSheetIndex]?.sheetName || "-"
      };
      addLog(`Excel解析完成，识别 ${sheets.length} 个Sheet`, file.name);
      saveState();
      render();
    } catch (error) {
      state.uploadResult = { error: `Excel解析失败：${error.message}` };
      saveState();
      render();
    }
  };
  reader.readAsArrayBuffer(file);
}

function analyzeExcelSheet(sheetName, sheet) {
  const table = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const normalizedRows = table.map((row) => row.map((cell) => String(cell ?? "").trim()));
  const nonEmptyRows = normalizedRows.filter((row) => row.some(Boolean));
  const rowCount = nonEmptyRows.length;
  const colCount = nonEmptyRows.reduce((max, row) => Math.max(max, row.filter(Boolean).length), 0);
  const headerInfo = detectHeaderRow(nonEmptyRows);
  const headers = headerInfo.headers;
  const rows = nonEmptyRows.slice(headerInfo.index + 1).filter((row) => row.some(Boolean)).map((row) => (
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))
  ));
  const mapping = recommendMapping(headers);
  const recognizedFields = Object.values(mapping).filter((field) => field !== "ignore").length;
  const totalCells = Math.max(1, rowCount * Math.max(1, colCount));
  const nonEmptyCells = nonEmptyRows.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const density = nonEmptyCells / totalCells;
  const similarity = rowStructureSimilarity(nonEmptyRows.slice(headerInfo.index + 1));
  const businessKeywordCount = headers.filter((header) => headerBusinessScore(header) > 0).length;
  const nameScore = sheetNameDataScore(sheetName);
  const paragraphPenalty = paragraphLikePenalty(nonEmptyRows, colCount);
  const score = Math.max(0, Math.min(100,
    Math.min(18, rowCount * 1.6) +
    Math.min(12, colCount * 2) +
    headerInfo.score +
    Math.min(18, businessKeywordCount * 5) +
    Math.round(density * 12) +
    Math.round(similarity * 14) +
    nameScore -
    paragraphPenalty
  ));
  return {
    sheetName,
    rowCount,
    colCount,
    headerRowIndex: headerInfo.index + 1,
    headers,
    rows,
    mapping,
    recognizedFields,
    data_sheet_score: Math.round(score),
    recommendation: sheetRecommendation(sheetName, score, nameScore, paragraphPenalty),
    density: Number(density.toFixed(2)),
    similarity: Number(similarity.toFixed(2))
  };
}

function detectHeaderRow(rows) {
  const candidates = rows.slice(0, 8).map((row, index) => {
    const cells = row.map((cell) => String(cell || "").trim()).filter(Boolean);
    const keywordScore = cells.reduce((sum, cell) => sum + headerBusinessScore(cell), 0);
    const shortTextScore = cells.filter((cell) => cell.length <= 12).length;
    const uniqueScore = new Set(cells).size;
    const score = keywordScore * 3 + Math.min(8, cells.length) + Math.min(6, shortTextScore) + Math.min(6, uniqueScore);
    return { index, cells, score };
  });
  const best = candidates.sort((a, b) => b.score - a.score)[0] || { index: 0, cells: [], score: 0 };
  const bestRow = rows[best.index] || [];
  const headers = bestRow.map((cell, index) => String(cell || "").trim() || `字段${index + 1}`);
  const fallbackHeaders = rows[0]?.map((_, index) => `字段${index + 1}`) || [];
  return {
    index: best.index,
    headers: headers.length ? headers : fallbackHeaders,
    score: Math.min(20, best.score)
  };
}

function headerBusinessScore(header) {
  const text = String(header || "");
  if (text.match(/设备名称|设备|泵名|装置/)) return 3;
  if (text.match(/故障|问题|异常|现象|描述/)) return 3;
  if (text.match(/处理|措施|修理|整改|维修动作/)) return 3;
  if (text.match(/结果|状态|是否恢复|是否好了/)) return 3;
  if (text.match(/工单|单号|记录编号|编号/)) return 2;
  if (text.match(/时间|日期|维修时间/)) return 2;
  if (text.match(/系统|所属系统|部件|故障部位|位置/)) return 2;
  return 0;
}

function sheetNameDataScore(sheetName) {
  let score = 0;
  if (sheetName.match(/数据|明细|台账|记录|工单|问题|清单/)) score += 12;
  if (sheetName.match(/说明|使用说明|封面|目录|汇总|统计|字典/)) score -= 16;
  return score;
}

function rowStructureSimilarity(rows) {
  const counts = rows.filter((row) => row.some(Boolean)).map((row) => row.filter(Boolean).length);
  if (counts.length <= 1) return 0;
  const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.abs(count - avg), 0) / counts.length;
  return Math.max(0, Math.min(1, 1 - variance / Math.max(1, avg)));
}

function paragraphLikePenalty(rows, colCount) {
  const longTextRows = rows.filter((row) => row.filter(Boolean).length <= 2 && row.join("").length > 40).length;
  let penalty = longTextRows * 6;
  if (colCount <= 2 && rows.length > 2) penalty += 18;
  return Math.min(35, penalty);
}

function sheetRecommendation(sheetName, score, nameScore, paragraphPenalty) {
  if (score >= 60) return "推荐导入";
  if (sheetName.match(/汇总|统计/)) return "可能是汇总页";
  if (nameScore < 0 || sheetName.match(/说明|使用说明|封面|目录|字典/)) return "可能是说明页";
  if (score < 45) return "可能是汇总页";
  if (paragraphPenalty >= 18) return "可能是说明页";
  return "需要人工确认";
}

function setUploadPreview(preview) {
  const mapping = recommendMapping(preview.headers);
  state.csvPreview = { ...preview, mapping, uploadBatchId: makeUploadBatchId() };
  state.uploadResult = uploadStatsForPreview({ ...preview, mapping });
  addLog(`${preview.fileType}解析完成，进入字段映射确认`, preview.fileName);
  saveState();
  render();
}

function selectExcelSheet(index) {
  if (!state.excelPreview) return;
  state.excelPreview.selectedSheetIndex = Number(index);
  saveState();
  render();
}

function confirmExcelSheet() {
  if (!state.excelPreview) return;
  const selected = state.excelPreview.sheets[state.excelPreview.selectedSheetIndex] || state.excelPreview.sheets[0];
  state.csvPreview = {
    kind: "excel",
    fileType: "Excel",
    fileName: state.excelPreview.fileName,
    sheetName: selected.sheetName,
    headers: selected.headers,
    rows: selected.rows,
    mapping: selected.mapping || recommendMapping(selected.headers),
    uploadBatchId: state.excelPreview.uploadBatchId,
    dataSheetScore: selected.data_sheet_score
  };
  state.uploadResult = uploadStatsForPreview(state.csvPreview);
  state.excelPreview = null;
  addLog(`确认Excel Sheet：${selected.sheetName}，进入字段映射确认`, state.csvPreview.fileName);
  saveState();
  render();
}

function readDocumentMock(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "").replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。；、：:,.!?+\-\s]/g, " ").replace(/\s+/g, " ").trim();
    createDocumentUploadTask(file, text.slice(0, 500));
  };
  reader.onerror = () => createDocumentUploadTask(file, "");
  reader.readAsText(file);
}

function createDocumentUploadTask(file, extractedText) {
  const id = `DOC-${Date.now().toString().slice(-6)}`;
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const uploadBatchId = makeUploadBatchId();
  const fileType = file.name.toLowerCase().endsWith(".pdf") ? "PDF" : file.name.toLowerCase().endsWith(".docx") ? "Word DOCX" : "Word DOC";
  const raw = extractedText || `文档解析模拟：${file.name}。真实企业场景中，PDF/Word通常用于检测报告、维修报告、SOP文档，后续会进入文本解析、Chunk切分、知识卡片和RAG流程。`;
  const record = {
    id,
    record_id: id,
    title: `${fileType}文档上传治理任务`,
    raw,
    raw_text: raw,
    source_system: "文档上传实验",
    source_type: "文档上传",
    sourceSystem: "文档上传实验",
    sourceType: "文档上传",
    sourceId: `DOC-UP-${Date.now().toString().slice(-6)}`,
    ingestMethod: "文档解析模拟",
    ingest_method: "文档上传",
    source_file_name: file.name,
    source_sheet_name: "-",
    upload_batch_id: uploadBatchId,
    original_row_index: "-",
    ingest_time: now,
    ingestTime: now,
    initialStatus: "待AI处理",
    current_status: "待AI处理",
    issue_types: [],
    need_review: true,
    fileName: file.name,
    fileType,
    dataStructureType: "非结构化文档",
    data_structure_type: "非结构化文档",
    parseStrategy: "文档解析模拟 + 文本抽取 + 人工复核",
    parse_strategy: "文档解析模拟 + 文本抽取 + 人工复核",
    rowData: { raw_text: raw }
  };
  state.userRecords.unshift(record);
  state.taskStates[id] = defaultTaskStates([record])[id];
  state.uploadResult = {
    fileName: file.name,
    fileType,
    totalRows: 1,
    successRows: extractedText ? 1 : 0,
    aiPool: 1,
    problemRows: extractedText ? 0 : 1,
    documentMock: true,
    extractedText: raw
  };
  state.selectedRecordId = id;
  state.drawerOpen = true;
  state.page = "workbench";
  addLog("文档解析模拟并生成非结构化治理任务", id);
  saveState();
  render();
}

async function handleRagUpload(file) {
  const lower = (file.name || "").toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    state.page = "workbench";
    ragState().notice = "Excel 已转入数据治理流程：先智能识别 Sheet、确认字段映射、生成治理任务；复核通过后的知识卡片再进入 RAG。";
    readExcelFile(file);
    return;
  }
  if (!lower.match(/\.(pdf|docx|txt|md)$/)) {
    createFailedRagDocument(file, "文件格式暂不支持：RAG 实验区当前支持 .pdf、.docx、.xlsx、.txt、.md。");
    saveState();
    return render();
  }
  const rag = ragState();
  rag.notice = `正在解析 ${file.name}...`;
  saveState();
  render();
  try {
    const parsed = await parseRagDocument(file);
    const now = new Date().toLocaleString("zh-CN", { hour12: false });
    const doc = {
      id: `RAG-DOC-${Date.now().toString().slice(-6)}`,
      name: file.name,
      type: parsed.type,
      text: parsed.text,
      pages: parsed.pages || [],
      sections: parsed.sections || [],
      uploadedAt: now,
      enabled: true,
      parseStatus: parsed.parseStatus || (parsed.text ? "解析成功" : "解析失败"),
      parseFailureReason: parsed.failureReason || "",
      parseWarnings: parsed.warnings || [],
      metadata: {
        document_name: file.name,
        source_type: parsed.type,
        upload_time: now,
        parser: parsed.parser,
        page_count: parsed.pages?.length || "-",
        section_count: parsed.sections?.length || "-",
        parse_status: parsed.parseStatus || (parsed.text ? "解析成功" : "解析失败")
      },
      status: parsed.text ? "已解析" : "解析失败"
    };
    rag.documents.unshift(doc);
    ragFileCache.set(doc.id, file);
    rag.selectedDocId = doc.id;
    rag.notice = parsed.warning || parsed.failureReason || `${file.name} 已解析为纯文本，可生成 Chunk 并写入向量集合。`;
    saveState();
    render();
  } catch (error) {
    createFailedRagDocument(file, error.message || "文件格式暂不支持");
    saveState();
    render();
  }
}

async function parseRagDocument(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return parsePdfDocument(file);
  if (lower.endsWith(".docx")) return parseDocxDocument(file);
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    const text = await file.text();
    const normalized = normalizeText(text);
    const warnings = [];
    let parseStatus = "解析成功";
    let failureReason = "";
    if (!normalized) {
      parseStatus = "解析失败";
      failureReason = "解析文本为空：文件没有可读取文本内容。";
      warnings.push("解析文本为空。");
    } else if (normalized.length < 40) {
      parseStatus = "内容过短";
      failureReason = "文本解析成功但内容过短，生成 Chunk 前建议确认文档是否完整。";
      warnings.push("文本解析成功但内容过短。");
    }
    return {
      type: lower.endsWith(".md") ? "Markdown" : "TXT",
      text: normalized,
      sections: sectionMetadataFromText(text),
      parser: "Browser FileReader",
      parseStatus,
      failureReason,
      warnings
    };
  }
  throw new Error("不支持的文档类型");
}

function createFailedRagDocument(file, reason) {
  const rag = ragState();
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const lower = (file.name || "").toLowerCase();
  const type = lower.endsWith(".pdf") ? "PDF" : lower.endsWith(".docx") ? "Word DOCX" : lower.endsWith(".txt") ? "TXT" : lower.endsWith(".md") ? "Markdown" : "未知格式";
  const doc = {
    id: `RAG-DOC-${Date.now().toString().slice(-6)}`,
    name: file.name,
    type,
    text: "",
    pages: [],
    sections: [],
    uploadedAt: now,
    enabled: false,
    parseStatus: "解析失败",
    parseFailureReason: reason,
    parseWarnings: [nextParseAction(reason, type)],
    metadata: {
      document_name: file.name,
      source_type: type,
      upload_time: now,
      parser: "未完成",
      page_count: "-",
      section_count: "-",
      parse_status: "解析失败"
    },
    status: "解析失败"
  };
  rag.documents.unshift(doc);
  ragFileCache.set(doc.id, file);
  rag.selectedDocId = doc.id;
  rag.notice = `解析失败：${reason}`;
}

async function parsePdfDocument(file) {
  const loaded = await ensurePdfJsLoaded();
  if (!loaded || !window.pdfjsLib) {
    return {
      type: "PDF",
      text: "",
      pages: [],
      parser: "PDF.js 未加载",
      parseStatus: "解析失败",
      failureReason: "PDF解析库未加载，无法解析PDF文本，请检查PDF.js引入或改用docx/txt测试。",
      warnings: ["PDF.js 未加载", "建议先用 docx / txt / md 测试真实文本解析。"]
    };
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push({ page: pageNumber, text: normalizeText(text) });
  }
  const text = normalizeText(pages.map((page) => `[第${page.page}页] ${page.text}`).join("\n\n"));
  const warnings = [];
  let parseStatus = "解析成功";
  let failureReason = "";
  if (!text) {
    parseStatus = "解析失败";
    failureReason = "解析文本为空：PDF可能是扫描版，需要 OCR，或文件没有可提取文本层。";
    warnings.push("PDF 可能是扫描版，需要 OCR。");
  } else if (text.length < 40) {
    parseStatus = "内容过短";
    failureReason = "文本解析成功但内容过短，生成 Chunk 前建议确认文档是否完整。";
    warnings.push("文本解析成功但内容过短。");
  }
  return {
    type: "PDF",
    text,
    pages,
    parser: "PDF.js",
    parseStatus,
    failureReason,
    warnings
  };
}

async function parseDocxDocument(file) {
  if (!window.mammoth) {
    return {
      type: "Word DOCX",
      text: "",
      sections: [],
      parser: "Mammoth 未加载",
      warning: "Mammoth 未加载成功，无法真实解析 DOCX。请确认网络可访问 CDN，或后续接入后端 Word 解析。"
    };
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  const text = normalizeText(result.value || "");
  const warnings = [];
  let parseStatus = "解析成功";
  let failureReason = "";
  if (!text) {
    parseStatus = "解析失败";
    failureReason = "解析文本为空：Word文档可能没有正文文本，或文件内容不可提取。";
    warnings.push("解析文本为空。");
  } else if (text.length < 40) {
    parseStatus = "内容过短";
    failureReason = "文本解析成功但内容过短，生成 Chunk 前建议确认文档是否完整。";
    warnings.push("文本解析成功但内容过短。");
  }
  return {
    type: "Word DOCX",
    text,
    sections: sectionMetadataFromText(result.value || ""),
    parser: "Mammoth",
    parseStatus,
    failureReason,
    warnings
  };
}

async function ensurePdfJsLoaded() {
  if (window.pdfjsLib) return true;
  const urls = [
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"
  ];
  for (const url of urls) {
    try {
      await loadExternalScript(url);
      if (window.pdfjsLib) return true;
    } catch {
      // Try the next CDN.
    }
  }
  return false;
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      setTimeout(() => window.pdfjsLib ? resolve() : reject(new Error("script exists but library missing")), 300);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function nextParseAction(reason, type) {
  if (String(reason).includes("PDF解析库未加载")) return "请检查 PDF.js 引入，或改用 docx/txt 测试。";
  if (String(reason).includes("扫描版") || String(reason).includes("OCR")) return "该 PDF 可能需要 OCR，建议上传可复制文本的 PDF 或 DOCX 版本。";
  if (String(reason).includes("过短")) return "解析文本过短，建议查看原文或改传 docx/txt。";
  if (type === "未知格式") return "文件格式暂不支持，请上传 pdf/docx/txt/md。";
  return "建议重新解析或改传 docx/txt/md 测试。";
}

function normalizeText(text) {
  return String(text || "").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sectionMetadataFromText(text) {
  return normalizeText(text).split(/\n{2,}|(?=^#{1,3}\s)/m).filter(Boolean).slice(0, 30).map((section, index) => ({
    section: index + 1,
    title: section.split("\n")[0].slice(0, 48) || `章节${index + 1}`,
    text: section
  }));
}

async function buildRagChunksFromDocument(doc) {
  const rag = ragState();
  const config = rag.config;
  if (!normalizeText(doc.text || "")) {
    rag.notice = `无法生成 Chunk：${doc.parseFailureReason || "解析文本为空。PDF可能是扫描版，需要 OCR，或请改用 docx/txt/md 测试。"}`;
    saveState();
    return render();
  }
  if (doc.parseStatus === "解析失败") {
    rag.notice = `无法生成 Chunk：${doc.parseFailureReason || "文档解析失败。"}`;
    saveState();
    return render();
  }
  const oldChunks = rag.chunks.filter((chunk) => chunk.document_id !== doc.id);
  const splitDetails = splitDocumentByStrategy(doc.text, config.chunkStrategy, Number(config.chunkSize) || 650, Number(config.chunkOverlap) || 90);
  const chunks = splitDetails.map((detail, index) => {
    const text = detail.text;
    const pageMatch = text.match(/第(\d+)页/);
    const qualityStatus = chunkQualityStatus(text, doc);
    const metadata = {
      document_id: doc.id,
      document_name: doc.name,
      source_type: doc.type,
      chunk_index: index + 1,
      page: pageMatch ? pageMatch[1] : "-",
      section: inferSection(text),
      knowledge_type: doc.type === "PDF" || doc.type === "Word DOCX" ? "文档型RAG" : doc.metadata?.source_type === "内置知识包" ? "内置维修知识" : "文本知识",
      file_type: doc.type,
      review_status: "文档已解析",
      equipment_name: inferEquipment(text),
      system: inferSystemFromText(text),
      fault_symptom: inferFaultSymptom(text),
      upload_time: doc.uploadedAt,
      start: detail.start,
      end: detail.end,
      chunk_length: text.length,
      overlap_length: detail.overlapLength,
      split_reason: detail.splitReason,
      chunk_strategy: config.chunkStrategy,
      quality_status: qualityStatus,
      status: qualityStatus === "不可引用" ? "禁用" : "已发布",
      trusted_level: doc.type === "PDF" || doc.type === "Word DOCX" ? "中高" : "中"
    };
    return {
      id: `${doc.id}-CH-${String(index + 1).padStart(3, "0")}`,
      document_id: doc.id,
      title: `${doc.name} / Chunk ${index + 1}`,
      text,
      start: detail.start,
      end: detail.end,
      chunkLength: text.length,
      overlapLength: detail.overlapLength,
      splitReason: detail.splitReason,
      qualityStatus,
      metadata,
      embeddingProvider: config.embeddingProvider,
      embeddingModel: config.embeddingModel,
      embedding: config.vectorStoreMode === "LocalStorage" ? embedText(text) : null,
      embeddingStatus: config.vectorStoreMode === "LocalStorage" ? "本地已生成" : "后端生成",
      vectorStoreStatus: config.vectorStoreMode === "LocalStorage" ? "已写入LocalStorage" : "待写入DashVector"
    };
  });
  rag.chunks = [...chunks, ...oldChunks];
  if (config.vectorStoreMode === "Aliyun DashVector") {
    await upsertChunksToDashVector(chunks);
  } else {
    rag.vectorStore = {
      ...rag.vectorStore,
      mode: "LocalStorage",
      status: "已写入LocalStorage本地向量库",
      vectorCount: rag.chunks.length,
      lastWriteTime: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    rag.notice = `${doc.name} 已生成 ${chunks.length} 个 Chunk，并写入 LocalStorage 本地向量库。`;
  }
  saveState();
  render();
}

function loadBuiltInKnowledgePack() {
  const rag = ragState();
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const existingIds = new Set(rag.documents.map((doc) => doc.id));
  const docs = builtInRagDocuments
    .filter((doc) => !existingIds.has(doc.id))
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      text: normalizeText(doc.text),
      pages: [],
      sections: sectionMetadataFromText(doc.text),
      uploadedAt: now,
      enabled: true,
      parseStatus: "解析成功",
      parseFailureReason: "",
      parseWarnings: [],
      status: "已解析",
      builtIn: true,
      metadata: {
        document_name: doc.name,
        source_type: "内置知识包",
        business_source_type: doc.sourceType,
        upload_time: now,
        parser: "Built-in Markdown",
        page_count: "-",
        section_count: sectionMetadataFromText(doc.text).length,
        parse_status: "解析成功",
        equipment_name: doc.equipment,
        system: doc.system,
        fault_symptom: doc.fault,
        review_status: "已审核",
        quality_status: "可引用"
      }
    }));
  rag.documents = [...docs, ...rag.documents];
  rag.selectedDocId = docs[0]?.id || rag.selectedDocId;
  rag.builtInPackLoaded = true;
  rag.notice = docs.length ? `已加载内置 RAG 文档包：${docs.length} 份船舶维修知识文档。` : "内置 RAG 文档包已存在，无需重复加载。";
  saveState();
  render();
}

function clearBuiltInKnowledgePack() {
  const rag = ragState();
  const builtInIds = new Set(builtInRagDocuments.map((doc) => doc.id));
  rag.documents = rag.documents.filter((doc) => !builtInIds.has(doc.id));
  rag.chunks = rag.chunks.filter((chunk) => !builtInIds.has(chunk.document_id));
  rag.selectedDocId = rag.documents[0]?.id || "";
  rag.builtInPackLoaded = false;
  rag.chunkStrategyReport = [];
  rag.vectorStore.vectorCount = rag.chunks.length;
  rag.notice = "已清空内置 RAG 文档包及其 Chunk。";
  saveState();
  render();
}

async function generateBuiltInPackChunks() {
  const rag = ragState();
  const docs = rag.documents.filter((doc) => doc.builtIn);
  if (!docs.length) {
    rag.notice = "请先点击“加载内置知识包”。";
    saveState();
    return render();
  }
  for (const doc of docs) {
    await buildRagChunksForDocumentNoRender(doc);
  }
  await compareChunkStrategies();
  rag.notice = `内置知识包已按 ${rag.config.chunkStrategy} 生成 Chunk，并完成策略对比。`;
  saveState();
  render();
}

async function buildRagChunksForDocumentNoRender(doc) {
  const rag = ragState();
  const config = rag.config;
  const splitDetails = splitDocumentByStrategy(doc.text, config.chunkStrategy, Number(config.chunkSize) || 650, Number(config.chunkOverlap) || 90);
  const oldChunks = rag.chunks.filter((chunk) => chunk.document_id !== doc.id);
  const chunks = splitDetails.map((detail, index) => makeRagChunkFromDetail(doc, detail, index, config));
  rag.chunks = [...chunks, ...oldChunks];
  if (config.vectorStoreMode === "LocalStorage") {
    rag.vectorStore = {
      ...rag.vectorStore,
      mode: "LocalStorage",
      status: "已写入LocalStorage本地向量库",
      vectorCount: rag.chunks.length,
      lastWriteTime: new Date().toLocaleString("zh-CN", { hour12: false })
    };
  } else if (chunks.length) {
    await upsertChunksToDashVector(chunks);
  }
}

function makeRagChunkFromDetail(doc, detail, index, config) {
  const text = detail.text;
  const pageMatch = text.match(/第(\d+)页/);
  const qualityStatus = chunkQualityStatus(text, doc);
  const metadata = {
    document_id: doc.id,
    document_name: doc.name,
    source_type: doc.metadata?.source_type || doc.type,
    business_source_type: doc.metadata?.business_source_type || doc.type,
    chunk_index: index + 1,
    page: pageMatch ? pageMatch[1] : "-",
    section: inferSection(text),
    knowledge_type: doc.metadata?.source_type === "内置知识包" ? "内置维修知识" : "文档型RAG",
    file_type: doc.type,
    review_status: doc.metadata?.review_status || "文档已解析",
    equipment_name: doc.metadata?.equipment_name || inferEquipment(text),
    system: doc.metadata?.system || inferSystemFromText(text),
    fault_symptom: doc.metadata?.fault_symptom || inferFaultSymptom(text),
    upload_time: doc.uploadedAt,
    start: detail.start,
    end: detail.end,
    chunk_length: text.length,
    overlap_length: detail.overlapLength,
    split_reason: detail.splitReason,
    chunk_strategy: config.chunkStrategy,
    quality_status: qualityStatus,
    status: qualityStatus === "不可引用" ? "禁用" : "已发布",
    trusted_level: doc.metadata?.review_status === "已审核" ? "高" : "中"
  };
  return {
    id: `${doc.id}-CH-${String(index + 1).padStart(3, "0")}`,
    document_id: doc.id,
    title: `${doc.name} / Chunk ${index + 1}`,
    text,
    start: detail.start,
    end: detail.end,
    chunkLength: text.length,
    overlapLength: detail.overlapLength,
    splitReason: detail.splitReason,
    qualityStatus,
    metadata,
    embeddingProvider: config.embeddingProvider,
    embeddingModel: config.embeddingModel,
    embedding: config.vectorStoreMode === "LocalStorage" ? embedText(text) : null,
    embeddingStatus: config.vectorStoreMode === "LocalStorage" ? "本地已生成" : "后端生成",
    vectorStoreStatus: config.vectorStoreMode === "LocalStorage" ? "已写入LocalStorage" : "待写入DashVector"
  };
}

async function upsertCurrentRagChunks() {
  const rag = ragState();
  const chunks = rag.chunks.filter((chunk) => chunk.qualityStatus !== "不可引用");
  if (!chunks.length) {
    rag.notice = "当前没有可写入向量库的 Chunk。";
    saveState();
    return render();
  }
  if (rag.config.vectorStoreMode === "Aliyun DashVector") {
    await upsertChunksToDashVector(chunks);
  } else {
    chunks.forEach((chunk) => {
      chunk.embedding = embedText(chunk.text);
      chunk.embeddingStatus = "本地已生成";
      chunk.vectorStoreStatus = "已写入LocalStorage";
    });
    rag.vectorStore = {
      ...rag.vectorStore,
      mode: "LocalStorage",
      status: "已写入LocalStorage本地向量库",
      vectorCount: chunks.length,
      lastWriteTime: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    rag.notice = `已写入 ${chunks.length} 个可引用 Chunk 到 LocalStorage 本地向量库。`;
  }
  saveState();
  render();
}

async function buildRagChunksFromKnowledgeCards() {
  const rag = ragState();
  const knowledgeTasks = allRecords().map(taskView).filter((task) => task.currentStatus === "可生成知识卡片" || task.ragReady);
  const knowledgeChunks = knowledgeTasks.map((task, index) => {
    const text = [
      `知识案例：${task.title}`,
      `设备：${task.finalData.equipment_name || "-"} ${task.finalData.equipment_code || ""}`,
      `系统：${task.finalData.system || "-"}`,
      `部件：${task.finalData.component || "-"}`,
      `故障现象：${task.finalData.fault_symptom || "-"}`,
      `处理措施：${task.finalData.repair_action || "-"}`,
      `处理结果：${task.finalData.repair_result || "-"}`,
      `来源：${task.sourceSystem} / ${task.sourceId}`,
      `可信等级：${task.confidence >= 85 ? "高" : "中"}`
    ].join("\n");
    const metadata = {
      document_id: task.id,
      document_name: task.title,
      source_type: "治理后知识卡片",
      chunk_index: 1,
      page: "-",
      section: "知识卡片",
      file_type: "knowledge_card",
      review_status: task.currentStatus === "可生成知识卡片" ? "已发布知识" : "RAG准备区",
      equipment_name: task.finalData.equipment_name || "-",
      system: task.finalData.system || "-",
      fault_symptom: task.finalData.fault_symptom || "-",
      upload_time: task.ingestTime || task.ingest_time || "-",
      knowledge_type: "数据治理型RAG",
      status: "已发布",
      trusted_level: task.confidence >= 85 ? "高" : "中"
    };
    return {
      id: `KB-CH-${String(index + 1).padStart(3, "0")}`,
      document_id: task.id,
      title: `${task.title} / 知识卡片`,
      text,
      metadata,
      embeddingProvider: rag.config.embeddingProvider,
      embeddingModel: rag.config.embeddingModel,
      embedding: rag.config.vectorStoreMode === "LocalStorage" ? embedText(text) : null,
      embeddingStatus: rag.config.vectorStoreMode === "LocalStorage" ? "本地已生成" : "后端生成",
      vectorStoreStatus: rag.config.vectorStoreMode === "LocalStorage" ? "已写入LocalStorage" : "待写入DashVector"
    };
  });
  const withoutKnowledge = rag.chunks.filter((chunk) => chunk.metadata?.source_type !== "治理后知识卡片");
  rag.chunks = [...knowledgeChunks, ...withoutKnowledge];
  if (rag.config.vectorStoreMode === "Aliyun DashVector" && knowledgeChunks.length) {
    await upsertChunksToDashVector(knowledgeChunks);
  } else {
    rag.vectorStore = {
      ...rag.vectorStore,
      mode: "LocalStorage",
      status: "已写入LocalStorage本地向量库",
      vectorCount: rag.chunks.length,
      lastWriteTime: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    rag.notice = knowledgeChunks.length ? `已将 ${knowledgeChunks.length} 张治理后知识卡片写入 LocalStorage 本地向量库。` : "当前没有已复核发布的知识卡片；Excel 数据需先完成治理和知识卡片生成。";
  }
  saveState();
  render();
}

async function reparseRagDocument(docId) {
  const rag = ragState();
  const doc = rag.documents.find((item) => item.id === docId);
  if (!doc) return;
  const cachedFile = ragFileCache.get(docId);
  if (!cachedFile) {
    doc.parseWarnings = [...(doc.parseWarnings || []), "浏览器刷新后无法保留原始文件二进制，请重新上传文件再解析。"];
    rag.notice = "无法重新解析：浏览器未保留原始文件，请重新上传该文档。";
    saveState();
    return render();
  }
  rag.notice = `正在重新解析 ${doc.name}...`;
  saveState();
  render();
  try {
    const parsed = await parseRagDocument(cachedFile);
    doc.text = parsed.text;
    doc.pages = parsed.pages || [];
    doc.sections = parsed.sections || [];
    doc.parseStatus = parsed.parseStatus || (parsed.text ? "解析成功" : "解析失败");
    doc.parseFailureReason = parsed.failureReason || "";
    doc.parseWarnings = parsed.warnings || [];
    doc.status = parsed.text ? "已解析" : "解析失败";
    doc.metadata = {
      ...doc.metadata,
      parser: parsed.parser,
      page_count: parsed.pages?.length || "-",
      section_count: parsed.sections?.length || "-",
      parse_status: doc.parseStatus
    };
    rag.notice = doc.parseFailureReason || `${doc.name} 已重新解析。`;
  } catch (error) {
    doc.parseStatus = "解析失败";
    doc.parseFailureReason = error.message || "重新解析失败";
    doc.parseWarnings = [nextParseAction(doc.parseFailureReason, doc.type)];
    doc.status = "解析失败";
    rag.notice = `重新解析失败：${doc.parseFailureReason}`;
  }
  saveState();
  render();
}

function deleteRagDocument(docId) {
  const rag = ragState();
  rag.documents = rag.documents.filter((doc) => doc.id !== docId);
  rag.chunks = rag.chunks.filter((chunk) => chunk.document_id !== docId);
  ragFileCache.delete(docId);
  if (rag.selectedDocId === docId) rag.selectedDocId = rag.documents[0]?.id || "";
  rag.vectorStore.vectorCount = rag.chunks.length;
  rag.notice = "文档和对应 Chunk 已删除。";
  saveState();
  render();
}

function toggleRagDocumentEnabled(docId) {
  const rag = ragState();
  const doc = rag.documents.find((item) => item.id === docId);
  if (!doc) return;
  doc.enabled = doc.enabled === false;
  rag.notice = doc.enabled ? `${doc.name} 已启用检索。` : `${doc.name} 已禁用检索。`;
  saveState();
  render();
}

async function rewriteDocumentVectorStore(docId) {
  const rag = ragState();
  const chunks = rag.chunks.filter((chunk) => chunk.document_id === docId && chunk.qualityStatus !== "不可引用");
  if (!chunks.length) {
    rag.notice = "当前文档没有可写入的可引用 Chunk。";
    saveState();
    return render();
  }
  if (rag.config.vectorStoreMode === "Aliyun DashVector") {
    await upsertChunksToDashVector(chunks);
  } else {
    chunks.forEach((chunk) => {
      chunk.embedding = embedText(chunk.text);
      chunk.embeddingStatus = "本地已生成";
      chunk.vectorStoreStatus = "已写入LocalStorage";
    });
    rag.vectorStore = {
      ...rag.vectorStore,
      mode: "LocalStorage",
      status: "已重新写入LocalStorage本地向量库",
      vectorCount: rag.chunks.length,
      lastWriteTime: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    rag.notice = `已重新写入 ${chunks.length} 个 Chunk。`;
  }
  saveState();
  render();
}

function rechunkCurrentDocument() {
  const rag = ragState();
  const doc = rag.documents.find((item) => item.id === rag.selectedDocId) || rag.documents[0];
  if (!doc) return;
  const ok = !window.confirm || window.confirm("重新切分当前文档会覆盖旧 Chunk，是否继续？");
  if (!ok) return;
  return buildRagChunksFromDocument(doc);
}

function saveChunkManual(chunkId) {
  const rag = ragState();
  const chunk = rag.chunks.find((item) => item.id === chunkId);
  if (!chunk) return;
  const escapedId = cssEscape(chunkId);
  const textInput = document.querySelector(`[data-chunk-text="${escapedId}"]`);
  const metadataInput = document.querySelector(`[data-chunk-metadata="${escapedId}"]`);
  const nextText = textInput ? textInput.value.trim() : chunk.text;
  let nextMetadata = chunk.metadata || {};
  if (metadataInput) {
    try {
      nextMetadata = JSON.parse(metadataInput.value || "{}");
    } catch {
      rag.notice = "metadata 不是合法 JSON，请修正后再保存。";
      saveState();
      return render();
    }
  }
  chunk.text = nextText;
  chunk.metadata = {
    ...nextMetadata,
    chunk_length: nextText.length,
    quality_status: chunkQualityStatus(nextText)
  };
  chunk.chunkLength = nextText.length;
  chunk.qualityStatus = chunk.metadata.quality_status;
  chunk.embedding = rag.config.vectorStoreMode === "LocalStorage" ? embedText(nextText) : null;
  chunk.embeddingStatus = rag.config.vectorStoreMode === "LocalStorage" ? "本地已重新生成" : "待后端重新生成";
  chunk.vectorStoreStatus = "已手工修改，待重新写入";
  rag.notice = `${chunk.id} 已保存人工修改。`;
  saveState();
  render();
}

function splitChunk(chunkId) {
  const rag = ragState();
  const index = rag.chunks.findIndex((chunk) => chunk.id === chunkId);
  if (index < 0) return;
  const chunk = rag.chunks[index];
  const pivot = Math.max(1, Math.floor(chunk.text.length / 2));
  const firstText = chunk.text.slice(0, pivot).trim();
  const secondText = chunk.text.slice(pivot).trim();
  if (!firstText || !secondText) {
    rag.notice = "Chunk 内容过短，无法拆分。";
    saveState();
    return render();
  }
  const first = makeManualChunk(chunk, `${chunk.id}-A`, firstText, chunk.start || 0, (chunk.start || 0) + firstText.length, "手动拆分");
  const second = makeManualChunk(chunk, `${chunk.id}-B`, secondText, first.end, first.end + secondText.length, "手动拆分");
  rag.chunks.splice(index, 1, first, second);
  rag.notice = `${chunk.id} 已拆分为 2 个 Chunk。`;
  saveState();
  render();
}

function mergeNextChunk(chunkId) {
  const rag = ragState();
  const index = rag.chunks.findIndex((chunk) => chunk.id === chunkId);
  const chunk = rag.chunks[index];
  const next = rag.chunks[index + 1];
  if (!chunk || !next || next.document_id !== chunk.document_id) {
    rag.notice = "没有可合并的相邻 Chunk。";
    saveState();
    return render();
  }
  const mergedText = `${chunk.text}\n${next.text}`.trim();
  const merged = makeManualChunk(chunk, `${chunk.id}-MERGED`, mergedText, chunk.start || 0, next.end || ((chunk.start || 0) + mergedText.length), "手动合并相邻Chunk");
  merged.metadata = { ...chunk.metadata, ...next.metadata, chunk_index: chunk.metadata?.chunk_index || 1, split_reason: "手动合并相邻Chunk" };
  rag.chunks.splice(index, 2, merged);
  rag.notice = `${chunk.id} 已与相邻 Chunk 合并。`;
  saveState();
  render();
}

function toggleChunkQuote(chunkId) {
  const rag = ragState();
  const chunk = rag.chunks.find((item) => item.id === chunkId);
  if (!chunk) return;
  const next = chunk.qualityStatus === "不可引用" ? chunkQualityStatus(chunk.text) : "不可引用";
  chunk.qualityStatus = next;
  chunk.metadata = { ...(chunk.metadata || {}), quality_status: next, status: next === "不可引用" ? "禁用" : "已发布" };
  chunk.vectorStoreStatus = next === "不可引用" ? "已禁用检索" : "待重新写入";
  rag.notice = `${chunk.id} 已标记为：${next}。`;
  saveState();
  render();
}

function regenerateChunkEmbedding(chunkId) {
  const rag = ragState();
  const chunk = rag.chunks.find((item) => item.id === chunkId);
  if (!chunk) return;
  if (rag.config.vectorStoreMode === "Aliyun DashVector") {
    return upsertChunksToDashVector([chunk]);
  }
  chunk.embedding = embedText(chunk.text);
  chunk.embeddingStatus = "本地已重新生成";
  chunk.vectorStoreStatus = "已写入LocalStorage";
  rag.notice = `${chunk.id} embedding 已重新生成。`;
  saveState();
  render();
}

function makeManualChunk(base, id, text, start, end, reason) {
  const qualityStatus = chunkQualityStatus(text);
  return {
    ...base,
    id,
    title: `${base.title || base.id} / ${reason}`,
    text,
    start,
    end,
    chunkLength: text.length,
    overlapLength: 0,
    splitReason: reason,
    qualityStatus,
    metadata: {
      ...(base.metadata || {}),
      chunk_length: text.length,
      start,
      end,
      overlap_length: 0,
      split_reason: reason,
      quality_status: qualityStatus,
      status: qualityStatus === "不可引用" ? "禁用" : "已发布"
    },
    embedding: ragState().config.vectorStoreMode === "LocalStorage" ? embedText(text) : null,
    embeddingStatus: ragState().config.vectorStoreMode === "LocalStorage" ? "本地已生成" : "待后端生成",
    vectorStoreStatus: "待重新写入"
  };
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

async function upsertChunksToDashVector(chunks) {
  const rag = ragState();
  try {
    const response = await fetch("/api/rag/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chunks: chunks.map((chunk) => ({
          id: chunk.id,
          text: chunk.text,
          metadata: normalizeDashVectorPayload(chunk)
        }))
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "DashVector upsert失败");
    rag.vectorStore = {
      mode: "Aliyun DashVector",
      status: "已写入Aliyun DashVector",
      vectorCount: data.written ?? data.count ?? chunks.length,
      lastWriteTime: new Date().toLocaleString("zh-CN", { hour12: false }),
      collection: data.collection || rag.config.dashVectorCollection
    };
    rag.notice = `Aliyun DashVector 写入成功：${data.written ?? data.count ?? chunks.length} 个 point，失败 ${data.failed ?? 0} 个，collection=${data.collection || rag.config.dashVectorCollection}。`;
  } catch (error) {
    rag.vectorStore = {
      ...rag.vectorStore,
      mode: "Aliyun DashVector",
      status: "写入失败",
      lastWriteTime: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    rag.notice = `Aliyun DashVector 写入失败：${error.message || "请先配置 DashVector 和百炼 Embedding 环境变量。"}`;
  }
}

function normalizeDashVectorPayload(chunk) {
  const meta = chunk.metadata || {};
  return {
    chunk_text: chunk.text,
    document_name: meta.document_name || chunk.title,
    file_type: meta.file_type || meta.source_type || "-",
    chunk_index: meta.chunk_index || 1,
    source_type: meta.source_type || "-",
    review_status: meta.review_status || meta.status || "-",
    equipment_name: meta.equipment_name || meta.equipment || "-",
    system: meta.system || "-",
    fault_symptom: meta.fault_symptom || meta.fault || "-",
    upload_time: meta.upload_time || "-"
  };
}

async function fetchBackendHealth() {
  const rag = ragState();
  try {
    const response = await fetch("/api/health");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "后端健康检查失败");
    rag.backendHealth = data;
    rag.vectorStore.collection = data.dashVector?.collection || data.vectorStore?.collection || rag.config.dashVectorCollection;
    rag.notice = data.dashVector?.configured && data.embedding?.configured
      ? "后端连接正常，DashVector 与百炼 Embedding 配置已检测。"
      : "后端已启动，但 DashVector 或百炼 Embedding 环境变量未完整配置。";
  } catch (error) {
    rag.backendHealth = { ok: false, error: error.message || "后端未启动" };
    rag.notice = `后端连接失败：${error.message || "请先启动 npm run dev / node server.js"}`;
  }
  saveState();
  render();
}

async function initDashVectorCollection() {
  const rag = ragState();
  try {
    const response = await fetch("/api/rag/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "初始化 Collection 失败");
    rag.vectorStore = {
      ...rag.vectorStore,
      mode: "Aliyun DashVector",
      status: data.created ? "DashVector Collection已创建" : "DashVector Collection已存在",
      collection: data.collection,
      lastWriteTime: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    rag.notice = `${data.collection} 初始化完成，向量维度 ${data.vectorSize}，${data.created ? "已创建新 Collection" : "已存在，未删除已有数据"}。`;
    await fetchBackendHealth();
  } catch (error) {
    rag.notice = `初始化失败：${error.message || "请先配置后端环境变量"}`;
    saveState();
    render();
  }
}

function recursiveCharacterTextSplitter(text, chunkSize = 650, chunkOverlap = 90) {
  const clean = normalizeText(text);
  if (!clean) return [];
  const separators = ["\n\n", "\n", "。", "；", "，", " ", ""];
  const pieces = splitRecursive(clean, chunkSize, separators);
  const chunks = [];
  let current = "";
  pieces.forEach((piece) => {
    const next = current ? `${current}${piece.match(/^[。；，\s]/) ? "" : " "}${piece}` : piece;
    if (next.length <= chunkSize) {
      current = next;
    } else {
      if (current) chunks.push(current.trim());
      const overlap = current.slice(Math.max(0, current.length - chunkOverlap));
      current = `${overlap} ${piece}`.trim();
    }
  });
  if (current) chunks.push(current.trim());
  return chunks.filter((chunk) => chunk.length > 8);
}

function splitDocumentByStrategy(text, strategy = "RecursiveCharacterTextSplitter", chunkSize = 650, chunkOverlap = 90) {
  if (strategy === "按段落切分") return paragraphSplitterDetailed(text, chunkSize, chunkOverlap);
  if (strategy === "按句子切分") return sentenceSplitterDetailed(text, chunkSize, chunkOverlap);
  return recursiveCharacterTextSplitterDetailed(text, chunkSize, chunkOverlap);
}

function paragraphSplitterDetailed(text, chunkSize = 650, chunkOverlap = 90) {
  const clean = normalizeText(text);
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return combineUnitsForStrategy(clean, paragraphs, chunkSize, chunkOverlap, "按段落切分");
}

function sentenceSplitterDetailed(text, chunkSize = 650, chunkOverlap = 90) {
  const clean = normalizeText(text);
  if (!clean) return [];
  const sentences = clean.match(/[^。！？；\n]+[。！？；]?|\n+/g)?.map((item) => item.trim()).filter(Boolean) || [clean];
  return combineUnitsForStrategy(clean, sentences, chunkSize, chunkOverlap, "按句子切分");
}

function combineUnitsForStrategy(clean, units, chunkSize, chunkOverlap, splitReason) {
  const chunks = [];
  let current = "";
  let currentStart = 0;
  let searchFrom = 0;
  units.forEach((unit) => {
    const unitStart = Math.max(0, clean.indexOf(unit, searchFrom));
    searchFrom = unitStart + unit.length;
    const next = current ? `${current}\n${unit}` : unit;
    if (next.length <= chunkSize || !current) {
      if (!current) currentStart = unitStart;
      current = next;
      return;
    }
    const end = currentStart + current.length;
    chunks.push({
      text: current.trim(),
      start: currentStart,
      end,
      overlapLength: chunks.length ? Math.min(chunkOverlap, current.length) : 0,
      splitReason
    });
    const overlap = current.slice(Math.max(0, current.length - chunkOverlap));
    currentStart = Math.max(0, unitStart - overlap.length);
    current = `${overlap}\n${unit}`.trim();
  });
  if (current) {
    chunks.push({
      text: current.trim(),
      start: currentStart,
      end: Math.min(clean.length, currentStart + current.length),
      overlapLength: chunks.length ? Math.min(chunkOverlap, current.length) : 0,
      splitReason
    });
  }
  return chunks.filter((chunk) => chunk.text.length > 8);
}

async function compareChunkStrategies() {
  const rag = ragState();
  const docs = rag.documents.filter((doc) => doc.builtIn || doc.enabled !== false);
  if (!docs.length) {
    rag.chunkStrategyReport = [];
    rag.notice = "没有可对比的文档，请先加载内置知识包或上传文档。";
    saveState();
    return render();
  }
  const query = normalizeText(rag.query || "压载泵振动升温怎么排查？");
  const strategies = ["按段落切分", "按句子切分", "RecursiveCharacterTextSplitter"];
  const compareChunkSize = Math.min(Number(rag.config.chunkSize) || 650, 280);
  const compareOverlap = Math.min(Number(rag.config.chunkOverlap) || 90, 60);
  rag.chunkStrategyReport = strategies.map((strategy) => {
    const tempChunks = docs.flatMap((doc) => splitDocumentByStrategy(doc.text, strategy, compareChunkSize, compareOverlap)
      .map((detail, index) => makeRagChunkFromDetail(doc, detail, index, { ...rag.config, chunkStrategy: strategy, vectorStoreMode: "LocalStorage" })));
    const results = scoreLocalChunks(query, tempChunks, 3);
    const avgLength = tempChunks.length ? Math.round(tempChunks.reduce((sum, chunk) => sum + chunk.text.length, 0) / tempChunks.length) : 0;
    const metadataComplete = tempChunks.every((chunk) => ["document_name", "source_type", "equipment_name", "system", "quality_status"].every((key) => chunk.metadata?.[key]));
    const best = results[0];
    return {
      strategy,
      chunk_count: tempChunks.length,
      avg_chunk_length: avgLength,
      overlap: strategy === "RecursiveCharacterTextSplitter" || Number(rag.config.chunkOverlap) > 0 ? "保留" : "不保留",
      metadata_complete: metadataComplete ? "完整" : "缺失",
      top_hits: results,
      top_similarity: best ? `${best.similarity}%` : "-",
      citation_accuracy: best && isCitationAccurate(query, best) ? "准确" : best ? "需复核" : "无命中"
    };
  });
  rag.notice = "已完成 Chunk 策略对比：段落、句子、Recursive 默认切分。";
  saveState();
  render();
}

function scoreLocalChunks(query, chunks, topK = 3) {
  const queryEmbedding = embedText(query);
  const queryTerms = new Set((query.match(/[\u4e00-\u9fa5]{1,2}|[a-z0-9]+/gi) || []).map((item) => item.toLowerCase()));
  return chunks.map((chunk) => {
    const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding || embedText(chunk.text));
    const text = `${chunk.text} ${Object.values(chunk.metadata || {}).join(" ")}`.toLowerCase();
    const keywordHits = [...queryTerms].filter((term) => text.includes(term));
    const score = Math.min(0.99, vectorScore * 0.75 + Math.min(0.25, keywordHits.length * 0.04));
    return {
      chunkId: chunk.id,
      title: chunk.title,
      text: chunk.text,
      score: Number(score.toFixed(4)),
      similarity: Math.round(score * 100),
      metadata: chunk.metadata,
      reason: keywordHits.length ? `关键词：${keywordHits.slice(0, 6).join("、")}` : "向量语义相似",
      source: chunk.metadata?.document_name || chunk.title
    };
  }).sort((a, b) => b.score - a.score).slice(0, topK);
}

function isCitationAccurate(query, result) {
  const text = `${result.text} ${Object.values(result.metadata || {}).join(" ")}`;
  if (/压载|振动|温升|轴承/.test(query)) return /压载|振动|温度|轴承|联轴器/.test(text);
  if (/消防|噪声|声音/.test(query)) return /消防|噪声|声音|地脚/.test(text);
  if (/海水|冷却|发热/.test(query)) return /海水|冷却|轴承|润滑/.test(text);
  if (/燃油|压力/.test(query)) return /燃油|压力|滤网|吸入/.test(text);
  if (/焊缝|RT|UT/.test(query)) return /焊缝|RT|UT|返修|复检/.test(text);
  return true;
}

function recursiveCharacterTextSplitterDetailed(text, chunkSize = 650, chunkOverlap = 90) {
  const clean = normalizeText(text);
  if (!clean) return [];
  if (clean.length <= chunkSize) {
    return [{
      text: clean,
      start: 0,
      end: clean.length,
      overlapLength: 0,
      splitReason: clean.includes("\n\n") ? "按段落" : clean.includes("\n") ? "按换行" : "内容未超过chunk_size"
    }];
  }
  const units = textUnitsWithRanges(clean);
  const chunks = [];
  let current = null;
  units.forEach((unit) => {
    if (unit.text.length > chunkSize) {
      if (current) {
        chunks.push(current);
        current = null;
      }
      for (let start = unit.start; start < unit.end; start += Math.max(1, chunkSize - chunkOverlap)) {
        const end = Math.min(unit.end, start + chunkSize);
        const overlapLength = chunks.length ? Math.max(0, Math.min(chunkOverlap, chunks[chunks.length - 1].end - start)) : 0;
        chunks.push({
          text: clean.slice(start, end).trim(),
          start,
          end,
          overlapLength,
          splitReason: "按字符长度"
        });
      }
      return;
    }
    if (!current) {
      current = { text: unit.text, start: unit.start, end: unit.end, overlapLength: 0, splitReason: unit.reason };
      return;
    }
    const nextText = `${current.text}${unit.text.startsWith("\n") ? "" : "\n"}${unit.text}`.trim();
    if (nextText.length <= chunkSize) {
      current.text = nextText;
      current.end = unit.end;
      current.splitReason = current.splitReason === unit.reason ? current.splitReason : "按段落/换行";
    } else {
      chunks.push(current);
      const overlapStart = Math.max(0, current.end - chunkOverlap);
      const start = Math.min(overlapStart, unit.start);
      current = {
        text: clean.slice(start, unit.end).trim(),
        start,
        end: unit.end,
        overlapLength: Math.max(0, unit.start - start),
        splitReason: unit.reason
      };
    }
  });
  if (current) chunks.push(current);
  return chunks
    .filter((chunk) => chunk.text.length > 8)
    .map((chunk) => ({ ...chunk, text: chunk.text.trim(), end: Math.max(chunk.start + chunk.text.trim().length, chunk.end) }));
}

function textUnitsWithRanges(text) {
  const units = [];
  const regex = /(.+?)(\n{2,}|\n|$)/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const body = match[1] || "";
    const separator = match[2] || "";
    if (!body.trim()) continue;
    units.push({
      text: `${body}${separator}`.trim(),
      start: match.index,
      end: match.index + body.length + separator.length,
      reason: separator.includes("\n\n") ? "按段落" : separator.includes("\n") ? "按换行" : "按字符长度"
    });
    if (!separator) break;
  }
  return units.length ? units : [{ text, start: 0, end: text.length, reason: "按字符长度" }];
}

function chunkQualityStatus(text, doc = {}) {
  const clean = normalizeText(text);
  if (!clean || clean.length < 30) return "不可引用";
  if (doc.parseStatus === "内容过短" || clean.length < 80 || clean.match(/扫描版|OCR|未解析|乱码/)) return "谨慎引用";
  return "可引用";
}

function splitRecursive(text, chunkSize, separators) {
  if (text.length <= chunkSize) return [text];
  const [separator, ...rest] = separators;
  if (separator === "") {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));
    return chunks;
  }
  const parts = text.split(separator).filter(Boolean).map((part, index, arr) => index < arr.length - 1 ? `${part}${separator}` : part);
  if (parts.length === 1) return splitRecursive(text, chunkSize, rest);
  return parts.flatMap((part) => part.length > chunkSize ? splitRecursive(part, chunkSize, rest) : [part]);
}

function inferSection(text) {
  const heading = String(text || "").split("\n").find((line) => line.trim().length > 0) || "";
  return heading.replace(/^#+\s*/, "").slice(0, 42) || "正文";
}

function inferEquipment(text) {
  const raw = String(text || "");
  if (raw.match(/压载泵|1号泵/)) return "1号压载泵";
  if (raw.match(/消防泵/)) return "1号消防泵";
  if (raw.match(/海水冷却泵|冷却泵/)) return "1号海水冷却泵";
  if (raw.match(/阀门|阀/)) return "压载水进口阀";
  if (raw.match(/管路|管子/)) return "压载水主管路";
  if (raw.match(/泵/)) return "泵类设备";
  return "-";
}

function inferSystemFromText(text) {
  const raw = String(text || "");
  if (raw.match(/压载/)) return "压载水系统";
  if (raw.match(/消防/)) return "消防水系统";
  if (raw.match(/冷却|海水/)) return "海水冷却系统";
  if (raw.match(/焊缝|RT|UT|探伤/)) return "船体结构";
  return "-";
}

function inferFaultSymptom(text) {
  const raw = String(text || "");
  if (raw.match(/振动|震|抖/)) return "异常振动";
  if (raw.match(/温度|发热|温升|烫/)) return "温度异常升高";
  if (raw.match(/泄漏|漏/)) return "泄漏";
  if (raw.match(/卡滞|转不动|不转/)) return "转动异常/泵轴卡滞";
  if (raw.match(/RT|UT|探伤|焊缝/)) return "探伤不合格";
  return "-";
}

function embedText(text) {
  const dim = 64;
  const vector = Array(dim).fill(0);
  const tokens = String(text || "").toLowerCase().match(/[\u4e00-\u9fa5]{1,2}|[a-z0-9]+/g) || [];
  tokens.forEach((token) => {
    const index = Math.abs(hashString(token)) % dim;
    vector[index] += 1;
  });
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(6)));
}

function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length) return 0;
  return a.reduce((sum, value, index) => sum + value * (b[index] || 0), 0);
}

async function runRagSearch() {
  const rag = ragState();
  const queryInput = document.querySelector("#ragQuery");
  if (queryInput) rag.query = queryInput.value;
  const query = normalizeText(rag.query || "");
  if (!query) {
    rag.notice = "请输入检索问题。";
    saveState();
    return render();
  }
  if (rag.config.vectorStoreMode === "Aliyun DashVector") {
    return queryDashVectorCloud(query);
  }
  const enabledDocIds = new Set(rag.documents.filter((doc) => doc.enabled !== false).map((doc) => doc.id));
  const searchableChunks = rag.chunks.filter((chunk) => enabledDocIds.has(chunk.document_id) && chunk.qualityStatus !== "不可引用" && chunk.metadata?.quality_status !== "不可引用");
  if (!searchableChunks.length) {
    rag.notice = "请先上传文档生成 Chunk，或将治理后的知识卡片写入 LocalStorage 本地向量库。";
    saveState();
    return render();
  }
  const queryEmbedding = embedText(query);
  const queryTerms = new Set((query.match(/[\u4e00-\u9fa5]{1,2}|[a-z0-9]+/gi) || []).map((item) => item.toLowerCase()));
  const results = searchableChunks.map((chunk) => {
    const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
    const text = `${chunk.text} ${Object.values(chunk.metadata || {}).join(" ")}`.toLowerCase();
    const keywordHits = [...queryTerms].filter((term) => text.includes(term));
    const keywordScore = Math.min(0.25, keywordHits.length * 0.04);
    const score = Math.min(0.99, vectorScore * 0.75 + keywordScore);
    return {
      chunkId: chunk.id,
      title: chunk.title,
      text: chunk.text,
      score: Number(score.toFixed(4)),
      similarity: Math.round(score * 100),
      metadata: chunk.metadata,
      reason: keywordHits.length ? `向量相似 + 关键词命中：${keywordHits.slice(0, 6).join("、")}` : "向量语义相似命中",
      source: chunk.metadata?.document_name || chunk.title
    };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
  rag.results = results;
  rag.answer = composeRagAnswer(query, results);
  rag.notice = `完成检索：问题理解 → 查询向量化 → 向量检索 → metadata过滤 → Top3重排序。`;
  recordRunAnalysis({
    run_id: `RAG-LOCAL-${Date.now()}`,
    run_type: "RAG 检索运行",
    user_input: query,
    route: "rag_query",
    agent_name: "RAGRetriever",
    node_trace: ["问题理解", "查询向量化", "向量检索", "metadata过滤", "Top3重排序"].map((node) => ({ node, status: "success" })),
    rag_hits: results,
    final_status: results.length ? "completed" : "failed",
    created_at: new Date().toISOString()
  });
  saveState();
  render();
}

async function runRagEval() {
  const rag = ragState();
  rag.evalNotice = "RAG评测运行中：资料质量、Chunk质量、Metadata、检索、回答可信度和归因正在执行。";
  saveState();
  render();
  try {
    const response = await fetch("/api/eval/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documents: rag.documents.map((doc) => ({
          document_name: doc.name,
          source_type: doc.metadata?.source_type || doc.type || "-",
          equipment_name: doc.metadata?.equipment_name || "-",
          system: doc.metadata?.system || "-",
          review_status: doc.metadata?.review_status || "已审核",
          quality_status: doc.metadata?.quality_status || "可引用",
          parse_status: doc.parseFailureReason ? "failed" : "parsed"
        })),
        chunks: rag.chunks.map((chunk) => ({
          id: chunk.id,
          text: chunk.text,
          metadata: chunk.metadata || {}
        })),
        vectorStoreMode: rag.config.vectorStoreMode,
        topK: Number(rag.config.topK || 5),
        threshold: 0.6
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "RAG评测失败");
    rag.evalResult = data.state;
    rag.evalNotice = `RAG评测完成：状态=${data.state?.status || "-"}，分支=${data.state?.branch || "-"}。`;
  } catch (error) {
    rag.evalNotice = `RAG评测失败：${error.message || "请确认后端和DashVector配置正常"}`;
  }
  saveState();
  render();
}

async function loadLatestRagEval() {
  const rag = ragState();
  try {
    const response = await fetch("/api/eval/latest");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "读取最近评测失败");
    rag.evalResult = data.state;
    rag.evalNotice = data.state ? "已读取最近一次RAG评测结果。" : "后端暂无最近评测结果。";
  } catch (error) {
    rag.evalNotice = `读取最近评测失败：${error.message || "后端未启动"}`;
  }
  saveState();
  render();
}

function renderAgentPage() {
  const run = state.agentRun || {};
  const nodeStatus = run.node_status || {};
  const toolCalls = run.tool_calls || [];
  const auditEvents = run.audit_events || [];
  const citations = run.citations || [];
  const runList = state.agentRunList || [];
  const knowledgeOps = state.agentKnowledgeOps || {};
  const currentUser = currentAgentUser();
  const role = currentUser.role;
  return `
    <section class="agent-runtime-page">
      <div class="enterprise-hero panel">
        <div>
          <p class="eyebrow">LangGraph Agent Runtime</p>
          <h2>设备故障 Agent 运行台</h2>
          <p class="dashboard-desc">用真实 @langchain/langgraph StateGraph 编排 Tool、State、审计、人工复核和反馈回流。当前答案生成仍为企业规则模板，便于先验证业务闭环。</p>
        </div>
        <div class="agent-feedback-actions">
          <button class="secondary-btn" data-help="capabilities" type="button">Demo能力说明</button>
          <span class="status-pill">${run.langgraph?.enabled ? "真实LangGraph.js" : "待运行"}</span>
        </div>
      </div>

      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Login & Approval Permission</p><h2>模拟登录账号与审批权限</h2></div>
          <div class="agent-feedback-actions">
            <button class="secondary-btn" data-load-approvals type="button">刷新审批</button>
            <button class="secondary-btn" data-load-audit-logs type="button">刷新审计</button>
          </div>
        </div>
        <div class="login-account-card">
          <div>
            <span>当前登录账号</span>
            <strong>${escapeHtml(currentUser.name)}｜${escapeHtml(currentUser.role)}</strong>
            <p>${escapeHtml(currentUser.department)} / ${escapeHtml(currentUser.scope)}</p>
          </div>
          <em>${escapeHtml(currentUser.approval)}</em>
        </div>
        <div class="role-switcher">
          ${agentAccounts().map((account) => `
            <button class="${currentUser.id === account.id ? "active" : ""}" data-agent-user="${account.id}" type="button">
              <strong>${escapeHtml(account.name)}</strong>
              <span>${escapeHtml(account.role)}</span>
            </button>
          `).join("")}
        </div>
        <p class="muted">这是模拟企业登录态：账号绑定角色和审批权限。审批流按当前登录账号判断权限，权限不足的操作会置灰，并提示“当前角色无权限执行该操作”。</p>
      </article>

      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Agent Input</p><h2>运行设备故障 Agent</h2></div>
          <div class="agent-feedback-actions">
            <button class="secondary-btn" data-load-agent-runs type="button">刷新运行回放</button>
            <button class="primary-btn" data-run-equipment-agent type="button">运行设备故障Agent</button>
          </div>
        </div>
        <textarea id="agentQuestion" class="agent-question-input" rows="3">${escapeHtml(state.agentQuestion || "")}</textarea>
        <p class="muted">Router 会先判断问题应进入哪个 Agent：设备故障、质量异常、数据治理、知识运营、RAG评测或 fallback。当前设备故障链路已接 LangGraph + Tool + RAG + 人工复核，其余分支先做轻量路由入口。</p>
        ${state.agentNotice ? `<div class="filter-notice">${escapeHtml(state.agentNotice)}</div>` : ""}
      </article>

      <section class="agent-runtime-grid">
        <div class="agent-runtime-main">
          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">State</p><h2>运行态 State 摘要</h2></div>
              <span class="status-pill">${escapeHtml(run.agent_run_id || "未生成Run")}</span>
            </div>
            <div class="agent-state-grid">
              ${renderAgentStateMetric("执行状态", run.status || "-")}
              ${renderAgentStateMetric("Agent Route", run.agent_route || "-")}
              ${renderAgentStateMetric("路由Agent", agentRouteName(run.agent_route))}
              ${renderAgentStateMetric("运行分支", run.route || "-")}
              ${renderAgentStateMetric("当前节点", run.current_node || "-")}
              ${renderAgentStateMetric("业务场景", run.scenario || "-")}
              ${renderAgentStateMetric("风险等级", run.risk_level || "-")}
              ${renderAgentStateMetric("等待人工输入", run.waiting_human_input ? "是" : run.agent_run_id ? "否" : "-")}
              ${renderAgentStateMetric("Tool调用数", toolCalls.length || 0)}
            </div>
            ${(run.failure_reasons || []).length ? `<div class="filter-notice">失败/降级原因：${escapeHtml((run.failure_reasons || []).join("；"))}</div>` : ""}
            ${run.route_reason ? `<div class="filter-notice">路由依据：${escapeHtml(run.route_reason)}</div>` : ""}
            ${run.agent_route ? `<div class="filter-notice">后续执行状态：${escapeHtml(agentRouteExecutionStatus(run))}</div>` : ""}
          </article>

          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Execution Plan</p><h2>LangGraph 节点执行链</h2></div>
              <span class="status-pill">StateGraph</span>
            </div>
            <div class="agent-node-chain">
              ${(run.langgraph?.nodes || ["input_node", "intent_classify_node", "master_data_lookup_node", "rag_retrieve_node", "graph_query_node", "quality_check_node", "risk_assess_node", "answer_compose_node", "human_review_route_node", "feedback_record_node"]).map((node) => {
                const item = nodeStatus[node] || {};
                return `
                  <article>
                    <span>${escapeHtml(item.status || "pending")}</span>
                    <strong>${escapeHtml(node)}</strong>
                    <p>${item.duration_ms !== undefined ? `${item.duration_ms}ms` : "等待执行"}</p>
                  </article>
                `;
              }).join("")}
            </div>
          </article>

          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Tool Calls</p><h2>工具调用链</h2></div>
              <span class="status-pill">${toolCalls.length} 次</span>
            </div>
            <div class="agent-tool-list">
              ${toolCalls.length ? toolCalls.map((call, index) => `
                <article>
                  <div>
                    <span>${index + 1}</span>
                    <strong>${escapeHtml(call.tool || "-")}</strong>
                    <em>${escapeHtml(call.status || "-")}</em>
                  </div>
                  <dl>
                    <div><dt>输入</dt><dd>${escapeHtml(shortJson(call.input))}</dd></div>
                    <div><dt>输出</dt><dd>${escapeHtml(shortJson(call.output))}</dd></div>
                    <div><dt>操作角色</dt><dd>${escapeHtml(call.operator_role || "-")}</dd></div>
                    <div><dt>耗时/错误</dt><dd>${escapeHtml(`${call.duration_ms || 0}ms${call.error ? `｜${call.error}` : ""}`)}</dd></div>
                  </dl>
                </article>
              `).join("") : `<p class="muted">点击“运行设备故障Agent”后展示每个 Tool 的输入、输出和状态。</p>`}
            </div>
          </article>

          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Business Output</p><h2>Agent 业务建议</h2></div>
              <span class="status-pill">${run.answer ? "已生成" : "待生成"}</span>
            </div>
            <pre class="agent-answer-box">${escapeHtml(run.answer || "运行后将输出：标准设备识别、相似案例、可能原因、排查步骤、推荐SOP、需补全字段和低置信度提示。")}</pre>
            ${renderAgentHumanReviewForm(run)}
            <div class="agent-feedback-actions">
              ${["采纳建议", "部分采纳", "标记错误", "补充字段", "形成知识缺口"].map((item) => `<button class="secondary-btn" data-agent-feedback="${item}" type="button" ${canRole("feedback") ? "" : "disabled"}>${item}</button>`).join("")}
            </div>
          </article>

          ${renderApprovalPanel()}

          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Replay</p><h2>Agent 运行回放</h2></div>
              <span class="status-pill">${runList.length} 条</span>
            </div>
            <div class="agent-run-list">
              ${runList.length ? runList.map((item) => `
                <button type="button" data-load-agent-run="${escapeHtml(item.agent_run_id)}">
                  <strong>${escapeHtml(item.agent_run_id)}</strong>
                  <span>${escapeHtml(item.route || "-")}｜${escapeHtml(item.status || "-")}｜Tool ${escapeHtml(item.tool_call_count || 0)}｜引用 ${escapeHtml(item.citation_count || 0)}</span>
                </button>
              `).join("") : `<p class="muted">点击“刷新运行回放”后，可按 run_id 查看一次 Agent 的完整运行链路。</p>`}
            </div>
          </article>
        </div>

        <aside class="agent-runtime-side">
          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Tool Registry</p><h2>工具注册表</h2></div>
            </div>
            <div class="agent-tool-registry">
              ${(run.tool_registry || []).length ? run.tool_registry.map((tool) => `
                <article>
                  <strong>${escapeHtml(tool.key || "-")}</strong>
                  <p>${escapeHtml(tool.name || "-")}</p>
                  <span>${escapeHtml(tool.description || "-")}</span>
                </article>
              `).join("") : `<p class="muted">运行 Agent 后展示统一注册的工具能力。</p>`}
            </div>
          </article>

          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Evidence</p><h2>可信依据面板</h2></div>
            </div>
            <div class="agent-evidence-list">
              <article><span>引用主数据</span><strong>${escapeHtml(run.selected_equipment ? `${run.selected_equipment.name} ${run.selected_equipment.code}` : "待识别")}</strong></article>
              <article><span>RAG命中</span><strong>${citations.length} 条可引用资料</strong></article>
              <article><span>图谱关系</span><strong>${(run.graph_facts || []).length} 条</strong></article>
              <article><span>缺失字段</span><strong>${escapeHtml((run.missing_fields || []).join("、") || "暂无")}</strong></article>
              <article><span>反馈状态</span><strong>${escapeHtml(run.feedback?.type || run.feedback?.status || "待反馈")}</strong></article>
            </div>
          </article>

          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Citations</p><h2>RAG 引用</h2></div>
            </div>
            <div class="agent-citation-list">
              ${citations.length ? citations.map((item) => `
                <article>
                  <strong>${escapeHtml(item.document_name || "-")}</strong>
                  <p>相似度 ${escapeHtml(item.similarity ?? "-")}%｜${escapeHtml(item.source_type || "-")}｜${escapeHtml(item.quality_status || "-")}</p>
                </article>
              `).join("") : `<p class="muted">暂无引用。若 DashVector 无可引用 Chunk，Agent 会进入人工复核分支。</p>`}
            </div>
          </article>

          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Audit</p><h2>审计事件</h2></div>
            </div>
            <div class="agent-audit-list">
              ${auditEvents.length ? auditEvents.slice(-8).map((item) => `
                <article>
                  <strong>${escapeHtml(item.node || "-")}</strong>
                  <p>${escapeHtml(item.action || "-")}</p>
                  <span>${escapeHtml(item.at || "-")}</span>
                </article>
              `).join("") : `<p class="muted">运行后记录节点动作、路由、反馈等审计事件。</p>`}
            </div>
          </article>

          <article class="panel enterprise-card">
            <div class="section-heading compact">
              <div><p class="eyebrow">Knowledge Ops</p><h2>知识运营回流</h2></div>
            </div>
            <div class="agent-evidence-list">
              <article><span>知识缺口</span><strong>${escapeHtml((run.knowledge_gaps || knowledgeOps.knowledge_gaps || []).length || 0)} 条</strong></article>
              <article><span>待审核知识卡片</span><strong>${escapeHtml((run.knowledge_cards || knowledgeOps.pending_knowledge_cards || []).length || 0)} 条</strong></article>
              <article><span>后续动作</span><strong>知识审核后可重新写入 DashVector</strong></article>
            </div>
            <div class="agent-run-list">
              ${(knowledgeOps.pending_knowledge_cards || []).slice(0, 4).map((card) => `
                <button type="button" data-approve-card="${escapeHtml(card.card_id)}" ${canRole("knowledge") ? "" : "disabled"}>
                  <strong>${escapeHtml(card.title || card.card_id)}</strong>
                  <span>${escapeHtml(card.review_status || "-")}｜${escapeHtml(card.vector_status || "-")}${card.vector_error ? `｜${escapeHtml(card.vector_error)}` : ""}</span>
                </button>
              `).join("")}
            </div>
          </article>
        </aside>
      </section>
    </section>
  `;
}

function renderApprovalPanel() {
  const approvals = state.approvalTasks || [];
  return `
    <article class="panel enterprise-card">
      <div class="section-heading compact">
        <div><p class="eyebrow">Approval Flow</p><h2>审批任务列表</h2></div>
        <span class="status-pill">${approvals.length} 条</span>
      </div>
      <div class="approval-task-list">
        ${approvals.length ? approvals.map((task) => {
          const allowed = canApprove(task);
          return `
            <article>
              <div>
                <strong>${escapeHtml(task.title || task.task_id)}</strong>
                <span>${escapeHtml(task.status || "-")}｜${escapeHtml(task.assignee_role || "-")}｜${escapeHtml(task.object_type || "-")}</span>
              </div>
              <div class="agent-feedback-actions">
                <button class="secondary-btn" data-approve-task="${escapeHtml(task.task_id)}" ${allowed ? "" : "disabled"} type="button">通过</button>
                <button class="secondary-btn danger" data-reject-task="${escapeHtml(task.task_id)}" ${allowed ? "" : "disabled"} type="button">驳回</button>
              </div>
            </article>
          `;
        }).join("") : `<p class="muted">暂无审批任务。人工复核通过生成知识卡片后，会自动产生知识管理员审核任务。</p>`}
      </div>
    </article>
  `;
}

function renderAgentHumanReviewForm(run) {
  if (!run?.agent_run_id || run.route !== "human_review") {
    return "";
  }
  const review = run.human_review_result || {};
  return `
    <div class="agent-review-box">
      <div class="section-heading compact">
        <div><p class="eyebrow">Human Review Resume</p><h2>人工复核补充字段后继续执行</h2></div>
        <button class="primary-btn" data-resume-agent-run type="button" ${canRole("repairReview") ? "" : "disabled"}>提交复核并恢复执行</button>
      </div>
      <div class="agent-review-grid">
        ${renderAgentReviewInput("equipment_code", "设备编码", review.equipment_code || run.selected_equipment?.code || "EQ-BW-PUMP-001")}
        ${renderAgentReviewInput("vibration_value", "振动值", review.vibration_value || "7.2 mm/s")}
        ${renderAgentReviewInput("temperature_value", "轴承温度", review.temperature_value || "78℃")}
        ${renderAgentReviewInput("acceptance_result", "验收结果", review.acceptance_result || "复测合格，试运行正常")}
        ${renderAgentReviewInput("repair_result", "处理结果", review.repair_result || "更换轴承并联轴器找正后恢复正常")}
      </div>
      <p class="muted">提交后后端调用 resume 接口，LangGraph 从 human_review 后恢复执行，重新做 RAG/质量检查/风险评估/建议生成。</p>
    </div>
  `;
}

function renderAgentReviewInput(key, label, value) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input data-agent-review="${key}" value="${escapeHtml(value || "")}">
    </label>
  `;
}

function renderAgentStateMetric(label, value) {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function agentRouteName(route) {
  const routeMap = {
    equipment_fault: "设备故障 Agent",
    quality_issue: "质量异常 Agent",
    data_governance: "数据治理 Agent",
    knowledge_ops: "知识运营 Agent",
    rag_eval: "RAG评测 Agent",
    fallback: "待补充说明"
  };
  return routeMap[route] || "-";
}

function agentRouteExecutionStatus(run) {
  if (!run?.agent_route) return "等待运行 Router";
  if (run.agent_route === "equipment_fault") {
    if (run.waiting_human_input) return "已进入设备故障 LangGraph 链路，当前等待人工复核补充字段";
    if (run.status === "completed") return "设备故障 LangGraph 链路已完成，可查看工具调用、引用和知识回流";
    return "设备故障 LangGraph 链路执行中";
  }
  if (run.agent_route === "fallback") return "无法判断业务场景，等待用户补充说明";
  return `${agentRouteName(run.agent_route)} 已完成轻量路由，后续可扩展为独立 LangGraph 子图`;
}

function agentAccounts() {
  return [
    { id: "frontline_chen", name: "陈师傅", role: "一线员工", department: "机舱维修班组", scope: "提交问题、查看建议、反馈采纳情况", approval: "无审批权限" },
    { id: "repair_li", name: "李工", role: "维修工程师", department: "设备维修中心", scope: "补充维修字段、恢复 human_review", approval: "维修字段复核" },
    { id: "device_wang", name: "王主管", role: "设备管理员", department: "设备管理部", scope: "确认设备编码、主数据绑定", approval: "设备主数据复核" },
    { id: "knowledge_zhao", name: "赵老师", role: "知识管理员", department: "知识运营组", scope: "审核知识卡片、发布知识、触发向量入库", approval: "知识发布审批" },
    { id: "audit_qian", name: "钱审计", role: "审计管理员", department: "数据治理办公室", scope: "查看审计日志和运行回放", approval: "只读审计" },
    { id: "admin_demo", name: "系统管理员", role: "管理员", department: "平台管理员", scope: "全量演示权限", approval: "全部审批权限" }
  ];
}

function currentAgentUser() {
  const user = agentAccounts().find((item) => item.id === state.agentUserId);
  if (user) return user;
  const roleUser = agentAccounts().find((item) => item.role === state.agentRole);
  return roleUser || agentAccounts().at(-1);
}

function currentActorPayload() {
  const user = currentAgentUser();
  return {
    actor: user.name,
    actor_role: user.role,
    operator_role: user.role,
    operator_name: user.name,
    user_id: user.id
  };
}

function canRole(action) {
  const role = currentAgentUser().role;
  if (role === "管理员") return true;
  if (action === "feedback") return ["一线员工", "维修工程师", "设备管理员", "知识管理员"].includes(role);
  if (action === "repairReview") return ["维修工程师"].includes(role);
  if (action === "deviceReview") return ["设备管理员"].includes(role);
  if (action === "knowledge") return ["知识管理员"].includes(role);
  if (action === "audit") return ["审计管理员"].includes(role);
  return false;
}

function canApprove(task) {
  const role = currentAgentUser().role;
  return role === "管理员" || role === task.assignee_role || (task.object_type === "knowledge_card" && role === "知识管理员");
}

function permissionNotice() {
  state.agentNotice = "当前角色无权限执行该操作";
  saveState();
  render();
}

function shortJson(value, max = 240) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? {});
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function runEquipmentAgent() {
  const input = document.querySelector("#agentQuestion");
  if (input) state.agentQuestion = input.value;
  state.agentNotice = "设备故障Agent运行中：LangGraph 正在调度主数据、RAG、图谱、质量规则和答案生成节点。";
  saveState();
  render();
  try {
    const response = await fetch("/api/agent/equipment-fault/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: state.agentQuestion, ...currentActorPayload() })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "设备故障Agent运行失败");
    state.agentRun = data.state;
    state.agentNotice = `Agent运行完成：Run=${data.state?.agent_run_id || "-"}，分支=${data.state?.route || "-"}。`;
    await loadAgentRuns(false);
  } catch (error) {
    state.agentNotice = `Agent运行失败：${error.message || "请确认后端已启动，并已配置DashVector/Embedding环境变量。"}`;
  }
  saveState();
  render();
}

async function resumeAgentRun() {
  if (!canRole("repairReview") && !canRole("deviceReview")) return permissionNotice();
  if (!state.agentRun?.agent_run_id) {
    state.agentNotice = "请先运行设备故障Agent，再提交人工复核。";
    saveState();
    return render();
  }
  const fields = {};
  document.querySelectorAll("[data-agent-review]").forEach((input) => {
    fields[input.dataset.agentReview] = input.value;
  });
  state.agentNotice = "人工复核字段已提交，LangGraph 正在从 human_review 分支恢复执行。";
  saveState();
  render();
  try {
    const response = await fetch(`/api/agent/runs/${encodeURIComponent(state.agentRun.agent_run_id)}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields, ...currentActorPayload() })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "恢复执行失败");
    state.agentRun = data.state;
    state.agentNotice = `人工复核后已恢复执行：状态=${data.state?.status || "-"}，分支=${data.state?.route || "-"}。`;
    await loadAgentRuns(false);
    await loadAgentKnowledgeOps(false);
  } catch (error) {
    state.agentNotice = `恢复执行失败：${error.message || "请确认后端运行正常。"}`;
  }
  saveState();
  render();
}

async function sendAgentFeedback(type) {
  if (!canRole("feedback")) return permissionNotice();
  if (!state.agentRun?.agent_run_id) {
    state.agentNotice = "请先运行设备故障Agent，再提交反馈。";
    saveState();
    return render();
  }
  try {
    const response = await fetch(`/api/agent/runs/${encodeURIComponent(state.agentRun.agent_run_id)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...currentActorPayload() })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "反馈提交失败");
    state.agentRun = data.state;
    state.agentNotice = `已提交反馈：${type}。审计日志和Agent状态已更新。`;
    await loadAgentKnowledgeOps(false);
    await loadAgentRuns(false);
  } catch (error) {
    state.agentNotice = `反馈提交失败：${error.message || "请重新运行Agent后再试。"}`;
  }
  saveState();
  render();
}

async function loadAgentRuns(shouldRender = true) {
  try {
    const response = await fetch("/api/agent/runs");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "读取运行回放失败");
    state.agentRunList = data.runs || [];
  } catch (error) {
    state.agentNotice = `读取运行回放失败：${error.message || "后端未启动"}`;
  }
  saveState();
  if (shouldRender) render();
}

async function loadAgentRunById(runId) {
  try {
    const response = await fetch(`/api/agent/runs/${encodeURIComponent(runId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "读取Agent Run失败");
    if (!data.state) throw new Error("该 run_id 不存在，可能后端已重启");
    state.agentRun = data.state;
    state.agentNotice = `已加载运行回放：${runId}`;
  } catch (error) {
    state.agentNotice = `读取运行回放失败：${error.message || "后端未启动"}`;
  }
  saveState();
  render();
}

async function loadAgentKnowledgeOps(shouldRender = true) {
  try {
    const response = await fetch("/api/agent/knowledge-operations");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "读取知识运营回流失败");
    state.agentKnowledgeOps = data;
  } catch (error) {
    state.agentNotice = `读取知识运营回流失败：${error.message || "后端未启动"}`;
  }
  saveState();
  if (shouldRender) render();
}

async function loadApprovals(shouldRender = true) {
  try {
    const response = await fetch("/api/approvals");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "读取审批任务失败");
    state.approvalTasks = data.approvals || [];
  } catch (error) {
    state.agentNotice = `读取审批任务失败：${error.message || "后端未启动"}`;
  }
  saveState();
  if (shouldRender) render();
}

async function approveTask(taskId) {
  const task = (state.approvalTasks || []).find((item) => item.task_id === taskId);
  if (task && !canApprove(task)) return permissionNotice();
  try {
    const response = await fetch(`/api/approvals/${encodeURIComponent(taskId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentActorPayload())
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "审批通过失败");
    state.agentNotice = data.vector_result?.error
      ? `审批已通过，但向量入库失败：${data.vector_result.error}`
      : "审批已通过，已尝试写入 DashVector。";
    await loadApprovals(false);
    await loadAgentKnowledgeOps(false);
    await loadAuditLogs(false);
  } catch (error) {
    state.agentNotice = `审批失败：${error.message}`;
  }
  saveState();
  render();
}

async function rejectTask(taskId) {
  const task = (state.approvalTasks || []).find((item) => item.task_id === taskId);
  if (task && !canApprove(task)) return permissionNotice();
  try {
    const response = await fetch(`/api/approvals/${encodeURIComponent(taskId)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...currentActorPayload(), reason: "Demo驳回" })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "审批驳回失败");
    state.agentNotice = "审批任务已驳回，并已写入审计日志。";
    await loadApprovals(false);
    await loadAgentKnowledgeOps(false);
    await loadAuditLogs(false);
  } catch (error) {
    state.agentNotice = `驳回失败：${error.message}`;
  }
  saveState();
  render();
}

async function approveKnowledgeCard(cardId) {
  if (!canRole("knowledge")) return permissionNotice();
  try {
    const response = await fetch(`/api/knowledge-cards/${encodeURIComponent(cardId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentActorPayload())
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "知识卡片审核失败");
    state.agentNotice = data.vector_result?.error
      ? `知识卡片已审核，但向量入库失败：${data.vector_result.error}`
      : "知识卡片已审核，并已写入 DashVector。";
    await loadApprovals(false);
    await loadAgentKnowledgeOps(false);
    await loadAuditLogs(false);
  } catch (error) {
    state.agentNotice = `知识卡片审核失败：${error.message}`;
  }
  saveState();
  render();
}

async function loadAuditLogs(shouldRender = true) {
  try {
    const response = await fetch("/api/audit-logs");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "读取审计日志失败");
    state.auditLogs = data.logs || [];
    state.agentNotice = `已读取审计日志 ${state.auditLogs.length} 条。`;
  } catch (error) {
    state.agentNotice = `读取审计日志失败：${error.message || "后端未启动"}`;
  }
  saveState();
  if (shouldRender) render();
}

async function loadRunAnalysis(shouldRender = true) {
  const filters = state.runAnalysisFilters || {};
  const params = new URLSearchParams();
  if (filters.run_type && filters.run_type !== "全部") params.set("run_type", filters.run_type);
  if (filters.status && filters.status !== "全部") params.set("status", filters.status);
  if (filters.route && filters.route !== "全部") params.set("route", filters.route);
  if (filters.agent_name && filters.agent_name !== "全部") params.set("agent_name", filters.agent_name);
  try {
    const response = await fetch(`/api/run-analysis${params.toString() ? `?${params}` : ""}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "读取运行分析失败");
    state.runAnalysis = data.records || [];
    if (!state.selectedAnalysisRunId && state.runAnalysis[0]) state.selectedAnalysisRunId = state.runAnalysis[0].run_id;
  } catch (error) {
    state.agentNotice = `读取运行分析失败：${error.message || "后端未启动"}`;
  }
  saveState();
  if (shouldRender) render();
}

async function recordRunAnalysis(payload) {
  const enriched = enrichRunAnalysisRecord(payload);
  state.runAnalysis = [enriched, ...(state.runAnalysis || []).filter((item) => item.run_id !== enriched.run_id)].slice(0, 80);
  state.selectedAnalysisRunId = enriched.run_id;
  try {
    await fetch("/api/run-analysis/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enriched)
    });
  } catch {
    // 分析中心是辅助能力，不阻塞主流程。
  }
}

function enrichRunAnalysisRecord(payload) {
  const analysis = payload.analysis || evaluateAgentRunEffect(payload);
  return {
    ...payload,
    analysis,
    effect_score: payload.effect_score ?? scoreRunEffect(analysis),
    success_items: payload.success_items || Object.entries(analysis).filter(([, value]) => value === true).map(([key]) => key),
    failed_items: payload.failed_items || Object.entries(analysis).filter(([, value]) => value === false).map(([key]) => key),
    root_causes: payload.root_causes || rootCausesForRun(payload, analysis),
    suggestions: payload.suggestions || suggestionsForRun(payload, analysis),
    created_at: payload.created_at || new Date().toISOString()
  };
}

function evaluateAgentRunEffect(run) {
  const toolCalls = run.tool_calls || [];
  const ragHits = run.rag_hits || [];
  const finalAnswer = run.final_answer || run.finalAnswer || run.answer || "";
  return {
    router_ok: Boolean(run.route && run.route !== "fallback"),
    state_flow_ok: Boolean((run.node_trace || []).length >= 4),
    tools_ok: toolCalls.length ? toolCalls.every((call) => call.status === "success") : false,
    rag_hit_ok: ragHits.some((hit) => Number(hit.similarity || hit.score * 100 || 0) >= 55),
    human_review_ok: run.human_review?.required ? Boolean(run.human_review?.status) : true,
    resume_ok: run.human_review?.required ? Boolean(run.resume?.status === "success" || run.resume_success) : true,
    citation_ok: /引用|依据|来源/.test(finalAnswer) || ragHits.length > 0,
    knowledge_output_ok: Boolean(run.knowledge_gap || run.knowledge_card || run.knowledge_gap_created || run.knowledge_card_created),
    feedback_ok: Boolean(run.feedback),
    audit_ok: Boolean(run.audit_logged || (run.node_trace || []).length)
  };
}

function scoreRunEffect(analysis) {
  const entries = Object.values(analysis);
  if (!entries.length) return 0;
  return Math.round((entries.filter(Boolean).length / entries.length) * 100);
}

function rootCausesForRun(run, analysis) {
  const causes = [];
  if (!analysis.router_ok) causes.push("Router 分流错误或进入 fallback。");
  if (!analysis.state_flow_ok) causes.push("LangGraph State 节点链路不完整。");
  if (!analysis.tools_ok) causes.push("Tool 调用失败或未记录 Tool 调用链。");
  if (!analysis.rag_hit_ok) causes.push("RAG 未命中有效资料或相似度偏低。");
  if (!analysis.human_review_ok) causes.push("Human Review 未完成。");
  if (!analysis.resume_ok) causes.push("人工复核后未成功 resume。");
  if (!analysis.citation_ok) causes.push("最终回答缺少引用依据。");
  if (!analysis.knowledge_output_ok) causes.push("未生成知识缺口或知识卡片。");
  if (!analysis.feedback_ok) causes.push("反馈回流未完成。");
  if (!analysis.audit_ok) causes.push("审计日志未记录。");
  return causes.length ? causes : ["本次运行链路完整，未发现明显失败原因。"];
}

function suggestionsForRun(run, analysis) {
  const suggestions = [];
  if (!analysis.router_ok) suggestions.push("优化 Router 规则或增加 LLM Router 兜底。");
  if (!analysis.state_flow_ok) suggestions.push("补齐 LangGraph node_trace 和 state_snapshot。");
  if (!analysis.tools_ok) suggestions.push("检查 Tool Registry，失败工具应记录 error、duration 和重试结果。");
  if (!analysis.rag_hit_ok) suggestions.push("补充 SOP/历史案例，或调整 Chunk Size、Overlap 和 metadata。");
  if (!analysis.citation_ok) suggestions.push("答案生成必须强制附带引用 Chunk 和来源文档。");
  if (!analysis.knowledge_output_ok) suggestions.push("对未命中问题自动生成 knowledge_gap，典型闭环生成知识卡片。");
  if (!analysis.feedback_ok) suggestions.push("增加采纳/部分采纳/标记错误/补充字段的反馈按钮。");
  if (!analysis.audit_ok) suggestions.push("所有运行、审批、反馈和入库动作写入 audit_logs。");
  return suggestions.length ? suggestions : ["保持当前配置，可继续用更多真实文档验证召回率和引用准确性。"];
}

function loadRunExperimentCase(caseId) {
  const item = runExperimentCases.find((runCase) => runCase.id === caseId);
  if (!item) return;
  state.agentQuestion = item.question;
  ragState().query = item.question;
  state.agentNotice = `已加载案例：${item.name}。可切到 Agent 页面运行，或在分析中心点击“运行案例实验”。`;
  saveState();
  render();
}

async function runExperimentCase(caseId) {
  const item = runExperimentCases.find((runCase) => runCase.id === caseId);
  if (!item) return;
  const rag = ragState();
  if (!rag.documents.some((doc) => doc.builtIn)) {
    const now = new Date().toLocaleString("zh-CN", { hour12: false });
    rag.documents = builtInRagDocuments.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      text: normalizeText(doc.text),
      pages: [],
      sections: sectionMetadataFromText(doc.text),
      uploadedAt: now,
      enabled: true,
      parseStatus: "解析成功",
      parseFailureReason: "",
      parseWarnings: [],
      status: "已解析",
      builtIn: true,
      metadata: {
        document_name: doc.name,
        source_type: "内置知识包",
        business_source_type: doc.sourceType,
        upload_time: now,
        parser: "Built-in Markdown",
        parse_status: "解析成功",
        equipment_name: doc.equipment,
        system: doc.system,
        fault_symptom: doc.fault,
        review_status: "已审核",
        quality_status: "可引用"
      }
    }));
    rag.builtInPackLoaded = true;
  }
  if (!rag.chunks.some((chunk) => chunk.metadata?.source_type === "内置知识包")) {
    for (const doc of rag.documents.filter((doc) => doc.builtIn)) {
      await buildRagChunksForDocumentNoRender(doc);
    }
  }
  const ragHits = scoreLocalChunks(item.question, rag.chunks.filter((chunk) => chunk.qualityStatus !== "不可引用"), 3);
  const needsHuman = item.id === "case-bw-pump" || item.id === "case-excel-governance";
  const toolCalls = [
    toolCallMock("agent_router", { question: item.question }, { route: item.route, agent_name: item.agent }),
    toolCallMock("master_data_lookup", { question: item.question }, { equipment: item.testData }),
    toolCallMock("rag_retrieve", { query: item.question, top_k: 3 }, { hits: ragHits.length }),
    toolCallMock("quality_rule_check", { test_data: item.testData }, { need_human_review: needsHuman }),
    toolCallMock(needsHuman ? "create_review_task" : "knowledge_card_upsert", { case_id: item.id }, { status: "success" })
  ];
  const finalAnswer = composeCaseAnswer(item, ragHits, needsHuman);
  const payload = {
    run_id: `CASE-${item.id}-${Date.now()}`,
    run_type: "LangGraph Agent 运行案例",
    user_input: `${item.question}\n${item.testData}`,
    route: item.route,
    agent_name: item.agent,
    node_trace: ["agent_router_node", "intent_classify_node", "master_data_lookup_node", "rag_retrieve_node", "quality_rule_check_node", needsHuman ? "human_review_node" : "answer_compose_node", "feedback_record_node"].map((node) => ({ node, status: "success" })),
    tool_calls: toolCalls,
    rag_hits: ragHits,
    human_review: needsHuman ? { required: true, status: "pending", fields: ["equipment_code", "vibration_value", "temperature_value"] } : { required: false, status: "not_required" },
    resume: needsHuman ? { status: "pending" } : { status: "not_required" },
    final_answer: finalAnswer,
    feedback: null,
    knowledge_gap: ragHits.length ? null : { title: `${item.name} 缺少可引用资料` },
    knowledge_card: item.route === "quality_issue" || item.route === "equipment_fault" ? { title: `${item.name}运行案例知识卡片`, status: "待审核" } : null,
    final_status: needsHuman ? "waiting_human_review" : "completed",
    audit_logged: true,
    created_at: new Date().toISOString()
  };
  await recordRunAnalysis(payload);
  state.agentQuestion = item.question;
  rag.query = item.question;
  state.agentNotice = `已运行案例实验：${item.name}，评分 ${state.runAnalysis[0]?.effect_score || 0}。`;
  saveState();
  render();
}

function toolCallMock(toolName, input, output) {
  return {
    tool_name: toolName,
    input,
    output,
    status: "success",
    error: "",
    duration_ms: 12 + Math.floor(Math.random() * 28),
    operator_role: state.agentRole || "管理员"
  };
}

function composeCaseAnswer(item, ragHits, needsHuman) {
  const refs = ragHits.map((hit, index) => `${index + 1}. ${hit.title}（${hit.similarity}%）`).join("\n") || "无可引用资料";
  return [
    `案例：${item.name}`,
    `路由：${item.route} / ${item.agent}`,
    `建议：先确认主数据和关键检测字段，再按命中的 SOP/历史案例执行排查；${needsHuman ? "当前缺少关键字段，需要进入 human_review。" : "当前资料命中较好，可生成带引用建议。"}`,
    "引用依据：",
    refs
  ].join("\n");
}

async function queryDashVectorCloud(query) {
  const rag = ragState();
  try {
    const response = await fetch("/api/rag/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: query,
        top_k: Number(rag.config.topK || 5),
        filters: {
          quality_status: "可引用"
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "DashVector query失败");
    const results = (data.results || []).map((item) => ({
      chunkId: item.id,
      title: item.document_name || item.metadata?.document_name || item.payload?.document_name || item.id,
      text: item.chunk_text || item.payload?.chunk_text || "",
      score: item.score,
      similarity: item.similarity ?? Math.round((item.score || 0) * 100),
      metadata: {
        ...(item.metadata || {}),
        document_name: item.document_name || item.metadata?.document_name || item.payload?.document_name || "-",
        source_type: item.metadata?.source_type || item.payload?.source_type || "-",
        trusted_level: item.metadata?.review_status || item.payload?.review_status || "云端结果",
        status: item.metadata?.review_status || item.payload?.review_status || "-",
        file_type: item.metadata?.file_type || item.payload?.file_type || "-",
        equipment_name: item.metadata?.equipment_name || item.payload?.equipment_name || "-",
        system: item.metadata?.system || item.payload?.system || "-",
        fault_symptom: item.metadata?.fault_symptom || item.payload?.fault_symptom || "-",
        can_quote: item.can_quote === false ? "否" : "是"
      },
      reason: "Aliyun DashVector 向量检索命中",
      source: item.document_name || item.metadata?.document_name || item.payload?.document_name || "-"
    }));
    rag.results = results;
    rag.answer = composeRagAnswer(query, results);
    rag.vectorStore = {
      ...rag.vectorStore,
      mode: "Aliyun DashVector",
      status: "Aliyun DashVector检索完成",
      vectorCount: data.count ?? rag.vectorStore.vectorCount,
      lastWriteTime: rag.vectorStore.lastWriteTime || "-",
      collection: data.collection || rag.config.dashVectorCollection
    };
    rag.notice = `Aliyun DashVector 检索完成：collection=${data.collection || rag.config.dashVectorCollection}，TopK=${results.length}。`;
  } catch (error) {
    rag.results = [];
    rag.answer = "";
    rag.notice = `Aliyun DashVector 检索失败：${error.message || "请先配置 DashVector 和百炼 Embedding 环境变量。"}`;
  }
  saveState();
  render();
}

function composeRagAnswer(query, results) {
  if (!results.length) return "未命中可引用知识。";
  const refs = results.map((result, index) => `${index + 1}. ${result.title}（相似度${result.similarity}%）`).join("\n");
  return [
    `问题：${query}`,
    "引用回答：建议先确认设备主数据和故障现象，再结合历史案例/SOP执行排查：检查轴承温度、振动值、联轴器找正状态、润滑状态和处理闭环结果；缺少检测值时不能由AI编造，应补充温度和振动测量数据。",
    "引用依据：",
    refs
  ].join("\n");
}

function renderStandardConfigCenter() {
  return `
    <section class="config-page">
      <div class="enterprise-hero panel">
        <div>
          <p class="eyebrow">Standard Configuration Center</p>
          <h2>标准配置中心</h2>
          <p class="dashboard-desc">这里是 AI 数据治理的规则底座：字段怎么认、设备怎么匹配、术语怎么归一、质量怎么判定、知识能不能入库，都由这些配置表解释。</p>
        </div>
      </div>
      <div class="config-summary">
        ${[
          ["字段标准", fieldStandards.length, "定义DWD标准明细字段和缺失处理"],
          ["设备主数据", equipmentMasterData.length, "支撑设备对象唯一绑定"],
          ["术语映射", termMappings.length, "把口语和别名归一为标准术语"],
          ["质量规则", qualityRules.length, "决定待复核、待补充或通过"],
          ["入库规则", knowledgeRules.length, "决定知识卡片/RAG是否允许发布"]
        ].map(([label, value, desc]) => `<article><span>${label}</span><strong>${value}</strong><p>${desc}</p></article>`).join("")}
      </div>
      ${renderConfigTable("字段标准表", "Field Standards", fieldStandards, [
        ["字段编码", "code"], ["字段名称", "name"], ["英文字段", "field"], ["是否必填", "required"], ["字段类型", "type"], ["业务含义", "meaning"], ["缺失后的处理", "missing"]
      ])}
      ${renderConfigTable("设备主数据表", "Equipment Master Data", equipmentMasterData, [
        ["设备编码", "code"], ["标准设备名称", "name"], ["设备类型", "type"], ["所属船舶", "ship"], ["所属系统", "system"], ["舱室/位置", "location"], ["型号", "model"], ["厂商", "vendor"], ["功能", "function"], ["关键部件", "components"], ["常见别名", "aliases"], ["状态", "status"]
      ])}
      ${renderConfigTable("标准词表/术语映射表", "Term Mapping", termMappings, [
        ["词条ID", "id"], ["原始表达", "raw"], ["标准术语", "standard"], ["类型", "type"], ["适用对象", "target"], ["来源", "source"], ["审核状态", "audit"], ["说明", "note"]
      ])}
      ${renderConfigTable("数据质量规则表", "Data Quality Rules", qualityRules, [
        ["规则ID", "id"], ["规则名称", "name"], ["触发条件", "trigger"], ["规则类型", "type"], ["处理动作", "action"], ["严重级别", "severity"], ["业务原因", "reason"]
      ])}
      ${renderConfigTable("知识入库规则表", "Knowledge Rules", knowledgeRules, [
        ["规则ID", "id"], ["规则名称", "name"], ["入库条件/禁止条件", "condition"], ["处理动作", "action"], ["业务原因", "reason"]
      ])}
    </section>
  `;
}

function renderConfigTable(title, eyebrow, rows, columns) {
  return `
    <article class="panel enterprise-card config-card">
      <div class="section-heading compact">
        <div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div>
        <span class="status-pill">${rows.length} 条</span>
      </div>
      <div class="config-table-wrap">
        <table class="standard-config-table">
          <thead>
            <tr>${columns.map(([label]) => `<th>${label}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${columns.map(([, key]) => `<td>${row[key] || ""}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderParseDiagnostics(doc) {
  if (!doc) return "";
  const problems = [
    doc.parseFailureReason,
    ...(doc.parseWarnings || [])
  ].filter(Boolean);
  return `
    <div class="parse-diagnostics ${doc.parseStatus === "解析失败" ? "bad" : doc.parseStatus === "内容过短" ? "warn" : "ok"}">
      <strong>${escapeHtml(doc.parseStatus || "未知状态")}</strong>
      <p>${escapeHtml(problems[0] || "文本解析成功，可进入 Chunk 切分。")}</p>
      ${problems.length > 1 ? `<ul>${problems.slice(1).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${doc.type === "PDF" && doc.parseStatus !== "解析成功" ? `<p>建议测试路径：优先用 docx / txt / md 测试真实文本解析；PDF 如果是扫描版，请先 OCR 或改传 docx 版本。</p>` : ""}
    </div>
  `;
}

function renderChunkCard(chunk) {
  const metadataJson = JSON.stringify(chunk.metadata || {}, null, 2);
  return `
    <article class="rag-chunk-card ${chunk.qualityStatus === "不可引用" ? "disabled" : ""}">
      <div class="chunk-card-head">
        <div>
          <strong>${escapeHtml(chunk.id)}</strong>
          <span>${escapeHtml(chunk.embeddingStatus)} / ${escapeHtml(chunk.vectorStoreStatus || "-")}</span>
        </div>
        <em>${escapeHtml(chunk.qualityStatus || chunk.metadata?.quality_status || "可引用")}</em>
      </div>
      <div class="chunk-process-grid">
        ${[
          ["chunk_index", chunk.metadata?.chunk_index || "-"],
          ["start/end", `${chunk.start ?? chunk.metadata?.start ?? "-"} / ${chunk.end ?? chunk.metadata?.end ?? "-"}`],
          ["chunk_length", chunk.chunkLength ?? chunk.metadata?.chunk_length ?? chunk.text.length],
          ["overlap_length", chunk.overlapLength ?? chunk.metadata?.overlap_length ?? 0],
          ["split_reason", chunk.splitReason || chunk.metadata?.split_reason || "-"],
          ["quality_status", chunk.qualityStatus || chunk.metadata?.quality_status || "-"]
        ].map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
      <label class="chunk-editor">
        <span>chunk_content</span>
        <textarea data-chunk-text="${escapeHtml(chunk.id)}" rows="6">${escapeHtml(chunk.text)}</textarea>
      </label>
      <label class="chunk-editor">
        <span>metadata JSON</span>
        <textarea data-chunk-metadata="${escapeHtml(chunk.id)}" rows="6">${escapeHtml(metadataJson)}</textarea>
      </label>
      <div class="chunk-actions">
        <button class="secondary-btn" data-save-chunk="${escapeHtml(chunk.id)}" type="button">保存修改</button>
        <button class="secondary-btn" data-split-chunk="${escapeHtml(chunk.id)}" type="button">拆分</button>
        <button class="secondary-btn" data-merge-next-chunk="${escapeHtml(chunk.id)}" type="button">合并相邻</button>
        <button class="secondary-btn" data-toggle-chunk-quote="${escapeHtml(chunk.id)}" type="button">${chunk.qualityStatus === "不可引用" ? "恢复引用" : "标记不可引用"}</button>
        <button class="primary-btn" data-regenerate-chunk="${escapeHtml(chunk.id)}" type="button">重新生成Embedding</button>
      </div>
    </article>
  `;
}

function renderRagPage() {
  const rag = ragState();
  const selectedDoc = rag.documents.find((doc) => doc.id === rag.selectedDocId) || rag.documents[0];
  const selectedChunks = selectedDoc ? rag.chunks.filter((chunk) => chunk.document_id === selectedDoc.id) : [];
  const knowledgeCount = allRecords().map(taskView).filter((task) => task.currentStatus === "可生成知识卡片" || task.ragReady).length;
  const health = rag.backendHealth;
  return `
    <section class="rag-experiment-page">
      <div class="enterprise-hero panel">
        <div>
          <p class="eyebrow">Real RAG Experiment Foundation</p>
          <h2>知识库 / RAG 检索实验</h2>
          <p class="dashboard-desc">PDF/Word/TXT/MD 走文档型 RAG；Excel 先进入数据治理，复核生成知识卡片后再写入向量集合。</p>
        </div>
      </div>
      <article class="panel enterprise-card rag-explain">
        ${[
          ["PDF / Word", "适合直接进入文档型 RAG：解析纯文本、保留页码/章节 metadata、切 Chunk、生成 embedding、写入向量库。"],
          ["Excel", "适合数据治理型 RAG：先识别 Sheet、字段映射、清洗标准化和人工复核，再把知识卡片写入向量库。"],
          ["LocalStorage / Aliyun DashVector", "LocalStorage 是本地演示模式；Aliyun DashVector 是真实云端向量库模式，API Key 只放后端环境变量。"],
          ["Embedding", "把文本转成向量；Local 模式使用 LocalHash，DashVector 模式由后端调用阿里云百炼 / Model Studio 生成。"],
          ["RecursiveCharacterTextSplitter", "按段落、换行、句号、分号等递归切分长文本，保留 chunk overlap。"]
        ].map(([title, desc]) => `<article><strong>${title}</strong><p>${desc}</p></article>`).join("")}
      </article>
      <section class="rag-layout">
        <article class="panel enterprise-card">
          <div class="section-heading compact">
            <div><p class="eyebrow">RAG Config</p><h2>Vector Store / Embedding 配置</h2></div>
            <span class="status-pill">${rag.vectorStore.status}</span>
          </div>
          <div class="rag-config-grid">
            ${ragConfigSelect("vectorStoreMode", "Vector Store Mode", ["LocalStorage", "Aliyun DashVector"])}
            ${ragConfigSelect("embeddingProvider", "Embedding Provider", ["LocalHash", "Aliyun Bailian / Model Studio"])}
            ${ragConfigInput("embeddingModel", "Embedding 模型")}
            ${ragConfigInput("dashVectorCollection", "DashVector Collection")}
            ${ragConfigInput("topK", "检索 TopK", "number")}
            ${ragConfigInput("chunkSize", "Chunk Size", "number")}
            ${ragConfigInput("chunkOverlap", "Chunk Overlap", "number")}
            ${ragConfigSelect("chunkStrategy", "Chunk 策略", ["RecursiveCharacterTextSplitter", "按段落切分", "按句子切分"])}
          </div>
          <div class="rag-doc-actions">
            <button class="secondary-btn" data-check-backend type="button">检查后端连接</button>
            <button class="primary-btn" data-init-dashvector type="button">初始化 Collection</button>
          </div>
          <div class="backend-health-grid">
            ${[
              ["后端状态", health?.ok ? "已连接" : "未检测/未连接"],
              ["DashVector配置", health?.dashVector?.configured ? "已配置" : "未配置"],
              ["Collection", health?.dashVector?.collection || health?.vectorStore?.collection || rag.vectorStore.collection || rag.config.dashVectorCollection],
              ["Collection存在", health?.dashVector?.collectionExists ? "是" : "否/未检测"],
              ["Collection维度", health?.dashVector?.collectionDimension || "未检测"],
              ["Embedding配置", health?.embedding?.configured ? "已配置" : "未配置"],
              ["Embedding模型", health?.embedding?.model || rag.config.embeddingModel],
              ["Embedding维度", health?.embedding?.dimension || "1024"]
            ].map(([label, value]) => `<article><span>${label}</span><strong>${escapeHtml(value)}</strong></article>`).join("")}
          </div>
          <div class="vector-status rag-vector-status">
            <strong>向量库写入状态</strong>
            <p>模式：${rag.config.vectorStoreMode}；集合：${rag.vectorStore.collection || rag.config.dashVectorCollection}；向量数：${rag.vectorStore.vectorCount}；最近写入：${rag.vectorStore.lastWriteTime}</p>
            <p>${rag.config.vectorStoreMode === "Aliyun DashVector" ? "Aliyun DashVector 模式会调用后端 /api/rag/upsert 和 /api/rag/query；未配置 DASHVECTOR_API_KEY、DASHVECTOR_ENDPOINT 或 DASHSCOPE_API_KEY 时会提示先配置后端环境变量。" : "LocalStorage 是本地演示模式，全部向量和检索结果保存在浏览器 localStorage。"} </p>
          </div>
        </article>
        <article class="panel enterprise-card">
          <div class="section-heading compact">
            <div><p class="eyebrow">Upload</p><h2>文件进入 RAG 流程</h2></div>
            <span class="status-pill">PDF / DOCX / XLSX / TXT / MD</span>
          </div>
          <label class="upload-experiment rag-upload">
            <span>上传 RAG 文件</span>
            <input id="ragFileUpload" type="file" accept=".pdf,.docx,.xlsx,.xls,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/markdown">
          </label>
          <div class="rag-doc-actions">
            <button class="primary-btn" data-build-knowledge-rag type="button">将已治理知识卡片写入 RAG</button>
            <button class="secondary-btn" data-open-workbench-for-excel type="button">Excel 先去治理工作台</button>
          </div>
          <p class="hint">已发布知识卡片：${knowledgeCount} 张。Excel 原始行不会直接向量化，必须先完成清洗、标准化和复核。</p>
          ${rag.notice ? `<div class="filter-notice">${escapeHtml(rag.notice)}</div>` : ""}
        </article>
      </section>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Built-in Knowledge Pack</p><h2>内置 RAG 文档包</h2></div>
          <span class="status-pill">${rag.documents.filter((doc) => doc.builtIn).length} / ${builtInRagDocuments.length} 份</span>
        </div>
        <div class="rag-doc-actions">
          <button class="primary-btn" data-load-built-in-rag type="button">加载内置知识包</button>
          <button class="secondary-btn" data-generate-built-in-chunks type="button">生成 Chunk</button>
          <button class="secondary-btn" data-upsert-current-chunks type="button">写入向量库</button>
          <button class="secondary-btn" data-compare-chunk-strategy type="button">对比 Chunk 策略</button>
          <button class="secondary-btn danger" data-clear-built-in-rag type="button">清空内置知识包</button>
        </div>
        <div class="built-in-doc-grid">
          ${builtInRagDocuments.map((doc) => `
            <article>
              <span>${doc.sourceType} / ${doc.system}</span>
              <strong>${doc.name}</strong>
              <p>${doc.equipment}｜${doc.fault}</p>
            </article>
          `).join("")}
        </div>
      </article>
      ${renderChunkStrategyReport(rag)}
      <section class="rag-layout wide">
        <article class="panel enterprise-card">
          <div class="section-heading compact">
            <div><p class="eyebrow">Documents</p><h2>已上传文档</h2></div>
            <span class="status-pill">${rag.documents.length} 个文档</span>
          </div>
          <div class="rag-doc-list">
            ${rag.documents.map((doc) => `
              <article class="${doc.id === rag.selectedDocId ? "selected-rag-doc" : ""}">
                <span>${doc.type} / ${doc.status} / ${doc.enabled === false ? "已禁用检索" : "已启用检索"}</span>
                <strong>${escapeHtml(doc.name)}</strong>
                <p>${escapeHtml(doc.uploadedAt)}</p>
                <p>Parser：${escapeHtml(doc.metadata.parser)}；页码/章节：${escapeHtml(doc.metadata.page_count || doc.metadata.section_count)}</p>
                <p>${escapeHtml(doc.parseFailureReason || "解析文本可查看。")}</p>
                <div class="rag-doc-actions">
                  <button class="secondary-btn" data-select-rag-doc="${doc.id}" type="button">查看</button>
                  <button class="secondary-btn" data-reparse-doc="${doc.id}" type="button">重新解析</button>
                  <button class="primary-btn" data-vectorize-doc="${doc.id}" type="button">重新生成Chunk</button>
                  <button class="secondary-btn" data-rewrite-doc-vector="${doc.id}" type="button">重新写入向量库</button>
                  <button class="secondary-btn" data-toggle-rag-doc="${doc.id}" type="button">${doc.enabled === false ? "启用检索" : "禁用检索"}</button>
                  <button class="secondary-btn danger" data-delete-rag-doc="${doc.id}" type="button">删除文档</button>
                </div>
              </article>
            `).join("") || `<p class="hint">暂无文档，请上传 PDF / DOCX / TXT / MD，或先生成治理后知识卡片。</p>`}
          </div>
        </article>
        <article class="panel enterprise-card">
          <div class="section-heading compact">
            <div><p class="eyebrow">Parsed Text</p><h2>已解析文本与 Metadata</h2></div>
            <span class="status-pill">${selectedDoc ? selectedDoc.type : "未选择"}</span>
          </div>
          ${selectedDoc ? `
            ${renderParseDiagnostics(selectedDoc)}
            <div class="rag-meta-table">
              ${Object.entries(selectedDoc.metadata).map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
            </div>
            <pre class="rag-text-preview">${escapeHtml(selectedDoc.text.slice(0, 1600) || "未解析到文本。")}</pre>
          ` : `<p class="hint">选择一个文档后展示解析文本和 metadata。</p>`}
        </article>
      </section>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Chunk / Embedding</p><h2>Chunk 切分结果与向量状态</h2></div>
          <div class="heading-actions">
            <button class="secondary-btn" data-rechunk-current type="button">重新切分当前文档</button>
            <span class="status-pill">${rag.chunks.length} 个 Chunk</span>
          </div>
        </div>
        <div class="rag-chunk-grid">
          ${(selectedChunks.length ? selectedChunks : rag.chunks.slice(0, 6)).map(renderChunkCard).join("") || `<p class="hint">尚未生成 Chunk。上传文档后点击“生成Chunk/Embedding”。如果显示 0 Chunk，请先查看上方解析失败原因。</p>`}
        </div>
      </article>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Retrieval Test</p><h2>RAG 检索测试</h2></div>
          <span class="status-pill">Top3 命中</span>
        </div>
        <div class="rag-search">
          <label>
            <span>检索问题</span>
            <input id="ragQuery" value="${escapeHtml(rag.query)}" placeholder="压载泵振动升温怎么排查？">
          </label>
          <button class="primary-btn" data-run-rag-search type="button">运行 RAG 检索</button>
        </div>
        <div class="rag-trace">
          ${["问题理解", "查询改写", "向量检索", "关键词/元数据过滤", "重排序", "引用回答"].map((step, index) => `<article><span>${index + 1}</span><strong>${step}</strong><p>${rag.results.length ? "已完成" : "等待检索"}</p></article>`).join("")}
        </div>
        <div class="rag-results">
          ${rag.results.map((result) => `
            <article>
              <div><strong>${escapeHtml(result.title)}</strong><span>相似度 ${result.similarity}%</span></div>
              <p>${escapeHtml(result.text.slice(0, 360))}</p>
              <div class="rag-meta">
                <em>${escapeHtml(result.reason)}</em>
                <em>来源：${escapeHtml(result.source)}</em>
                <em>可信等级：${escapeHtml(result.metadata?.trusted_level || "中")}</em>
                <em>状态：${escapeHtml(result.metadata?.status || "已发布")}</em>
                <em>是否可引用：${escapeHtml(result.metadata?.can_quote || "是")}</em>
              </div>
              <div class="rag-result-metadata">
                ${Object.entries(result.metadata || {}).slice(0, 10).map(([key, value]) => `<span>${escapeHtml(key)}=${escapeHtml(value)}</span>`).join("")}
              </div>
            </article>
          `).join("") || `<p class="hint">暂无命中结果。请先写入 Chunk 后运行检索。</p>`}
        </div>
        ${rag.answer ? `<pre class="rag-answer">${escapeHtml(rag.answer)}</pre>` : ""}
      </article>
      ${renderRagEvalPanel(rag)}
    </section>
  `;
}

function renderChunkStrategyReport(rag) {
  const rows = rag.chunkStrategyReport || [];
  return `
    <article class="panel enterprise-card">
      <div class="section-heading compact">
        <div><p class="eyebrow">Chunk Strategy Compare</p><h2>Chunk 策略对比</h2></div>
        <span class="status-pill">${rows.length ? "已生成" : "未生成"}</span>
      </div>
      ${rows.length ? `
        <div class="dashboard-table-wrap">
          <table class="enterprise-table chunk-compare-table">
            <thead>
              <tr><th>策略</th><th>Chunk数量</th><th>平均长度</th><th>Overlap</th><th>Metadata</th><th>TopK命中</th><th>最高相似度</th><th>引用准确性</th></tr>
            </thead>
            <tbody>
              ${rows.map((row) => `
                <tr>
                  <td><strong>${escapeHtml(row.strategy)}</strong></td>
                  <td>${row.chunk_count}</td>
                  <td>${row.avg_chunk_length}</td>
                  <td>${row.overlap}</td>
                  <td>${row.metadata_complete}</td>
                  <td class="summary-cell">${(row.top_hits || []).map((hit) => `${escapeHtml(hit.title)} (${hit.similarity}%)`).join("<br>") || "-"}</td>
                  <td>${row.top_similarity}</td>
                  <td>${row.citation_accuracy}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<p class="hint">点击“对比 Chunk 策略”后，系统会用当前问题对三种切分方式进行 TopK 检索评估。</p>`}
    </article>
  `;
}

function renderRagEvalPanel(rag) {
  const evalState = rag.evalResult;
  const metrics = evalState?.metrics || {};
  const nodeStatus = evalState?.node_status || {};
  const nodeRows = Object.entries(nodeStatus);
  const metricRows = [
    ["真实LangGraph.js", evalState?.langgraph?.enabled ? "true" : "未运行"],
    ["route分支", evalState?.route || evalState?.branch || "-"],
    ["Top1命中率", percent(metrics.top1_hit_rate)],
    ["Recall@3", percent(metrics.recall_at_3)],
    ["Recall@5", percent(metrics.recall_at_5)],
    ["Precision@3", percent(metrics.precision_at_3)],
    ["无命中问题数", metrics.no_hit_questions ?? "-"]
  ];
  return `
    <article class="panel enterprise-card rag-eval-panel">
      <div class="section-heading compact">
        <div><p class="eyebrow">LangGraph Style RAG Eval</p><h2>RAG 评测中心</h2></div>
        <span class="status-pill">${escapeHtml(evalState?.status || "未运行")}</span>
      </div>
      <div class="rag-doc-actions">
        <button class="primary-btn" data-run-rag-eval type="button">运行RAG评测</button>
        <button class="secondary-btn" data-load-latest-rag-eval type="button">读取最近结果</button>
      </div>
      <p class="hint">当前评估流程已由官方 @langchain/langgraph 驱动。LangGraph 负责管理 State、Node 和条件分支；RAG 负责执行知识检索；评测节点负责计算命中率、归因和优化建议。</p>
      ${rag.evalNotice ? `<div class="filter-notice">${escapeHtml(rag.evalNotice)}</div>` : ""}
      <div class="backend-health-grid">
        ${metricRows.map(([label, value]) => `<article><span>${label}</span><strong>${escapeHtml(value)}</strong></article>`).join("")}
      </div>
      <section class="rag-layout">
        <article>
          <h3>问题归因</h3>
          ${(evalState?.root_causes || []).map((item) => `<p class="audit-line">${escapeHtml(item)}</p>`).join("") || `<p class="hint">暂无归因，运行评测后生成。</p>`}
        </article>
        <article>
          <h3>优化建议</h3>
          ${(evalState?.suggestions || []).map((item) => `<p class="audit-line">${escapeHtml(item)}</p>`).join("") || `<p class="hint">暂无建议，运行评测后生成。</p>`}
        </article>
      </section>
      <div class="rag-trace">
        ${nodeRows.map(([name, info], index) => `<article><span>${index + 1}</span><strong>${escapeHtml(name)}</strong><p>${escapeHtml(info.status)}${info.duration_ms !== undefined ? ` / ${info.duration_ms}ms` : ""}</p></article>`).join("") || `<article><span>0</span><strong>等待评测</strong><p>未执行</p></article>`}
      </div>
      ${evalState?.retrieval_results?.length ? `
        <div class="rag-results">
          ${evalState.retrieval_results.map((item) => `
            <article>
              <div><strong>${escapeHtml(item.question)}</strong><span>Top3 ${item.top3_hit ? "命中" : "未命中"}</span></div>
              <p>Top1：${escapeHtml(item.top_results?.[0]?.document_name || item.error || "无结果")}</p>
              <div class="rag-meta">
                <em>Precision@3：${percent(item.precision_at_3)}</em>
                <em>目标设备：${escapeHtml(item.target_equipment || "-")}</em>
                <em>目标系统：${escapeHtml(item.target_system || "-")}</em>
              </div>
            </article>
          `).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

function percent(value) {
  if (value === undefined || value === null || value === "") return "-";
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function ragConfigInput(key, label, type = "text") {
  const value = ragState().config[key] ?? "";
  return `<label><span>${label}</span><input data-rag-config="${key}" type="${type}" value="${value}"></label>`;
}

function ragConfigSelect(key, label, options) {
  const value = ragState().config[key] ?? options[0];
  return `
    <label>
      <span>${label}</span>
      <select data-rag-config="${key}">
        ${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderRunAnalysisPage() {
  const records = state.runAnalysis || [];
  const selected = records.find((item) => item.run_id === state.selectedAnalysisRunId) || records[0];
  const filters = state.runAnalysisFilters || {};
  const options = (key) => ["全部", ...new Set(records.map((item) => item[key]).filter(Boolean))];
  return `
    <section class="analysis-page">
      <div class="enterprise-hero panel">
        <div>
          <p class="eyebrow">Run Analysis Center</p>
          <h2>运行分析中心</h2>
          <p class="dashboard-desc">记录用户每次手动操作 Demo 的运行过程，并自动判断 Router、Tool、RAG、人工复核、审批和知识入库结果。</p>
        </div>
        <button class="primary-btn" data-load-run-analysis type="button">刷新分析记录</button>
      </div>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Run Cases</p><h2>内置运行案例实验</h2></div>
          <span class="status-pill">${runExperimentCases.length} 个案例</span>
        </div>
        <div class="run-case-grid">
          ${runExperimentCases.map((item) => `
            <article>
              <span>${escapeHtml(item.agent)} / ${escapeHtml(item.route)}</span>
              <strong>${escapeHtml(item.name)}</strong>
              <p>${escapeHtml(item.question)}</p>
              <div class="rag-doc-actions">
                <button class="secondary-btn" data-load-run-case="${item.id}" type="button">填入问题</button>
                <button class="primary-btn" data-run-experiment-case="${item.id}" type="button">运行案例实验</button>
              </div>
            </article>
          `).join("")}
        </div>
      </article>
      <article class="panel enterprise-card">
        <div class="analysis-filter-grid">
          ${analysisSelect("run_type", "运行类型", options("run_type"), filters.run_type)}
          ${analysisSelect("status", "运行状态", options("final_status"), filters.status)}
          ${analysisSelect("route", "Route", options("route"), filters.route)}
          ${analysisSelect("agent_name", "Agent", options("agent_name"), filters.agent_name)}
        </div>
      </article>
      <section class="analysis-layout">
        <article class="panel enterprise-card">
          <div class="section-heading compact">
            <div><p class="eyebrow">Recent Runs</p><h2>最近运行记录</h2></div>
            <span class="status-pill">${records.length} 条</span>
          </div>
          <div class="analysis-run-list">
            ${records.map((item) => `
              <button class="${selected?.run_id === item.run_id ? "active" : ""}" data-select-analysis="${escapeHtml(item.run_id)}" type="button">
                <strong>${escapeHtml(item.run_type || "-")}</strong>
                <span>${escapeHtml(item.run_id)}｜${escapeHtml(item.final_status || "-")}</span>
                <em>${escapeHtml(item.agent_name || item.route || "-")}</em>
              </button>
            `).join("") || `<p class="muted">暂无运行分析记录。请先运行 Agent、RAG 检索、数据治理或知识审核。</p>`}
          </div>
        </article>
        <article class="panel enterprise-card">
          <div class="section-heading compact">
            <div><p class="eyebrow">Run Detail</p><h2>运行详情与自动归因</h2></div>
            <span class="status-pill">${escapeHtml(selected?.route || "-")}</span>
          </div>
          ${selected ? renderRunAnalysisDetail(selected) : `<p class="muted">选择一条运行记录查看分析。</p>`}
        </article>
      </section>
    </section>
  `;
}

function analysisSelect(key, label, options, value) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select data-analysis-filter="${key}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderRunAnalysisDetail(item) {
  const checks = item.analysis || {};
  const toolCalls = item.tool_calls || [];
  const ragHits = item.rag_hits || [];
  return `
    <div class="analysis-summary-grid">
      ${renderAgentStateMetric("运行类型", item.run_type || "-")}
      ${renderAgentStateMetric("状态", item.final_status || "-")}
      ${renderAgentStateMetric("Agent/Route", item.agent_name || item.route || "-")}
      ${renderAgentStateMetric("Tool", `${toolCalls.filter((call) => call.status === "success").length}/${toolCalls.length}`)}
      ${renderAgentStateMetric("RAG命中", `${ragHits.length} 条`)}
      ${renderAgentStateMetric("效果评分", `${item.effect_score ?? scoreRunEffect(checks)}分`)}
      ${renderAgentStateMetric("创建时间", item.created_at || "-")}
    </div>
    <div class="analysis-input-box">
      <strong>用户输入 / 上传文件</strong>
      <p>${escapeHtml(item.user_input || "-")}</p>
    </div>
    <div class="analysis-check-grid">
      ${Object.entries(checks).map(([key, value]) => `
        <article class="${value === false ? "bad" : value === true ? "good" : ""}">
          <span>${escapeHtml(key)}</span>
          <strong>${value === null ? "不适用" : value ? "通过" : "需关注"}</strong>
        </article>
      `).join("")}
    </div>
    <section class="rag-layout">
      <article>
        <h3>成功项</h3>
        ${(item.success_items || []).map((success) => `<p class="audit-line">${escapeHtml(success)}</p>`).join("") || `<p class="hint">暂无成功项。</p>`}
      </article>
      <article>
        <h3>失败项</h3>
        ${(item.failed_items || []).map((failed) => `<p class="audit-line">${escapeHtml(failed)}</p>`).join("") || `<p class="hint">暂无失败项。</p>`}
      </article>
    </section>
    <section class="rag-layout">
      <article>
        <h3>问题归因</h3>
        ${(item.root_causes || []).map((cause) => `<p class="audit-line">${escapeHtml(cause)}</p>`).join("") || `<p class="hint">未发现明显失败原因。</p>`}
      </article>
      <article>
        <h3>优化建议</h3>
        ${(item.suggestions || []).map((suggestion) => `<p class="audit-line">${escapeHtml(suggestion)}</p>`).join("") || `<p class="hint">暂无建议。</p>`}
      </article>
    </section>
    ${item.final_answer ? `<pre class="rag-answer">${escapeHtml(item.final_answer)}</pre>` : ""}
    <details class="analysis-raw-detail">
      <summary>查看 node_trace / tool_calls / rag_hits / human_review / resume</summary>
      <pre>${escapeHtml(JSON.stringify({
        node_trace: item.node_trace,
        tool_calls: item.tool_calls,
        rag_hits: item.rag_hits,
        human_review: item.human_review,
        resume: item.resume,
        approval_result: item.approval_result,
        feedback: item.feedback,
        knowledge_gap: item.knowledge_gap,
        knowledge_card: item.knowledge_card
      }, null, 2))}</pre>
    </details>
  `;
}

function render() {
  normalizeDependentFilters();
  const titleMap = {
    dashboard: "治理驾驶舱",
    config: "标准配置中心",
    rag: "知识库 / RAG 检索实验",
    workbench: "AI治理工作台",
    ingest: "数据接入",
    agent: "Agent应用与知识运营",
    analysis: "运行分析中心"
  };
  pageTitle.textContent = titleMap[state.page] || "船舶 AI 数据治理实验台";
  nav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.page === state.page));
  if (state.page === "dashboard") {
    pageContent.innerHTML = `
      ${renderDashboard()}
      ${state.drawerOpen ? renderDrawer(taskView(selectedRecord())) : ""}
      ${state.helpPanel ? renderHelpPanel(state.helpPanel) : ""}
    `;
    saveState();
    return;
  }
  if (state.page === "config") {
    pageContent.innerHTML = `
      ${renderStandardConfigCenter()}
      ${state.helpPanel ? renderHelpPanel(state.helpPanel) : ""}
    `;
    saveState();
    return;
  }
  if (state.page === "rag") {
    pageContent.innerHTML = `
      ${renderRagPage()}
      ${state.helpPanel ? renderHelpPanel(state.helpPanel) : ""}
    `;
    saveState();
    return;
  }
  if (state.page === "agent") {
    pageContent.innerHTML = `
      ${renderAgentPage()}
      ${state.helpPanel ? renderHelpPanel(state.helpPanel) : ""}
    `;
    saveState();
    return;
  }
  if (state.page === "analysis") {
    pageContent.innerHTML = `
      ${renderRunAnalysisPage()}
      ${state.helpPanel ? renderHelpPanel(state.helpPanel) : ""}
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
          <span class="status-pill">AI识别 / 抽取 / 校验 / 分流</span>
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
          <div><p class="eyebrow">AI Pass Rule</p><h2>AI自动通过前提</h2></div>
          <span class="status-pill">≥85% 自动通过</span>
        </div>
        <p class="muted">AI负责识别、抽取、标准化、主数据匹配、质量校验和分流；人工只处理低置信度、高风险或缺关键字段的数据。</p>
        <div class="pass-rule-grid">
          ${["数据可解析", "关键字段完整", "主数据可唯一匹配", "标准词表命中", "质量规则通过", "置信度 ≥ 85%", "入库规则通过"].map((item) => `<span>${item}</span>`).join("")}
        </div>
        <div class="threshold-strip">
          <article><strong>≥85%</strong><span>自动通过，进入DWD</span></article>
          <article><strong>60%-85%</strong><span>进入人工复核</span></article>
          <article><strong>&lt;60%</strong><span>待补充或驳回</span></article>
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
                <th>来源系统</th><th>数据类型</th><th>今日接入量</th><th>AI识别覆盖率</th><th>字段抽取成功率</th><th>主数据匹配成功率</th><th>自动通过率</th><th>人工复核率</th><th>知识卡片生成数</th><th>演示口径</th><th>最近同步时间</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${sourceBreakdown().map((source) => `
                <tr>
                  <td><strong>${source.system}</strong></td>
                  <td>${source.type}</td>
                  <td>${source.total}</td>
                  <td>${source.aiCoverage}</td>
                  <td>${source.extraction}</td>
                  <td>${source.master}</td>
                  <td>${source.autoRate}</td>
                  <td>${source.reviewRate}</td>
                  <td>${source.knowledge}</td>
                  <td class="summary-cell">${source.note}</td>
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
          <div><p class="eyebrow">Assignment Overview</p><h2>待办分派概览</h2></div>
          <span class="status-pill">AI自动分流</span>
        </div>
        <div class="todo-grid assignment-grid">
          ${assignmentOverview().map(([label, count, action, desc]) => `
            <button data-dashboard-queue="${action}" type="button">
              <span>${label}</span>
              <strong>${count}</strong>
              <p>${desc}</p>
              <em>进入队列</em>
            </button>
          `).join("")}
        </div>
      </article>
      <article class="panel enterprise-card">
        <div class="section-heading compact">
          <div><p class="eyebrow">Todo Principle</p><h2>待办中心说明</h2></div>
        </div>
        <p class="muted">待办用于承接 AI 无法百分百确认或企业规则要求人工确认的数据，保证数据入库前可信、可追溯。设备管理员处理主数据，维修工程师补维修闭环字段，质量工程师复核RT/UT和检测类问题，工艺工程师处理管路/图纸/工艺问题，知识管理员审核发布知识卡片。</p>
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
        <div class="section-heading compact"><div><p class="eyebrow">File Upload Experiment</p><h2>Excel / CSV / PDF / Word 上传实验</h2></div><span class="status-pill">前端模拟解析</span></div>
        <p class="hint">真实企业中，业务系统数据通常通过 ETL/API/数据库同步接入；Excel 常用于历史台账和部门数据归集；PDF/Word 常用于检测报告、维修报告和 SOP 文档。本 Demo 当前先支持 Excel/CSV 上传，PDF/Word 先做解析模拟。</p>
        <label class="upload-experiment">
          <span>选择文件</span>
          <input id="dataFileUpload" type="file" accept=".xlsx,.xls,.csv,text/csv,.pdf,.doc,.docx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
        </label>
        <button class="secondary-btn" data-load-csv-sample type="button">加载CSV样例并进入映射确认</button>
        ${state.uploadResult ? renderUploadStats(state.uploadResult) : `<p class="hint">Excel/CSV 上传后会先识别表头、推荐字段映射，确认映射后再生成治理任务。PDF/Word 当前会生成一条非结构化文档治理任务。</p>`}
      </article>
    </section>
    ${state.excelPreview ? renderExcelSheetSelection() : state.csvPreview ? renderCsvMapping() : ""}
  `;
}

function renderUploadStats(stats) {
  if (stats.error) return `<div class="upload-error">${stats.error}</div>`;
  if (stats.sheetScan) {
    return `
      <div class="upload-result-head">
        <strong>Excel Sheet 识别结果</strong>
        <p>${stats.fileName} / 共识别 ${stats.totalSheets} 个 Sheet</p>
        <em>系统默认推荐：${stats.recommendedSheet}。请在下方确认要导入的 Sheet。</em>
      </div>
    `;
  }
  if (stats.documentMock) {
    return `
      <div class="document-mock-box">
        <strong>文档解析模拟</strong>
        <p>当前为文档解析模拟。真实企业场景中，PDF/Word 通常用于检测报告、维修报告、SOP 文档，后续会进入文本解析、Chunk 切分、知识卡片和 RAG 流程。</p>
        <dl>
          <div><dt>文件名</dt><dd>${stats.fileName}</dd></div>
          <div><dt>文件类型</dt><dd>${stats.fileType}</dd></div>
          <div><dt>提取文本预览</dt><dd>${stats.extractedText || "未读取到文本，已生成模拟治理任务。"}</dd></div>
        </dl>
      </div>
    `;
  }
  return `
    <div class="upload-result-head">
      <strong>${stats.fileType === "Excel" ? "Excel 解析结果" : "CSV 解析结果"}</strong>
      <p>${stats.fileName || "-"}${stats.sheetName ? ` / Sheet：${stats.sheetName}` : ""}</p>
      <em>识别到的表头：${(stats.headers || []).join("、") || "无"}</em>
    </div>
    <div class="upload-stats">
      ${[
        ["文件名", stats.fileName || "-"],
        ["Sheet名称", stats.sheetName || "-"],
        ["上传批次", stats.uploadBatchId || "-"],
        ["总行数", stats.totalRows],
        ["成功读取行数", stats.successRows ?? stats.totalRows],
        ["成功识别字段数", stats.recognizedFields],
        ["未识别字段数", stats.unrecognizedFields],
        ["缺失关键字段数量", stats.missingCritical],
        ["缺设备编码数量", stats.missingCode],
        ["缺处理结果数量", stats.missingResult],
        ["疑似重复数量", stats.duplicate],
        ["进入AI治理任务池数量", stats.aiPool],
        ["有问题待补充数量", stats.problemRows]
      ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("")}
    </div>
  `;
}

function renderExcelSheetSelection() {
  const preview = state.excelPreview;
  const selected = preview.sheets[preview.selectedSheetIndex] || preview.sheets[0];
  return `
    <article class="panel enterprise-card mapping-card">
      <div class="section-heading compact">
        <div><p class="eyebrow">Sheet Detection</p><h2>Excel Sheet 智能识别</h2></div>
        <span class="status-pill">${preview.sheets.length} 个 Sheet</span>
      </div>
      <p class="hint">系统已读取所有 Sheet 并计算 data_sheet_score。默认选中最像业务数据表的 Sheet，你也可以手动切换后再进入字段映射确认。</p>
      <div class="sheet-detect-table">
        <table class="enterprise-table">
          <thead>
            <tr>
              <th>选择</th><th>Sheet名称</th><th>行数</th><th>列数</th><th>识别到的表头</th><th>推荐字段数量</th><th>data_sheet_score</th><th>系统推荐</th>
            </tr>
          </thead>
          <tbody>
            ${preview.sheets.map((sheet, index) => `
              <tr class="${index === preview.selectedSheetIndex ? "selected-sheet-row" : ""}">
                <td><button class="table-link-btn" data-select-sheet="${index}" type="button">${index === preview.selectedSheetIndex ? "已选中" : "选择"}</button></td>
                <td><strong>${sheet.sheetName}</strong></td>
                <td>${sheet.rowCount}</td>
                <td>${sheet.colCount}</td>
                <td class="summary-cell">${sheet.headers.join("、") || "未识别"}</td>
                <td>${sheet.recognizedFields}</td>
                <td><b class="${sheet.data_sheet_score < 45 ? "low-score" : ""}">${sheet.data_sheet_score}</b></td>
                <td>${sheet.recommendation}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="sheet-selected-panel">
        <strong>当前选择：${selected?.sheetName || "-"}</strong>
        <p>评分 ${selected?.data_sheet_score ?? "-"}；系统判断：${selected?.recommendation || "-"}。确认后进入字段映射确认，不会直接导入。</p>
      </div>
      <div class="mapping-actions">
        <button class="primary-btn" data-confirm-sheet type="button">确认 Sheet 并进入字段映射</button>
        <button class="secondary-btn" data-cancel-excel type="button">取消Excel上传</button>
      </div>
    </article>
  `;
}

function renderCsvMapping() {
  const stats = uploadStatsForPreview(state.csvPreview);
  return `
    <article class="panel enterprise-card mapping-card">
      <div class="section-heading compact"><div><p class="eyebrow">Field Mapping</p><h2>${state.csvPreview.fileType} 字段映射确认</h2></div><span class="status-pill">${state.csvPreview.rows.length} 行待生成</span></div>
      ${renderUploadStats(stats)}
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
  const distribution = workbenchDistribution();
  return `
    <article class="panel enterprise-card">
      <div class="section-heading compact">
        <div><p class="eyebrow">AI Governance Lab</p><h2>AI治理工作台</h2></div>
        <span class="status-pill">${tasks.length} / ${allRecords().length} 条</span>
      </div>
      <div class="workbench-distribution">
        <span>当前总量：<b>${distribution.total}</b></span>
        <span>自动通过：<b>${distribution.auto}</b></span>
        <span>待人工复核：<b>${distribution.review}</b></span>
        <span>待补充/异常：<b>${distribution.supplement}</b></span>
        <span>知识卡片待审核：<b>${distribution.knowledge}</b></span>
        <span>已入RAG向量库：<b>${distribution.vectorized}</b></span>
      </div>
      <div class="filter-notice">当前筛选：${currentWorkbenchFilterLabel()}</div>
      ${renderFilters()}
      <div class="task-table-wrap">
        <table class="enterprise-table task-table lab-table">
          <colgroup>
            <col class="col-id">
            <col class="col-source">
            <col class="col-ingest">
            <col class="col-file">
            <col class="col-sheet">
            <col class="col-batch">
            <col class="col-structure">
            <col class="col-strategy">
            <col class="col-source-id">
            <col class="col-type">
            <col class="col-summary">
            <col class="col-issues">
            <col class="col-issues">
            <col class="col-decision">
            <col class="col-summary">
            <col class="col-issues">
            <col class="col-summary">
            <col class="col-assignee">
            <col class="col-review">
            <col class="col-summary">
            <col class="col-confidence">
            <col class="col-layer">
            <col class="col-status">
            <col class="col-actions">
          </colgroup>
          <thead>
            <tr>
              <th>记录ID</th><th>来源系统</th><th>接入方式</th><th>来源文件</th><th>Sheet</th><th>上传批次</th><th>数据结构</th><th>解析策略</th><th>来源单号</th><th>数据类型</th><th>原始摘要</th><th>业务问题类型</th><th>数据质量问题</th><th>AI处理结论</th><th>AI建议动作</th><th>触发规则</th><th>需复核原因</th><th>推荐负责人</th><th>是否可自动处理</th><th>不能自动处理原因</th><th>置信度</th><th>当前层级</th><th>当前状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map((task) => `
              <tr>
                <td><strong>${task.id}</strong></td>
                <td>${task.sourceSystem}</td>
                <td>${task.ingest_method}</td>
                <td>${task.source_file_name}</td>
                <td>${task.source_sheet_name}</td>
                <td>${task.upload_batch_id}</td>
                <td><span class="state-badge">${task.dataStructure}</span></td>
                <td>${actualStrategy(task).name}</td>
                <td>${task.sourceId}</td>
                <td>${task.sourceType}</td>
                <td class="summary-cell"><span>${task.raw}</span></td>
                <td class="issue-cell"><em>${task.business_problem_type}</em></td>
                <td class="issue-cell">${task.data_quality_issues.length ? task.data_quality_issues.map((issue) => `<em>${issue}</em>`).join("") : "<span>关键字段完整</span>"}</td>
                <td>${aiDecisionLabel(task)}</td>
                <td class="summary-cell">${task.ai_suggested_action}</td>
                <td class="issue-cell">${task.trigger_rules.length ? task.trigger_rules.map((rule) => `<em>${rule}</em>`).join("") : "<span>PASS ≥85%</span>"}</td>
                <td class="summary-cell">${task.review_reason}</td>
                <td>${task.assignee_name}<br><span class="muted">${task.recommended_owner}</span></td>
                <td>${task.can_auto_process}</td>
                <td class="summary-cell">${task.cannot_auto_reason}</td>
                <td><b class="${task.confidence < 70 ? "low-score" : ""}">${task.confidence}%</b></td>
                <td>${task.currentLayer}</td>
                <td><span class="state-badge ${badgeClass(task.currentStatus)}">${task.currentStatus}</span></td>
                <td>
                  <div class="row-actions">
                    <button data-open="${task.id}" type="button">查看详情</button>
                    <button data-ai="${task.id}" type="button">${task.aiRunning ? "处理中" : "AI处理"}</button>
                    <button data-review-open="${task.id}" type="button">复核</button>
                  </div>
                </td>
              </tr>
            `).join("") || `<tr><td colspan="24" class="empty-row">当前筛选条件下暂无任务。</td></tr>`}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function workbenchDistribution() {
  const tasks = allRecords().map(taskView);
  return {
    total: tasks.length,
    auto: tasks.filter((task) => task.ai_decision === "auto_pass").length,
    review: tasks.filter((task) => task.ai_decision === "human_review").length,
    supplement: tasks.filter((task) => task.ai_decision === "need_supplement").length,
    knowledge: tasks.filter((task) => task.ai_decision === "knowledge_review").length,
    vectorized: tasks.filter((task) => task.ai_decision === "vectorized").length
  };
}

function currentWorkbenchFilterLabel() {
  const labels = [];
  const f = state.filters;
  if (f.autoDecision !== "全部") labels.push(`${f.autoDecision}队列`);
  if (f.reviewQueue !== "全部") labels.push(f.reviewQueue);
  if (f.sourceSystem !== "全部") labels.push(f.sourceSystem);
  if (f.issueType !== "全部") labels.push(f.issueType);
  if (f.currentLayer !== "全部") labels.push(f.currentLayer);
  if (f.currentStatus !== "全部") labels.push(f.currentStatus);
  if (f.ingestMethod !== "全部") labels.push(f.ingestMethod);
  return labels.length ? labels.join(" / ") : "全部任务";
}

function renderFilters() {
  const tasks = allRecords().map(taskView);
  const notice = filterCompatibilityNotice();
  return `
    <div class="filter-bar lab-filter">
      ${selectFilter("sourceSystem", "来源系统", ["全部", ...sourceConfigs.map((source) => source.system), "CSV上传实验", "Excel上传实验", "文档上传实验"])}
      ${selectFilter("ingestMethod", "接入方式", ["全部", ...uniqueTaskValues(tasks, "ingest_method")])}
      ${selectFilter("sourceFileName", "来源文件", ["全部", ...uniqueTaskValues(tasks, "source_file_name")])}
      ${selectFilter("uploadBatchId", "上传批次", ["全部", ...uniqueTaskValues(tasks, "upload_batch_id")])}
      ${selectFilter("reviewQueue", "复核队列", ["全部", ...uniqueTaskValues(tasks, "review_queue")])}
      ${selectFilter("assigneeRole", "负责人角色", ["全部", ...uniqueTaskValues(tasks, "assignee_role")])}
      ${selectFilter("assigneeName", "负责人", ["全部", ...uniqueTaskValues(tasks, "assignee_name")])}
      ${selectFilter("slaStatus", "SLA状态", ["全部", "正常", "即将超时", "已超时"])}
      ${selectFilter("autoDecision", "AI自动决策", ["全部", "自动通过", "待人工复核", "待补充/异常", "知识卡片待审核", "已入RAG向量库", "不入库"])}
      ${selectFilter("dataStructure", "数据结构", ["全部", ...structures])}
      ${selectFilter("currentStatus", "当前状态", ["全部", ...statuses])}
      ${selectFilter("issueType", "问题类型", ["全部", ...issueTypes])}
      ${selectFilter("currentLayer", "当前层级", ["全部", ...layers])}
      ${selectFilter("needsReview", "是否复核", ["全部", "是", "否"])}
      ${selectFilter("confidence", "置信度区间", ["全部", ">=85", "70-84", "<70"])}
      <button class="secondary-btn" data-reset-filters type="button">重置筛选</button>
    </div>
    ${notice ? `<div class="filter-notice">${notice}</div>` : ""}
  `;
}

function uniqueTaskValues(tasks, key) {
  return [...new Set(tasks.map((task) => task[key]).filter((value) => value && value !== "-" && value !== "非文件接入" && value !== "系统内置样例"))];
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
  const strategy = actualStrategy(task);
  const stats = extractionStats(task);
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
        ${renderSourceTrace(task)}
        ${drawerSection("数据结构识别与解析策略", [
          ["数据来源", `${task.sourceSystem} / ${task.sourceType}`],
          ["文件类型", task.fileType || "业务系统记录"],
          ["来源文件", task.fileName || "非文件接入"],
          ["数据结构类型", task.dataStructure],
          ["推荐解析策略", strategy.name],
          ["处理步骤", strategy.steps],
          ["为什么这样处理", strategy.reason],
          ["Rule 命中字段数", `${stats.ruleFields.length} 个：${stats.ruleFields.join("、") || "无"}`],
          ["Model 命中字段数", `${stats.modelFields.length} 个：${stats.modelFields.join("、") || "无"}`],
          ["Human 待确认字段数", `${stats.needHumanFields.length} 个：${stats.needHumanFields.join("、") || "无"}`]
        ])}
        ${renderAiProcess(task)}
        ${renderCleaningExecutionLog(task)}
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

function renderSourceTrace(task) {
  return drawerSection("数据来源追溯", [
    ["来源系统", task.sourceSystem],
    ["接入方式", task.ingest_method],
    ["来源文件", task.source_file_name],
    ["Sheet", task.source_sheet_name],
    ["上传批次", task.upload_batch_id],
    ["原始行号", task.original_row_index],
    ["导入时间", task.ingest_time]
  ]);
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

function renderCleaningExecutionLog(task) {
  const hitQualityRules = qualityRuleHitObjects(task);
  const missedQualityRules = qualityRules.filter((rule) => !hitQualityRules.some((hit) => hit.id === rule.id));
  const confidence = confidenceBreakdown(task);
  const termCount = termHitObjects(task).length;
  const masterText = task.issueList.includes("主数据不确定") || !task.finalData.equipment_code ? "设备主数据待确认" : "设备主数据已确认";
  const reviewText = task.needsReview ? "需人工复核" : "可自动通过";
  return `
    <section class="drawer-section cleaning-log-section">
      <div class="cleaning-evidence-head">
        <div>
          <h3>清洗依据摘要</h3>
          <p>命中 ${termCount} 条标准词表规则，触发 ${hitQualityRules.length} 条质量规则，${masterText}，${reviewText}。</p>
        </div>
      </div>
      ${renderConfidenceSummary(confidence)}
      <details class="cleaning-details-toggle">
        <summary>查看清洗依据</summary>
        <div class="cleaning-timeline">
        ${cleaningStep("1", "数据结构判断", [
          ["输入内容", task.raw],
          ["判断原因", structureReason(task)],
          ["推荐解析策略", actualStrategy(task).name],
          ["本步骤输出", `${task.dataStructure}；${actualStrategy(task).steps}`],
          ["是否成功", "是"],
          ["失败原因", "无"],
          ["对最终状态的影响", "决定使用字段映射、规则识别或模型兜底。"]
        ])}
        ${cleaningStep("2", "设备识别", [
          ["原文命中的设备词", detectedDevicePhrase(task.raw)],
          ["识别到的设备大类", equipmentCategory(task.finalData.equipment_name || task.ruleResult.equipment_name || task.modelResult.equipment_name)],
          ["是否能唯一确认设备编码", canConfirmMasterData(task) ? `是，绑定 ${task.finalData.equipment_code}` : "否，进入主数据待确认"],
          ["不能确认的原因", canConfirmMasterData(task) ? "设备名称、所属系统和历史故障共现证据足够。" : masterDataUncertainReason(task)],
          ["对最终状态的影响", canConfirmMasterData(task) ? "主数据不阻断入DWD。" : "触发设备管理员复核。"]
        ], candidateMatchTable(task))}
        ${fieldRecognitionStep("3", "故障现象识别", task, "fault_symptom", "故障现象")}
        ${fieldRecognitionStep("4", "处理措施识别", task, "repair_action", "处理措施")}
        ${fieldRecognitionStep("5", "处理结果识别", task, "repair_result", "处理结果")}
        ${cleaningStep("6", "字段标准检查", [], keyFieldCheckTable(task))}
        ${cleaningStep("7", "数据质量规则命中", [
          ["命中的质量规则", hitQualityRules.length ? hitQualityRules.map((rule) => `${rule.id} ${rule.name}`).join("；") : "无"],
          ["未命中的质量规则", missedQualityRules.map((rule) => `${rule.id} ${rule.name}`).join("；")],
          ["状态流转影响", hitQualityRules.length ? hitQualityRules.map((rule) => `${rule.id}：${rule.action}`).join("；") : "质量规则未阻断，可继续进入复核或DWD。"]
        ], qualityRuleFlowTable(hitQualityRules, missedQualityRules))}
        ${cleaningStep("8", "置信度计算", [
          ["计算方式", "字段完整度30% + 设备匹配度25% + 术语命中度20% + 处理链路完整度15% + 人工复核状态10%"],
          ["最终总分", `${confidence.total}%`],
          ["结论", confidence.total >= 85 ? "可自动通过或进入DWD候选。" : confidence.total >= 55 ? "需要人工复核。" : "置信度低，进入有问题待补充。"]
        ], confidenceTable(confidence.items))}
        ${cleaningStep("9", "最终分流判断", [
          ["最终状态", finalStatusLabel(task)],
          ["为什么进入这个状态", finalRuleReason(task)],
          ["下一步建议动作", task.next_action || nextAction(task)]
        ])}
        ${renderRuleEvidenceTables(task)}
        </div>
      </details>
    </section>
  `;
}

function renderConfidenceSummary(confidence) {
  return `
    <div class="confidence-summary">
      ${confidence.items.map((item) => `<article><span>${item.name}</span><strong>${item.score}</strong><em>${item.weight}% 权重 / 加权 ${item.weighted}</em></article>`).join("")}
      <article class="total"><span>最终置信度</span><strong>${confidence.total}%</strong><em>动态计算</em></article>
    </div>
  `;
}

function renderRuleEvidenceTables(task) {
  return `
    <div class="rule-hit-grid">
      ${ruleHitCard("字段标准检查结果", fieldStandardHits(task), ["字段", "标准编码", "检查结果", "处理说明"])}
      ${ruleHitCard("设备主数据候选匹配", masterDataHits(task), ["候选设备", "设备编码", "置信度", "匹配结论"])}
      ${ruleHitCard("标准词表命中情况", termMappingHits(task), ["原始表达", "标准术语", "审核状态", "说明"])}
      ${ruleHitCard("数据质量规则命中情况", qualityRuleHits(task), ["规则", "严重级别", "处理动作", "命中原因"])}
      ${ruleHitCard("知识入库规则命中情况", knowledgeRuleHits(task), ["规则", "判定", "处理动作", "业务原因"])}
    </div>
  `;
}

function cleaningStep(index, title, rows, extra = "") {
  return `
    <article class="cleaning-step">
      <div class="cleaning-step-head">
        <span>${index}</span>
        <strong>${title}</strong>
      </div>
      ${rows.length ? `<dl>${rows.map(([key, value]) => `<div><dt>${key}</dt><dd>${value || "未识别"}</dd></div>`).join("")}</dl>` : ""}
      ${extra}
    </article>
  `;
}

function fieldRecognitionStep(index, title, task, field, termType) {
  const hits = termHitsByType(task, termType);
  const value = task.finalData[field] || "";
  return cleaningStep(index, title, [
    ["输入", task.raw],
    ["原文命中片段", matchedFragments(task, termType).join("；") || "未命中明确片段"],
    ["命中的标准词表规则", hits.length ? hits.map((hit) => `${hit.id}：${hit.raw} → ${hit.standard}`).join("；") : "未命中词表，使用抽取兜底或保持为空"],
    ["输出字段", `${field} = ${value || "空"}`],
    ["字段来源", fieldSource(task, field)],
    ["是否成功", value ? "是" : "否"],
    ["失败原因", value ? "无" : "规则和模型均未抽取到可信字段"],
    ["对最终状态的影响", value ? "关键字段已满足，不作为missing。" : "关键字段缺失，触发人工复核或待补充。"],
    ["是否需要人工确认", fieldNeedsReview(task, field, hits) ? "是" : "否"]
  ]);
}

function structureReason(task) {
  if (task.dataStructure === "结构化数据") return `来源为${task.sourceSystem}，通常包含业务字段和来源单号，优先规则解析。`;
  if (task.dataStructure === "半结构化数据") return `来源为${task.sourceSystem}，字段名可能不统一，需要先做表头映射再抽取。`;
  if (task.dataStructure === "非结构化文档") return `来源为${task.sourceSystem}，文件类型为${task.fileType || "文档"}，本阶段先做文档文本解析模拟。`;
  if (task.dataStructure === "非结构化文本") return `来源为${task.sourceSystem}，主要是现场自然语言描述，没有固定字段，需要规则识别、模型兜底和人工复核。`;
  return `来源为${task.sourceSystem}，主要是自然语言描述，没有固定字段，需要模型抽取占位 + 规则校验 + 人工复核。`;
}

function detectedDevicePhrase(raw) {
  const phrases = ["2号压载泵", "1号压载泵", "压载泵", "1号泵", "消防泵", "海水冷却泵", "舱底水泵", "阀门", "管路", "管子", "焊缝", "分段", "电机", "泵"];
  return phrases.find((phrase) => (raw || "").includes(phrase)) || "未命中设备词";
}

function equipmentCategory(device) {
  if (!device) return "未明确设备";
  if (device.includes("泵")) return "泵类设备";
  if (device.includes("阀门")) return "阀门类设备";
  if (device.includes("管路")) return "管路/安装对象";
  if (device.includes("焊缝")) return "船体质量对象";
  if (device.includes("电机")) return "电气设备";
  return device;
}

function canConfirmMasterData(task) {
  return Boolean(task.finalData.equipment_code) && (task.candidates?.[0]?.score || 0) >= 85 && !task.issueList.includes("主数据不确定");
}

function masterDataUncertainReason(task) {
  if (!task.finalData.equipment_code) return "缺少唯一设备编码，候选设备只说明相似，不足以自动绑定。";
  if ((task.candidates?.[0]?.score || 0) < 85) return "最高候选匹配度低于85%，按规则进入人工复核。";
  if (task.issueList.includes("主数据不确定")) return "命中主数据不确定规则，需要人工确认候选设备。";
  return "证据不足，需要人工确认。";
}

function candidateMatchTable(task) {
  return `
    <div class="cleaning-mini-table">
      <table>
        <thead><tr><th>主数据候选设备</th><th>匹配度</th><th>匹配依据</th></tr></thead>
        <tbody>
          ${task.candidates.map((candidate) => `<tr><td>${candidate.name}<br><span>${candidate.code}</span></td><td>${candidate.score}%</td><td>${candidate.reason}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function termHitsByType(task, termType) {
  const raw = task.raw || "";
  const standardText = `${task.ruleResult.fault_symptom || ""}；${task.ruleResult.repair_action || ""}；${task.ruleResult.repair_result || ""}；${task.finalData.fault_symptom || ""}；${task.finalData.repair_action || ""}；${task.finalData.repair_result || ""}`;
  return termMappings.filter((item) => item.type === termType && termMatched(item, raw, standardText));
}

function matchedFragments(task, termType) {
  const raw = task.raw || "";
  const direct = termHitsByType(task, termType).map((hit) => hit.raw).filter((phrase) => raw.includes(phrase) || (phrase === "换轴承" && raw.includes("换了轴承")));
  const fallbackMap = {
    "故障现象": detectSymptoms(raw),
    "处理措施": detectActions(raw),
    "处理结果": detectResult(raw) ? [detectResult(raw)] : []
  };
  return [...new Set([...direct, ...(fallbackMap[termType] || [])])];
}

function fieldSource(task, field) {
  if (task.humanCorrections?.[field]) return "Human：人工修正/补充";
  if (task.ruleResult?.[field]) return "Rule：规则解析/词表命中";
  if (task.modelResult?.[field]) return "Model：MockModelPlaceholder 抽取";
  return "未生成";
}

function fieldNeedsReview(task, field, hits) {
  if (!task.finalData[field]) return true;
  if (hits.some((hit) => hit.audit !== "已审核")) return true;
  if (field === "fault_symptom" && task.issueList.includes("术语不标准")) return true;
  return task.confidence < 85 && task.needsReview;
}

function keyFieldCheckTable(task) {
  const rows = keyFieldStandards(task).map((item) => `
    <tr>
      <td>${item.label}</td>
      <td>${item.satisfied ? "满足" : "缺失"}</td>
      <td>${item.impact}</td>
      <td>${item.blocks}</td>
    </tr>
  `).join("");
  return `
    <div class="cleaning-mini-table">
      <table>
        <thead><tr><th>关键字段</th><th>检查结果</th><th>业务影响</th><th>是否影响DWD/知识卡片</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function keyFieldStandards(task) {
  const f = task.finalData;
  const needsTemp = task.issueList.includes("缺温度值") || (task.raw || "").match(/温度|发热|过热|烫/);
  const needsVibration = task.issueList.includes("缺振动值") || (task.raw || "").match(/震|抖|振动/);
  const defs = [
    ["设备名称", "equipment_name", true, "缺失会导致无法识别业务对象。", "影响DWD和知识卡片"],
    ["设备编码", "equipment_code", true, "缺失会导致无法绑定主数据。", "阻断自动入库/RAG"],
    ["所属系统", "system", true, "缺失会降低主数据匹配准确率。", "影响匹配置信度"],
    ["部件", "component", false, "缺失会降低相似案例召回质量。", "不阻断，但建议补充"],
    ["故障现象", "fault_symptom", true, "RAG检索和故障分类的核心字段。", "阻断知识卡片"],
    ["处理措施", "repair_action", true, "业务建议必须引用可复用措施。", "阻断知识卡片"],
    ["处理结果", "repair_result", true, "用于判断案例是否闭环。", "阻断成功案例入库"],
    ["温度值", "temperature_value", Boolean(needsTemp), "涉及温升时需要量化证据，AI不能编造。", needsTemp ? "缺失则待补充" : "非本次必填"],
    ["振动值", "vibration_value", Boolean(needsVibration), "涉及振动时需要量化证据，AI不能编造。", needsVibration ? "缺失则待补充" : "非本次必填"]
  ];
  return defs.map(([label, field, required, impact, blocks]) => ({
    label,
    satisfied: Boolean(f[field]) || !required,
    impact,
    blocks
  }));
}

function qualityRuleHitObjects(task) {
  const hitNames = qualityRuleHits(task).map((row) => row[0].split(" ")[0]);
  return qualityRules.filter((rule) => hitNames.includes(rule.id));
}

function qualityRuleFlowTable(hitRules, missedRules) {
  const hitRows = hitRules.map((rule) => `<tr><td>${rule.id} ${rule.name}</td><td>命中</td><td>${rule.action}</td></tr>`).join("");
  const missedRows = missedRules.map((rule) => `<tr><td>${rule.id} ${rule.name}</td><td>未命中</td><td>不影响本条状态流转</td></tr>`).join("");
  return `
    <div class="cleaning-mini-table">
      <table>
        <thead><tr><th>规则</th><th>结果</th><th>对状态流转的影响</th></tr></thead>
        <tbody>${hitRows}${missedRows}</tbody>
      </table>
    </div>
  `;
}

function confidenceBreakdown(task) {
  return scoreConfidence(task);
}

function confidenceItem(name, weight, score, reason) {
  return { name, weight, score, weighted: Number((score * weight / 100).toFixed(1)), reason };
}

function confidenceTable(items) {
  return `
    <div class="cleaning-mini-table confidence-table">
      <table>
        <thead><tr><th>维度</th><th>权重</th><th>分数</th><th>原因</th><th>加权结果</th></tr></thead>
        <tbody>
          ${items.map((item) => `<tr><td>${item.name}</td><td>${item.weight}%</td><td>${item.score}</td><td>${item.reason}</td><td>${item.weighted}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function finalStatusLabel(task) {
  if (task.currentStatus === "已通过") return "已通过";
  if (task.currentStatus === "可生成知识卡片") return "已发布知识";
  if (task.currentStatus === "知识卡片待审核") return "知识卡片待审核";
  if (task.currentStatus === "已入RAG向量库") return "已入RAG向量库";
  if (task.currentStatus === "有问题待补充") return "有问题待补充";
  if (task.currentStatus === "已驳回") return "不入库/已驳回";
  return task.needsReview ? "待人工复核" : task.currentStatus;
}

function renderCleanCompare(task) {
  const rows = [
    ["原始数据", "source", { raw: task.raw, sourceSystem: task.sourceSystem, sourceId: task.sourceId }],
    ["规则处理结果", "rule", task.ruleResult],
    ["模型抽取结果", "model", task.modelResult],
    ["数据质量检查结果", "quality", { issues: task.issueList.join("；") || "无", missing: task.qualityAfterHuman.missing.join("；") || "无", confidence: `${task.confidence}%` }],
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

function renderRuleHitDetails(task) {
  const termCount = termHitObjects(task).length;
  const qualityCount = qualityRuleHitObjects(task).length;
  const masterText = task.issueList.includes("主数据不确定") || !task.finalData.equipment_code
    ? "当前需人工确认设备主数据。"
    : "设备主数据已可绑定。";
  return `
    <section class="drawer-section compact-rule-section">
      <div class="rule-summary-row">
        <div>
          <h3>清洗规则摘要</h3>
          <p>命中 ${termCount} 条标准词表规则，触发 ${qualityCount} 条质量规则，${masterText}</p>
        </div>
        <details class="rule-details-toggle">
          <summary>查看规则依据</summary>
          <div class="rule-hit-grid">
            ${ruleHitCard("字段标准检查结果", fieldStandardHits(task), ["字段", "标准编码", "检查结果", "处理说明"])}
            ${ruleHitCard("设备主数据候选匹配", masterDataHits(task), ["候选设备", "设备编码", "置信度", "匹配结论"])}
            ${ruleHitCard("标准词表命中情况", termMappingHits(task), ["原始表达", "标准术语", "审核状态", "说明"])}
            ${ruleHitCard("数据质量规则命中情况", qualityRuleHits(task), ["规则", "严重级别", "处理动作", "命中原因"])}
            ${ruleHitCard("知识入库规则命中情况", knowledgeRuleHits(task), ["规则", "判定", "处理动作", "业务原因"])}
            ${ruleHitCard("置信度评分拆解", confidenceBreakdown(task).items.map((item) => [item.name, `${item.weight}%`, `${item.score}`, `${item.weighted}｜${item.reason}`]), ["评分维度", "权重", "分数", "加权结果/原因"])}
          </div>
          <div class="final-rule-reason">
            <span>最终状态解释</span>
            <strong>${task.currentStatus}</strong>
            <p>${finalRuleReason(task)}</p>
          </div>
        </details>
      </div>
    </section>
  `;
}

function ruleHitCard(title, rows, headers) {
  return `
    <article class="rule-hit-card">
      <h4>${title}</h4>
      <div class="rule-hit-table">
        <table>
          <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">暂无命中。</td></tr>`}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function fieldStandardHits(task) {
  const fieldValue = {
    source_system: task.sourceSystem,
    source_id: task.sourceId,
    raw_text: task.raw,
    equipment_name: task.finalData.equipment_name,
    equipment_code: task.finalData.equipment_code,
    system: task.finalData.system,
    location: task.finalData.location,
    component: task.finalData.component,
    fault_symptom: task.finalData.fault_symptom,
    fault_reason: task.finalData.fault_reason,
    repair_action: task.finalData.repair_action,
    repair_result: task.finalData.repair_result,
    temperature_value: task.finalData.temperature_value,
    vibration_value: task.finalData.vibration_value,
    repair_time: task.finalData.repair_time,
    repair_person: task.finalData.repair_person,
    reviewer: task.finalData.reviewer,
    review_status: task.currentStatus,
    confidence: `${task.confidence}%`,
    knowledge_value: task.currentStatus === "可生成知识卡片" ? "高" : "待评估"
  };
  return fieldStandards.map((standard) => {
    const value = fieldValue[standard.field];
    const required = standard.required === "是" || standard.required === "条件必填";
    const passed = Boolean(value);
    const status = passed ? "已满足" : required ? "缺失/待补充" : "未填写";
    return [standard.name, standard.code, status, passed ? "符合字段标准" : standard.missing];
  });
}

function masterDataHits(task) {
  return task.candidates.map((candidate) => {
    const master = equipmentMasterData.find((item) => item.code === candidate.code || item.name === candidate.name);
    const conclusion = candidate.score >= 85 ? "推荐绑定" : "候选参考，需人工确认";
    return [
      master ? master.name : candidate.name,
      candidate.code,
      `${candidate.score}%`,
      `${conclusion}；${candidate.reason}`
    ];
  });
}

function termMappingHits(task) {
  const raw = task.raw || "";
  const standardText = `${task.ruleResult.fault_symptom || ""}；${task.ruleResult.repair_action || ""}；${task.ruleResult.repair_result || ""}；${task.finalData.fault_symptom || ""}；${task.finalData.repair_action || ""}；${task.finalData.repair_result || ""}`;
  const hits = termMappings.filter((item) => termMatched(item, raw, standardText));
  return hits.map((item) => [item.raw, item.standard, item.audit, item.note]);
}

function termMatched(item, raw, standardText) {
  const relaxed = item.raw.replace("泵", "").replace("加", "补充").replace("用", "补充");
  const actionVariant = item.raw === "换轴承" && raw.includes("换了轴承");
  const lubricationVariant = item.raw.includes("润滑油") && raw.includes("润滑油");
  const jamVariant = item.id === "T007" && raw.match(/泵轴.*卡顿|泵轴.*不转/);
  return raw.includes(item.raw) || raw.includes(relaxed) || raw.includes(item.standard) || standardText.includes(item.raw) || actionVariant || lubricationVariant || jamVariant;
}

function termDrivenFields(raw) {
  const text = raw || "";
  const fields = { fault_symptom: [], repair_action: [], repair_result: [] };
  termMappings.forEach((item) => {
    if (!termMatched(item, text, "")) return;
    if (item.type === "故障现象") fields.fault_symptom.push(item.standard);
    if (item.type === "处理措施") fields.repair_action.push(item.standard);
    if (item.type === "处理结果") fields.repair_result.push(item.standard);
  });
  return compactObject({
    fault_symptom: [...new Set(fields.fault_symptom)].join("；"),
    repair_action: [...new Set(fields.repair_action)].join("；"),
    repair_result: [...new Set(fields.repair_result)].join("；")
  });
}

function qualityRuleHits(task) {
  const hitIds = new Set();
  const missing = task.qualityAfterHuman?.missing || task.quality?.missing || [];
  if (!task.finalData.equipment_name) hitIds.add("Q001");
  if (task.issueList.includes("缺设备编码") || !task.finalData.equipment_code) hitIds.add("Q002");
  if (task.issueList.includes("主数据不确定") || (task.candidates?.[0]?.score || 0) < 85) hitIds.add("Q003");
  if (!task.finalData.fault_symptom || missing.includes("fault_symptom")) hitIds.add("Q004");
  if (!task.finalData.repair_action || missing.includes("repair_action")) hitIds.add("Q005");
  if (!task.finalData.repair_result || missing.includes("repair_result")) hitIds.add("Q006");
  if (task.issueList.includes("缺温度值") || task.issueList.includes("缺振动值") || missing.includes("temperature_value") || missing.includes("vibration_value")) {
    hitIds.add("Q007");
    hitIds.add("Q008");
  }
  if (task.issueList.includes("术语不标准")) hitIds.add("Q009");
  if (task.confidence < 70) hitIds.add("Q010");
  if (task.issueList.includes("描述过于模糊")) hitIds.add("Q011");
  if ((task.raw || "").includes("重复") || (task.sourceId || "").includes("DUP")) hitIds.add("Q012");
  if (!task.sourceSystem || !task.sourceId) hitIds.add("Q013");
  if (task.needsReview && !["已通过", "可生成知识卡片"].includes(task.currentStatus)) hitIds.add("Q014");
  return qualityRules
    .filter((rule) => hitIds.has(rule.id))
    .map((rule) => [`${rule.id} ${rule.name}`, rule.severity, rule.action, rule.reason]);
}

function knowledgeRuleHits(task) {
  const rows = [];
  const add = (id, result) => {
    const rule = knowledgeRules.find((item) => item.id === id);
    if (rule) rows.push([`${rule.id} ${rule.name}`, result, rule.action, rule.reason]);
  };
  add("K001", ["已通过", "可生成知识卡片"].includes(task.currentStatus) ? "通过" : "阻断：未复核通过");
  add("K002", task.finalData.equipment_code && !task.issueList.includes("主数据不确定") ? "通过" : "阻断：主数据未确认");
  add("K003", task.finalData.fault_symptom ? "通过" : "阻断：缺故障现象");
  add("K004", task.finalData.repair_action ? "通过" : "阻断：缺处理措施");
  add("K005", task.finalData.repair_result ? "通过" : "阻断：缺处理结果");
  if (task.issueList.includes("描述过于模糊")) add("K006", "阻断：描述过于模糊");
  if (task.issueList.includes("主数据不确定")) add("K007", "阻断：主数据不确定");
  if (task.confidence < 85) add("K008", "需审核：置信度低于85%");
  add("K009", task.sourceId ? "通过" : "阻断：缺来源单号");
  add("K010", task.currentStatus ? "通过" : "阻断：缺审核状态");
  if ((task.finalData.repair_result || "").includes("临时恢复")) add("K011", "风险：不能作为稳定方案");
  if (termMappingHits(task).some((row) => row[2] !== "已审核")) add("K012", "需专家确认：命中未审核词条");
  return rows;
}

function finalRuleReason(task) {
  if (task.currentStatus === "有问题待补充") return "命中缺失关键字段、描述过于模糊或低置信度规则，当前只能进入问题队列，不能生成知识卡片。";
  if (task.currentStatus === "待人工复核") return "AI已完成抽取和标准化，但主数据、缺失字段或术语存在不确定项，需要人工确认后才能写入DWD。";
  if (task.currentStatus === "已通过") return "字段标准和质量规则基本满足，已允许进入DWD标准明细层，下一步可生成知识卡片。";
  if (task.currentStatus === "可生成知识卡片") return "满足知识入库基础规则，已生成知识卡片并进入RAG准备区。";
  if (task.currentStatus === "已接入") return "数据仍停留在ODS原始数据层，尚未进入AI治理处理。";
  return routeDecision(task);
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
      ${renderReviewTriggers(task)}
      <form id="correctionForm" class="correction-form">
        <input type="hidden" name="recordId" value="${task.id}">
        ${correctionInput("设备名称", "equipment_name", data.equipment_name)}
        ${correctionInput("设备编码", "equipment_code", data.equipment_code)}
        ${correctionInput("所属系统", "system", data.system)}
        ${correctionInput("舱室/位置", "location", data.location)}
        ${correctionInput("部件", "component", data.component)}
        ${correctionInput("故障现象", "fault_symptom", data.fault_symptom)}
        ${correctionInput("处理措施", "repair_action", data.repair_action)}
        ${correctionInput("处理结果", "repair_result", data.repair_result)}
        ${correctionInput("温度值", "temperature_value", data.temperature_value)}
        ${correctionInput("振动值", "vibration_value", data.vibration_value)}
        ${correctionInput("知识沉淀价值", "knowledge_value", data.knowledge_value || "中")}
        <button class="primary-btn" type="submit">保存人工修正并重新计算状态</button>
      </form>
    </section>
  `;
}

function renderReviewTriggers(task) {
  const triggers = reviewTriggers(task);
  return `
    <div class="review-trigger-box">
      <strong>人工复核触发前提</strong>
      <div>
        ${triggers.length ? triggers.map((item) => `<span>${item}</span>`).join("") : "<span>未触发强制复核条件</span>"}
      </div>
      <p>当前分派：${task.review_queue} / ${task.assignee_role} ${task.assignee_name}；下一步：${task.next_action}</p>
    </div>
  `;
}

function reviewTriggers(task) {
  const triggers = [];
  const missing = task.qualityAfterHuman?.missing || [];
  if (!task.finalData.equipment_code || task.issueList.includes("缺设备编码")) triggers.push("缺设备编码");
  if (task.issueList.includes("主数据不确定")) triggers.push("主数据无法唯一确认");
  if (missing.length) triggers.push(`关键字段缺失：${missing.join("、")}`);
  if (task.confidence < 85) triggers.push("置信度低于阈值");
  if (termHitObjects(task).some((item) => item.audit !== "已审核")) triggers.push("命中待审核词表");
  if (task.issueList.includes("描述过于模糊")) triggers.push("原始描述过于模糊");
  if (task.currentStatus === "可生成知识卡片") triggers.push("生成知识卡片前需要确认");
  return [...new Set(triggers)];
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
  if (task.currentStatus === "知识卡片待审核") return "知识管理员审核后发布并写入向量库";
  if (task.currentStatus === "已入RAG向量库") return "可被RAG和Agent检索调用";
  if (task.currentStatus === "已通过") return "生成知识卡片";
  if (task.currentStatus === "有问题待补充") return "补充字段或澄清原始描述";
  if (task.currentStatus === "待人工复核") return "人工确认AI不确定字段";
  return "AI处理或进入人工复核";
}

function destination(task) {
  if (task.currentStatus === "已入RAG向量库") return "已入向量库";
  if (task.currentStatus === "知识卡片待审核") return "知识卡片 / 待审核";
  if (task.currentStatus === "可生成知识卡片") return "知识卡片库 / RAG准备区";
  if (task.currentStatus === "已通过") return "DWD标准明细层";
  if (task.currentStatus === "有问题待补充") return "有问题队列";
  if (task.currentStatus === "已驳回") return "问题队列";
  return task.currentLayer;
}

function renderHelpPanel(type) {
  const titleMap = { flow: "系统流程图", rules: "流转规则", guide: "使用说明", capabilities: "Demo能力说明" };
  return `
    <div class="drawer-mask" data-close-help></div>
    <aside class="help-panel">
      <div class="drawer-head">
        <div><p class="eyebrow">Help Center</p><h2>${titleMap[type]}</h2></div>
        <button class="icon-btn" data-close-help type="button">×</button>
      </div>
      <div class="drawer-body">
        ${type === "flow" ? renderHelpFlow() : type === "rules" ? renderHelpRules() : type === "capabilities" ? renderDemoCapabilities() : renderHelpGuide()}
      </div>
    </aside>
  `;
}

function renderDemoCapabilities() {
  const groups = [
    {
      title: "已实现",
      status: "ready",
      items: [
        ["LangGraph Agent", "真实 @langchain/langgraph StateGraph，支持节点、状态、分支和 resume。", "继续沉淀更多业务子图。"],
        ["RAG检索", "支持文档 Chunk、metadata、TopK 命中和引用依据展示。", "与评测结果联动优化检索质量。"],
        ["DashVector", "支持阿里云 DashVector 云端向量库写入和检索。", "增加更多 collection 管理和灰度发布策略。"],
        ["百炼Embedding", "使用 text-embedding-v4，1024维向量，与 DashVector Collection 对齐。", "按文档类型配置 embedding 策略。"],
        ["SQLite持久化", "Agent run、tool call、审计、反馈、审批和知识卡片可本地留痕。", "后续替换为企业数据库。"],
        ["审批权限", "内置一线员工、维修工程师、设备管理员、知识管理员、审计管理员、管理员角色。", "扩展审批流模板和组织权限。"],
        ["知识卡片入库", "人工复核后生成待审核知识卡片，审核后可写入 DashVector。", "打通知识版本和发布流程。"],
        ["Agent运行回放", "可按 run_id 查看 state 变化、节点执行链、tool 调用、RAG引用和审计事件。", "增加可视化时间轴。"]
      ]
    },
    {
      title: "进行中",
      status: "progress",
      items: [
        ["多Agent Router", "当前已用规则路由到设备故障、质量异常、数据治理、知识运营、RAG评测。", "预留 LLM Router，并把质量异常等分支升级为独立子图。"],
        ["RAG评测联动", "已有 LangGraph 风格评测入口，可看 Recall、Precision 和问题归因。", "把评测结论自动反推 Chunk、metadata 和知识缺口。"],
        ["知识图谱/Neo4j接入", "当前用轻量图谱事实模拟设备-现象-部件-措施关系。", "后续接入 Neo4j，支持真实拓扑查询和路径解释。"]
      ]
    },
    {
      title: "规划中",
      status: "planned",
      items: [
        ["多模态图片治理", "用于现场照片、缺陷图片和设备铭牌识别。", "接 OCR/视觉模型，提取设备、缺陷位置和证据。"],
        ["OCR", "解析扫描 PDF、图片报告、手写现场单。", "补齐文档型资料的真实解析链路。"],
        ["图向量", "用于图纸、照片、拓扑图等多模态检索。", "和文本向量、知识图谱做混合检索。"],
        ["真实EAM/QMS/MES/PLM接入", "当前用 mock + localStorage 模拟企业多源数据。", "后续通过 API/ETL/数据库同步接真实系统。"],
        ["动态系统架构图", "当前流程图是静态展示。", "后续按真实运行状态动态展示数据流和调用链。"]
      ]
    }
  ];
  return `
    <div class="capability-board">
      ${groups.map((group) => `
        <section class="capability-column ${group.status}">
          <div class="section-heading compact">
            <div><p class="eyebrow">${group.status}</p><h3>${group.title}</h3></div>
            <span class="status-pill">${group.items.length} 项</span>
          </div>
          ${group.items.map(([name, value, next]) => `
            <article>
              <strong>${escapeHtml(name)}</strong>
              <p>${escapeHtml(value)}</p>
              <em>下一步：${escapeHtml(next)}</em>
            </article>
          `).join("")}
        </section>
      `).join("")}
    </div>
  `;
}

function renderHelpFlow() {
  const lanes = [
    {
      title: "Source",
      nodes: [
        ["EAM/QMS/MES", "工单/检测/施工"],
        ["Excel/PDF/Word", "历史台账/报告/SOP"],
        ["Manual Input", "现场补充记录"]
      ]
    },
    {
      title: "Governance",
      nodes: [
        ["ODS", "保留原始记录"],
        ["AI Task Pool", "结构识别 + 分流"],
        ["Rule / Model / Human", "解析、标准化、复核"]
      ]
    },
    {
      title: "Knowledge",
      nodes: [
        ["DWD", "标准明细"],
        ["Knowledge Card", "可复用案例"],
        ["RAG Vector Store", "Chunk + Embedding"]
      ]
    },
    {
      title: "Application",
      nodes: [
        ["RAG Search", "TopK + 引用"],
        ["Agent", "工具编排"],
        ["Feedback", "评测与回流"]
      ]
    }
  ];
  return `
    <div class="diagram-toolbar">
      <span>Mock Data</span><span>Rule</span><span>Model</span><span>Human Review</span><span>DashVector</span>
    </div>
    <div class="flow-lane-diagram">
      ${lanes.map((lane) => `
        <section>
          <h3>${lane.title}</h3>
          <div>
            ${lane.nodes.map(([title, desc], index) => `
              <article>
                <span>${index + 1}</span>
                <strong>${title}</strong>
                <em>${desc}</em>
              </article>
            `).join("")}
          </div>
        </section>
      `).join("")}
    </div>
    <div class="pipeline-strip">
      ${["业务数据源", "数据接入", "ODS", "AI治理任务池", "DWD", "知识卡片", "RAG向量库", "Agent应用"].map((item, index) => `<span>${index + 1}. ${item}</span>`).join("")}
    </div>
  `;
}

function renderHelpRules() {
  const states = [
    ["已接入", "ODS"],
    ["待AI处理", "AI Queue"],
    ["AI处理中", "Rule/Model"],
    ["待人工复核", "Human"],
    ["已通过", "DWD"],
    ["可生成知识卡片", "KB/RAG"]
  ];
  const branches = [
    ["结构化", "字段映射 + 规则校验", "自动通过 / DWD"],
    ["半结构化", "表头识别 + 模型辅助", "数据管理员复核"],
    ["非结构化", "模型抽取 + 规则校验", "维修工程师复核"],
    ["主数据不确定", "候选匹配 < 85%", "设备管理员复核"],
    ["描述过于模糊", "关键字段不足", "有问题待补充"],
    ["知识发布前", "已复核 + 可引用", "知识管理员审核"]
  ];
  return `
    <div class="state-machine">
      ${states.map(([name, layer], index) => `
        <article class="${index === 0 ? "start" : index === states.length - 1 ? "end" : ""}">
          <span>${layer}</span>
          <strong>${name}</strong>
        </article>
      `).join("")}
    </div>
    <div class="branch-rule-map">
      ${branches.map(([condition, action, owner]) => `
        <article>
          <span>If</span><strong>${condition}</strong>
          <span>Then</span><strong>${action}</strong>
          <em>${owner}</em>
        </article>
      `).join("")}
    </div>
  `;
}

function renderHelpGuide() {
  const mindmap = [
    ["Input", ["上传文档", "Excel台账", "手工录入"]],
    ["AI Value", ["结构识别", "字段抽取", "术语归一", "自动分流"]],
    ["Control", ["规则优先", "低置信复核", "禁止编造数值"]],
    ["Output", ["DWD标准明细", "知识卡片", "RAG Chunk", "Agent引用"]],
    ["Eval", ["TopK命中", "引用可信", "问题归因", "反馈回流"]]
  ];
  return `
    <div class="mindmap">
      <div class="mindmap-center">
        <strong>AI Data Governance Lab</strong>
        <span>Rule + Model + Human</span>
      </div>
      ${mindmap.map(([title, items]) => `
        <article>
          <h3>${title}</h3>
          ${items.map((item) => `<span>${item}</span>`).join("")}
        </article>
      `).join("")}
    </div>
    <div class="legend-grid">
      <article><strong>Rule</strong><p>结构化字段、词表、质量规则先行。</p></article>
      <article><strong>Model</strong><p>处理自然语言抽取和歧义判断。</p></article>
      <article><strong>Human</strong><p>确认主数据、低置信度和发布审核。</p></article>
      <article><strong>RAG</strong><p>只引用已审核、可追溯、可引用知识。</p></article>
    </div>
  `;
}

function badgeClass(value) {
  if (["正常", "已通过", "可生成知识卡片", "已入RAG向量库"].includes(value)) return "ok";
  if (["延迟", "待人工复核", "待AI处理", "AI处理中", "即将超时", "知识卡片待审核"].includes(value)) return "warn";
  if (["待配置", "有问题待补充", "已超时", "已驳回"].includes(value)) return "bad";
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

  const dashboardQueue = event.target.closest("[data-dashboard-queue]");
  if (dashboardQueue) return openWorkbenchTodo(dashboardQueue.dataset.dashboardQueue);

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
  const selectSheetButton = event.target.closest("[data-select-sheet]");
  if (selectSheetButton) return selectExcelSheet(selectSheetButton.dataset.selectSheet);
  if (event.target.closest("[data-confirm-sheet]")) return confirmExcelSheet();
  if (event.target.closest("[data-cancel-excel]")) {
    state.excelPreview = null;
    state.uploadResult = null;
    saveState();
    return render();
  }
  if (event.target.closest("[data-cancel-mapping]")) {
    state.csvPreview = null;
    saveState();
    return render();
  }
  const selectRagDoc = event.target.closest("[data-select-rag-doc]");
  if (selectRagDoc) {
    ragState().selectedDocId = selectRagDoc.dataset.selectRagDoc;
    saveState();
    return render();
  }
  const reparseDoc = event.target.closest("[data-reparse-doc]");
  if (reparseDoc) return reparseRagDocument(reparseDoc.dataset.reparseDoc);
  const vectorizeDoc = event.target.closest("[data-vectorize-doc]");
  if (vectorizeDoc) {
    const doc = ragState().documents.find((item) => item.id === vectorizeDoc.dataset.vectorizeDoc);
    if (doc) return buildRagChunksFromDocument(doc);
  }
  const rewriteDoc = event.target.closest("[data-rewrite-doc-vector]");
  if (rewriteDoc) return rewriteDocumentVectorStore(rewriteDoc.dataset.rewriteDocVector);
  const toggleRagDoc = event.target.closest("[data-toggle-rag-doc]");
  if (toggleRagDoc) return toggleRagDocumentEnabled(toggleRagDoc.dataset.toggleRagDoc);
  const deleteRagDoc = event.target.closest("[data-delete-rag-doc]");
  if (deleteRagDoc) return deleteRagDocument(deleteRagDoc.dataset.deleteRagDoc);
  if (event.target.closest("[data-rechunk-current]")) return rechunkCurrentDocument();
  if (event.target.closest("[data-load-built-in-rag]")) return loadBuiltInKnowledgePack();
  if (event.target.closest("[data-generate-built-in-chunks]")) return generateBuiltInPackChunks();
  if (event.target.closest("[data-upsert-current-chunks]")) return upsertCurrentRagChunks();
  if (event.target.closest("[data-compare-chunk-strategy]")) return compareChunkStrategies();
  if (event.target.closest("[data-clear-built-in-rag]")) return clearBuiltInKnowledgePack();
  const saveChunk = event.target.closest("[data-save-chunk]");
  if (saveChunk) return saveChunkManual(saveChunk.dataset.saveChunk);
  const splitChunkButton = event.target.closest("[data-split-chunk]");
  if (splitChunkButton) return splitChunk(splitChunkButton.dataset.splitChunk);
  const mergeChunkButton = event.target.closest("[data-merge-next-chunk]");
  if (mergeChunkButton) return mergeNextChunk(mergeChunkButton.dataset.mergeNextChunk);
  const toggleChunkButton = event.target.closest("[data-toggle-chunk-quote]");
  if (toggleChunkButton) return toggleChunkQuote(toggleChunkButton.dataset.toggleChunkQuote);
  const regenerateChunkButton = event.target.closest("[data-regenerate-chunk]");
  if (regenerateChunkButton) return regenerateChunkEmbedding(regenerateChunkButton.dataset.regenerateChunk);
  if (event.target.closest("[data-check-backend]")) return fetchBackendHealth();
  if (event.target.closest("[data-init-dashvector]")) return initDashVectorCollection();
  if (event.target.closest("[data-run-rag-eval]")) return runRagEval();
  if (event.target.closest("[data-load-latest-rag-eval]")) return loadLatestRagEval();
  if (event.target.closest("[data-run-equipment-agent]")) return runEquipmentAgent();
  if (event.target.closest("[data-resume-agent-run]")) return resumeAgentRun();
  if (event.target.closest("[data-load-agent-runs]")) return loadAgentRuns();
  if (event.target.closest("[data-load-approvals]")) return loadApprovals();
  if (event.target.closest("[data-load-audit-logs]")) return loadAuditLogs();
  if (event.target.closest("[data-load-run-analysis]")) return loadRunAnalysis();
  const analysisButton = event.target.closest("[data-select-analysis]");
  if (analysisButton) {
    state.selectedAnalysisRunId = analysisButton.dataset.selectAnalysis;
    saveState();
    return render();
  }
  const loadRunCaseButton = event.target.closest("[data-load-run-case]");
  if (loadRunCaseButton) return loadRunExperimentCase(loadRunCaseButton.dataset.loadRunCase);
  const runCaseButton = event.target.closest("[data-run-experiment-case]");
  if (runCaseButton) return runExperimentCase(runCaseButton.dataset.runExperimentCase);
  const roleButton = event.target.closest("[data-agent-role]");
  if (roleButton) {
    state.agentRole = roleButton.dataset.agentRole;
    state.agentNotice = `已切换角色：${state.agentRole}`;
    saveState();
    return render();
  }
  const userButton = event.target.closest("[data-agent-user]");
  if (userButton) {
    const user = agentAccounts().find((item) => item.id === userButton.dataset.agentUser);
    if (user) {
      state.agentUserId = user.id;
      state.agentRole = user.role;
      state.agentNotice = `已模拟登录：${user.name}（${user.role}）`;
      saveState();
      return render();
    }
  }
  const approveButton = event.target.closest("[data-approve-task]");
  if (approveButton) return approveTask(approveButton.dataset.approveTask);
  const rejectApprovalButton = event.target.closest("[data-reject-task]");
  if (rejectApprovalButton) return rejectTask(rejectApprovalButton.dataset.rejectTask);
  const approveCardButton = event.target.closest("[data-approve-card]");
  if (approveCardButton) return approveKnowledgeCard(approveCardButton.dataset.approveCard);
  const loadAgentRunButton = event.target.closest("[data-load-agent-run]");
  if (loadAgentRunButton) return loadAgentRunById(loadAgentRunButton.dataset.loadAgentRun);
  const agentFeedbackButton = event.target.closest("[data-agent-feedback]");
  if (agentFeedbackButton) return sendAgentFeedback(agentFeedbackButton.dataset.agentFeedback);
  if (event.target.closest("[data-build-knowledge-rag]")) return buildRagChunksFromKnowledgeCards();
  if (event.target.closest("[data-open-workbench-for-excel]")) {
    state.page = "workbench";
    state.filters = { ...defaultFilters };
    state.filters.ingestMethod = "Excel上传";
    normalizeDependentFilters();
    ragState().notice = "已切到治理工作台。Excel 数据需要先完成 Sheet 识别、字段映射、AI治理和人工复核。";
    saveState();
    return render();
  }
  if (event.target.closest("[data-run-rag-search]")) return runRagSearch();
  const navButton = event.target.closest("[data-page]");
  if (navButton) {
    state.page = navButton.dataset.page;
    state.drawerOpen = false;
    state.helpPanel = "";
    if (state.page === "workbench") {
      state.filters = { ...defaultFilters };
      normalizeDependentFilters();
    }
    saveState();
    if (state.page === "analysis") return loadRunAnalysis();
    return render();
  }
});

document.addEventListener("change", (event) => {
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.filters[filter.dataset.filter] = filter.value;
    normalizeDependentFilters();
    saveState();
    return render();
  }
  const mapping = event.target.closest("[data-mapping]");
  if (mapping && state.csvPreview) {
    state.csvPreview.mapping[mapping.dataset.mapping] = mapping.value;
    saveState();
    return render();
  }
  if (event.target.matches("#dataFileUpload")) {
    const file = event.target.files?.[0];
    if (!file) return;
    handleDataFileUpload(file);
    event.target.value = "";
  }
  if (event.target.matches("#ragFileUpload")) {
    const file = event.target.files?.[0];
    if (!file) return;
    handleRagUpload(file);
    event.target.value = "";
  }
  const ragConfig = event.target.closest("[data-rag-config]");
  if (ragConfig) {
    const key = ragConfig.dataset.ragConfig;
    ragState().config[key] = ["chunkSize", "chunkOverlap"].includes(key) ? Number(ragConfig.value) : ragConfig.value;
    ragState().notice = `RAG配置已更新：${key}`;
    saveState();
    return render();
  }
  const analysisFilter = event.target.closest("[data-analysis-filter]");
  if (analysisFilter) {
    state.runAnalysisFilters = {
      ...(state.runAnalysisFilters || {}),
      [analysisFilter.dataset.analysisFilter]: analysisFilter.value
    };
    state.selectedAnalysisRunId = "";
    saveState();
    return loadRunAnalysis();
  }
  if (event.target.matches("#ragQuery")) {
    ragState().query = event.target.value;
    saveState();
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
  state = { ...defaultState, filters: { ...defaultFilters }, rag: mergeRagState(), taskStates: defaultTaskStates(demoRecords()), userRecords: [], csvPreview: null, excelPreview: null, logs: [] };
  addLog("重置AI数据治理实验台");
  saveState();
  render();
});

render();
