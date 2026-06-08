const { Annotation, END, START, StateGraph } = require("@langchain/langgraph");

const equipmentMasterData = [
  {
    code: "EQ-BW-PUMP-001",
    name: "1号压载泵",
    aliases: ["1号压载泵", "压载泵", "1号泵", "BW泵"],
    system: "压载水系统",
    type: "离心泵",
    location: "机舱泵区",
    common_parts: ["轴承", "联轴器", "叶轮", "机械密封"]
  },
  {
    code: "EQ-FS-PUMP-002",
    name: "1号消防泵",
    aliases: ["消防泵", "消防水泵"],
    system: "消防水系统",
    type: "消防泵",
    location: "消防泵舱",
    common_parts: ["地脚螺栓", "轴承", "泵体"]
  },
  {
    code: "EQ-SW-PUMP-004",
    name: "1号海水冷却泵",
    aliases: ["海水冷却泵", "冷却泵"],
    system: "海水冷却系统",
    type: "海水泵",
    location: "机舱左舷",
    common_parts: ["轴承", "滤网", "叶轮"]
  }
];

const toolRegistry = [
  toolDef("master_data_lookup", "MasterDataTool", "查询设备主数据候选并选择可信设备编码。"),
  toolDef("rag_retrieve", "RAGRetrieverTool", "从 DashVector 或本地向量库检索可引用知识 Chunk。"),
  toolDef("quality_rule_check", "QualityRuleTool", "检查关键字段、主数据、引用和质量规则。"),
  toolDef("create_review_task", "ReviewTaskTool", "关键字段不足或低置信度时创建人工复核任务。"),
  toolDef("knowledge_gap_create", "KnowledgeGapTool", "把错误反馈、知识缺口或资料不足转成知识运营待办。"),
  toolDef("feedback_log", "FeedbackRecorderTool", "记录用户反馈和采纳情况，进入审计日志。"),
  toolDef("knowledge_card_upsert", "KnowledgeCardTool", "把已确认的案例沉淀为待审核知识卡片，后续可重新入库向量库。"),
  toolDef("dashvector_upsert", "DashVectorTool", "把审核后的 Chunk/知识卡片写入 DashVector。")
];

const AgentState = Annotation.Root({
  agent_run_id: Annotation(),
  user_question: Annotation(),
  intent: Annotation(),
  scenario: Annotation(),
  equipment_candidates: Annotation(),
  selected_equipment: Annotation(),
  retrieved_chunks: Annotation(),
  graph_facts: Annotation(),
  quality_findings: Annotation(),
  missing_fields: Annotation(),
  risk_level: Annotation(),
  answer: Annotation(),
  citations: Annotation(),
  tool_registry: Annotation(),
  tool_calls: Annotation(),
  human_review_required: Annotation(),
  human_review_result: Annotation(),
  feedback: Annotation(),
  agent_route: Annotation(),
  route_reason: Annotation(),
  current_node: Annotation(),
  waiting_human_input: Annotation(),
  failure_reasons: Annotation(),
  knowledge_gaps: Annotation(),
  knowledge_cards: Annotation(),
  status: Annotation(),
  route: Annotation(),
  node_status: Annotation(),
  state_changes: Annotation(),
  audit_events: Annotation(),
  langgraph: Annotation()
});

const agentNodeNames = [
  "input_node",
  "agent_router_node",
  "intent_classify_node",
  "master_data_lookup_node",
  "rag_retrieve_node",
  "graph_query_node",
  "quality_check_node",
  "risk_assess_node",
  "answer_compose_node",
  "human_review_route_node",
  "feedback_record_node"
];

const resumeNodeNames = [
  "human_review_apply_node",
  "quality_check_node",
  "rag_retrieve_node",
  "graph_query_node",
  "risk_assess_node",
  "answer_compose_node",
  "human_review_route_node",
  "feedback_record_node"
];

