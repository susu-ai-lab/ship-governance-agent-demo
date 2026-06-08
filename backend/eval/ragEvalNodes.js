const { loadEvalDataset } = require("./ragEvalState");

async function load_eval_dataset_node(state) {
  const dataset = loadEvalDataset(state);
  return {
    ...state,
    ...dataset,
    status: "dataset_loaded"
  };
}

async function document_quality_node(state) {
  const documents = state.documents || [];
  const issues = documents.flatMap((doc) => {
    const docIssues = [];
    if (doc.parse_status && doc.parse_status !== "parsed") docIssues.push("文档解析失败");
    if (!doc.document_name && !doc.name) docIssues.push("缺少文档名");
    if (!["已审核", "已发布", "已发布知识"].includes(doc.review_status || doc.metadata?.review_status)) docIssues.push("未审核");
    if (!["可引用", "高", "中"].includes(doc.quality_status || doc.metadata?.quality_status)) docIssues.push("不可引用或可信等级不足");
    return docIssues.map((issue) => ({
      document_name: doc.document_name || doc.name || "-",
      issue,
      severity: issue === "文档解析失败" ? "high" : "medium"
    }));
  });
  return {
    ...state,
    document_quality: {
      total_documents: documents.length,
      parsed_documents: documents.filter((doc) => !doc.parse_status || doc.parse_status === "parsed").length,
      reviewed_documents: documents.filter((doc) => ["已审核", "已发布", "已发布知识"].includes(doc.review_status || doc.metadata?.review_status)).length,
      quotable_documents: documents.filter((doc) => ["可引用", "高", "中"].includes(doc.quality_status || doc.metadata?.quality_status)).length,
      severe_issue: issues.some((item) => item.severity === "high") || documents.length === 0,
      issues
    },
    status: "document_quality_checked"
  };
}

async function chunk_quality_node(state) {
  const chunks = state.chunks || [];
  const actionTerms = ["检查", "确认", "更换", "紧固", "找正", "补充", "复测", "隔离", "停机", "处理", "排查"];
  const issueRows = chunks.flatMap((chunk) => {
    const text = String(chunk.text || chunk.chunk_text || "");
    const length = text.length;
    const issues = [];
    if (length < 120) issues.push("Chunk过短，业务上下文不足");
    if (length > 900) issues.push("Chunk过长，检索粒度偏粗");
    if (!/(泵|阀|电机|轴承|管路|焊缝|设备)/.test(text)) issues.push("缺少明确业务对象");
    if (!/(振动|温度|发热|噪声|泄漏|压力|绝缘|故障|异常)/.test(text)) issues.push("缺少故障/问题含义");
    if (!actionTerms.some((term) => text.includes(term))) issues.push("可能切断排查步骤或处理动作");
    return issues.map((issue) => ({
      chunk_id: chunk.id || chunk.chunk_id || "-",
      document_name: chunk.metadata?.document_name || chunk.document_name || "-",
      issue,
      chunk_length: length
    }));
  });
  const passed = chunks.length ? chunks.length - new Set(issueRows.map((item) => item.chunk_id)).size : 0;
  return {
    ...state,
    chunk_quality: {
      total_chunks: chunks.length,
      passed_chunks: passed,
      failed_chunks: Math.max(0, chunks.length - passed),
      pass_rate: chunks.length ? round(passed / chunks.length) : 0,
      severe_issue: issueRows.some((item) => item.issue.includes("过短") || item.issue.includes("缺少明确业务对象")),
      issues: issueRows
    },
    status: "chunk_quality_checked"
  };
}

async function metadata_check_node(state) {
  const required = ["document_name", "source_type", "equipment_name", "system", "review_status", "quality_status"];
  const chunks = state.chunks || [];
  const docs = state.documents || [];
  const targets = chunks.length ? chunks.map((chunk) => ({ id: chunk.id || chunk.chunk_id, metadata: chunk.metadata || chunk.payload || {} })) : docs.map((doc) => ({ id: doc.document_name || doc.name, metadata: doc.metadata || doc }));
  const missing = targets.flatMap((item) => required
    .filter((key) => !item.metadata?.[key])
    .map((key) => ({
      id: item.id || "-",
      missing_field: key,
      severity: ["document_name", "review_status", "quality_status"].includes(key) ? "high" : "medium"
    })));
  const totalChecks = Math.max(1, targets.length * required.length);
  return {
    ...state,
    metadata_quality: {
      required_fields: required,
      checked_items: targets.length,
      missing_count: missing.length,
      completeness: round((totalChecks - missing.length) / totalChecks),
      severe_issue: missing.some((item) => item.severity === "high"),
      missing
    },
    status: "metadata_checked"
  };
}

