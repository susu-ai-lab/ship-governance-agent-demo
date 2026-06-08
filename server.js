const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const { runRagEvalGraph } = require("./src/graphs/ragEvalGraph");
const {
  createKnowledgeGap,
  resumeEquipmentFaultAgent,
  runEquipmentFaultAgent,
  toolRegistry
} = require("./src/graphs/equipmentFaultAgentGraph");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "ship_agent_demo.sqlite"));
let latestEvalState = null;
const agentRuns = new Map();
const agentRunOrder = [];
const knowledgeGaps = [];
const pendingKnowledgeCards = [];

initDatabase();
hydrateRuntimeFromDatabase();

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(express.static(PUBLIC_DIR));

app.get("/api/health", async (req, res) => {
  const dashVectorConfigured = Boolean(process.env.DASHVECTOR_ENDPOINT && process.env.DASHVECTOR_API_KEY);
  const embeddingConfigured = Boolean(process.env.DASHSCOPE_API_KEY);
  let dashVectorReachable = false;
  let collectionExists = false;
  let collectionDimension = null;
  let dashVectorError = "";

  if (dashVectorConfigured) {
    try {
      const collectionInfo = await dashVectorCollectionInfo();
      collectionExists = collectionInfo.exists;
      collectionDimension = collectionInfo.dimension;
      dashVectorReachable = true;
    } catch (error) {
      dashVectorError = error.message || "DashVector health check failed";
    }
  }

  res.json({
    ok: true,
    service: "ship-rag-backend",
    vectorStore: {
      provider: "aliyun_dashvector",
      configured: dashVectorConfigured,
      reachable: dashVectorReachable,
      collection: collectionName(),
      collectionExists,
      collectionDimension,
      error: dashVectorError || undefined
    },
    dashVector: {
      configured: dashVectorConfigured,
      reachable: dashVectorReachable,
      collection: collectionName(),
      collectionExists,
      collectionDimension,
      error: dashVectorError || undefined
    },
    embedding: {
      configured: embeddingConfigured,
      provider: embeddingProvider(),
      model: embeddingModel(),
      dimension: embeddingDimensionConfig(),
      baseURL: dashScopeBaseURL()
    }
  });
});