async function runEquipmentFaultAgent(options = {}, deps = {}) {
  const initialState = createInitialState(options);
  const graph = createEquipmentFaultAgentGraph(deps);
  const app = graph.compile();
  return finalizeGraphState(await app.invoke(initialState), false);
}

async function resumeEquipmentFaultAgent(previousState = {}, humanReviewResult = {}, deps = {}) {
  const initialState = {
    ...createInitialState({ user_question: previousState.user_question }),
    ...previousState,
    human_review_result: {
      ...(previousState.human_review_result || {}),
      ...humanReviewResult,
      reviewed_at: new Date().toISOString()
    },
    status: "resuming_from_human_review",
    route: "resume",
    human_review_required: false,
    tool_registry: previousState.tool_registry || toolRegistry,
    tool_calls: previousState.tool_calls || [],
    audit_events: appendAudit(previousState, "resume_api", "接收人工复核补充字段", humanReviewResult),
    state_changes: previousState.state_changes || [],
    langgraph: {
      ...(previousState.langgraph || {}),
      enabled: true,
      package: "@langchain/langgraph",
      graph: "EquipmentFaultAgentResume",
      nodes: resumeNodeNames
    }
  };
  const graph = createEquipmentFaultResumeGraph(deps);
  const app = graph.compile();
  return finalizeGraphState(await app.invoke(initialState), true);
}

function createInitialState(options = {}) {
  return {
    agent_run_id: options.agent_run_id || newAgentRunId(),
    user_question: options.user_question || "某船压载泵启动后异常振动，并伴随轴承位置温度升高，应该怎么排查？",
    intent: {},
    scenario: "unknown",
    equipment_candidates: [],
    selected_equipment: null,
    retrieved_chunks: [],
    graph_facts: [],
    quality_findings: [],
    missing_fields: [],
    risk_level: "待评估",
    answer: "",
    citations: [],
    tool_registry: toolRegistry,
    tool_calls: [],
    human_review_required: false,
    human_review_result: options.human_review_result || null,
    feedback: options.feedback || null,
    agent_route: "pending",
    route_reason: "",
    current_node: "",
    waiting_human_input: false,
    failure_reasons: [],
    knowledge_gaps: [],
    knowledge_cards: [],
    status: "running",
    route: "running",
    node_status: {},
    state_changes: [],
    audit_events: [],
    langgraph: {
      enabled: true,
      package: "@langchain/langgraph",
      graph: "EquipmentFaultAgent",
      nodes: agentNodeNames
    }
  };
}