async function retrieval_eval_node(state, deps = {}) {
  if (typeof deps.queryRag !== "function") {
    throw new Error("retrieval_eval_node 缺少 queryRag 依赖");
  }
  const retrievalResults = [];
  for (const question of state.questions || []) {
    try {
      const response = await deps.queryRag(question.question, 5, { quality_status: "可引用" });
      const results = response.results || [];
      retrievalResults.push({
        question_id: question.id,
        question: question.question,
        expected_keywords: question.expected_keywords,
        expected_source_type: question.expected_source_type,
        target_equipment: question.target_equipment,
        target_system: question.target_system,
        top_results: results.map((item, index) => ({
          rank: index + 1,
          id: item.id,
          score: item.score,
          similarity: item.similarity,
          chunk_text: item.chunk_text,
          document_name: item.document_name || item.metadata?.document_name || "-",
          source_type: item.metadata?.source_type || "-",
          equipment_name: item.metadata?.equipment_name || "-",
          system: item.metadata?.system || "-",
          review_status: item.metadata?.review_status || "-",
          quality_status: item.metadata?.quality_status || "-"
        })),
        top1_hit: isRelevant(results.slice(0, 1), question),
        top3_hit: isRelevant(results.slice(0, 3), question),
        top5_hit: isRelevant(results.slice(0, 5), question),
        precision_at_3: precisionAt(results.slice(0, 3), question),
        error: ""
      });
    } catch (error) {
      retrievalResults.push({
        question_id: question.id,
        question: question.question,
        expected_keywords: question.expected_keywords,
        expected_source_type: question.expected_source_type,
        target_equipment: question.target_equipment,
        target_system: question.target_system,
        top_results: [],
        top1_hit: false,
        top3_hit: false,
        top5_hit: false,
        precision_at_3: 0,
        error: error.message || "RAG检索失败"
      });
    }
  }
  return {
    ...state,
    retrieval_results: retrievalResults,
    status: "retrieval_evaluated"
  };
}

async function metrics_node(state) {
  const rows = state.retrieval_results || [];
  const total = Math.max(1, rows.length);
  const noHit = rows.filter((item) => !item.top5_hit || !item.top_results.length);
  return {
    ...state,
    metrics: {
      question_count: rows.length,
      top1_hit_rate: round(rows.filter((item) => item.top1_hit).length / total),
      recall_at_3: round(rows.filter((item) => item.top3_hit).length / total),
      recall_at_5: round(rows.filter((item) => item.top5_hit).length / total),
      precision_at_3: round(rows.reduce((sum, item) => sum + Number(item.precision_at_3 || 0), 0) / total),
      no_hit_questions: noHit.length,
      no_hit_question_ids: noHit.map((item) => item.question_id)
    },
    status: "metrics_calculated"
  };
}

async function answer_eval_node(state) {
  const rows = state.retrieval_results || [];
  const evaluations = rows.map((row) => {
    const quoted = row.top_results.filter((item) => item.quality_status === "可引用" || item.review_status === "已审核");
    const support = isRelevant(quoted.slice(0, 3), row);
    return {
      question_id: row.question_id,
      has_citation: quoted.length > 0,
      citation_supports_answer: support,
      out_of_context_risk: !support || row.top_results.length === 0,
      note: support ? "TopK引用可支撑回答" : "引用不足或命中资料无法支撑标准答案"
    };
  });
  return {
    ...state,
    answer_evaluation: {
      total: evaluations.length,
      citation_rate: evaluations.length ? round(evaluations.filter((item) => item.has_citation).length / evaluations.length) : 0,
      faithfulness_rate: evaluations.length ? round(evaluations.filter((item) => item.citation_supports_answer).length / evaluations.length) : 0,
      has_answer_issue: evaluations.some((item) => item.out_of_context_risk),
      evaluations
    },
    status: "answer_evaluated"
  };
}