app.post("/api/rag/init", async (req, res) => {
  try {
    assertCloudConfigured();
    const vectorSize = await embeddingDimension();
    const collectionInfo = await dashVectorCollectionInfo();
    if (collectionInfo.exists && collectionInfo.dimension && collectionInfo.dimension !== vectorSize) {
      throw badRequest(`DashVector Collection 维度为 ${collectionInfo.dimension}，但百炼 Embedding 当前输出为 ${vectorSize}，请保持 EMBEDDING_DIMENSION 与 Collection 一致。`);
    }
    if (!collectionInfo.exists) {
      await createDashVectorCollection(vectorSize);
    }
    res.json({
      ok: true,
      provider: "Aliyun DashVector",
      collection: collectionName(),
      created: !collectionInfo.exists,
      vectorSize
    });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.post("/api/rag/upsert", async (req, res) => {
  try {
    assertCloudConfigured();
    const chunks = Array.isArray(req.body?.chunks) ? req.body.chunks : [];
    if (!chunks.length) throw badRequest("chunks 不能为空");

    const validChunks = chunks.filter((chunk) => normalizeChunkText(chunk));
    const failed = chunks.length - validChunks.length;
    if (!validChunks.length) throw badRequest("没有可写入的有效 chunk.text");

    await assertCollectionExists();
    const texts = validChunks.map(normalizeChunkText);
    const vectors = await embedTexts(texts);
    assertVectorDimensions(vectors);
    const docs = validChunks.map((chunk, index) => ({
      id: dashVectorDocId(chunk.id || `${chunk.metadata?.document_name || "chunk"}-${index + 1}`),
      vector: vectors[index],
      fields: {
        chunk_text: texts[index],
        ...normalizeMetadata(chunk.metadata || {}, index)
      }
    }));

    await dashVectorFetch(`/v1/collections/${encodeURIComponent(collectionName())}/docs/upsert`, {
      method: "POST",
      body: JSON.stringify({ docs })
    });

    res.json({
      ok: true,
      provider: "Aliyun DashVector",
      collection: collectionName(),
      written: docs.length,
      failed,
      count: docs.length,
      vectorSize: vectors[0]?.length || 0
    });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.post("/api/rag/query", async (req, res) => {
  try {
    const question = String(req.body?.question || req.body?.query || "").trim();
    if (!question) throw badRequest("question 不能为空");
    const topK = Math.max(1, Math.min(20, Number(req.body?.top_k || req.body?.topK || 5)));
    const filters = req.body?.filters || {};
    const result = await runDashVectorQuery(question, topK, filters);
    upsertRunAnalysis({
      run_id: `RAG-${Date.now()}`,
      run_type: "RAG 检索运行",
      user_input: question,
      route: "rag_query",
      agent_name: "RAGRetriever",
      rag_hits: result.results || result.hits || [],
      final_status: (result.results || result.hits || []).length ? "completed" : "failed",
      created_at: new Date().toISOString()
    });
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.post("/api/eval/run", async (req, res) => {
  try {
    const state = await runRagEvalGraph(req.body || {}, {
      queryRag: (question, topK, filters) => runDashVectorQuery(question, topK, filters)
    });
    latestEvalState = {
      ...state,
      completed_at: new Date().toISOString()
    };
    res.json({ ok: true, state: latestEvalState });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.get("/api/eval/latest", (req, res) => {
  res.json({
    ok: true,
    state: latestEvalState
  });
});

app.post("/api/agent/equipment-fault/run", async (req, res) => {
  try {
    const question = String(req.body?.question || req.body?.user_question || "").trim()
      || "某船压载泵启动后异常振动，并伴随轴承位置温度升高，应该怎么排查？";
    const actorRole = String(req.body?.actor_role || req.body?.operator_role || "system");
    const actor = String(req.body?.actor || req.body?.operator_name || actorRole);
    const state = await runEquipmentFaultAgent({
      user_question: question,
      feedback: req.body?.feedback || {
        status: "pending",
        options: ["采纳建议", "部分采纳", "标记错误", "补充字段", "形成知识缺口"],
        actor_role: actorRole,
        actor
      }
    }, {
      queryRag: (query, topK, filters) => runDashVectorQuery(query, topK, filters)
    });
    const completedState = {
      ...state,
      operator_context: {
        actor,
        actor_role: actorRole,
        user_id: req.body?.user_id || ""
      },
      completed_at: new Date().toISOString()
    };
    saveAgentRun(completedState);
    res.json({ ok: true, state: completedState });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.get("/api/agent/tool-registry", (req, res) => {
  res.json({
    ok: true,
    tools: toolRegistry
  });
});

app.get("/api/agent/runs", (req, res) => {
  res.json({
    ok: true,
    runs: listAgentRuns()
  });
});

app.get("/api/agent/runs/:id", (req, res) => {
  res.json({
    ok: true,
    state: getAgentRunState(req.params.id)
  });
});

app.post("/api/agent/runs/:id/resume", async (req, res) => {
  try {
    const current = getAgentRunState(req.params.id);
    if (!current) throw badRequest("Agent Run 不存在或后端已重启，请重新运行设备故障Agent。");
    const body = req.body || {};
    const submittedFields = body.fields && typeof body.fields === "object" ? body.fields : body;
    const reviewerRole = String(body.operator_role || body.operatorRole || submittedFields.operator_role || "人工复核员").trim();
    const reviewFields = {
      equipment_code: String(submittedFields.equipment_code || "").trim(),
      vibration_value: String(submittedFields.vibration_value || "").trim(),
      temperature_value: String(submittedFields.temperature_value || "").trim(),
      acceptance_result: String(submittedFields.acceptance_result || "").trim(),
      repair_result: String(submittedFields.repair_result || "").trim(),
      reviewer: String(submittedFields.reviewer || reviewerRole).trim()
    };
    const resumedState = await resumeEquipmentFaultAgent(current, reviewFields, {
      queryRag: (query, topK, filters) => runDashVectorQuery(query, topK, filters)
    });
    const completedState = {
      ...resumedState,
      resumed_from_run_id: current.agent_run_id,
      completed_at: new Date().toISOString()
    };
    if (Array.isArray(completedState.knowledge_cards)) {
      completedState.knowledge_cards.forEach((card) => upsertPendingKnowledgeCard(card));
    }
    saveAgentRun(completedState);
    upsertRunAnalysis({
      run_id: `HUMAN-${completedState.agent_run_id}-${Date.now()}`,
      run_type: "人工复核",
      user_input: completedState.user_question || "",
      route: completedState.agent_route || "equipment_fault",
      agent_name: routeToAgentName(completedState.agent_route),
      node_trace: completedState.state_changes || [],
      tool_calls: completedState.tool_calls || [],
      rag_hits: completedState.citations || [],
      human_review: completedState.human_review_result || reviewFields,
      final_status: completedState.status || "",
      created_at: new Date().toISOString()
    });
    res.json({ ok: true, state: completedState });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.post("/api/agent/runs/:id/feedback", (req, res) => {
  try {
    const current = getAgentRunState(req.params.id);
    if (!current) throw badRequest("Agent Run 不存在或后端已重启，请重新运行设备故障Agent。");
    const feedback = {
      type: String(req.body?.type || req.body?.feedback_type || "采纳建议"),
      comment: String(req.body?.comment || ""),
      fields: req.body?.fields || {},
      actor: String(req.body?.actor || req.body?.operator_name || "user"),
      actor_role: String(req.body?.actor_role || req.body?.operator_role || "一线员工"),
      recorded_at: new Date().toISOString()
    };
    const shouldCreateGap = ["标记错误", "形成知识缺口"].includes(feedback.type);
    const shouldCreateCard = feedback.type === "补充字段";
    const gap = shouldCreateGap ? createKnowledgeGap(current, feedback) : null;
    const card = shouldCreateCard ? createFeedbackKnowledgeCard(current, feedback) : null;
    if (gap) knowledgeGaps.push(gap);
    if (card) upsertPendingKnowledgeCard(card);
    if (gap) {
      writeAuditLog({
        actor: feedback.actor,
        action: "知识缺口生成",
        object_type: "knowledge_gap",
        object_id: gap.gap_id,
        before_status: "",
        after_status: gap.status,
        result: "success",
        detail: gap
      });
    }
    const toolCall = gap
      ? serverToolCall(current, "knowledge_gap_create", { feedback }, gap, "success")
      : card
        ? serverToolCall(current, "knowledge_card_upsert", { feedback }, card, "success")
        : serverToolCall(current, "feedback_log", { feedback }, { status: "recorded" }, "success");
    const updated = {
      ...current,
      feedback,
      knowledge_gaps: gap ? [...(current.knowledge_gaps || []), gap] : (current.knowledge_gaps || []),
      knowledge_cards: card ? [...(current.knowledge_cards || []), card] : (current.knowledge_cards || []),
      status: feedback.type === "标记错误"
        ? "needs_correction"
        : feedback.type === "补充字段"
          ? "field_supplemented"
          : "feedback_recorded",
      tool_calls: [...(current.tool_calls || []), toolCall],
      audit_events: [
        ...(current.audit_events || []),
        {
          node: "feedback_api",
          action: "记录用户反馈",
          detail: feedback,
          at: new Date().toISOString()
        }
      ]
    };
    saveAgentRun(updated);
    res.json({ ok: true, state: updated });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.get("/api/agent/knowledge-operations", (req, res) => {
  res.json({
    ok: true,
    knowledge_gaps: listKnowledgeGaps(),
    pending_knowledge_cards: listKnowledgeCards()
  });
});

app.get("/api/approvals", (req, res) => {
  res.json({
    ok: true,
    approvals: listApprovalTasks()
  });
});

app.post("/api/approvals/:task_id/approve", async (req, res) => {
  try {
    const actorRole = String(req.body?.actor_role || req.body?.role || "管理员");
    const actor = String(req.body?.actor || actorRole);
    const task = getApprovalTask(req.params.task_id);
    if (!task) throw badRequest("审批任务不存在");
    if (!canApproveTask(actorRole, task)) throw forbidden("当前角色无权限执行该操作");
    const before = task.status;
    const after = task.object_type === "knowledge_card" ? "已发布" : "已通过";
    updateApprovalTask(task.task_id, after);
    let vectorResult = null;
    if (task.object_type === "knowledge_card") {
      updateKnowledgeCardStatus(task.object_id, "已审核", "待重新入库", "");
      vectorResult = await upsertKnowledgeCardVector(task.object_id, actor);
    }
    writeAuditLog({
      actor,
      action: "审批通过",
      object_type: "approval_task",
      object_id: task.task_id,
      before_status: before,
      after_status: after,
      result: "success",
      detail: { task, vector_result: vectorResult }
    });
    upsertRunAnalysis({
      run_id: `APPROVAL-${task.task_id}`,
      run_type: "知识卡片审核入库",
      user_input: task.title || task.object_id,
      route: "knowledge_ops",
      agent_name: "知识运营 Agent",
      approval_result: { task_id: task.task_id, before, after, vector_result: vectorResult },
      final_status: vectorResult?.error ? "vector_failed" : after,
      created_at: new Date().toISOString()
    });
    res.json({ ok: true, task: getApprovalTask(task.task_id), vector_result: vectorResult });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.post("/api/approvals/:task_id/reject", (req, res) => {
  try {
    const actorRole = String(req.body?.actor_role || req.body?.role || "管理员");
    const actor = String(req.body?.actor || actorRole);
    const task = getApprovalTask(req.params.task_id);
    if (!task) throw badRequest("审批任务不存在");
    if (!canApproveTask(actorRole, task)) throw forbidden("当前角色无权限执行该操作");
    const before = task.status;
    updateApprovalTask(task.task_id, "已驳回");
    if (task.object_type === "knowledge_card") {
      updateKnowledgeCardStatus(task.object_id, "已驳回", "不入库", req.body?.reason || "审批驳回");
    }
    writeAuditLog({
      actor,
      action: "审批驳回",
      object_type: "approval_task",
      object_id: task.task_id,
      before_status: before,
      after_status: "已驳回",
      result: "success",
      detail: { reason: req.body?.reason || "", task }
    });
    upsertRunAnalysis({
      run_id: `APPROVAL-${task.task_id}`,
      run_type: "知识卡片审核入库",
      user_input: task.title || task.object_id,
      route: "knowledge_ops",
      agent_name: "知识运营 Agent",
      approval_result: { task_id: task.task_id, before, after: "已驳回", reason: req.body?.reason || "" },
      final_status: "已驳回",
      created_at: new Date().toISOString()
    });
    res.json({ ok: true, task: getApprovalTask(task.task_id) });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.post("/api/knowledge-cards/:card_id/approve", async (req, res) => {
  try {
    const actorRole = String(req.body?.actor_role || req.body?.role || "知识管理员");
    const actor = String(req.body?.actor || actorRole);
    if (!canManageKnowledge(actorRole)) throw forbidden("当前角色无权限执行该操作");
    const card = getKnowledgeCard(req.params.card_id);
    if (!card) throw badRequest("知识卡片不存在");
    updateKnowledgeCardStatus(card.card_id, "已审核", card.vector_status, "");
    const vectorResult = await upsertKnowledgeCardVector(card.card_id, actor);
    writeAuditLog({
      actor,
      action: "知识卡片审核通过",
      object_type: "knowledge_card",
      object_id: card.card_id,
      before_status: card.review_status,
      after_status: "已审核",
      result: "success",
      detail: { card_id: card.card_id, vector_result: vectorResult }
    });
    upsertRunAnalysis({
      run_id: `KNOWLEDGE-${card.card_id}`,
      run_type: "知识卡片审核入库",
      user_input: card.title || card.card_id,
      route: "knowledge_ops",
      agent_name: "知识运营 Agent",
      approval_result: { card_id: card.card_id, review_status: "已审核", vector_result: vectorResult },
      final_status: vectorResult?.error ? "vector_failed" : "已入库",
      created_at: new Date().toISOString()
    });
    res.json({ ok: true, card: getKnowledgeCard(card.card_id), vector_result: vectorResult });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.post("/api/knowledge-cards/:card_id/upsert-vector", async (req, res) => {
  try {
    const actorRole = String(req.body?.actor_role || req.body?.role || "知识管理员");
    const actor = String(req.body?.actor || actorRole);
    if (!canManageKnowledge(actorRole)) throw forbidden("当前角色无权限执行该操作");
    const result = await upsertKnowledgeCardVector(req.params.card_id, actor);
    upsertRunAnalysis({
      run_id: `VECTOR-${req.params.card_id}`,
      run_type: "知识卡片审核入库",
      user_input: req.params.card_id,
      route: "knowledge_ops",
      agent_name: "知识运营 Agent",
      approval_result: result,
      final_status: result?.error ? "vector_failed" : "已入库",
      created_at: new Date().toISOString()
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.get("/api/audit-logs", (req, res) => {
  res.json({
    ok: true,
    logs: listAuditLogs()
  });
});

app.get("/api/run-analysis", (req, res) => {
  res.json({
    ok: true,
    records: listRunAnalysis(req.query || {})
  });
});

app.get("/api/run-analysis/:id", (req, res) => {
  const record = getRunAnalysis(req.params.id);
  if (!record) return res.status(404).json({ error: "运行分析记录不存在" });
  res.json({ ok: true, record });
});

app.post("/api/run-analysis/record", (req, res) => {
  try {
    const body = req.body || {};
    const record = upsertRunAnalysis({
      run_id: body.run_id || `RUN-${Date.now()}`,
      run_type: body.run_type || "数据治理运行",
      user_input: body.user_input || body.input || "",
      route: body.route || "",
      agent_name: body.agent_name || "",
      node_trace: body.node_trace || [],
      tool_calls: body.tool_calls || [],
      rag_hits: body.rag_hits || [],
      human_review: body.human_review || null,
      approval_result: body.approval_result || null,
      feedback: body.feedback || null,
      final_status: body.final_status || "completed",
      created_at: body.created_at || new Date().toISOString()
    });
    res.json({ ok: true, record });
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Ship RAG backend running at http://localhost:${PORT}/`);
});

function saveAgentRun(state) {
  if (!state?.agent_run_id) return;
  if (!agentRuns.has(state.agent_run_id)) {
    agentRunOrder.unshift(state.agent_run_id);
  }
  agentRuns.set(state.agent_run_id, state);
  persistAgentRun(state);
}

function summarizeAgentRun(state) {
  if (!state) return null;
  return {
    agent_run_id: state.agent_run_id,
    user_question: state.user_question,
    status: state.status,
    route: state.route,
    risk_level: state.risk_level,
    human_review_required: Boolean(state.human_review_required),
    tool_call_count: (state.tool_calls || []).length,
    citation_count: (state.citations || []).length,
    feedback_type: state.feedback?.type || state.feedback?.status || "",
    completed_at: state.completed_at || ""
  };
}

function serverToolCall(state, toolKey, input, output, status, error = "") {
  const tool = toolRegistry.find((item) => item.key === toolKey || item.name === toolKey) || {
    key: toolKey,
    name: toolKey,
    description: "-"
  };
  return {
    id: `${tool.key}-${String((state.tool_calls || []).length + 1).padStart(3, "0")}`,
    key: tool.key,
    tool: tool.name,
    description: tool.description,
    input,
    output,
    status,
    error,
    duration_ms: 0,
    run_id: state.agent_run_id,
    operator_role: input?.actor_role || state.feedback?.actor_role || "system",
    called_at: new Date().toISOString()
  };
}

function upsertPendingKnowledgeCard(card) {
  if (!card?.card_id) return;
  const index = pendingKnowledgeCards.findIndex((item) => item.card_id === card.card_id);
  if (index >= 0) {
    pendingKnowledgeCards[index] = card;
  } else {
    pendingKnowledgeCards.unshift(card);
  }
  persistKnowledgeCard(card);
  ensureApprovalTaskForKnowledgeCard(card);
}

function createFeedbackKnowledgeCard(state, feedback) {
  return {
    card_id: `KC-FEEDBACK-${state.agent_run_id}-${Date.now()}`,
    title: `用户补充字段后的待审核知识：${state.selected_equipment?.name || "设备故障"}`,
    equipment_code: state.selected_equipment?.code || "",
    equipment_name: state.selected_equipment?.name || "",
    system: state.selected_equipment?.system || "",
    review_status: "待知识管理员审核",
    vector_status: "待重新入库",
    source_run_id: state.agent_run_id,
    content: state.answer || "",
    feedback,
    citations: (state.citations || []).map((item) => item.document_name),
    created_at: new Date().toISOString()
  };
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      run_id TEXT PRIMARY KEY,
      user_question TEXT,
      final_status TEXT,
      final_answer TEXT,
      state_snapshot TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT,
      tool_name TEXT,
      input_json TEXT,
      output_json TEXT,
      status TEXT,
      duration_ms INTEGER,
      operator_role TEXT,
      error TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT,
      action TEXT,
      object_type TEXT,
      object_id TEXT,
      before_status TEXT,
      after_status TEXT,
      result TEXT,
      detail_json TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT,
      feedback_type TEXT,
      comment TEXT,
      fields_json TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS knowledge_cards (
      card_id TEXT PRIMARY KEY,
      run_id TEXT,
      title TEXT,
      content TEXT,
      review_status TEXT,
      vector_status TEXT,
      vector_error TEXT,
      payload_json TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS approval_tasks (
      task_id TEXT PRIMARY KEY,
      object_type TEXT,
      object_id TEXT,
      title TEXT,
      status TEXT,
      assignee_role TEXT,
      created_by TEXT,
      payload_json TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS run_analysis (
      run_id TEXT PRIMARY KEY,
      run_type TEXT,
      user_input TEXT,
      route TEXT,
      agent_name TEXT,
      node_trace_json TEXT,
      tool_calls_json TEXT,
      rag_hits_json TEXT,
      human_review_json TEXT,
      approval_result_json TEXT,
      feedback_json TEXT,
      final_status TEXT,
      analysis_json TEXT,
      root_causes_json TEXT,
      suggestions_json TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);
  try {
    db.exec("ALTER TABLE tool_calls ADD COLUMN operator_role TEXT;");
  } catch {
    // Existing database already has this column.
  }
}

function hydrateRuntimeFromDatabase() {
  listAgentRuns().forEach((run) => {
    const state = getAgentRunState(run.agent_run_id);
    if (state) {
      agentRuns.set(run.agent_run_id, state);
      if (!agentRunOrder.includes(run.agent_run_id)) agentRunOrder.push(run.agent_run_id);
    }
  });
  listKnowledgeCards().forEach((card) => {
    if (!pendingKnowledgeCards.some((item) => item.card_id === card.card_id)) {
      pendingKnowledgeCards.push(card);
    }
  });
}

function persistAgentRun(state) {
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT created_at FROM agent_runs WHERE run_id = ?").get(state.agent_run_id);
  db.prepare(`
    INSERT OR REPLACE INTO agent_runs
      (run_id, user_question, final_status, final_answer, state_snapshot, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    state.agent_run_id,
    state.user_question || "",
    state.status || "",
    state.answer || "",
    JSON.stringify(state),
    existing?.created_at || state.completed_at || now,
    now
  );

  db.prepare("DELETE FROM tool_calls WHERE run_id = ?").run(state.agent_run_id);
  (state.tool_calls || []).forEach((call) => {
    db.prepare(`
      INSERT INTO tool_calls
        (run_id, tool_name, input_json, output_json, status, duration_ms, operator_role, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      state.agent_run_id,
      call.key || call.tool || "",
      JSON.stringify(call.input || {}),
      JSON.stringify(call.output || {}),
      call.status || "",
      Number(call.duration_ms || 0),
      call.operator_role || "system",
      call.error || "",
      call.called_at || now
    );
  });

  db.prepare("DELETE FROM audit_logs WHERE object_type = 'agent_run' AND object_id = ?").run(state.agent_run_id);
  (state.audit_events || []).forEach((event) => writeAuditLog({
    actor: event.detail?.reviewer || "system",
    action: event.action || event.node || "",
    object_type: "agent_run",
    object_id: state.agent_run_id,
    before_status: "",
    after_status: state.status || "",
    result: "success",
    detail: event,
    created_at: event.at || now
  }));

  if (state.feedback?.type) persistFeedback(state.agent_run_id, state.feedback);
  (state.knowledge_cards || []).forEach((card) => upsertPendingKnowledgeCard(card));
  upsertRunAnalysis(analysisRecordFromAgentState(state));
}

function analysisRecordFromAgentState(state) {
  return {
    run_id: state.agent_run_id,
    run_type: "LangGraph Agent 运行",
    user_input: state.user_question || "",
    route: state.agent_route || state.route || "",
    agent_name: routeToAgentName(state.agent_route),
    node_trace: state.state_changes || [],
    tool_calls: state.tool_calls || [],
    rag_hits: state.citations || state.retrieved_chunks || [],
    human_review: state.human_review_result || (state.human_review_required ? { status: "waiting" } : null),
    approval_result: null,
    feedback: state.feedback || null,
    final_status: state.status || "",
    created_at: state.completed_at || new Date().toISOString()
  };
}

function routeToAgentName(route) {
  return {
    equipment_fault: "设备故障 Agent",
    quality_issue: "质量异常 Agent",
    data_governance: "数据治理 Agent",
    knowledge_ops: "知识运营 Agent",
    rag_eval: "RAG评测 Agent",
    rag_query: "RAGRetriever",
    fallback: "Fallback Router"
  }[route] || route || "-";
}

function upsertRunAnalysis(record) {
  if (!record?.run_id) return null;
  const now = new Date().toISOString();
  const normalized = {
    run_id: record.run_id,
    run_type: record.run_type || "未知运行",
    user_input: record.user_input || "",
    route: record.route || "",
    agent_name: record.agent_name || routeToAgentName(record.route),
    node_trace: Array.isArray(record.node_trace) ? record.node_trace : [],
    tool_calls: Array.isArray(record.tool_calls) ? record.tool_calls : [],
    rag_hits: Array.isArray(record.rag_hits) ? record.rag_hits : [],
    human_review: record.human_review || null,
    approval_result: record.approval_result || null,
    feedback: record.feedback || null,
    final_status: record.final_status || "unknown",
    created_at: record.created_at || now
  };
  const analysis = analyzeRunRecord(normalized);
  const existing = db.prepare("SELECT created_at FROM run_analysis WHERE run_id = ?").get(normalized.run_id);
  db.prepare(`
    INSERT OR REPLACE INTO run_analysis
      (run_id, run_type, user_input, route, agent_name, node_trace_json, tool_calls_json, rag_hits_json, human_review_json,
       approval_result_json, feedback_json, final_status, analysis_json, root_causes_json, suggestions_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    normalized.run_id,
    normalized.run_type,
    normalized.user_input,
    normalized.route,
    normalized.agent_name,
    JSON.stringify(normalized.node_trace),
    JSON.stringify(normalized.tool_calls),
    JSON.stringify(normalized.rag_hits),
    JSON.stringify(normalized.human_review),
    JSON.stringify(normalized.approval_result),
    JSON.stringify(normalized.feedback),
    normalized.final_status,
    JSON.stringify(analysis.checks),
    JSON.stringify(analysis.root_causes),
    JSON.stringify(analysis.suggestions),
    existing?.created_at || normalized.created_at,
    now
  );
  return getRunAnalysis(normalized.run_id);
}

function analyzeRunRecord(record) {
  const toolCalls = record.tool_calls || [];
  const ragHits = record.rag_hits || [];
  const nodeTrace = record.node_trace || [];
  const knowledgeCards = toolCalls.filter((call) => call.key === "knowledge_card_upsert" || call.tool === "KnowledgeCardTool");
  const dashVectorCalls = toolCalls.filter((call) => call.key === "dashvector_upsert" || call.tool === "DashVectorTool");
  const failedTools = toolCalls.filter((call) => call.status === "failed" || call.error);
  const checks = {
    router_ok: Boolean(record.route && record.route !== "fallback"),
    tool_success: toolCalls.length ? failedTools.length === 0 : record.run_type !== "LangGraph Agent 运行",
    rag_hit_valid: ragHits.length > 0,
    chunk_metadata_usable: ragHits.length ? ragHits.some((hit) => hit.document_name || hit.metadata?.document_name || hit.source_type || hit.metadata?.source_type) : false,
    human_review_reasonable: ["waiting_human_review", "待人工复核"].includes(record.final_status) || record.human_review ? Boolean(record.human_review) : true,
    resume_success: record.human_review ? record.final_status === "completed" || record.final_status === "feedback_recorded" : null,
    answer_has_citation: record.run_type === "LangGraph Agent 运行" ? ragHits.length > 0 : null,
    knowledge_gap_or_card: Boolean(record.feedback?.type === "形成知识缺口" || record.feedback?.type === "标记错误" || knowledgeCards.length),
    dashvector_upsert_success: dashVectorCalls.length ? dashVectorCalls.every((call) => call.status === "success" && !call.error) : null
  };
  const rootCauses = [];
  if (/解析失败|未解析|PDF解析库/.test(record.user_input)) rootCauses.push("文档解析失败");
  if (record.user_input.includes("chunk_error")) rootCauses.push("Chunk 切分不合理");
  if (ragHits.length && !checks.chunk_metadata_usable) rootCauses.push("metadata 缺失");
  if (["RAG 检索运行", "LangGraph Agent 运行"].includes(record.run_type) && !ragHits.length) rootCauses.push("RAG 未命中");
  if (!checks.router_ok && record.run_type === "LangGraph Agent 运行") rootCauses.push("Router 分流错误");
  if (failedTools.length) rootCauses.push("Tool 调用失败");
  if (record.final_status === "forbidden" || record.approval_result?.error?.includes("权限")) rootCauses.push("权限不足");
  if (["waiting_human_review", "待人工复核"].includes(record.final_status) || record.human_review?.status === "waiting") rootCauses.push("人工复核未完成");
  if (knowledgeCards.length && !dashVectorCalls.length) rootCauses.push("知识卡片未入库");
  if (dashVectorCalls.some((call) => call.status === "failed" || call.error)) rootCauses.push("DashVector 写入失败");
  if (record.run_type === "LangGraph Agent 运行" && !ragHits.length) rootCauses.push("回答缺少引用依据");
  const suggestions = suggestionsForRootCauses(rootCauses);
  if (!suggestions.length) suggestions.push("本次运行未发现明显阻断问题，可继续观察后续反馈和审批结果。");
  return {
    checks,
    root_causes: [...new Set(rootCauses)],
    suggestions: [...new Set(suggestions)]
  };
}

function suggestionsForRootCauses(rootCauses) {
  const map = {
    "文档解析失败": "优先改传 docx/txt/md，扫描 PDF 后续接 OCR。",
    "Chunk 切分不合理": "调整 Chunk Size / Overlap，避免切断排查步骤和表格语义。",
    "metadata 缺失": "补充 document_name、source_type、equipment_name、system、review_status、quality_status。",
    "RAG 未命中": "补充 SOP 或历史案例，并检查 DashVector / 百炼配置。",
    "Router 分流错误": "优化 Router 规则，后续接入 LLM Router 做语义兜底。",
    "Tool 调用失败": "检查工具输入、DashVector 服务、Embedding Key 和后端日志。",
    "权限不足": "切换到具备审批权限的登录账号，或调整审批任务 assignee_role。",
    "人工复核未完成": "补充设备编码、振动值、温度值、处理结果和验收结果。",
    "知识卡片未入库": "由知识管理员审核知识卡片，并触发向量入库。",
    "DashVector 写入失败": "检查 DashVector Endpoint/API Key/Collection 和 1024 维向量配置。",
    "回答缺少引用依据": "补充可引用知识、提高 Chunk 质量，避免无依据回答。"
  };
  return rootCauses.map((item) => map[item]).filter(Boolean);
}

function listRunAnalysis(filters = {}) {
  const rows = db.prepare("SELECT * FROM run_analysis ORDER BY updated_at DESC LIMIT 200").all().map(parseRunAnalysisRow);
  return rows.filter((row) => {
    if (filters.run_type && filters.run_type !== "全部" && row.run_type !== filters.run_type) return false;
    if (filters.status && filters.status !== "全部" && row.final_status !== filters.status) return false;
    if (filters.route && filters.route !== "全部" && row.route !== filters.route) return false;
    if (filters.agent_name && filters.agent_name !== "全部" && row.agent_name !== filters.agent_name) return false;
    return true;
  });
}

function getRunAnalysis(runId) {
  const row = db.prepare("SELECT * FROM run_analysis WHERE run_id = ?").get(runId);
  return row ? parseRunAnalysisRow(row) : null;
}

function parseRunAnalysisRow(row) {
  return {
    run_id: row.run_id,
    run_type: row.run_type,
    user_input: row.user_input,
    route: row.route,
    agent_name: row.agent_name,
    node_trace: parseJson(row.node_trace_json, []),
    tool_calls: parseJson(row.tool_calls_json, []),
    rag_hits: parseJson(row.rag_hits_json, []),
    human_review: parseJson(row.human_review_json, null),
    approval_result: parseJson(row.approval_result_json, null),
    feedback: parseJson(row.feedback_json, null),
    final_status: row.final_status,
    analysis: parseJson(row.analysis_json, {}),
    root_causes: parseJson(row.root_causes_json, []),
    suggestions: parseJson(row.suggestions_json, []),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function listAgentRuns() {
  return db.prepare(`
    SELECT run_id AS agent_run_id, user_question, final_status AS status, final_answer, state_snapshot, created_at, updated_at
    FROM agent_runs
    ORDER BY updated_at DESC
  `).all().map((row) => {
    const state = parseJson(row.state_snapshot, {});
    return summarizeAgentRun({
      ...state,
      agent_run_id: row.agent_run_id,
      user_question: row.user_question,
      status: row.status,
      answer: row.final_answer,
      completed_at: state.completed_at || row.updated_at
    });
  });
}

function getAgentRunState(runId) {
  if (agentRuns.has(runId)) return agentRuns.get(runId);
  const row = db.prepare("SELECT state_snapshot FROM agent_runs WHERE run_id = ?").get(runId);
  if (!row) return null;
  const state = parseJson(row.state_snapshot, null);
  if (state?.agent_run_id) agentRuns.set(state.agent_run_id, state);
  return state;
}

function persistFeedback(runId, value) {
  db.prepare("DELETE FROM feedback WHERE run_id = ?").run(runId);
  db.prepare(`
    INSERT INTO feedback (run_id, feedback_type, comment, fields_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(runId, value.type || value.status || "", value.comment || "", JSON.stringify(value.fields || {}), value.recorded_at || new Date().toISOString());
}

function persistKnowledgeCard(card) {
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT created_at FROM knowledge_cards WHERE card_id = ?").get(card.card_id);
  db.prepare(`
    INSERT OR REPLACE INTO knowledge_cards
      (card_id, run_id, title, content, review_status, vector_status, vector_error, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    card.card_id,
    card.source_run_id || card.run_id || "",
    card.title || "",
    card.content || "",
    card.review_status || "待知识管理员审核",
    card.vector_status || "待重新入库",
    card.vector_error || "",
    JSON.stringify(card),
    existing?.created_at || card.created_at || now,
    now
  );
}

function listKnowledgeCards() {
  return db.prepare("SELECT * FROM knowledge_cards ORDER BY updated_at DESC").all().map((row) => ({
    ...parseJson(row.payload_json, {}),
    card_id: row.card_id,
    source_run_id: row.run_id,
    title: row.title,
    content: row.content,
    review_status: row.review_status,
    vector_status: row.vector_status,
    vector_error: row.vector_error,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

function getKnowledgeCard(cardId) {
  const row = db.prepare("SELECT * FROM knowledge_cards WHERE card_id = ?").get(cardId);
  if (!row) return null;
  return {
    ...parseJson(row.payload_json, {}),
    card_id: row.card_id,
    source_run_id: row.run_id,
    title: row.title,
    content: row.content,
    review_status: row.review_status,
    vector_status: row.vector_status,
    vector_error: row.vector_error,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function updateKnowledgeCardStatus(cardId, reviewStatus, vectorStatus, vectorError) {
  const current = getKnowledgeCard(cardId);
  if (!current) return null;
  const payload = {
    ...current,
    review_status: reviewStatus || current.review_status,
    vector_status: vectorStatus || current.vector_status,
    vector_error: vectorError || "",
    updated_at: new Date().toISOString()
  };
  db.prepare(`
    UPDATE knowledge_cards
    SET review_status = ?, vector_status = ?, vector_error = ?, payload_json = ?, updated_at = ?
    WHERE card_id = ?
  `).run(payload.review_status, payload.vector_status, payload.vector_error, JSON.stringify(payload), payload.updated_at, cardId);
  const index = pendingKnowledgeCards.findIndex((item) => item.card_id === cardId);
  if (index >= 0) pendingKnowledgeCards[index] = payload;
  return payload;
}

function ensureApprovalTaskForKnowledgeCard(card) {
  const taskId = `APPROVAL-${card.card_id}`;
  const exists = db.prepare("SELECT task_id FROM approval_tasks WHERE task_id = ?").get(taskId);
  if (exists) return;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO approval_tasks
      (task_id, object_type, object_id, title, status, assignee_role, created_by, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taskId,
    "knowledge_card",
    card.card_id,
    `审核知识卡片：${card.title || card.card_id}`,
    "待复核",
    "知识管理员",
    "system",
    JSON.stringify(card),
    now,
    now
  );
}

function listApprovalTasks() {
  return db.prepare("SELECT * FROM approval_tasks ORDER BY updated_at DESC").all().map((row) => ({
    task_id: row.task_id,
    object_type: row.object_type,
    object_id: row.object_id,
    title: row.title,
    status: row.status,
    assignee_role: row.assignee_role,
    created_by: row.created_by,
    payload: parseJson(row.payload_json, {}),
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

function getApprovalTask(taskId) {
  return listApprovalTasks().find((item) => item.task_id === taskId) || null;
}

function updateApprovalTask(taskId, status) {
  db.prepare("UPDATE approval_tasks SET status = ?, updated_at = ? WHERE task_id = ?").run(status, new Date().toISOString(), taskId);
}

function listKnowledgeGaps() {
  return db.prepare(`
    SELECT detail_json, created_at
    FROM audit_logs
    WHERE action = '知识缺口生成' OR detail_json LIKE '%knowledge_gap_create%'
    ORDER BY created_at DESC
  `).all().map((row) => parseJson(row.detail_json, {})).filter((item) => item.gap_id || item.output?.gap_id);
}

function writeAuditLog({ actor = "system", action, object_type, object_id, before_status = "", after_status = "", result = "success", detail = {}, created_at = "" }) {
  db.prepare(`
    INSERT INTO audit_logs
      (actor, action, object_type, object_id, before_status, after_status, result, detail_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(actor, action || "", object_type || "", object_id || "", before_status || "", after_status || "", result || "", JSON.stringify(detail || {}), created_at || new Date().toISOString());
}

function listAuditLogs() {
  return db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300").all().map((row) => ({
    id: row.id,
    actor: row.actor,
    action: row.action,
    object_type: row.object_type,
    object_id: row.object_id,
    before_status: row.before_status,
    after_status: row.after_status,
    result: row.result,
    detail: parseJson(row.detail_json, {}),
    created_at: row.created_at
  }));
}

async function upsertKnowledgeCardVector(cardId, actor) {
  const card = getKnowledgeCard(cardId);
  if (!card) throw badRequest("知识卡片不存在");
  const beforeStatus = card.vector_status;
  try {
    assertCloudConfigured();
    await assertCollectionExists();
    const chunk = knowledgeCardToChunk(card);
    const [vector] = await embedTexts([chunk.text]);
    assertVectorDimensions([vector]);
    await dashVectorFetch(`/v1/collections/${encodeURIComponent(collectionName())}/docs/upsert`, {
      method: "POST",
      body: JSON.stringify({
        docs: [{
          id: dashVectorDocId(chunk.id),
          vector,
          fields: {
            chunk_text: chunk.text,
            ...normalizeMetadata(chunk.metadata, 0)
          }
        }]
      })
    });
    const updated = updateKnowledgeCardStatus(cardId, "已审核", "已入库", "");
    const runState = card.source_run_id ? getAgentRunState(card.source_run_id) : null;
    if (runState) {
      const toolCall = serverToolCall(runState, "dashvector_upsert", { card_id: cardId, actor_role: actor }, { collection: collectionName(), vector_status: "已入库" }, "success");
      saveAgentRun({ ...runState, tool_calls: [...(runState.tool_calls || []), toolCall] });
    }
    writeAuditLog({
      actor,
      action: "知识卡片写入DashVector",
      object_type: "knowledge_card",
      object_id: cardId,
      before_status: beforeStatus,
      after_status: "已入库",
      result: "success",
      detail: { collection: collectionName(), embedding_model: embeddingModel(), dimension: embeddingDimensionConfig(), chunk }
    });
    return { card: updated, vector_status: "已入库" };
  } catch (error) {
    const updated = updateKnowledgeCardStatus(cardId, card.review_status || "已审核", "入库失败", error.message);
    const runState = card.source_run_id ? getAgentRunState(card.source_run_id) : null;
    if (runState) {
      const toolCall = serverToolCall(runState, "dashvector_upsert", { card_id: cardId, actor_role: actor }, { vector_status: "入库失败" }, "failed", error.message);
      saveAgentRun({ ...runState, tool_calls: [...(runState.tool_calls || []), toolCall] });
    }
    writeAuditLog({
      actor,
      action: "知识卡片写入DashVector",
      object_type: "knowledge_card",
      object_id: cardId,
      before_status: beforeStatus,
      after_status: "入库失败",
      result: "failed",
      detail: { error: error.message }
    });
    return { card: updated, vector_status: "入库失败", error: error.message };
  }
}

function knowledgeCardToChunk(card) {
  return {
    id: `${card.card_id}-chunk-001`,
    text: `${card.title}\n${card.content || ""}`.trim(),
    metadata: {
      document_name: card.title || card.card_id,
      source_type: "知识卡片",
      file_type: "knowledge_card",
      chunk_index: 1,
      equipment_name: card.equipment_name || "-",
      system: card.system || "-",
      review_status: card.review_status || "已审核",
      quality_status: "可引用",
      fault_symptom: "异常振动/温度异常升高",
      upload_time: new Date().toISOString()
    }
  };
}

function canManageKnowledge(role) {
  return ["知识管理员", "管理员"].includes(role);
}

function canApproveTask(role, task) {
  return role === "管理员" || role === task.assignee_role || (task.object_type === "knowledge_card" && canManageKnowledge(role));
}

function parseJson(text, fallback) {
  try {
    return JSON.parse(text || "");
  } catch {
    return fallback;
  }
}

async function runDashVectorQuery(question, topK = 5, filters = {}) {
  assertCloudConfigured();
  await assertCollectionExists();
  const [vector] = await embedTexts([question]);
  assertVectorDimensions([vector]);
  const queryBody = {
    vector,
    topk: Math.max(1, Math.min(20, Number(topK || 5))),
    include_vector: false,
    output_fields: [
      "chunk_text",
      "document_name",
      "source_type",
      "file_type",
      "chunk_index",
      "equipment_name",
      "system",
      "review_status",
      "quality_status",
      "fault_symptom",
      "upload_time"
    ]
  };
  const filter = dashVectorFilter(filters);
  if (filter) queryBody.filter = filter;

  const data = await dashVectorFetch(`/v1/collections/${encodeURIComponent(collectionName())}/query`, {
    method: "POST",
    body: JSON.stringify(queryBody)
  });
  const docs = extractDashVectorDocs(data);

  return {
    ok: true,
    provider: "Aliyun DashVector",
    collection: collectionName(),
    count: docs.length,
    results: docs.map((doc) => normalizeSearchResult(doc))
  };
}

async function dashVectorCollectionExists() {
  return (await dashVectorCollectionInfo()).exists;
}

async function dashVectorCollectionInfo() {
  try {
    const data = await dashVectorFetch(`/v1/collections/${encodeURIComponent(collectionName())}`, {
      method: "GET"
    });
    return {
      exists: true,
      dimension: extractCollectionDimension(data),
      raw: data
    };
  } catch (error) {
    if (error.status === 404) {
      return {
        exists: false,
        dimension: null,
        raw: null
      };
    }
    throw error;
  }
}

async function createDashVectorCollection(vectorSize) {
  await dashVectorFetch("/v1/collections", {
    method: "POST",
    body: JSON.stringify({
      name: collectionName(),
      dimension: vectorSize,
      metric: "cosine",
      fields_schema: {
        chunk_text: "STRING",
        document_name: "STRING",
        source_type: "STRING",
        file_type: "STRING",
        chunk_index: "INT",
        equipment_name: "STRING",
        system: "STRING",
        review_status: "STRING",
        quality_status: "STRING",
        fault_symptom: "STRING",
        upload_time: "STRING"
      }
    })
  });
}

async function assertCollectionExists() {
  const collectionInfo = await dashVectorCollectionInfo();
  if (!collectionInfo.exists) {
    throw badRequest("Collection 不存在，请先点击“初始化 Collection”。");
  }
  const expectedDimension = embeddingDimensionConfig();
  if (collectionInfo.dimension && collectionInfo.dimension !== expectedDimension) {
    throw badRequest(`DashVector Collection 维度为 ${collectionInfo.dimension}，但 EMBEDDING_DIMENSION=${expectedDimension}，请保持二者一致。`);
  }
}

async function embeddingDimension() {
  const [vector] = await embedTexts(["dimension probe"]);
  assertVectorDimensions([vector]);
  return vector.length;
}

async function embedTexts(texts) {
  const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: dashScopeBaseURL()
  });
  const response = await client.embeddings.create({
    model: embeddingModel(),
    input: texts,
    dimensions: embeddingDimensionConfig(),
    encoding_format: "float"
  });
  const vectors = response.data?.map((item) => item.embedding) || [];
  if (vectors.length !== texts.length) {
    throw new Error("阿里云百炼 Embedding 返回数量异常");
  }
  return vectors;
}

function assertVectorDimensions(vectors) {
  const expectedDimension = embeddingDimensionConfig();
  vectors.forEach((vector, index) => {
    if (!Array.isArray(vector)) {
      throw new Error(`第 ${index + 1} 个 Embedding 不是有效向量`);
    }
    if (vector.length !== expectedDimension) {
      throw new Error(`第 ${index + 1} 个 Embedding 维度为 ${vector.length}，期望 ${expectedDimension}。请检查 EMBEDDING_MODEL / EMBEDDING_DIMENSION 与 DashVector Collection 配置。`);
    }
  });
}

async function dashVectorFetch(pathname, options = {}) {
  const response = await fetch(`${dashVectorEndpoint()}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "DashVector-Auth-Token": process.env.DASHVECTOR_API_KEY,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || data.error || data.reason || data.code || `DashVector 请求失败：HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (typeof data.code === "number" && data.code !== 0) {
    const error = new Error(data.message || `DashVector 请求失败：code=${data.code}`);
    error.status = 502;
    throw error;
  }
  return data;
}

function dashVectorFilter(filters = {}) {
  const conditions = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key} = '${escapeFilterValue(value)}'`);
  return conditions.length ? conditions.join(" and ") : undefined;
}

function extractDashVectorDocs(data) {
  const candidates = [
    data.output,
    data.docs,
    data.result?.docs,
    data.result,
    data.data?.docs,
    data.data,
    data.items
  ].filter(Boolean);
  const docs = candidates.find((candidate) => Array.isArray(candidate));
  return docs || [];
}

function extractCollectionDimension(data) {
  const candidates = [
    data.dimension,
    data.output?.dimension,
    data.result?.dimension,
    data.data?.dimension,
    data.collection?.dimension,
    data.output?.collection?.dimension,
    data.result?.collection?.dimension,
    data.data?.collection?.dimension
  ];
  const dimension = candidates.find((value) => Number.isFinite(Number(value)) && Number(value) > 0);
  return dimension ? Number(dimension) : null;
}

function normalizeSearchResult(doc) {
  const fields = doc.fields || doc.payload || doc.metadata || {};
  const metadata = { ...fields };
  delete metadata.chunk_text;
  const rawScore = Number(doc.score ?? doc.similarity ?? doc.distance ?? 0);
  const similarity = rawScore <= 1 ? Math.max(0, Math.min(100, Math.round((1 - rawScore) * 100))) : Math.round(rawScore);
  return {
    id: doc.id,
    score: rawScore,
    similarity,
    chunk_text: fields.chunk_text || doc.chunk_text || "",
    metadata,
    document_name: fields.document_name || "",
    chunk_index: fields.chunk_index || "",
    can_quote: fields.quality_status !== "不可引用",
    payload: fields
  };
}

function normalizeMetadata(metadata, index) {
  return {
    document_name: String(metadata.document_name || `document-${index + 1}`),
    source_type: String(metadata.source_type || "-"),
    file_type: String(metadata.file_type || "-"),
    chunk_index: Number(metadata.chunk_index || index + 1),
    equipment_name: String(metadata.equipment_name || "-"),
    system: String(metadata.system || "-"),
    review_status: String(metadata.review_status || "-"),
    quality_status: String(metadata.quality_status || "可引用"),
    fault_symptom: String(metadata.fault_symptom || "-"),
    upload_time: String(metadata.upload_time || new Date().toISOString())
  };
}

function normalizeChunkText(chunk) {
  return String(chunk?.text || chunk?.metadata?.chunk_text || "").trim();
}

function assertCloudConfigured() {
  if (!process.env.DASHVECTOR_ENDPOINT || !process.env.DASHVECTOR_API_KEY || !process.env.DASHSCOPE_API_KEY) {
    throw configError("请先配置 DashVector 和百炼 Embedding 环境变量。");
  }
}

function embeddingProvider() {
  return String(process.env.EMBEDDING_PROVIDER || "aliyun").toLowerCase();
}

function embeddingModel() {
  return process.env.EMBEDDING_MODEL || "text-embedding-v4";
}

function embeddingDimensionConfig() {
  const value = Number(process.env.EMBEDDING_DIMENSION || 1024);
  if (!Number.isInteger(value) || value <= 0) {
    throw configError("EMBEDDING_DIMENSION 必须是正整数，例如 1024。");
  }
  return value;
}

function dashScopeBaseURL() {
  return process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
}

function collectionName() {
  return process.env.DASHVECTOR_COLLECTION || "ship_rag_demo";
}

function dashVectorEndpoint() {
  const value = String(process.env.DASHVECTOR_ENDPOINT || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function dashVectorDocId(value) {
  const base = String(value || "").replace(/[^\w:-]/g, "_").slice(0, 64);
  if (base) return base;
  return crypto.randomUUID();
}

function escapeFilterValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function configError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function statusForError(error) {
  return error.status || 500;
}

function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}