function newAgentRunId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AGENT-RUN-${stamp}-${suffix}`;
}

function createEquipmentFaultAgentGraph(deps = {}) {
  return new StateGraph(AgentState)
    .addNode("input_node", withAgentNode("input_node", input_node))
    .addNode("agent_router_node", withAgentNode("agent_router_node", agent_router_node))
    .addNode("intent_classify_node", withAgentNode("intent_classify_node", intent_classify_node))
    .addNode("route_answer_node", withAgentNode("route_answer_node", route_answer_node))
    .addNode("master_data_lookup_node", withAgentNode("master_data_lookup_node", master_data_lookup_node))
    .addNode("rag_retrieve_node", withAgentNode("rag_retrieve_node", (state) => rag_retrieve_node(state, deps)))
    .addNode("graph_query_node", withAgentNode("graph_query_node", graph_query_node))
    .addNode("quality_check_node", withAgentNode("quality_check_node", quality_check_node))
    .addNode("risk_assess_node", withAgentNode("risk_assess_node", risk_assess_node))
    .addNode("answer_compose_node", withAgentNode("answer_compose_node", answer_compose_node))
    .addNode("human_review_route_node", withAgentNode("human_review_route_node", human_review_route_node))
    .addNode("feedback_record_node", withAgentNode("feedback_record_node", feedback_record_node))
    .addEdge(START, "input_node")
    .addEdge("input_node", "agent_router_node")
    .addConditionalEdges("agent_router_node", (state) => state.agent_route || "equipment_fault", {
      equipment_fault: "intent_classify_node",
      quality_issue: "route_answer_node",
      data_governance: "route_answer_node",
      knowledge_ops: "route_answer_node",
      rag_eval: "route_answer_node",
      fallback: "route_answer_node"
    })
    .addEdge("intent_classify_node", "master_data_lookup_node")
    .addEdge("master_data_lookup_node", "rag_retrieve_node")
    .addEdge("rag_retrieve_node", "graph_query_node")
    .addEdge("graph_query_node", "quality_check_node")
    .addEdge("quality_check_node", "risk_assess_node")
    .addEdge("risk_assess_node", "answer_compose_node")
    .addEdge("answer_compose_node", "human_review_route_node")
    .addEdge("route_answer_node", "feedback_record_node")
    .addConditionalEdges("human_review_route_node", (state) => state.route || "completed", {
      human_review: "feedback_record_node",
      completed: "feedback_record_node"
    })
    .addEdge("feedback_record_node", END);
}

function createEquipmentFaultResumeGraph(deps = {}) {
  return new StateGraph(AgentState)
    .addNode("human_review_apply_node", withAgentNode("human_review_apply_node", human_review_apply_node))
    .addNode("quality_check_node", withAgentNode("quality_check_node", quality_check_node))
    .addNode("rag_retrieve_node", withAgentNode("rag_retrieve_node", (state) => rag_retrieve_node(state, deps)))
    .addNode("graph_query_node", withAgentNode("graph_query_node", graph_query_node))
    .addNode("risk_assess_node", withAgentNode("risk_assess_node", risk_assess_node))
    .addNode("answer_compose_node", withAgentNode("answer_compose_node", answer_compose_node))
    .addNode("human_review_route_node", withAgentNode("human_review_route_node", human_review_route_node))
    .addNode("feedback_record_node", withAgentNode("feedback_record_node", feedback_record_node))
    .addEdge(START, "human_review_apply_node")
    .addEdge("human_review_apply_node", "rag_retrieve_node")
    .addEdge("rag_retrieve_node", "graph_query_node")
    .addEdge("graph_query_node", "quality_check_node")
    .addEdge("quality_check_node", "risk_assess_node")
    .addEdge("risk_assess_node", "answer_compose_node")
    .addEdge("answer_compose_node", "human_review_route_node")
    .addConditionalEdges("human_review_route_node", (state) => state.route || "completed", {
      human_review: "feedback_record_node",
      completed: "feedback_record_node"
    })
    .addEdge("feedback_record_node", END);
}

async function input_node(state) {
  return {
    status: "input_received",
    current_node: "input_node",
    audit_events: appendAudit(state, "input_node", "接收用户问题", { question: state.user_question })
  };
}

async function agent_router_node(state) {
  const question = state.user_question || "";
  let route = "fallback";
  let reason = "未命中明确业务意图，需要用户补充说明";
  if (/(振动|温升|故障|排查|轴承|联轴器)/.test(question)) {
    route = "equipment_fault";
    reason = "命中“振动、温升、故障、排查、轴承、联轴器”等设备故障关键词";
  } else if (/(RT|UT|焊缝|不合格|检测|质量)/i.test(question)) {
    route = "quality_issue";
    reason = "命中“RT、UT、焊缝、不合格、检测、质量”等质量异常关键词";
  } else if (/(字段|清洗|入库|主数据|标准词表)/.test(question)) {
    route = "data_governance";
    reason = "命中“字段、清洗、入库、主数据、标准词表”等数据治理关键词";
  } else if (/(SOP|知识卡片|向量库|检索不到|DashVector)/i.test(question)) {
    route = "knowledge_ops";
    reason = "命中“SOP、知识卡片、向量库、检索不到、DashVector”等知识运营关键词";
  } else if (/(命中率|召回率|Precision|Recall|评测|相似度)/i.test(question)) {
    route = "rag_eval";
    reason = "命中“命中率、召回率、Precision、Recall、评测、相似度”等RAG评测关键词";
  }
  return {
    agent_route: route,
    route_reason: reason,
    current_node: "agent_router_node",
    tool_calls: appendToolCall(state, "feedback_log", { question }, { agent_route: route, reason }, "success"),
    audit_events: appendAudit(state, "agent_router_node", "完成Agent路由", { agent_route: route, reason })
  };
}

async function route_answer_node(state) {
  const route = state.agent_route || "fallback";
  const routeAnswers = {
    quality_issue: [
      "当前问题被路由到：quality_issue（质量异常 Agent）。",
      "建议进入质量异常治理流程，检查焊缝 RT/UT 检测记录、不合格类型、返修措施、复检结果和质量标准引用。",
      "本阶段先完成轻量路由展示，后续可接入质量异常子图和质量知识库。"
    ],
    data_governance: [
      "当前问题被路由到：data_governance（数据治理/字段清洗）。",
      "建议查看该记录的字段标准、主数据匹配、质量规则命中和知识入库规则。",
      "若缺设备编码、关键字段或主数据不确定，应进入人工复核或待补充数据。"
    ],
    knowledge_ops: [
      "当前问题被路由到：knowledge_ops（知识卡片/知识库/入库）。",
      "建议检查知识卡片审核状态、vector_status、metadata、quality_status，以及是否已写入 DashVector。",
      "若SOP检索不到，可形成知识缺口并补充资料后重新入库。"
    ],
    rag_eval: [
      "当前问题被路由到：rag_eval（RAG命中率/检索效果评估）。",
      "建议运行 RAG 评测，查看 Top1、Recall@3、Recall@5、Precision@3、无命中问题和失败归因。",
      "若召回不足，优先检查 Chunk、metadata、embedding 和资料覆盖。"
    ],
    fallback: [
      "当前问题暂未识别到明确业务路由。",
      "请补充问题属于设备故障排查、数据治理、知识库入库，还是RAG评测。",
      "系统已进入待补充说明状态。"
    ]
  };
  const needsHuman = route === "fallback";
  return {
    answer: (routeAnswers[route] || routeAnswers.fallback).join("\n"),
    status: needsHuman ? "waiting_user_clarification" : "completed",
    route: needsHuman ? "human_review" : "completed",
    current_node: "route_answer_node",
    waiting_human_input: needsHuman,
    human_review_required: needsHuman,
    missing_fields: needsHuman ? ["问题业务场景说明"] : [],
    tool_calls: needsHuman
      ? appendToolCall(state, "create_review_task", { question: state.user_question }, { reason: "无法识别业务路由", next_action: "请补充业务场景" }, "success")
      : state.tool_calls,
    audit_events: appendAudit(state, "route_answer_node", "按路由生成最小回答", { agent_route: route, needs_human: needsHuman })
  };
}

async function intent_classify_node(state) {
  const question = state.user_question || "";
  const intent = {
    name: "设备故障排查",
    confidence: /(泵|电机|阀|振动|温度|发热|噪声|压力|故障|异常)/.test(question) ? 0.9 : 0.62,
    reason: "命中船舶设备、故障现象或排查动作关键词"
  };
  return {
    intent,
    scenario: "设备故障",
    current_node: "intent_classify_node",
    audit_events: appendAudit(state, "intent_classify_node", "完成意图识别", intent)
  };
}

async function master_data_lookup_node(state) {
  const question = state.user_question || "";
  const candidates = equipmentMasterData.map((item) => {
    const aliasHits = item.aliases.filter((alias) => question.includes(alias)).length;
    const partHits = item.common_parts.filter((part) => question.includes(part)).length;
    const systemHit = question.includes(item.system) ? 1 : 0;
    const score = Math.min(0.98, aliasHits * 0.52 + partHits * 0.1 + systemHit * 0.18 + (item.name.includes("压载泵") && question.includes("压载") ? 0.25 : 0.02));
    return {
      ...item,
      score: Number(score.toFixed(2)),
      basis: `别名命中${aliasHits}，部件命中${partHits}，系统命中${systemHit}`
    };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
  const selected = candidates[0]?.score >= 0.75 ? candidates[0] : null;
  return {
    equipment_candidates: candidates,
    selected_equipment: selected,
    current_node: "master_data_lookup_node",
    tool_calls: appendToolCall(state, "master_data_lookup", { question }, { selected, candidates }, "success"),
    audit_events: appendAudit(state, "master_data_lookup_node", "完成主数据查询", { selected_code: selected?.code || "待人工确认" })
  };
}

async function rag_retrieve_node(state, deps = {}) {
  const query = state.selected_equipment
    ? `${state.selected_equipment.name} ${state.user_question}`
    : state.user_question;
  let output = { results: [], provider: "unavailable" };
  let status = "success";
  const startedAt = Date.now();
  let attempts = 0;
  while (attempts < 2) {
    attempts += 1;
    try {
      if (typeof deps.queryRag === "function") {
        output = await deps.queryRag(query, 5, { quality_status: "可引用" });
      }
      break;
    } catch (error) {
      status = "failed";
      output = { results: [], error: error.message || "知识库暂不可用" };
      if (attempts >= 2) break;
    }
  }
  const chunks = (output.results || []).map((item) => ({
    id: item.id,
    score: item.score,
    similarity: item.similarity,
    chunk_text: item.chunk_text,
    document_name: item.document_name || item.metadata?.document_name || "-",
    source_type: item.metadata?.source_type || "-",
    review_status: item.metadata?.review_status || "-",
    quality_status: item.metadata?.quality_status || "-"
  }));
  const gaps = !chunks.length ? [
    ...(state.knowledge_gaps || []),
    createKnowledgeGap(state, {
      type: status === "failed" ? "知识库暂不可用" : "RAG无命中",
      comment: output.error || "RAG检索未命中可引用资料"
    })
  ] : (state.knowledge_gaps || []);
  const failureReasons = status === "failed" ? [...(state.failure_reasons || []), output.error || "知识库暂不可用"] : (state.failure_reasons || []);
  return {
    retrieved_chunks: chunks,
    citations: chunks.filter((item) => item.quality_status !== "不可引用").slice(0, 4),
    knowledge_gaps: gaps,
    failure_reasons: failureReasons,
    current_node: "rag_retrieve_node",
    tool_calls: appendToolCall(state, "rag_retrieve", { query, top_k: 5, filters: { quality_status: "可引用" }, retry: 1 }, { count: chunks.length, chunks, attempts }, status, output.error, Date.now() - startedAt),
    audit_events: appendAudit(state, "rag_retrieve_node", status === "failed" ? "RAG检索失败并降级" : "完成RAG检索", { count: chunks.length, provider: output.provider || "-", error: output.error || "" })
  };
}

async function graph_query_node(state) {
  const equipment = state.selected_equipment;
  const facts = equipment ? [
    `${equipment.name} 属于 ${equipment.system}`,
    `${equipment.name} 常见关联部件：${(equipment.common_parts || []).join("、")}`,
    "异常振动 可能关联 联轴器不对中 / 轴承磨损 / 地脚螺栓松动",
    "轴承温度升高 可能关联 润滑不足 / 轴承损伤 / 对中偏差"
  ] : ["未唯一绑定设备主数据，图谱查询只返回泵类通用关系。"];
  return {
    graph_facts: facts,
    current_node: "graph_query_node",
    audit_events: appendAudit(state, "graph_query_node", "完成图谱关系查询", { fact_count: facts.length })
  };
}

async function human_review_apply_node(state) {
  const review = state.human_review_result || {};
  const selected = review.equipment_code
    ? equipmentMasterData.find((item) => item.code === review.equipment_code) || {
      code: review.equipment_code,
      name: review.equipment_name || state.selected_equipment?.name || "人工确认设备",
      system: review.system || state.selected_equipment?.system || "-",
      common_parts: state.selected_equipment?.common_parts || [],
      aliases: []
    }
    : state.selected_equipment;
  const mergedQuestion = [
    state.user_question,
    review.vibration_value ? `振动值${review.vibration_value}` : "",
    review.temperature_value ? `温度值${review.temperature_value}` : "",
    review.acceptance_result ? `验收结果${review.acceptance_result}` : "",
    review.repair_result ? `处理结果${review.repair_result}` : ""
  ].filter(Boolean).join("；");
  return {
    selected_equipment: selected || null,
    user_question: mergedQuestion,
    status: "human_review_applied",
    human_review_required: false,
    waiting_human_input: false,
    current_node: "human_review_apply_node",
    tool_calls: appendToolCall(state, "quality_rule_check", { human_review_result: review }, { selected_equipment: selected, merged_question: mergedQuestion }, "success"),
    audit_events: appendAudit(state, "human_review_apply_node", "应用人工复核字段并恢复执行", review)
  };
}

async function quality_check_node(state) {
  const question = state.user_question || "";
  const review = state.human_review_result || {};
  const missing = [];
  const hasVibration = Boolean(review.vibration_value) || /(振动值|mm\/s|mm每秒)/.test(question);
  const hasTemperature = Boolean(review.temperature_value) || /(温度值|℃|摄氏)/.test(question);
  const hasAcceptance = Boolean(review.acceptance_result) || /(验收|试运行|复测|正常)/.test(question);
  const hasRepairResult = Boolean(review.repair_result) || /(处理结果|恢复正常|试运行正常|正常)/.test(question);
  if (!state.selected_equipment?.code) missing.push("设备编码");
  if (!hasVibration || !hasTemperature) missing.push("振动测量值/轴承温度值");
  if (!hasAcceptance) missing.push("验收结果");
  if (!hasRepairResult) missing.push("处理结果");
  const findings = [
    state.selected_equipment ? "主数据已绑定" : "主数据不确定，需要人工确认",
    state.retrieved_chunks.length ? "存在可引用RAG资料" : "RAG未命中可引用资料",
    missing.length ? `缺失字段：${missing.join("、")}` : "关键字段较完整"
  ];
  return {
    missing_fields: missing,
    quality_findings: findings,
    human_review_required: missing.length > 0 || !state.selected_equipment || !state.retrieved_chunks.length || (state.failure_reasons || []).length > 0,
    waiting_human_input: missing.length > 0 || !state.selected_equipment || !state.retrieved_chunks.length || (state.failure_reasons || []).length > 0,
    current_node: "quality_check_node",
    tool_calls: appendToolCall(state, "quality_rule_check", { question, human_review_result: review }, { findings, missing }, "success"),
    audit_events: appendAudit(state, "quality_check_node", "完成质量规则检查", { missing_count: missing.length })
  };
}

async function risk_assess_node(state) {
  const highSignals = /(温度升高|发热|异常振动|绝缘低|外漏|压力波动|温度值)/.test(state.user_question || "");
  const risk = highSignals && state.missing_fields.length ? "中高" : highSignals ? "中" : "低";
  return {
    risk_level: risk,
    current_node: "risk_assess_node",
    audit_events: appendAudit(state, "risk_assess_node", "完成风险评估", { risk_level: risk })
  };
}

async function answer_compose_node(state) {
  const equipment = state.selected_equipment;
  const similar = state.retrieved_chunks[0];
  const review = state.human_review_result || {};
  const answer = [
    `标准设备识别：${equipment ? `${equipment.name}（${equipment.code}，${equipment.system}）` : "未能唯一确认设备，需人工确认主数据"}`,
    `风险等级：${state.risk_level}`,
    `相似案例/知识：${similar ? `${similar.document_name}，相似度${similar.similarity}%` : "未命中可引用知识"}`,
    "可能原因：联轴器不对中、轴承磨损或润滑不足、地脚螺栓松动、泵轴卡滞。",
    "排查步骤：先采集振动值和轴承温度值；检查联轴器找正；检查轴承润滑和磨损；检查地脚螺栓紧固；复测并记录验收结果。",
    review.vibration_value || review.temperature_value ? `人工补充检测值：振动=${review.vibration_value || "未补充"}，温度=${review.temperature_value || "未补充"}` : "人工补充检测值：暂无",
    review.acceptance_result ? `验收结果：${review.acceptance_result}` : "验收结果：待补充",
    `需补全字段：${state.missing_fields.length ? state.missing_fields.join("、") : "暂无"}`,
    state.human_review_required ? "低置信度提示：存在缺失字段或主数据/引用不足，需要人工复核后发布。" : "低置信度提示：已完成关键字段确认，可作为待审核知识卡片。"
  ].join("\n");
  const knowledgeCard = !state.human_review_required ? createKnowledgeCard(state, answer) : null;
  return {
    answer,
    knowledge_cards: knowledgeCard ? [...(state.knowledge_cards || []), knowledgeCard] : (state.knowledge_cards || []),
    tool_calls: knowledgeCard
      ? appendToolCall(state, "knowledge_card_upsert", { agent_run_id: state.agent_run_id }, knowledgeCard, "success")
      : state.tool_calls,
    current_node: "answer_compose_node",
    audit_events: appendAudit(state, "answer_compose_node", "生成业务建议", { citation_count: state.citations.length, knowledge_card: Boolean(knowledgeCard) })
  };
}

async function human_review_route_node(state) {
  const route = state.human_review_required ? "human_review" : "completed";
  const reviewTask = route === "human_review" ? {
    review_task_id: `REVIEW-${state.agent_run_id}`,
    queue: state.selected_equipment ? "维修工程师复核" : "设备管理员复核",
    reason: state.missing_fields,
    next_action: "补充设备编码、振动值、温度值、验收结果或处理结果后恢复执行"
  } : null;
  return {
    route,
    status: route,
    waiting_human_input: route === "human_review",
    current_node: "human_review_route_node",
    tool_calls: reviewTask ? appendToolCall(state, "create_review_task", { agent_run_id: state.agent_run_id, missing_fields: state.missing_fields }, reviewTask, "success") : state.tool_calls,
    audit_events: appendAudit(state, "human_review_route_node", "完成人工复核路由", { route })
  };
}

async function feedback_record_node(state) {
  const feedback = state.feedback || {
    status: "pending",
    options: ["采纳建议", "部分采纳", "标记错误", "补充字段", "形成知识缺口"]
  };
  return {
    feedback,
    status: state.route === "human_review" ? "waiting_human_review" : "completed",
    waiting_human_input: state.route === "human_review",
    current_node: "feedback_record_node",
    tool_calls: appendToolCall(state, "feedback_log", { agent_run_id: state.agent_run_id }, feedback, "success"),
    audit_events: appendAudit(state, "feedback_record_node", "记录反馈入口", { feedback_status: feedback.status })
  };
}

function withAgentNode(nodeName, nodeFn) {
  return async (state) => {
    const startedAt = Date.now();
    try {
      const update = await nodeFn(state);
      return {
        ...update,
        state_changes: appendStateChange(state, nodeName, update),
        node_status: {
          ...(state.node_status || {}),
          [nodeName]: {
            status: "success",
            started_at: new Date(startedAt).toISOString(),
            duration_ms: Date.now() - startedAt
          }
        }
      };
    } catch (error) {
      return {
        status: "failed",
        route: "human_review",
        human_review_required: true,
        audit_events: appendAudit(state, nodeName, "节点失败", { error: error.message || "未知错误" }),
        state_changes: appendStateChange(state, nodeName, { status: "failed", route: "human_review" }),
        node_status: {
          ...(state.node_status || {}),
          [nodeName]: {
            status: "failed",
            started_at: new Date(startedAt).toISOString(),
            duration_ms: Date.now() - startedAt,
            error: error.message || "节点执行失败"
          }
        }
      };
    }
  };
}

function appendToolCall(state, toolKey, input, output, status, error = "", durationMs = 0) {
  const tool = toolRegistry.find((item) => item.key === toolKey || item.name === toolKey) || {
    key: toolKey,
    name: toolKey,
    description: "-"
  };
  return [
    ...(state.tool_calls || []),
    {
      id: `${tool.key}-${String((state.tool_calls || []).length + 1).padStart(3, "0")}`,
      key: tool.key,
      tool: tool.name,
      description: tool.description,
      input,
      output,
      status,
      error,
      duration_ms: Number(durationMs || 0),
      run_id: state.agent_run_id,
      operator_role: state.human_review_result?.reviewer || state.feedback?.actor_role || "system",
      called_at: new Date().toISOString()
    }
  ];
}

function appendAudit(state, node, action, detail) {
  return [
    ...(state.audit_events || []),
    {
      node,
      action,
      detail,
      at: new Date().toISOString()
    }
  ];
}

function appendStateChange(state, node, update) {
  const updatedKeys = Object.keys(update || {}).filter((key) => !["node_status", "audit_events", "tool_calls", "state_changes"].includes(key));
  return [
    ...(state.state_changes || []),
    {
      node,
      updated_keys: updatedKeys,
      status: update.status || state.status || "-",
      route: update.route || state.route || "-",
      at: new Date().toISOString()
    }
  ];
}

function finalizeGraphState(state, resumed) {
  return {
    ...state,
    langgraph: {
      ...(state.langgraph || {}),
      enabled: true,
      compiled: true,
      resumed,
      executed_at: new Date().toISOString()
    }
  };
}

function createKnowledgeCard(state, answer) {
  const equipment = state.selected_equipment || {};
  return {
    card_id: `KC-${state.agent_run_id}`,
    title: `${equipment.name || "设备"}异常振动与温升排查建议`,
    equipment_code: equipment.code || "",
    equipment_name: equipment.name || "",
    system: equipment.system || "",
    review_status: "待知识管理员审核",
    vector_status: "待重新入库",
    source_run_id: state.agent_run_id,
    content: answer,
    citations: (state.citations || []).map((item) => item.document_name),
    created_at: new Date().toISOString()
  };
}

function createKnowledgeGap(state, feedback) {
  return {
    gap_id: `KG-${state.agent_run_id}-${Date.now()}`,
    source_run_id: state.agent_run_id,
    type: feedback.type || "形成知识缺口",
    question: state.user_question,
    reason: feedback.type === "标记错误"
      ? "用户标记回答错误，需要复盘引用资料和生成规则。"
      : feedback.type === "补充字段"
        ? "用户补充字段，需要沉淀字段补全规则。"
        : "用户发现知识缺口，需要补充SOP、案例或规范。",
    missing_fields: state.missing_fields || [],
    status: "待知识运营处理",
    created_at: new Date().toISOString()
  };
}

function toolDef(key, name, description) {
  return { key, name, description, enabled: true };
}

module.exports = {
  AgentState,
  runEquipmentFaultAgent,
  resumeEquipmentFaultAgent,
  createEquipmentFaultAgentGraph,
  createEquipmentFaultResumeGraph,
  agentNodeNames,
  resumeNodeNames,
  toolRegistry,
  createKnowledgeGap,
  equipmentMasterData
};
