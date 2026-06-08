const evalQuestions = [
  {
    id: "Q001",
    question: "压载泵振动升温怎么排查？",
    expected_keywords: ["压载泵", "异常振动", "轴承温度", "联轴器找正", "更换轴承"],
    expected_source_type: "SOP",
    target_equipment: "1号压载泵",
    target_system: "压载水系统"
  },
  {
    id: "Q002",
    question: "消防泵启动噪声大应该先检查什么？",
    expected_keywords: ["消防泵", "异常噪声", "地脚螺栓", "紧固", "试运行"],
    expected_source_type: "历史维修案例",
    target_equipment: "1号消防泵",
    target_system: "消防系统"
  },
  {
    id: "Q003",
    question: "海水冷却泵轴承发热可能有哪些原因？",
    expected_keywords: ["海水冷却泵", "轴承发热", "润滑不足", "补充润滑", "温度下降"],
    expected_source_type: "历史维修案例",
    target_equipment: "1号海水冷却泵",
    target_system: "海水冷却系统"
  },
  {
    id: "Q004",
    question: "燃油输送泵压力波动怎么处理？",
    expected_keywords: ["燃油输送泵", "压力波动", "过滤器", "吸入管路", "排气"],
    expected_source_type: "SOP",
    target_equipment: "燃油输送泵",
    target_system: "燃油系统"
  },
  {
    id: "Q005",
    question: "阀门外漏是否可以继续运行？",
    expected_keywords: ["阀门外漏", "泄漏", "隔离", "密封", "风险评估"],
    expected_source_type: "规范",
    target_equipment: "压载水进口阀",
    target_system: "压载水系统"
  },
  {
    id: "Q006",
    question: "电机绝缘低于标准怎么办？",
    expected_keywords: ["电机", "绝缘低", "停机", "烘干", "复测"],
    expected_source_type: "规范",
    target_equipment: "主机冷却泵电机",
    target_system: "电气系统"
  }
];

const evalDocuments = [
  {
    document_name: "压载泵检修SOP-联调样例.md",
    source_type: "SOP",
    equipment_name: "1号压载泵",
    system: "压载水系统",
    review_status: "已审核",
    quality_status: "可引用",
    parse_status: "parsed"
  },
  {
    document_name: "泵类设备振动排查规范.md",
    source_type: "通用规范",
    equipment_name: "泵类设备",
    system: "通用泵系统",
    review_status: "已审核",
    quality_status: "可引用",
    parse_status: "parsed"
  }
];

function createInitialRagEvalState(input = {}) {
  return {
    run_id: input.run_id || `RAG-EVAL-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    questions: input.questions || [],
    documents: input.documents || [],
    chunks: input.chunks || [],
    expected_answers: input.expected_answers || {},
    document_quality: {},
    chunk_quality: {},
    metadata_quality: {},
    retrieval_results: [],
    metrics: {},
    answer_evaluation: {},
    root_causes: [],
    suggestions: [],
    status: "pending",
    branch: "pending",
    node_status: {}
  };
}

function loadEvalDataset(state) {
  const questions = state.questions.length ? state.questions : evalQuestions;
  const documents = state.documents.length ? state.documents : evalDocuments;
  return {
    questions,
    documents,
    expected_answers: Object.fromEntries(questions.map((item) => [item.id, {
      expected_keywords: item.expected_keywords,
      expected_source_type: item.expected_source_type,
      target_equipment: item.target_equipment,
      target_system: item.target_system
    }]))
  };
}

module.exports = {
  createInitialRagEvalState,
  loadEvalDataset,
  evalQuestions,
  evalDocuments
};