async function root_cause_node(state) {
  const rootCauses = [];
  if (state.document_quality?.severe_issue) rootCauses.push("文档解析失败");
  if ((state.chunk_quality?.total_chunks || 0) > 0 && (state.chunk_quality?.severe_issue || state.chunk_quality?.pass_rate < 0.8)) rootCauses.push("Chunk切分不合理");
  if (state.metadata_quality?.severe_issue || state.metadata_quality?.completeness < 0.9) rootCauses.push("metadata缺失");
  if ((state.metrics?.recall_at_3 || 0) < 0.6) rootCauses.push("embedding不准");
  if ((state.metrics?.no_hit_questions || 0) > 0) rootCauses.push("资料缺失");
  const noHits = new Set(state.metrics?.no_hit_question_ids || []);
  const vagueQuestions = (state.retrieval_results || []).filter((item) => noHits.has(item.question_id) && item.question.length < 12);
  if (vagueQuestions.length) rootCauses.push("问题表达模糊");
  if ((state.metrics?.precision_at_3 || 0) < 0.5 && (state.metrics?.recall_at_5 || 0) >= 0.6) rootCauses.push("缺少rerank");
  if (state.answer_evaluation?.has_answer_issue) rootCauses.push("回答引用错误");
  return {
    ...state,
    root_causes: [...new Set(rootCauses)],
    status: "root_causes_analyzed"
  };
}

async function suggestion_node(state) {
  const causeToSuggestion = {
    "文档解析失败": "优先修复PDF/Word解析链路；扫描件需要OCR，解析为空的文档不要进入RAG。",
    "Chunk切分不合理": "调整chunk_size/overlap，按故障现象、原因、措施、结果保持一个完整排查步骤。",
    "metadata缺失": "补齐document_name、source_type、equipment_name、system、review_status、quality_status，再写入向量库。",
    "embedding不准": "补充同义词、标准术语和领域样例；必要时加入rerank或领域embedding对比。",
    "资料缺失": "为无命中问题补充对应SOP、历史维修案例或规范文档。",
    "问题表达模糊": "增加查询改写，将口语问题改写为设备+现象+系统的标准查询。",
    "缺少rerank": "增加metadata过滤和rerank，把已审核、同设备、同系统资料排到前面。",
    "回答引用错误": "答案生成前强制校验引用是否覆盖设备、现象、措施和风险提示。"
  };
  const suggestions = (state.root_causes || []).map((cause) => causeToSuggestion[cause]).filter(Boolean);
  if (!suggestions.length) {
    suggestions.push("当前RAG评测通过，可继续补充评测集并观察线上反馈采纳率。");
  }
  return {
    ...state,
    suggestions,
    status: "completed"
  };
}

function determineBranch(state) {
  if (state.document_quality?.severe_issue) return "document_issue";
  if ((state.chunk_quality?.total_chunks || 0) > 0 && (state.chunk_quality?.severe_issue || state.chunk_quality?.pass_rate < 0.8)) return "chunk_issue";
  if ((state.metrics?.recall_at_3 || 0) < 0.6) return "retrieval_issue";
  if (state.answer_evaluation?.has_answer_issue) return "answer_issue";
  return "passed";
}

function isRelevant(results, expected) {
  return results.some((result) => {
    const text = [
      result.chunk_text,
      result.text,
      result.document_name,
      result.source_type,
      result.equipment_name,
      result.system,
      result.metadata?.document_name,
      result.metadata?.source_type,
      result.metadata?.equipment_name,
      result.metadata?.system
    ].filter(Boolean).join(" ");
    const keywordHits = (expected.expected_keywords || []).filter((keyword) => text.includes(keyword));
    const sourceHit = expected.expected_source_type ? text.includes(expected.expected_source_type) : false;
    const equipmentHit = expected.target_equipment ? text.includes(expected.target_equipment) : false;
    const systemHit = expected.target_system ? text.includes(expected.target_system) : false;
    if (equipmentHit && keywordHits.length >= 1) return true;
    if (systemHit && keywordHits.length >= 2) return true;
    if (sourceHit && keywordHits.length >= 2) return true;
    if (expected.target_equipment || expected.target_system) return false;
    return keywordHits.length >= 3;
  });
}

function precisionAt(results, expected) {
  if (!results.length) return 0;
  const hits = results.filter((result) => isRelevant([result], expected)).length;
  return round(hits / results.length);
}

function round(value) {
  return Number(Number(value || 0).toFixed(4));
}

module.exports = {
  load_eval_dataset_node,
  document_quality_node,
  chunk_quality_node,
  metadata_check_node,
  retrieval_eval_node,
  metrics_node,
  answer_eval_node,
  root_cause_node,
  suggestion_node,
  determineBranch
};
