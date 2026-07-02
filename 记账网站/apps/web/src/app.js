const STORAGE_KEY = "poker-ledger-v3";
const CLIENT_ID_KEY = "poker-ledger-client-id";
const DEFAULT_SYNC_TEXT = "当前仅保存在本机浏览器。";
const config = normalizeConfig(window.POKER_LEDGER_CONFIG || {});
const urlParams = new URLSearchParams(window.location.search);
const shareToken = urlParams.get("share") || "";

const state = loadState();
const authContext = {
  client: null,
  user: null,
  member: null,
  initialized: false,
};
const syncContext = {
  clientId: getOrCreateClientId(),
  status: "local",
  statusText: DEFAULT_SYNC_TEXT,
  initialized: false,
  manager: null,
  pendingTimer: null,
  pushing: false,
  queuedSnapshot: null,
};

const elements = {
  heroSessionCount: document.querySelector("#heroSessionCount"),
  heroPlayerCount: document.querySelector("#heroPlayerCount"),
  syncStatusBadge: document.querySelector("#syncStatusBadge"),
  syncStatusText: document.querySelector("#syncStatusText"),
  authStatusBadge: document.querySelector("#authStatusBadge"),
  authStatusText: document.querySelector("#authStatusText"),
  authEmailInput: document.querySelector("#authEmailInput"),
  sendMagicLinkBtn: document.querySelector("#sendMagicLinkBtn"),
  currentUserEmail: document.querySelector("#currentUserEmail"),
  signOutBtn: document.querySelector("#signOutBtn"),
  accessGateView: document.querySelector("#accessGateView"),
  focusLoginBtn: document.querySelector("#focusLoginBtn"),
  gateAuthEmailInput: document.querySelector("#gateAuthEmailInput"),
  gateSendMagicLinkBtn: document.querySelector("#gateSendMagicLinkBtn"),
  gateAuthStatusText: document.querySelector("#gateAuthStatusText"),
  shareView: document.querySelector("#shareView"),
  shareSessionDetail: document.querySelector("#shareSessionDetail"),
  homeView: document.querySelector("#homeView"),
  accountingView: document.querySelector("#accountingView"),
  historyView: document.querySelector("#historyView"),
  statsView: document.querySelector("#statsView"),
  sessionForm: document.querySelector("#sessionForm"),
  playerRows: document.querySelector("#playerRows"),
  playerTemplate: document.querySelector("#playerRowTemplate"),
  partnerRows: document.querySelector("#partnerRows"),
  partnerTemplate: document.querySelector("#partnerRowTemplate"),
  addPlayerBtn: document.querySelector("#addPlayerBtn"),
  addPlayerModal: document.querySelector("#addPlayerModal"),
  closeAddPlayerModalBtn: document.querySelector("#closeAddPlayerModalBtn"),
  addPlayerNameInput: document.querySelector("#addPlayerNameInput"),
  addPlayerBuyinInput: document.querySelector("#addPlayerBuyinInput"),
  addPlayerSuggestions: document.querySelector("#addPlayerSuggestions"),
  confirmAddPlayerBtn: document.querySelector("#confirmAddPlayerBtn"),
  addPartnerBtn: document.querySelector("#addPartnerBtn"),
  resetSessionBtn: document.querySelector("#resetSessionBtn"),
  enterSettlementBtn: document.querySelector("#enterSettlementBtn"),
  returnLiveBtn: document.querySelector("#returnLiveBtn"),
  draftStagePill: document.querySelector("#draftStagePill"),
  sessionTimerDisplay: document.querySelector("#sessionTimerDisplay"),
  openRebuyModalBtn: document.querySelector("#openRebuyModalBtn"),
  rebuyModal: document.querySelector("#rebuyModal"),
  closeRebuyModalBtn: document.querySelector("#closeRebuyModalBtn"),
  rebuyPlayerSelect: document.querySelector("#rebuyPlayerSelect"),
  rebuyAmountInput: document.querySelector("#rebuyAmountInput"),
  confirmRebuyBtn: document.querySelector("#confirmRebuyBtn"),
  playerSuggestions: document.querySelector("#playerSuggestions"),
  sessionName: document.querySelector("#sessionName"),
  sessionDate: document.querySelector("#sessionDate"),
  sessionLocation: document.querySelector("#sessionLocation"),
  sessionDuration: document.querySelector("#sessionDuration"),
  sessionNotes: document.querySelector("#sessionNotes"),
  dealerFee: document.querySelector("#dealerFee"),
  dealerNames: document.querySelector("#dealerNames"),
  dealerSharePercent: document.querySelector("#dealerSharePercent"),
  collaborationName: document.querySelector("#collaborationName"),
  collaborationSharePercent: document.querySelector("#collaborationSharePercent"),
  modernShareDisplay: document.querySelector("#modernShareDisplay"),
  sessionCashoutDisplay: document.querySelector("#sessionCashoutDisplay"),
  sessionMetrics: document.querySelector("#sessionMetrics"),
  profitSummaryCards: document.querySelector("#profitSummaryCards"),
  partnerFinalTable: document.querySelector("#partnerFinalTable"),
  sessionList: document.querySelector("#sessionList"),
  historySettlementFilter: document.querySelector("#historySettlementFilter"),
  overviewGrid: document.querySelector("#overviewGrid"),
  debtSummary: document.querySelector("#debtSummary"),
  playerInsightSelect: document.querySelector("#playerInsightSelect"),
  playerInsight: document.querySelector("#playerInsight"),
  newPlayerName: document.querySelector("#newPlayerName"),
  createPlayerBtn: document.querySelector("#createPlayerBtn"),
  mergeSourcePlayerSelect: document.querySelector("#mergeSourcePlayerSelect"),
  mergeTargetPlayerInput: document.querySelector("#mergeTargetPlayerInput"),
  mergePlayersBtn: document.querySelector("#mergePlayersBtn"),
  mergePlayersStatus: document.querySelector("#mergePlayersStatus"),
  leaderboardMetric: document.querySelector("#leaderboardMetric"),
  leaderboardFilter: document.querySelector("#leaderboardFilter"),
  leaderboard: document.querySelector("#leaderboard"),
  startAccountingBtn: document.querySelector("#startAccountingBtn"),
  sessionSetupModal: document.querySelector("#sessionSetupModal"),
  setupSessionNameInput: document.querySelector("#setupSessionNameInput"),
  setupSessionDateInput: document.querySelector("#setupSessionDateInput"),
  setupSessionLocationInput: document.querySelector("#setupSessionLocationInput"),
  setupCollaborationInput: document.querySelector("#setupCollaborationInput"),
  setupCollaborationNameInput: document.querySelector("#setupCollaborationNameInput"),
  setupCollaborationShareInput: document.querySelector("#setupCollaborationShareInput"),
  setupDealerShareEnabledInput: document.querySelector("#setupDealerShareEnabledInput"),
  setupDealerShareInput: document.querySelector("#setupDealerShareInput"),
  setupDealerNamesInput: document.querySelector("#setupDealerNamesInput"),
  confirmSessionSetupBtn: document.querySelector("#confirmSessionSetupBtn"),
  sessionInfoBar: document.querySelector("#sessionInfoBar"),
  sessionMetaPrimary: document.querySelector("#sessionMetaPrimary"),
  sessionMetaSecondary: document.querySelector("#sessionMetaSecondary"),
  rebuyForm: document.querySelector("#rebuyForm"),
  addPlayerForm: document.querySelector("#addPlayerForm"),
  sessionSetupForm: document.querySelector("#sessionSetupForm"),
  historySessionModal: document.querySelector("#historySessionModal"),
  historySessionModalTitle: document.querySelector("#historySessionModalTitle"),
  historySessionDetail: document.querySelector("#historySessionDetail"),
  generateShareLinkBtn: document.querySelector("#generateShareLinkBtn"),
  shareLinkStatus: document.querySelector("#shareLinkStatus"),
  partnerShareWarning: document.querySelector("#partnerShareWarning"),
};

let timerInterval = null;
let activeHistorySessionId = "";
let activeHistorySessionMode = "settlement";
let activeHistorySettlementPlayerKey = "";

init();

async function init() {
  ensureDraftSession();
  bindEvents();
  render();
  if (shareToken) {
    await initializeShareView();
    return;
  }
  await initializeSync();
}

function bindEvents() {
  elements.sendMagicLinkBtn?.addEventListener("click", sendMagicLink);
  elements.gateSendMagicLinkBtn?.addEventListener("click", sendMagicLink);
  elements.signOutBtn?.addEventListener("click", signOutMember);
  elements.focusLoginBtn?.addEventListener("click", () => focusAuth());
  elements.generateShareLinkBtn?.addEventListener("click", generateShareLinkForActiveSession);
  elements.startAccountingBtn.addEventListener("click", openSessionSetupModal);
  elements.confirmSessionSetupBtn.addEventListener("click", confirmSessionSetup);
  elements.rebuyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmRebuy();
  });
  elements.rebuyForm.addEventListener("keydown", handleDialogEnter);
  elements.addPlayerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmAddPlayer();
  });
  elements.addPlayerForm.addEventListener("keydown", handleDialogEnter);
  elements.sessionSetupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmSessionSetup();
  });
  elements.sessionSetupForm.addEventListener("keydown", handleDialogEnter);
  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!canAccessFullLedger()) {
        focusAuth();
        return;
      }
      state.ui.activeView = button.dataset.viewTarget;
      saveState();
      renderViews();
    });
  });

  document.querySelector("#goHomeFromAccountingBtn").addEventListener("click", () => switchView("home"));
  document.querySelector("#goHomeFromHistoryBtn").addEventListener("click", () => switchView("home"));
  document.querySelector("#goHomeFromStatsBtn").addEventListener("click", () => switchView("home"));

  elements.addPlayerBtn.addEventListener("click", openAddPlayerModal);
  elements.confirmAddPlayerBtn.addEventListener("click", confirmAddPlayer);
  elements.closeAddPlayerModalBtn.addEventListener("click", () => elements.addPlayerModal.close());
  elements.addPlayerNameInput.addEventListener("input", renderAddPlayerSuggestions);
  elements.addPlayerSuggestions?.addEventListener("click", handleAddPlayerSuggestionClick);

  elements.addPartnerBtn.addEventListener("click", () => {
    state.draftSession.partners.push(createPartner());
    saveState();
    render();
  });

  elements.resetSessionBtn.addEventListener("click", () => {
    state.draftSession = createDefaultDraftSession();
    state.ui.expandedPlayerId = "";
    saveState();
    render();
  });

  elements.openRebuyModalBtn.addEventListener("click", openRebuyModal);
  elements.confirmRebuyBtn.addEventListener("click", confirmRebuy);
  elements.closeRebuyModalBtn.addEventListener("click", () => elements.rebuyModal.close());

  elements.enterSettlementBtn.addEventListener("click", () => {
    if (!getNamedDraftPlayers().length || sum(getNamedDraftPlayers().map(getPlayerBuyInTotal)) <= 0) {
      alert("请先记录玩家 buyin，再进入结算。");
      return;
    }
    finalizeLiveSession();
    state.draftSession.stage = "settlement";
    saveState();
    render();
  });

  elements.returnLiveBtn.addEventListener("click", () => {
    resumeLiveSession();
    state.draftSession.stage = "live";
    saveState();
    render();
  });

  elements.sessionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSession();
  });

  [
    [elements.sessionName, "name", "string"],
    [elements.sessionDate, "date", "string"],
    [elements.sessionLocation, "location", "string"],
    [elements.dealerNames, "dealerNames", "string"],
    [elements.collaborationName, "collaborationName", "string"],
    [elements.sessionDuration, "durationHours", "number"],
    [elements.sessionNotes, "notes", "string"],
    [elements.dealerFee, "dealerFee", "number"],
    [elements.dealerSharePercent, "dealerSharePercent", "number"],
    [elements.collaborationSharePercent, "collaborationSharePercent", "number"],
  ].forEach(([element, key, type]) => {
    element.addEventListener("input", () => {
      state.draftSession[key] = type === "number" ? toNumber(element.value) : element.value.trim();
      saveState();
      render();
    });
  });

  elements.playerInsightSelect.addEventListener("change", renderPlayerInsight);
  elements.leaderboardMetric.addEventListener("change", renderLeaderboard);
  elements.leaderboardFilter.addEventListener("input", renderLeaderboard);
  elements.historySettlementFilter?.addEventListener("change", renderHistory);
  elements.sessionList.addEventListener("click", handleHistoryActions);
  elements.historySessionDetail.addEventListener("click", handleHistorySessionActions);
  elements.mergePlayersBtn?.addEventListener("click", mergePlayers);
  elements.mergeSourcePlayerSelect?.addEventListener("change", () => {
    const selected = state.players.find((player) => player.id === elements.mergeSourcePlayerSelect.value);
    if (selected) {
      elements.mergeTargetPlayerInput.value = selected.name;
    }
  });

  elements.createPlayerBtn.addEventListener("click", () => {
    const name = elements.newPlayerName.value.trim();
    if (!name) return;
    upsertPlayer(name);
    elements.newPlayerName.value = "";
    saveState();
    renderStats();
  });
}

function switchView(view) {
  if (!canAccessFullLedger()) {
    focusAuth();
    return;
  }
  state.ui.activeView = view;
  saveState();
  renderViews();
}

function handleDialogEnter(event) {
  if (event.key !== "Enter" || event.target.tagName === "TEXTAREA") return;
  event.preventDefault();
  event.currentTarget.requestSubmit();
}

function createDefaultDraftSession() {
  return {
    name: "Modern Casino",
    date: getNewYorkNowLocalInput(),
    location: "Fort lee",
    collaboration: "No",
    collaborationName: "",
    collaborationSharePercent: 0,
    dealerShareEnabled: "No",
    dealerSharePercent: 0,
    dealerNames: "",
    durationHours: 0,
    notes: "",
    stage: "live",
    dealerFee: 0,
    startedAt: "",
    endedAt: "",
    players: [],
    partners: createDefaultPartners(),
  };
}

function createDraftPlayer() {
  return {
    id: crypto.randomUUID(),
    name: "",
    buyIns: [],
    cashOuts: [],
    cashOut: 0,
    cashOutRecorded: false,
    insuranceProfit: 0,
    startedAt: "",
    endedAt: "",
    totalPlayMs: 0,
    exited: false,
    pausedForSettlement: false,
    settlementStatus: "pending",
    settledAmount: 0,
    remainingAmount: 0,
    partnerName: "",
  };
}

function createPartner(seed = "") {
  return {
    id: crypto.randomUUID(),
    name: seed ? `${seed}合伙人` : "",
    sharePercent: 0,
    cost: 0,
    manualAdvance: 0,
    advance: 0,
  };
}

function createDefaultPartners() {
  return [
    createPartnerWithShare("Blue", 39.6),
    createPartnerWithShare("项往", 29.7),
    createPartnerWithShare("JW", 29.7),
    createPartnerWithShare("Kanye", 1),
  ];
}

function createPartnerWithShare(name, sharePercent) {
  const partner = createPartner();
  partner.name = name;
  partner.sharePercent = sharePercent;
  return partner;
}

function ensureDraftSession() {
  state.meta = normalizeMeta(state.meta);
  state.ui = {
    activeView: state.ui?.activeView || "home",
    expandedPlayerId: state.ui?.expandedPlayerId || "",
    expandedHistorySettlementPlayerKey: state.ui?.expandedHistorySettlementPlayerKey || "",
  };
  state.draftSession = normalizeDraftSession(state.draftSession);
  state.sessions = Array.isArray(state.sessions) ? state.sessions.map(normalizeSession) : [];
  state.players = Array.isArray(state.players)
    ? state.players
        .map((player) => ({ ...player, id: player.id || crypto.randomUUID(), name: String(player.name || "").trim() }))
        .filter((player) => player.name)
    : [];
}

function normalizeMeta(meta) {
  return {
    revision: Math.max(0, Number(meta?.revision) || 0),
    updatedAt: typeof meta?.updatedAt === "string" && meta.updatedAt ? meta.updatedAt : "",
    updatedBy: typeof meta?.updatedBy === "string" ? meta.updatedBy : "",
  };
}

function normalizeDraftSession(draft) {
  const fallback = createDefaultDraftSession();
  if (!draft || typeof draft !== "object") return fallback;
  return {
    ...fallback,
    ...draft,
    durationHours: toNumber(draft.durationHours ?? fallback.durationHours),
    dealerFee: toNumber(draft.dealerFee ?? fallback.dealerFee),
    collaboration: draft.collaboration === "Yes" ? "Yes" : "No",
    collaborationName: String(draft.collaborationName || ""),
    collaborationSharePercent: toNumber(draft.collaborationSharePercent ?? fallback.collaborationSharePercent),
    dealerShareEnabled: draft.dealerShareEnabled === "Yes" ? "Yes" : "No",
    dealerSharePercent: toNumber(draft.dealerSharePercent ?? fallback.dealerSharePercent),
    dealerNames: String(draft.dealerNames || ""),
    stage: draft.stage === "settlement" ? "settlement" : "live",
    players: Array.isArray(draft.players) && draft.players.length ? draft.players.map(normalizeDraftPlayer) : fallback.players,
    partners: Array.isArray(draft.partners) && draft.partners.length ? draft.partners.map(normalizePartner) : fallback.partners,
  };
}

function normalizeDraftPlayer(player) {
  return {
    id: player.id || crypto.randomUUID(),
    name: String(player.name || "").trim(),
    buyIns: Array.isArray(player.buyIns) ? player.buyIns.map(toNumber).filter((value) => value > 0) : [],
    cashOuts: Array.isArray(player.cashOuts) ? player.cashOuts.map(toNumber).filter((value) => value > 0) : [],
    cashOut: toNumber(player.cashOut),
    cashOutRecorded: Boolean(player.cashOutRecorded) || toNumber(player.cashOut) > 0,
    insuranceProfit: toNumber(player.insuranceProfit),
    startedAt: String(player.startedAt || ""),
    endedAt: String(player.endedAt || ""),
    totalPlayMs: toNumber(player.totalPlayMs),
    exited: Boolean(player.exited),
    pausedForSettlement: Boolean(player.pausedForSettlement),
    settlementStatus: ["pending", "partial", "settled"].includes(player.settlementStatus) ? player.settlementStatus : "pending",
    settledAmount: toNumber(player.settledAmount),
    remainingAmount: toNumber(player.remainingAmount),
    partnerName: String(player.partnerName || "").trim(),
  };
}

function normalizePartner(partner) {
  return {
    id: partner.id || crypto.randomUUID(),
    name: String(partner.name || "").trim(),
    sharePercent: toNumber(partner.sharePercent),
    cost: toNumber(partner.cost),
    manualAdvance: toNumber(partner.manualAdvance ?? partner.advance),
    advance: toNumber(partner.advance),
  };
}

function normalizeSession(session) {
  const normalized = {
    ...session,
    dealerFee: toNumber(session.dealerFee),
    dealerSharePercent: toNumber(session.dealerSharePercent),
    collaborationSharePercent: toNumber(session.collaborationSharePercent),
    totalBuyIn: toNumber(session.totalBuyIn),
    totalCashOut: toNumber(session.totalCashOut),
    totalCosts: toNumber(session.totalCosts),
    netProfit: toNumber(session.netProfit),
    players: Array.isArray(session.players)
      ? session.players.map((player) => ({
          ...player,
          cashOut: toNumber(player.cashOut),
          profit: toNumber(player.profit),
          settledAmount: toNumber(player.settledAmount),
          remainingAmount: toNumber(player.remainingAmount),
        }))
      : [],
    partners: Array.isArray(session.partners)
      ? session.partners.map((partner) => ({
          ...partner,
          sharePercent: toNumber(partner.sharePercent),
          cost: toNumber(partner.cost),
          manualAdvance: toNumber(partner.manualAdvance ?? partner.advance),
          advance: toNumber(partner.advance),
          profitShare: toNumber(partner.profitShare),
          playerProfit: toNumber(partner.playerProfit),
          finalAmount: toNumber(partner.finalAmount),
        }))
      : [],
  };
  return recomputeSavedSession(normalized);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return normalizeRootState(JSON.parse(raw));
    } catch (error) {
      console.warn("parse storage failed", error);
    }
  }
  return createEmptyState();
}

function saveState(options = {}) {
  if (!options.skipTouch) {
    touchState();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!options.skipRemote) {
    queueRemoteSync();
  }
}

function createEmptyState() {
  return normalizeRootState({
    ui: { activeView: "home", expandedPlayerId: "", expandedHistorySettlementPlayerKey: "" },
    draftSession: createDefaultDraftSession(),
    sessions: [],
    players: [],
    meta: { revision: 0, updatedAt: "", updatedBy: "" },
  });
}

function normalizeRootState(raw) {
  return {
    ui: raw?.ui || { activeView: "home", expandedPlayerId: "", expandedHistorySettlementPlayerKey: "" },
    draftSession: raw?.draftSession || createDefaultDraftSession(),
    sessions: Array.isArray(raw?.sessions) ? raw.sessions : [],
    players: Array.isArray(raw?.players) ? raw.players : [],
    meta: normalizeMeta(raw?.meta),
  };
}

function touchState() {
  state.meta = normalizeMeta(state.meta);
  state.meta.revision += 1;
  state.meta.updatedAt = new Date().toISOString();
  state.meta.updatedBy = syncContext.clientId;
}

function canAccessFullLedger() {
  if (config.syncProvider !== "supabase") return true;
  return Boolean(authContext.member);
}

function focusAuth() {
  if (!elements.accessGateView?.hidden) {
    elements.gateAuthEmailInput?.focus();
  } else {
    elements.authEmailInput?.focus();
  }
  setAuthStatus("locked", "完整账本权限只开放给已登记的成员邮箱。");
}

function queueRemoteSync() {
  if (!syncContext.initialized || !syncContext.manager || !canAccessFullLedger()) return;
  if (syncContext.pendingTimer) {
    clearTimeout(syncContext.pendingTimer);
  }
  setSyncStatus("syncing", "正在把最新账单同步到云端。");
  syncContext.pendingTimer = window.setTimeout(() => {
    syncContext.pendingTimer = null;
    pushRemoteState(cloneState(state));
  }, 450);
}

async function initializeSync() {
  if (config.syncProvider !== "supabase") {
    syncContext.initialized = true;
    authContext.initialized = true;
    renderSyncStatus();
    return;
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.workspaceId) {
    syncContext.initialized = true;
    setSyncStatus("error", "缺少云端配置，当前已退回本地模式。");
    return;
  }

  if (!window.supabase?.createClient) {
    syncContext.initialized = true;
    authContext.initialized = true;
    setSyncStatus("error", "Supabase SDK 未加载，当前已退回本地模式。");
    return;
  }

  authContext.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  await initializeAuth();

  if (!canAccessFullLedger()) {
    syncContext.initialized = true;
    setSyncStatus("locked", "已连接 Supabase，等待成员登录后加载完整账本。");
    render();
    return;
  }

  await connectAuthorizedWorkspace();
}

async function connectAuthorizedWorkspace() {
  setSyncStatus("connecting", "正在连接共享账本数据库。");

  try {
    syncContext.manager = createSupabaseManager();
    await syncContext.manager.bootstrap();
    syncContext.initialized = true;
    setSyncStatus("synced", `云端账本已连接，工作区：${config.workspaceId}`);
  } catch (error) {
    syncContext.initialized = true;
    syncContext.manager = null;
    console.error("sync bootstrap failed", error);
    setSyncStatus("error", "云端连接失败，当前仍可在本机使用。");
  }
}

function createSupabaseManager() {
  const client = authContext.client;

  return {
    async bootstrap() {
      const { data, error } = await client
        .from(config.supabaseTable)
        .select("workspace_id,state,updated_at,updated_by")
        .eq("workspace_id", config.workspaceId)
        .maybeSingle();

      if (error) throw error;

      if (data?.state) {
        applyRemoteState(data.state);
      } else {
        touchState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        await pushRemoteState(cloneState(state));
      }

      client
        .channel(`poker-ledger:${config.workspaceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: config.supabaseTable,
            filter: `workspace_id=eq.${config.workspaceId}`,
          },
          (payload) => {
            const remoteState = payload.new?.state;
            const remoteEditor = remoteState?.meta?.updatedBy || payload.new?.updated_by || "";
            if (!remoteState || remoteEditor === syncContext.clientId) return;
            applyRemoteState(remoteState);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setSyncStatus("synced", `云端账本已连接，工作区：${config.workspaceId}`);
          }
        });
    },
    async push(snapshot) {
      const payload = {
        workspace_id: config.workspaceId,
        state: snapshot,
        updated_at: snapshot.meta.updatedAt || new Date().toISOString(),
        updated_by: snapshot.meta.updatedBy || syncContext.clientId,
      };
      const { error } = await client.from(config.supabaseTable).upsert(payload, { onConflict: "workspace_id" });
      if (error) throw error;
    },
  };
}

async function initializeAuth() {
  if (!authContext.client) return;
  const {
    data: { session },
  } = await authContext.client.auth.getSession();
  authContext.user = session?.user || null;
  authContext.member = authContext.user ? await fetchMembership(authContext.user) : null;
  authContext.initialized = true;
  renderAuthState();

  authContext.client.auth.onAuthStateChange(async (_event, sessionValue) => {
    authContext.user = sessionValue?.user || null;
    authContext.member = authContext.user ? await fetchMembership(authContext.user) : null;
    renderAuthState();
    if (canAccessFullLedger() && !syncContext.manager) {
      await connectAuthorizedWorkspace();
    } else {
      if (!canAccessFullLedger()) {
        syncContext.manager = null;
        setSyncStatus("locked", "已连接 Supabase，等待成员登录后加载完整账本。");
      }
      render();
    }
  });
}

async function fetchMembership(user) {
  if (!user?.email || !authContext.client) return null;
  const { data, error } = await authContext.client
    .from(config.workspaceMembersTable)
    .select("workspace_id,email,role,display_name")
    .eq("workspace_id", config.workspaceId)
    .eq("email", user.email)
    .maybeSingle();
  if (error) {
    console.error("membership lookup failed", error);
    return null;
  }
  return data || null;
}

async function sendMagicLink() {
  const email = elements.gateAuthEmailInput?.value.trim() || elements.authEmailInput?.value.trim();
  if (!email || !authContext.client) return;
  elements.sendMagicLinkBtn.disabled = true;
  if (elements.gateSendMagicLinkBtn) elements.gateSendMagicLinkBtn.disabled = true;
  try {
    const { error } = await authContext.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
    setAuthStatus("connecting", "登录链接已发送，请去邮箱里点开 magic link。");
  } catch (error) {
    console.error("send magic link failed", error);
    setAuthStatus("error", "发送登录链接失败，请检查邮箱是否已加入成员名单。");
  } finally {
    elements.sendMagicLinkBtn.disabled = false;
    if (elements.gateSendMagicLinkBtn) elements.gateSendMagicLinkBtn.disabled = false;
  }
}

async function signOutMember() {
  if (!authContext.client) return;
  await authContext.client.auth.signOut();
  authContext.user = null;
  authContext.member = null;
  syncContext.manager = null;
  setSyncStatus("locked", "已退出登录，完整账本功能已锁定。");
  renderAuthState();
  render();
}

async function initializeShareView() {
  if (!window.supabase?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
    elements.shareView.hidden = false;
    elements.shareSessionDetail.innerHTML = `<div class="empty-state">分享视图初始化失败，缺少 Supabase 配置。</div>`;
    renderViews();
    return;
  }
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc("get_shared_session", { p_share_token: shareToken });

  elements.shareView.hidden = false;
  const shared = Array.isArray(data) ? data[0] : data;
  if (error || !shared?.share_snapshot) {
    console.error("load shared session failed", error);
    elements.shareSessionDetail.innerHTML = `<div class="empty-state">这个分享链接无效、已过期，或尚未生成分享快照。</div>`;
    renderViews();
    return;
  }

  const session = normalizeSession(shared.share_snapshot);
  elements.shareSessionDetail.innerHTML = `
    <section class="subcard history-detail-summary">
      <div class="section-head compact">
        <div>
          <h3>${escapeHtml(shared.session_name || session.name || "牌局账单")}</h3>
          <p class="session-item-meta">${escapeHtml(session.date)} · ${escapeHtml(session.location || "未填写地点")} · 仅限本场分享</p>
        </div>
      </div>
      <div class="session-summary-grid">
        <div class="session-summary-item"><span>总 Buyin</span><strong>${formatCurrency(session.totalBuyIn)}</strong></div>
        <div class="session-summary-item"><span>总 Cash Out</span><strong>${formatCurrency(session.totalCashOut)}</strong></div>
        <div class="session-summary-item"><span>总成本</span><strong>${formatCurrency(session.totalCosts)}</strong></div>
        <div class="session-summary-item"><span>盈利</span><strong class="${session.netProfit >= 0 ? "positive" : "negative"}">${formatCurrency(session.netProfit)}</strong></div>
      </div>
      <p class="session-item-meta">链接有效期：${shared.expires_at ? formatSyncTime(shared.expires_at) : "长期有效"}</p>
    </section>
    ${renderHistorySessionDetail(session, isSessionSettled(session))}
  `;
  renderViews();
}

async function pushRemoteState(snapshot) {
  if (!syncContext.manager) return;
  if (syncContext.pushing) {
    syncContext.queuedSnapshot = snapshot;
    return;
  }

  syncContext.pushing = true;

  try {
    await syncContext.manager.push(snapshot);
    setSyncStatus("synced", `最近同步：${formatSyncTime(snapshot.meta.updatedAt)}`);
  } catch (error) {
    console.error("push remote state failed", error);
    setSyncStatus("error", "云端保存失败，稍后修改会继续尝试同步。");
  } finally {
    syncContext.pushing = false;
    if (syncContext.queuedSnapshot) {
      const nextSnapshot = syncContext.queuedSnapshot;
      syncContext.queuedSnapshot = null;
      pushRemoteState(nextSnapshot);
    }
  }
}

function applyRemoteState(remoteState) {
  const incoming = normalizeRootState(remoteState);
  if (!isIncomingStateNewer(incoming, state)) return;
  replaceState(incoming);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  setSyncStatus("synced", `已接收合伙人的最新修改：${formatSyncTime(state.meta.updatedAt)}`);
  render();
}

function replaceState(nextState) {
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, cloneState(nextState));
  ensureDraftSession();
}

function isIncomingStateNewer(incoming, current) {
  const incomingStamp = getStateTimestamp(incoming);
  const currentStamp = getStateTimestamp(current);
  if (incomingStamp !== currentStamp) return incomingStamp > currentStamp;
  return normalizeMeta(incoming.meta).revision > normalizeMeta(current.meta).revision;
}

function getStateTimestamp(candidate) {
  const value = candidate?.meta?.updatedAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function setSyncStatus(status, text) {
  syncContext.status = status;
  syncContext.statusText = text;
  renderSyncStatus();
}

function renderSyncStatus() {
  if (!elements.syncStatusBadge || !elements.syncStatusText) return;
  elements.syncStatusBadge.textContent = getSyncStatusLabel(syncContext.status);
  elements.syncStatusBadge.className = `sync-status ${syncContext.status}`;
  elements.syncStatusText.textContent = syncContext.statusText;
}

function renderAuthState() {
  if (!elements.authStatusBadge || !elements.authStatusText) return;
  if (authContext.member) {
    setAuthStatus("synced", `已登录成员：${authContext.member.display_name || authContext.member.email}`);
    elements.currentUserEmail.textContent = authContext.user?.email || "";
    elements.signOutBtn.hidden = false;
    elements.authEmailInput.value = authContext.user?.email || "";
    if (elements.gateAuthEmailInput) elements.gateAuthEmailInput.value = authContext.user?.email || "";
    elements.authEmailInput.disabled = true;
    if (elements.gateAuthEmailInput) elements.gateAuthEmailInput.disabled = true;
    elements.sendMagicLinkBtn.hidden = true;
    if (elements.gateSendMagicLinkBtn) elements.gateSendMagicLinkBtn.hidden = true;
  } else if (authContext.user) {
    setAuthStatus("error", "该邮箱已登录，但不在完整账本成员名单内。");
    elements.currentUserEmail.textContent = authContext.user.email || "";
    elements.signOutBtn.hidden = false;
    elements.authEmailInput.disabled = true;
    if (elements.gateAuthEmailInput) elements.gateAuthEmailInput.disabled = true;
    elements.sendMagicLinkBtn.hidden = true;
    if (elements.gateSendMagicLinkBtn) elements.gateSendMagicLinkBtn.hidden = true;
  } else {
    setAuthStatus("local", "未登录。完整账本与英雄榜需要指定成员邮箱登录。");
    elements.currentUserEmail.textContent = "";
    elements.signOutBtn.hidden = true;
    elements.authEmailInput.disabled = false;
    if (elements.gateAuthEmailInput) elements.gateAuthEmailInput.disabled = false;
    elements.sendMagicLinkBtn.hidden = false;
    if (elements.gateSendMagicLinkBtn) elements.gateSendMagicLinkBtn.hidden = false;
  }
  if (elements.gateAuthStatusText) {
    elements.gateAuthStatusText.textContent = elements.authStatusText.textContent;
  }
}

function setAuthStatus(status, text) {
  elements.authStatusBadge.textContent =
    {
      local: "未登录",
      connecting: "验证中",
      synced: "成员已验证",
      error: "无权限",
      locked: "受限访问",
    }[status] || "未登录";
  elements.authStatusBadge.className = `sync-status ${status}`;
  elements.authStatusText.textContent = text;
}

function getSyncStatusLabel(status) {
  return {
    local: "本地模式",
    connecting: "连接中",
    synced: "云端已连",
    syncing: "同步中",
    locked: "待登录",
    error: "同步异常",
  }[status] || "本地模式";
}

function formatSyncTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function normalizeConfig(raw) {
  return {
    syncProvider: raw?.syncProvider === "supabase" ? "supabase" : "local",
    supabaseUrl: String(raw?.supabaseUrl || "").trim(),
    supabaseAnonKey: String(raw?.supabaseAnonKey || "").trim(),
    supabaseTable: String(raw?.supabaseTable || "workspace_state").trim(),
    shareTable: String(raw?.shareTable || "session_shares").trim(),
    workspaceMembersTable: String(raw?.workspaceMembersTable || "workspace_members").trim(),
    workspaceId: String(raw?.workspaceId || "modern-casino").trim(),
    siteTitle: String(raw?.siteTitle || "开局账本").trim(),
  };
}

function getOrCreateClientId() {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(CLIENT_ID_KEY, created);
  return created;
}

function render() {
  renderViews();
  syncDraftFields();
  syncTimer();
  renderHeroStats();
  renderSyncStatus();
  renderPlayerRows();
  renderPartnerRows();
  renderFinancials();
  renderHistory();
  renderStats();
}

function renderViews() {
  if (shareToken) {
    elements.accessGateView.hidden = true;
    elements.homeView.hidden = true;
    elements.accountingView.hidden = true;
    elements.historyView.hidden = true;
    elements.statsView.hidden = true;
    elements.shareView.hidden = false;
    return;
  }

  const active = state.ui.activeView || "home";
  const allowed = canAccessFullLedger();
  elements.accessGateView.hidden = allowed;
  elements.shareView.hidden = true;
  elements.homeView.hidden = !allowed || active !== "home";
  elements.accountingView.hidden = !allowed || active !== "accounting";
  elements.historyView.hidden = !allowed || active !== "history";
  elements.statsView.hidden = !allowed || active !== "stats";
}

function syncDraftFields() {
  const draft = state.draftSession;
  elements.sessionName.value = draft.name;
  elements.sessionDate.value = String(draft.date).slice(0, 10);
  elements.sessionLocation.value = draft.location;
  elements.dealerNames.value = draft.dealerNames;
  elements.dealerSharePercent.value = draft.dealerSharePercent;
  elements.collaborationName.value = draft.collaborationName;
  elements.collaborationSharePercent.value = draft.collaborationSharePercent;
  elements.modernShareDisplay.value = calculateModernSharePercent(draft).toFixed(2);
  elements.sessionDuration.value = draft.durationHours;
  elements.sessionNotes.value = draft.notes;
  elements.dealerFee.value = draft.dealerFee;
  elements.draftStagePill.textContent = draft.stage === "settlement" ? "结算中" : "进行中";
  elements.draftStagePill.className = `stage-pill ${draft.stage === "settlement" ? "settlement" : "live"}`;
  elements.enterSettlementBtn.hidden = draft.stage === "settlement";
  elements.returnLiveBtn.hidden = draft.stage !== "settlement";
  elements.sessionMetaPrimary.hidden = true;
  elements.sessionMetaSecondary.hidden = true;
  elements.sessionInfoBar.innerHTML = `
    <span>牌局：<strong>${escapeHtml(draft.name)}</strong></span>
    <span>时间：<strong>${escapeHtml(formatSetupDate(draft.date))}</strong></span>
    <span>地点：<strong>${escapeHtml(draft.location)}</strong></span>
    <span>合作开局：<strong>${escapeHtml(draft.collaboration)}</strong></span>
    <span>荷关：<strong>${escapeHtml(draft.dealerNames || "未填写")}</strong></span>
    <span>Dealer 分红：<strong>${escapeHtml(formatPercent(draft.dealerSharePercent))}</strong></span>
    <span>合作方分红：<strong>${escapeHtml(formatPercent(draft.collaborationSharePercent))}</strong></span>
  `;
}

function syncTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateTimerDisplay();
  if (state.draftSession.startedAt && !state.draftSession.endedAt && state.draftSession.stage === "live") {
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }
}

function updateTimerDisplay() {
  const durationMs = getSessionDurationMs();
  const durationHours = durationMs / 3600000;
  elements.sessionTimerDisplay.textContent = formatDuration(durationMs);
  elements.sessionDuration.value = formatDuration(durationMs);
  state.draftSession.durationHours = Number(durationHours.toFixed(2));
}

function renderPlayerRows() {
  elements.playerRows.innerHTML = "";
  renderPlayerSuggestions();

  const partnerOptions = getPartnerNames();

  if (!state.draftSession.players.length) {
    elements.playerRows.innerHTML = `<div class="empty-state">当前还没有玩家，点击“加入玩家”开始记录第一位玩家。</div>`;
    return;
  }

  state.draftSession.players.forEach((player, index) => {
    const fragment = elements.playerTemplate.content.cloneNode(true);
    fragment.querySelector(".row-index").textContent = player.name || `玩家 ${index + 1}`;

    const nameInput = fragment.querySelector(".player-name");
    const buyinTotal = fragment.querySelector(".player-buyin-total");
    const buyinCount = fragment.querySelector(".player-buyin-count");
    const buyinEntry = fragment.querySelector(".player-buyin-entry");
    const addBuyinBtn = fragment.querySelector(".add-buyin");
    const liveCashoutInput = fragment.querySelector(".player-live-cashout");
    const confirmLiveCashoutBtn = fragment.querySelector(".confirm-live-cashout");
    const buyinHistory = fragment.querySelector(".buyin-history");
    const cashoutInput = fragment.querySelector(".player-cashout");
    const profitDisplay = fragment.querySelector(".player-profit-display");
    const playtimeDisplay = fragment.querySelector(".player-playtime");
    const summaryName = fragment.querySelector(".player-summary-name");
    const summaryTime = fragment.querySelector(".player-summary-time");
    const summaryBuyin = fragment.querySelector(".player-summary-buyin");
    const summaryCashout = fragment.querySelector(".player-summary-cashout");
    const statusSelect = fragment.querySelector(".player-settlement-status");
    const partnerSelect = fragment.querySelector(".player-partner-select");
    const settledAmountInput = fragment.querySelector(".player-settled-amount");
    const remainingAmountInput = fragment.querySelector(".player-remaining-amount");
    const insuranceInput = fragment.querySelector(".player-insurance");
    const preview = fragment.querySelector(".player-preview");
    const removeBtn = fragment.querySelector(".remove-player");
    const settlementFields = fragment.querySelectorAll(".settlement-fields");
    const liveGrid = fragment.querySelector(".player-live-grid");
    const settlementDetailGrid = fragment.querySelector(".settlement-detail-grid");
    const cardToggle = fragment.querySelector(".player-card-toggle");
    const details = fragment.querySelector(".player-card-details");
    const summaryBuyinInline = fragment.querySelector(".player-summary-inline-buyin");
    const summaryCashoutInline = fragment.querySelector(".player-summary-inline-cashout");
    const summaryCashoutAction = fragment.querySelector(".player-summary-cashout-action");
    const summaryCashoutInput = fragment.querySelector(".player-summary-live-cashout");
    const summaryCashoutBtn = fragment.querySelector(".confirm-summary-cashout");
    const resumeBtn = fragment.querySelector(".resume-player");
    const article = fragment.querySelector(".player-row");
    const playerCashOutTotal = getPlayerCashOutTotal(player);

    nameInput.value = player.name;
    buyinTotal.textContent = formatCurrency(getPlayerBuyInTotal(player));
    buyinCount.textContent = `${player.buyIns.length}`;
    playtimeDisplay.textContent = formatDuration(getPlayerPlayMs(player));
    cashoutInput.value = player.cashOutRecorded ? playerCashOutTotal : "";
    liveCashoutInput.value = "";
    statusSelect.value = player.settlementStatus;
    settledAmountInput.value = player.settledAmount;
    remainingAmountInput.value = player.remainingAmount;
    insuranceInput.value = player.insuranceProfit;
    partnerSelect.innerHTML = `<option value="">未指定</option>${partnerOptions
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join("")}`;
    partnerSelect.value = player.partnerName;

    const settlementMode = state.draftSession.stage === "settlement";
    summaryName.textContent = player.name || `玩家 ${index + 1}`;
    summaryTime.textContent = formatDuration(getPlayerPlayMs(player));
    summaryBuyin.textContent = formatCurrency(getPlayerBuyInTotal(player));
    summaryCashout.textContent = player.cashOutRecorded ? formatCurrency(playerCashOutTotal) : "无";
    summaryBuyinInline.textContent = `总 Buyin ${formatCurrency(getPlayerBuyInTotal(player))}`;
    summaryCashoutInline.textContent = player.exited || settlementMode
      ? `盈利 ${formatCurrency(getPlayerProfit(player))} · 游戏时间 ${formatDuration(getPlayerPlayMs(player))} · Cash Out ${
          player.cashOutRecorded ? formatCurrency(playerCashOutTotal) : "无"
        }`
      : "";
    const expanded = settlementMode || (state.ui.expandedPlayerId === player.id && !player.exited);
    const compactMode = player.exited && !settlementMode;
    article.classList.toggle("player-row-compact", compactMode);
    article.classList.toggle("player-row-settlement", settlementMode);
    liveGrid.hidden = compactMode || settlementMode;
    settlementDetailGrid.hidden = !settlementMode;
    settlementFields.forEach((section) => {
      section.hidden = !settlementMode;
    });
    details.hidden = !expanded;
    summaryCashoutAction.hidden = compactMode || settlementMode;
    summaryCashoutInput.value = "";
    resumeBtn.hidden = !(player.exited && !settlementMode);

    buyinHistory.innerHTML = player.buyIns.length
      ? player.buyIns
          .map(
            (amount, chipIndex) =>
              `<button class="buyin-chip" data-chip-index="${chipIndex}" type="button">${formatCurrency(amount)} <span>移除</span></button>`
          )
          .join("")
      : `<span class="empty-inline">还没有 buyin / rebuy 记录</span>`;

    profitDisplay.textContent = settlementMode ? formatCurrency(getPlayerProfit(player)) : "--";
    profitDisplay.className = `player-profit-display ${getPlayerProfit(player) >= 0 ? "positive" : "negative"}`;
    preview.innerHTML = getPlayerPreview(player);

    cardToggle.addEventListener("click", () => {
      if (compactMode || settlementMode) return;
      state.ui.expandedPlayerId = state.ui.expandedPlayerId === player.id ? "" : player.id;
      saveState();
      renderPlayerRows();
    });

    nameInput.addEventListener("input", () => {
      player.name = nameInput.value.trim();
      saveState();
      render();
    });

    addBuyinBtn.addEventListener("click", () => {
      const amount = toNumber(buyinEntry.value);
      if (amount <= 0) return;
      ensureSessionStarted();
      ensurePlayerStarted(player);
      player.buyIns.push(amount);
      buyinEntry.value = "";
      saveState();
      render();
    });

    buyinEntry.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addBuyinBtn.click();
      }
    });

    buyinHistory.querySelectorAll(".buyin-chip").forEach((button) => {
      button.addEventListener("click", () => {
        player.buyIns.splice(Number(button.dataset.chipIndex), 1);
        saveState();
        render();
      });
    });

    confirmLiveCashoutBtn.addEventListener("click", () => {
      const amount = toNumber(liveCashoutInput.value);
      if (amount <= 0) return;
      recordPlayerCashout(player, amount);
      saveState();
      render();
    });

    summaryCashoutBtn.addEventListener("click", () => {
      const amount = toNumber(summaryCashoutInput.value);
      if (amount <= 0) return;
      recordPlayerCashout(player, amount);
      saveState();
      render();
    });

    resumeBtn.addEventListener("click", () => {
      resumePlayer(player);
      state.ui.expandedPlayerId = player.id;
      saveState();
      render();
    });

    [cashoutInput, statusSelect, partnerSelect, settledAmountInput, remainingAmountInput, insuranceInput].forEach(
      (input) => {
        const eventName = input === statusSelect || input === partnerSelect ? "change" : "input";
        input.addEventListener(eventName, () => {
          const rawCashout = cashoutInput.value.trim();
          player.cashOutRecorded = rawCashout !== "";
          player.cashOut = rawCashout === "" ? 0 : toNumber(rawCashout);
          player.settlementStatus = statusSelect.value;
          player.partnerName = partnerSelect.value;
          player.settledAmount = toNumber(settledAmountInput.value);
          player.remainingAmount = toNumber(remainingAmountInput.value);
          player.insuranceProfit = toNumber(insuranceInput.value);
          saveState();
          renderFinancials();
        });
      }
    );

    removeBtn.addEventListener("click", () => {
      state.draftSession.players = state.draftSession.players.filter((item) => item.id !== player.id);
      saveState();
      render();
    });

    elements.playerRows.appendChild(fragment);
  });
}

function renderPlayerSuggestions() {
  const names = getAllKnownPlayerNames();
  elements.playerSuggestions.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  if (elements.mergeTargetPlayerInput && document.activeElement !== elements.mergeTargetPlayerInput) {
    const selectedSource = elements.mergeSourcePlayerSelect?.value || "";
    const sourcePlayer = state.players.find((player) => player.id === selectedSource);
    if (!elements.mergeTargetPlayerInput.value.trim() && sourcePlayer) {
      elements.mergeTargetPlayerInput.value = sourcePlayer.name;
    }
  }
}

function renderAddPlayerSuggestions() {
  if (!elements.addPlayerSuggestions) return;
  const query = elements.addPlayerNameInput.value.trim().toLowerCase();
  const matches = getAllKnownPlayerNames()
    .filter((name) => !query || name.toLowerCase().includes(query))
    .slice(0, 8);
  if (!matches.length || !query) {
    elements.addPlayerSuggestions.hidden = true;
    elements.addPlayerSuggestions.innerHTML = "";
    return;
  }
  elements.addPlayerSuggestions.hidden = false;
  elements.addPlayerSuggestions.innerHTML = matches
    .map(
      (name) =>
        `<button class="suggestion-item" type="button" data-player-name="${escapeHtml(name)}">${escapeHtml(
          name
        )}</button>`
    )
    .join("");
}

function handleAddPlayerSuggestionClick(event) {
  const button = event.target.closest("[data-player-name]");
  if (!button) return;
  elements.addPlayerNameInput.value = button.dataset.playerName || "";
  elements.addPlayerSuggestions.hidden = true;
  elements.addPlayerSuggestions.innerHTML = "";
}

function renderPartnerRows() {
  elements.partnerRows.innerHTML = "";
  const partnerShareTotal = sum(state.draftSession.partners.map((partner) => partner.sharePercent));
  const shareIsValid = Math.abs(partnerShareTotal - 100) < 0.01;
  if (elements.partnerShareWarning) {
    elements.partnerShareWarning.hidden = shareIsValid;
    elements.partnerShareWarning.textContent = shareIsValid ? "" : "股份加总有误";
  }

  state.draftSession.partners.forEach((partner) => {
    const fragment = elements.partnerTemplate.content.cloneNode(true);
    const nameInput = fragment.querySelector(".partner-name");
    const shareInput = fragment.querySelector(".partner-share");
    const costInput = fragment.querySelector(".partner-cost");
    const advanceInput = fragment.querySelector(".partner-advance");
    const removeBtn = fragment.querySelector(".remove-partner");

    nameInput.value = partner.name;
    shareInput.value = partner.sharePercent;
    costInput.value = partner.cost;
    advanceInput.value = partner.manualAdvance ?? partner.advance;

    [nameInput, shareInput, costInput, advanceInput].forEach((input) => {
      input.addEventListener("input", () => {
        partner.name = nameInput.value.trim();
        partner.sharePercent = toNumber(shareInput.value);
        partner.cost = toNumber(costInput.value);
        partner.manualAdvance = toNumber(advanceInput.value);
        partner.advance = partner.manualAdvance;
        saveState();
        render();
      });
    });

    removeBtn.addEventListener("click", () => {
      state.draftSession.partners = state.draftSession.partners.filter((item) => item.id !== partner.id);
      if (!state.draftSession.partners.length) state.draftSession.partners = [createPartner("甲")];
      saveState();
      render();
    });

    elements.partnerRows.appendChild(fragment);
  });
}

function renderRebuyOptions() {
  const options = getActiveDraftPlayers()
    .map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`)
    .join("");
  elements.rebuyPlayerSelect.innerHTML = options;
}

function openRebuyModal() {
  renderRebuyOptions();
  if (!elements.rebuyPlayerSelect.options.length) {
    alert("请先添加玩家后再记录 rebuy。");
    return;
  }
  elements.rebuyAmountInput.value = "";
  elements.rebuyModal.showModal();
}

function confirmRebuy() {
  const player = state.draftSession.players.find((item) => item.id === elements.rebuyPlayerSelect.value);
  const amount = toNumber(elements.rebuyAmountInput.value);
  if (!player || amount <= 0) return;
  ensureSessionStarted();
  ensurePlayerStarted(player);
  player.buyIns.push(amount);
  saveState();
  elements.rebuyModal.close();
  render();
}

function openAddPlayerModal() {
  elements.addPlayerNameInput.value = "";
  elements.addPlayerBuyinInput.value = "3000";
  renderAddPlayerSuggestions();
  elements.addPlayerModal.showModal();
}

function confirmAddPlayer() {
  const name = elements.addPlayerNameInput.value.trim();
  const buyin = toNumber(elements.addPlayerBuyinInput.value);
  if (!name || buyin <= 0) return;
  const player = createDraftPlayer();
  player.name = name;
  ensureSessionStarted();
  ensurePlayerStarted(player);
  player.buyIns.push(buyin);
  state.draftSession.players.push(player);
  saveState();
  elements.addPlayerSuggestions.hidden = true;
  elements.addPlayerModal.close();
  render();
}

function openSessionSetupModal() {
  if (!canAccessFullLedger()) {
    focusAuth();
    return;
  }
  const draft = state.draftSession;
  elements.setupSessionNameInput.value = draft.name || "Modern Casino";
  elements.setupSessionDateInput.value = draft.date || getNewYorkNowLocalInput();
  elements.setupSessionLocationInput.value = draft.location || "Fort lee";
  elements.setupCollaborationInput.value = draft.collaboration || "No";
  elements.setupCollaborationNameInput.value = draft.collaborationName || "";
  elements.setupCollaborationShareInput.value = draft.collaborationSharePercent || 0;
  elements.setupDealerShareEnabledInput.value = draft.dealerShareEnabled || "No";
  elements.setupDealerShareInput.value = draft.dealerSharePercent || 0;
  elements.setupDealerNamesInput.value = draft.dealerNames || "";
  elements.sessionSetupModal.showModal();
}

function confirmSessionSetup() {
  state.draftSession.name = elements.setupSessionNameInput.value.trim() || "Modern Casino";
  state.draftSession.date = elements.setupSessionDateInput.value || getNewYorkNowLocalInput();
  state.draftSession.location = elements.setupSessionLocationInput.value.trim() || "Fort lee";
  state.draftSession.collaboration = elements.setupCollaborationInput.value || "No";
  state.draftSession.collaborationName = elements.setupCollaborationNameInput.value.trim();
  state.draftSession.collaborationSharePercent =
    state.draftSession.collaboration === "Yes" ? toNumber(elements.setupCollaborationShareInput.value) : 0;
  state.draftSession.dealerShareEnabled = elements.setupDealerShareEnabledInput.value || "No";
  state.draftSession.dealerSharePercent =
    state.draftSession.dealerShareEnabled === "Yes" ? toNumber(elements.setupDealerShareInput.value) : 0;
  state.draftSession.dealerNames = elements.setupDealerNamesInput.value.trim();
  state.ui.activeView = "accounting";
  saveState();
  elements.sessionSetupModal.close();
  render();
}

function renderFinancials() {
  const summary = computeDraftSummary();
  const finalReady =
    state.draftSession.stage === "settlement" &&
    summary.players.length > 0 &&
    summary.players.every((player) => player.cashOutRecorded);

  elements.sessionCashoutDisplay.value = finalReady ? summary.totalCashOut.toFixed(2) : "0.00";
  elements.profitSummaryCards.innerHTML = [
    metricCard("总 Buyin", formatCurrency(summary.totalBuyIn)),
    metricCard("总 Cash Out", finalReady ? formatCurrency(summary.totalCashOut) : "待牌局结束"),
    metricCard("所有成本", formatCurrency(summary.totalCosts)),
    metricCard("净利润", finalReady ? formatCurrency(summary.netProfit) : "待所有 Cash Out", finalReady ? summary.netProfit >= 0 : null),
    metricCard(
      "Modern 集团净利润",
      finalReady ? formatCurrency(summary.modernNetProfit) : "待所有 Cash Out",
      finalReady ? summary.modernNetProfit >= 0 : null
    ),
    metricCard(
      "Dealer 分红",
      finalReady ? formatCurrency(summary.dealerShareAmount) : "待所有 Cash Out",
      finalReady ? summary.dealerShareAmount >= 0 : null
    ),
    metricCard(
      "合作方分红",
      finalReady ? formatCurrency(summary.collaborationShareAmount) : "待所有 Cash Out",
      finalReady ? summary.collaborationShareAmount >= 0 : null
    ),
  ].join("");

  elements.sessionMetrics.innerHTML = [
    metricCard("参与玩家", `${getNamedDraftPlayers().length}`),
    metricCard("总 Buyin 次数", `${summary.totalBuyInCount}`),
    metricCard("已结账人数", `${summary.settledCount}`),
    metricCard("未结账人数", `${summary.pendingCount}`),
    metricCard("结账余额", formatCurrency(summary.remainingSettlement)),
    metricCard("牌局状态", state.draftSession.stage === "settlement" ? "结算中" : "进行中"),
  ].join("");

  elements.partnerFinalTable.innerHTML = !finalReady
    ? `<div class="empty-state">牌局仍在进行或尚未完成全部 Cash Out，暂不生成最终收益。</div>`
    : summary.partnerResults.length
    ? summary.partnerResults
        .map(
          (partner) => `
            <article class="leaderboard-row">
              <div>
                <h3>${escapeHtml(partner.name || "未命名合伙人")}</h3>
                <p>Modern 分股 ${formatPercent(partner.sharePercent)} · Modern 利润 ${formatCurrency(partner.profitShare)} · 玩家盈利 ${formatCurrency(partner.playerProfit)}</p>
              </div>
              <div>
                <p>最终应收 / 应付</p>
                <strong class="leaderboard-score ${partner.finalAmount >= 0 ? "positive" : "negative"}">${formatCurrency(partner.finalAmount)}</strong>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">请先录入合伙人信息。</div>`;
}

function computeDraftSummary() {
  const players = getNamedDraftPlayers();
  const partners = state.draftSession.partners.filter((partner) => partner.name);
  const totalBuyIn = sum(players.map(getPlayerBuyInTotal));
  const totalCashOut = sum(players.map((player) => player.cashOut));
  const totalBuyInCount = sum(players.map((player) => player.buyIns.length));
  const partnerCosts = sum(partners.map((partner) => partner.cost));
  const totalCosts = state.draftSession.dealerFee + partnerCosts;
  const netProfit = totalBuyIn - totalCashOut - totalCosts;
  const dealerShareAmount = state.draftSession.dealerShareEnabled === "Yes" ? netProfit * (state.draftSession.dealerSharePercent / 100) : 0;
  const collaborationShareAmount = netProfit * (state.draftSession.collaborationSharePercent / 100);
  const modernNetProfit = netProfit - dealerShareAmount - collaborationShareAmount;
  const settledCount = players.filter((player) => player.settlementStatus === "settled").length;
  const pendingCount = players.length - settledCount;
  const remainingSettlement = sum(players.map((player) => player.remainingAmount));
  const partnerShareTotal = sum(partners.map((partner) => partner.sharePercent));
  const partnerPayouts = buildPartnerPayoutMap(players, partners.map((partner) => partner.name));
  const partnerResults = partners.map((partner) => {
    const playerProfit = sum(
      players.filter((player) => player.partnerName === partner.name).map((player) => getPlayerProfit(player))
    );
    const profitShare = partnerShareTotal > 0 ? modernNetProfit * (partner.sharePercent / partnerShareTotal) : 0;
    const manualAdvance = toNumber(partner.manualAdvance ?? partner.advance);
    const advance = manualAdvance + (partnerPayouts.get(partner.name) || 0);
    return {
      ...partner,
      manualAdvance,
      advance,
      profitShare,
      playerProfit,
      finalAmount: profitShare + playerProfit - advance,
    };
  });

  return {
    players,
    partners,
    totalBuyIn,
    totalCashOut,
    totalBuyInCount,
    totalCosts,
    netProfit,
    modernNetProfit,
    dealerShareAmount,
    collaborationShareAmount,
    settledCount,
    pendingCount,
    remainingSettlement,
    partnerResults,
  };
}

function getPlayerPreview(player) {
  const base = [
    `总 Buyin：<strong>${formatCurrency(getPlayerBuyInTotal(player))}</strong>`,
    `Buyin 明细：${player.buyIns.length ? player.buyIns.map(formatCurrency).join(" / ") : "暂无"}`,
  ];

  if (player.cashOuts?.length) {
    base.push(`Cash Out 记录：${player.cashOuts.map(formatCurrency).join(" / ")}`);
  }

  if (state.draftSession.stage === "settlement" || player.exited || player.cashOut > 0) {
    base.push(`Cash Out 合计：${formatCurrency(getPlayerCashOutTotal(player))}`);
    base.push(`游戏时间：${formatDuration(getPlayerPlayMs(player))}`);
    base.push(`盈利：<strong class="${getPlayerProfit(player) >= 0 ? "positive" : "negative"}">${formatCurrency(getPlayerProfit(player))}</strong>`);
  }

  return base.map((line) => `<div>${line}</div>`).join("");
}

function settlementLabel(status) {
  return { pending: "未结账", partial: "部分结账", settled: "已结账" }[status] || "未结账";
}

function getNamedDraftPlayers() {
  return state.draftSession.players.filter((player) => player.name);
}

function getActiveDraftPlayers() {
  return getNamedDraftPlayers().filter((player) => !player.exited);
}

function getPartnerNames() {
  return state.draftSession.partners.map((partner) => partner.name).filter(Boolean);
}

function getPlayerBuyInTotal(player) {
  return sum(player.buyIns);
}

function getPlayerCashOutTotal(player) {
  return toNumber(player.cashOut);
}

function getPlayerProfit(player) {
  return getPlayerCashOutTotal(player) + player.insuranceProfit - getPlayerBuyInTotal(player);
}

function getModernPartnerNamesFromSession(session) {
  return (session?.partners || [])
    .map((partner) => String(partner.name || "").trim())
    .filter(Boolean);
}

function getPlayerOutstandingAmount(player) {
  const profit = toNumber(player.profit ?? getPlayerProfit(player));
  const settledAmount = Math.max(toNumber(player.settledAmount), 0);
  if (profit > 0) return Math.max(profit - settledAmount, 0);
  if (profit < 0) return Math.max(toNumber(player.remainingAmount), 0);
  return 0;
}

function isPlayerSettlementComplete(player) {
  const profit = toNumber(player.profit ?? getPlayerProfit(player));
  const outstanding = getPlayerOutstandingAmount(player);
  if (outstanding > 0.009) return false;
  if (profit > 0 && Math.max(toNumber(player.settledAmount), 0) > 0 && !String(player.partnerName || "").trim()) return false;
  return true;
}

function isSessionSettled(session) {
  if (!session?.players?.length) return false;
  return session.players.every(isPlayerSettlementComplete);
}

function buildPartnerPayoutMap(players, partnerNames) {
  const validPartnerNames = new Set((partnerNames || []).filter(Boolean));
  const payoutMap = new Map();
  players.forEach((player) => {
    const partnerName = String(player.partnerName || "").trim();
    const profit = toNumber(player.profit ?? getPlayerProfit(player));
    if (profit <= 0 || !partnerName || !validPartnerNames.has(partnerName)) return;
    const payout = Math.min(Math.max(toNumber(player.settledAmount), 0), profit);
    if (payout <= 0) return;
    payoutMap.set(partnerName, (payoutMap.get(partnerName) || 0) - payout);
  });
  return payoutMap;
}

function recomputeSavedSession(session) {
  if (!session || typeof session !== "object") return session;
  const players = Array.isArray(session.players) ? session.players : [];
  const partners = Array.isArray(session.partners) ? session.partners : [];
  const totalBuyIn = sum(players.map((player) => toNumber(player.totalBuyIn)));
  const totalCashOut = sum(players.map((player) => toNumber(player.cashOut)));
  const partnerCosts = sum(partners.map((partner) => toNumber(partner.cost)));
  const totalCosts = toNumber(session.dealerFee) + partnerCosts;
  const netProfit = totalBuyIn - totalCashOut - totalCosts;
  const dealerShareAmount = session.dealerShareEnabled === "Yes" ? netProfit * (toNumber(session.dealerSharePercent) / 100) : 0;
  const collaborationShareAmount = netProfit * (toNumber(session.collaborationSharePercent) / 100);
  const modernNetProfit = netProfit - dealerShareAmount - collaborationShareAmount;
  const partnerShareTotal = sum(partners.map((partner) => toNumber(partner.sharePercent)));
  const partnerPayouts = buildPartnerPayoutMap(players, partners.map((partner) => partner.name));
  const recomputedPartners = partners.map((partner) => {
    const playerProfit = sum(
      players
        .filter((player) => String(player.partnerName || "").trim() === String(partner.name || "").trim())
        .map((player) => toNumber(player.profit))
    );
    const profitShare = partnerShareTotal > 0 ? modernNetProfit * (toNumber(partner.sharePercent) / partnerShareTotal) : 0;
    const manualAdvance = toNumber(partner.manualAdvance ?? partner.advance);
    const advance = manualAdvance + (partnerPayouts.get(partner.name) || 0);
    return {
      ...partner,
      manualAdvance,
      advance,
      profitShare,
      playerProfit,
      finalAmount: profitShare + playerProfit - advance,
    };
  });

  return {
    ...session,
    totalBuyIn,
    totalCashOut,
    totalCosts,
    netProfit,
    modernNetProfit,
    dealerShareAmount,
    collaborationShareAmount,
    partners: recomputedPartners,
  };
}

function getSavedSessionMetrics(session) {
  const hours = Math.max(toNumber(session.durationHours), 0);
  const grossRake = toNumber(session.totalBuyIn) - toNumber(session.totalCashOut);
  return {
    grossRake,
    hourlyRake: hours ? grossRake / hours : 0,
    hourlyNetProfit: hours ? toNumber(session.netProfit) / hours : 0,
  };
}

function getSavedSessionPartnerDetail(session, partner) {
  const partnerName = String(partner.name || "").trim();
  const tableProfit = sum(
    (session.players || [])
      .filter((player) => String(player.name || "").trim() === partnerName)
      .map((player) => toNumber(player.profit))
  );
  const balanceWithSession = toNumber(partner.profitShare) - toNumber(partner.cost) - toNumber(partner.advance);
  return {
    profitShare: toNumber(partner.profitShare),
    cost: toNumber(partner.cost),
    advance: toNumber(partner.advance),
    tableProfit,
    actualTakeHome: balanceWithSession + tableProfit,
    balanceWithSession,
  };
}

function saveSession() {
  if (!state.draftSession.name || !getNamedDraftPlayers().length) {
    alert("请先填写牌局名称并录入玩家。");
    return;
  }

  if (state.draftSession.stage !== "settlement") {
    alert("请先结束牌局并进入结算，再保存最终账单。");
    return;
  }

  const unsettledPlayers = getNamedDraftPlayers().filter((player) => !player.cashOutRecorded);
  if (unsettledPlayers.length) {
    alert("请先完成所有玩家的 Cash Out 记录，再保存最终账单。");
    return;
  }

  const summary = computeDraftSummary();
  const session = {
    id: crypto.randomUUID(),
    name: state.draftSession.name,
    date: state.draftSession.date,
    location: state.draftSession.location,
    dealerNames: state.draftSession.dealerNames,
    dealerSharePercent: state.draftSession.dealerSharePercent,
    dealerShareEnabled: state.draftSession.dealerShareEnabled,
    collaborationName: state.draftSession.collaborationName,
    collaborationSharePercent: state.draftSession.collaborationSharePercent,
    durationHours: state.draftSession.durationHours,
    notes: state.draftSession.notes,
    stage: state.draftSession.stage,
    dealerFee: state.draftSession.dealerFee,
    totalBuyIn: summary.totalBuyIn,
    totalCashOut: summary.totalCashOut,
    totalCosts: summary.totalCosts,
    netProfit: summary.netProfit,
    players: summary.players.map((player) => ({
      playerId: upsertPlayer(player.name),
      name: player.name,
      buyInEntries: [...player.buyIns],
      totalBuyIn: getPlayerBuyInTotal(player),
      cashOut: getPlayerCashOutTotal(player),
      cashOutHistory: [...(player.cashOuts || [])],
      cashOutRecorded: player.cashOutRecorded,
      insuranceProfit: player.insuranceProfit,
      profit: getPlayerProfit(player),
      playMs: getPlayerPlayMs(player),
      settlementStatus: player.settlementStatus,
      settledAmount: player.settledAmount,
      remainingAmount: player.remainingAmount,
      partnerName: player.partnerName,
    })),
    partners: summary.partnerResults.map((partner) => ({
      name: partner.name,
      sharePercent: partner.sharePercent,
      cost: partner.cost,
      manualAdvance: partner.manualAdvance,
      advance: partner.advance,
      profitShare: partner.profitShare,
      playerProfit: partner.playerProfit,
      finalAmount: partner.finalAmount,
    })),
    createdAt: new Date().toISOString(),
  };

  state.sessions.unshift(session);
  state.draftSession = createDefaultDraftSession();
  state.ui.activeView = "history";
  saveState();
  render();
}

function finalizeLiveSession() {
  const nowIso = new Date().toISOString();
  state.draftSession.endedAt = nowIso;
  state.draftSession.durationHours = Number((getSessionDurationMs() / 3600000).toFixed(2));
  state.draftSession.players.forEach((player) => {
    if (!player.startedAt || player.exited) return;
    player.totalPlayMs = getPlayerPlayMs(player, nowIso);
    player.startedAt = "";
    player.endedAt = nowIso;
    player.pausedForSettlement = true;
  });
}

function resumeLiveSession() {
  state.draftSession.endedAt = "";
  state.draftSession.players.forEach((player) => {
    if (player.exited || !player.pausedForSettlement) return;
    player.startedAt = new Date().toISOString();
    player.endedAt = "";
    player.pausedForSettlement = false;
  });
}

function ensureSessionStarted() {
  if (!state.draftSession.startedAt) {
    state.draftSession.startedAt = new Date().toISOString();
  }
}

function ensurePlayerStarted(player) {
  if (!player.startedAt) {
    player.startedAt = new Date().toISOString();
    player.endedAt = "";
    player.pausedForSettlement = false;
  }
}

function recordPlayerCashout(player, amount) {
  player.cashOuts = Array.isArray(player.cashOuts) ? player.cashOuts : [];
  player.cashOuts.push(amount);
  player.cashOut = sum(player.cashOuts);
  player.cashOutRecorded = true;
  exitPlayer(player);
}

function exitPlayer(player) {
  const nowIso = new Date().toISOString();
  if (!player.startedAt) player.startedAt = nowIso;
  player.totalPlayMs = getPlayerPlayMs(player, nowIso);
  player.startedAt = "";
  player.endedAt = nowIso;
  player.exited = true;
  player.pausedForSettlement = false;
}

function resumePlayer(player) {
  player.exited = false;
  player.startedAt = new Date().toISOString();
  player.endedAt = "";
  player.pausedForSettlement = false;
  player.cashOutRecorded = false;
}

function getSessionDurationMs() {
  const { startedAt, endedAt } = state.draftSession;
  if (!startedAt) return 0;
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return Math.max(end - new Date(startedAt).getTime(), 0);
}

function getPlayerPlayMs(player, fallbackEndIso = "") {
  const total = toNumber(player.totalPlayMs);
  if (!player.startedAt) return total;
  const end = player.endedAt || fallbackEndIso || (state.draftSession.endedAt ? state.draftSession.endedAt : new Date().toISOString());
  return total + Math.max(new Date(end).getTime() - new Date(player.startedAt).getTime(), 0);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function getNewYorkNowLocalInput() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date()).replace(" ", "T");
}

function formatSetupDate(value) {
  return String(value || "").replace("T", " ");
}

function formatPercent(value) {
  return `${toNumber(value).toFixed(2)}%`;
}

function calculateModernSharePercent(draft = state.draftSession) {
  const dealerShare = draft.dealerShareEnabled === "Yes" ? toNumber(draft.dealerSharePercent) : 0;
  const collaborationShare = toNumber(draft.collaborationSharePercent);
  return Math.max(0, 100 - dealerShare - collaborationShare);
}

function isDefaultModernPartner(partner) {
  return [
    ["Blue", 39.6],
    ["项往", 29.7],
    ["JW", 29.7],
    ["Kanye", 1],
  ].some(([name, share]) => partner.name === name && Math.abs(toNumber(partner.sharePercent) - share) < 0.001);
}

function renderHistory() {
  const cards = [];
  const filter = elements.historySettlementFilter?.value || "all";
  const unsettledSessions = [];
  const settledSessions = [];

  if (hasDraftActivity()) {
    const draft = buildDraftSessionSnapshot();
    cards.push(`
      <article class="session-item session-item-live">
        <div class="session-item-top">
          <div>
            <h3>${escapeHtml(draft.name)}</h3>
            <p class="session-item-meta">实时账单 · ${escapeHtml(draft.stageLabel)} · ${escapeHtml(draft.date)} · ${escapeHtml(draft.location)}</p>
          </div>
          <button class="ghost-button" type="button" data-history-action="open-draft">${draft.openLabel}</button>
        </div>
        <div class="player-tag-list">
          ${draft.players
            .map((player) => `<span class="player-tag">${escapeHtml(player.name)} Buyin ${formatCurrency(player.totalBuyIn)}</span>`)
            .join("")}
        </div>
        <p class="session-item-meta">
          总 Buyin ${formatCurrency(draft.totalBuyIn)} · 总 Cash Out ${formatCurrency(draft.totalCashOut)} · 所有成本 ${formatCurrency(draft.totalCosts)}
        </p>
      </article>
    `);
  }

  if (!state.sessions.length && !cards.length) {
    elements.sessionList.innerHTML = `<div class="empty-state">暂无往期账单。</div>`;
    return;
  }

  state.sessions.forEach((session) => {
    const settled = isSessionSettled(session);
    if (filter === "settled" && !settled) return;
    if (filter === "unsettled" && settled) return;
    const card = `
      <article class="session-item">
        <div class="session-item-top">
          <div>
            <h3>${escapeHtml(session.name)}</h3>
            <p class="session-item-meta">${escapeHtml(session.date)} · ${escapeHtml(session.location || "未填写地点")} · ${toNumber(session.durationHours).toFixed(2)} 小时</p>
          </div>
          <div class="toolbar wrap end">
            <span class="settlement-badge ${settled ? "settlement-badge-settled" : "settlement-badge-unsettled"}">${settled ? "已结清" : "未结清"}</span>
            <strong class="${session.netProfit >= 0 ? "positive" : "negative"}">${formatCurrency(session.netProfit)}</strong>
          </div>
        </div>
        <div class="session-summary-grid">
          <div class="session-summary-item"><span>总 Cash In</span><strong>${formatCurrency(session.totalBuyIn)}</strong></div>
          <div class="session-summary-item"><span>总 Cash Out</span><strong>${formatCurrency(session.totalCashOut)}</strong></div>
          <div class="session-summary-item"><span>总成本</span><strong>${formatCurrency(session.totalCosts)}</strong></div>
          <div class="session-summary-item"><span>盈利</span><strong class="${session.netProfit >= 0 ? "positive" : "negative"}">${formatCurrency(session.netProfit)}</strong></div>
        </div>
        <div class="toolbar wrap">
          <button class="ghost-button" type="button" data-history-action="open-session-detail" data-session-id="${session.id}">详情</button>
          <button class="ghost-button" type="button" data-history-action="open-session-settlement" data-session-id="${session.id}">结账记录</button>
          <button class="ghost-button danger-button" type="button" data-history-action="delete-session" data-session-id="${session.id}">删除</button>
        </div>
      </article>
    `;
    if (settled) {
      settledSessions.push(card);
    } else {
      unsettledSessions.push(card);
    }
  });

  if (filter === "all") {
    if (unsettledSessions.length) {
      cards.push(`<section class="history-group"><div class="section-head compact"><div><h3>未结清账单</h3></div></div>${unsettledSessions.join("")}</section>`);
    }
    if (settledSessions.length) {
      cards.push(`<section class="history-group"><div class="section-head compact"><div><h3>已结清账单</h3></div></div>${settledSessions.join("")}</section>`);
    }
  } else {
    cards.push(...(filter === "settled" ? settledSessions : unsettledSessions));
  }

  if (!cards.length) {
    elements.sessionList.innerHTML = `<div class="empty-state">当前筛选下暂无账单。</div>`;
    return;
  }

  elements.sessionList.innerHTML = cards.join("");
}

function hasDraftActivity() {
  const draft = state.draftSession;
  return Boolean(
    draft.players.length ||
      draft.startedAt ||
      draft.dealerFee > 0 ||
      draft.partners.some(
        (partner) =>
          partner.cost > 0 ||
          partner.advance !== 0 ||
          !isDefaultModernPartner(partner)
      )
  );
}

function buildDraftSessionSnapshot() {
  const summary = computeDraftSummary();
  return {
    name: state.draftSession.name || "未命名牌局",
    date: formatSetupDate(state.draftSession.date),
    location: state.draftSession.location || "未填写地点",
    stageLabel: state.draftSession.stage === "settlement" ? "结算中" : "进行中",
    openLabel: state.draftSession.stage === "settlement" ? "继续结算" : "继续记账",
    players: summary.players.map((player) => ({
      name: player.name,
      totalBuyIn: getPlayerBuyInTotal(player),
    })),
    totalBuyIn: summary.totalBuyIn,
    totalCashOut: summary.totalCashOut,
    totalCosts: summary.totalCosts,
  };
}

function handleHistoryActions(event) {
  if (!canAccessFullLedger()) {
    focusAuth();
    return;
  }
  const button = event.target.closest("[data-history-action]");
  if (!button) return;
  if (button.dataset.historyAction === "open-draft") {
    state.ui.activeView = "accounting";
    saveState();
    render();
  }
  if (button.dataset.historyAction === "open-session") {
    openHistorySessionModal(button.dataset.sessionId, "settlement");
  }
  if (button.dataset.historyAction === "open-session-detail") {
    openHistorySessionModal(button.dataset.sessionId, "detail");
  }
  if (button.dataset.historyAction === "open-session-settlement") {
    openHistorySessionModal(button.dataset.sessionId, "settlement");
  }
  if (button.dataset.historyAction === "delete-session") {
    deleteSession(button.dataset.sessionId);
  }
}

function handleHistorySessionActions(event) {
  const button = event.target.closest("[data-history-action]");
  if (!button) return;
  if (button.dataset.historyAction === "toggle-history-settlement-player") {
    const playerKey = button.dataset.playerKey || "";
    state.ui.expandedHistorySettlementPlayerKey =
      state.ui.expandedHistorySettlementPlayerKey === playerKey ? "" : playerKey;
    activeHistorySettlementPlayerKey = state.ui.expandedHistorySettlementPlayerKey;
    saveState();
    const session = state.sessions.find((item) => item.id === activeHistorySessionId);
    if (session) openHistorySessionModal(session.id, "settlement");
  }
}

function deleteSession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;
  if (!window.confirm(`确认删除账单“${session.name}”吗？此操作不可撤回。`)) return;
  state.sessions = state.sessions.filter((item) => item.id !== sessionId);
  if (activeHistorySessionId === sessionId && elements.historySessionModal.open) {
    elements.historySessionModal.close();
    activeHistorySessionId = "";
    activeHistorySettlementPlayerKey = "";
  }
  saveState();
  render();
}

function renderStats() {
  renderOverview();
  renderDebtSummary();
  renderPlayerOptions();
  renderPlayerInsight();
  renderLeaderboard();
}

function renderOverview() {
  const totalBuyIn = sum(state.sessions.map((session) => session.totalBuyIn));
  const totalCashOut = sum(state.sessions.map((session) => session.totalCashOut));
  const totalCosts = sum(state.sessions.map((session) => session.totalCosts));
  const totalNetProfit = sum(state.sessions.map((session) => session.netProfit));
  elements.overviewGrid.innerHTML = [
    metricCard("累计牌局", `${state.sessions.length}`),
    metricCard("累计玩家", `${state.players.length}`),
    metricCard("总 Buyin", formatCurrency(totalBuyIn)),
    metricCard("总 Cash Out", formatCurrency(totalCashOut)),
    metricCard("总成本", formatCurrency(totalCosts)),
    metricCard("总净盈利", formatCurrency(totalNetProfit), totalNetProfit >= 0),
  ].join("");
}

function renderDebtSummary() {
  const debtMap = new Map();
  state.sessions.forEach((session) => {
    session.players.forEach((player) => {
      const debt = toNumber(player.remainingAmount);
      const profit = toNumber(player.profit);
      if (debt <= 0 || profit > 0) return;
      const current = debtMap.get(player.name) || 0;
      debtMap.set(player.name, current + debt);
    });
  });

  if (!debtMap.size) {
    elements.debtSummary.className = "player-insight empty-state";
    elements.debtSummary.innerHTML = "暂无欠款记录。";
    return;
  }

  const debts = [...debtMap.entries()].sort((a, b) => b[1] - a[1]);
  const totalDebt = debts.reduce((sumValue, [, amount]) => sumValue + amount, 0);
  elements.debtSummary.className = "player-insight";
  elements.debtSummary.innerHTML = `
    <div class="insight-grid">
      ${metricCard("欠款人数", `${debts.length}`)}
      ${metricCard("累计欠款", formatCurrencyAbs(totalDebt), false)}
    </div>
    <div class="partner-final-table">
      ${debts
        .map(
          ([name, amount]) => `
            <article class="leaderboard-row">
              <div>
                <h3>${escapeHtml(name)}</h3>
                <p>欠 Modern 集团</p>
              </div>
              <strong class="leaderboard-score negative">${formatCurrencyAbs(amount)}</strong>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function openHistorySessionModal(sessionId, mode = "settlement") {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;
  activeHistorySessionId = sessionId;
  activeHistorySessionMode = mode;
  activeHistorySettlementPlayerKey = state.ui.expandedHistorySettlementPlayerKey || "";
  const partnerNames = getModernPartnerNamesFromSession(session);
  const settled = isSessionSettled(session);
  elements.historySessionModalTitle.textContent = mode === "detail" ? `${session.name} 详情` : `${session.name} 结账记录`;
  elements.shareLinkStatus.textContent = "";
  elements.generateShareLinkBtn.hidden = !authContext.member;
  elements.historySessionDetail.innerHTML =
    mode === "detail"
      ? renderHistorySessionDetail(session, settled)
      : renderHistorySessionSettlement(session, partnerNames);
  if (mode === "settlement") {
    elements.historySessionDetail.querySelectorAll("[data-history-player-field]").forEach((field) => {
      field.addEventListener("input", updateHistorySessionPlayerField);
      field.addEventListener("change", updateHistorySessionPlayerField);
    });
  } else {
    elements.historySessionDetail.querySelectorAll("[data-history-partner-field]").forEach((field) => {
      field.addEventListener("input", updateHistorySessionPartnerField);
      field.addEventListener("change", updateHistorySessionPartnerField);
    });
  }
  if (!elements.historySessionModal.open) {
    elements.historySessionModal.showModal();
  }
}

function updateHistorySessionPlayerField(event) {
  const field = event.target.dataset.historyPlayerField;
  const session = state.sessions.find((item) => item.id === event.target.dataset.sessionId);
  const player = session?.players?.[Number(event.target.dataset.playerIndex)];
  if (!session || !player || !field) return;
  const partnerNames = getModernPartnerNamesFromSession(session);
  if (field === "partnerName") {
    const partnerName = String(event.target.value || "").trim();
    player.partnerName = partnerName && partnerNames.includes(partnerName) ? partnerName : "";
  } else {
    player[field] = ["settledAmount", "remainingAmount"].includes(field) ? toNumber(event.target.value) : event.target.value;
  }
  const profit = toNumber(player.profit);
  if (profit > 0) {
    player.settledAmount = Math.min(Math.max(toNumber(player.settledAmount), 0), profit);
    player.remainingAmount = 0;
  } else {
    player.remainingAmount = Math.max(toNumber(player.remainingAmount), 0);
  }
  Object.assign(session, recomputeSavedSession(session));
  saveState();
  openHistorySessionModal(session.id, "settlement");
  renderHistory();
  renderStats();
}

function updateHistorySessionPartnerField(event) {
  const field = event.target.dataset.historyPartnerField;
  const session = state.sessions.find((item) => item.id === event.target.dataset.sessionId);
  const partner = session?.partners?.[Number(event.target.dataset.partnerIndex)];
  if (!session || !partner || !field) return;
  partner[field] = toNumber(event.target.value);
  if (field === "manualAdvance") {
    partner.advance = partner.manualAdvance;
  }
  Object.assign(session, recomputeSavedSession(session));
  saveState();
  openHistorySessionModal(session.id, "detail");
  renderHistory();
  renderStats();
}

async function generateShareLinkForActiveSession() {
  if (!activeHistorySessionId || !authContext.client || !authContext.member) return;
  const session = state.sessions.find((item) => item.id === activeHistorySessionId);
  if (!session) return;
  const shareTokenValue = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  elements.generateShareLinkBtn.disabled = true;
  try {
    const payload = {
      workspace_id: config.workspaceId,
      session_id: session.id,
      session_name: session.name,
      share_token: shareTokenValue,
      share_snapshot: cloneState(session),
      expires_at: expiresAt,
      created_by: authContext.user?.email || authContext.member.email,
    };
    const { error } = await authContext.client.from(config.shareTable).insert(payload);
    if (error) throw error;
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareTokenValue}`;
    await navigator.clipboard.writeText(shareUrl);
    elements.shareLinkStatus.textContent = `分享链接已复制，14 天有效：${formatSyncTime(expiresAt)}`;
  } catch (error) {
    console.error("generate share link failed", error);
    elements.shareLinkStatus.textContent = "生成分享链接失败，请先执行新的 Supabase SQL。";
  } finally {
    elements.generateShareLinkBtn.disabled = false;
  }
}

function renderHistorySessionDetail(session, settled) {
  const summary = getSavedSessionMetrics(session);
  return `
    <section class="subcard history-detail-summary">
      <div class="session-item-top">
        <div>
          <h4>${escapeHtml(session.name)}</h4>
          <p class="session-item-meta">${escapeHtml(session.date)} · ${escapeHtml(session.location || "未填写地点")} · ${toNumber(session.durationHours).toFixed(2)} 小时</p>
        </div>
        <span class="settlement-badge ${settled ? "settlement-badge-settled" : "settlement-badge-unsettled"}">${settled ? "已结清" : "未结清"}</span>
      </div>
      <div class="session-summary-grid">
        <div class="session-summary-item"><span>净利润</span><strong class="${session.netProfit >= 0 ? "positive" : "negative"}">${formatCurrency(session.netProfit)}</strong></div>
        <div class="session-summary-item"><span>Hourly 抽水</span><strong class="${summary.hourlyRake >= 0 ? "positive" : "negative"}">${formatCurrency(summary.hourlyRake)}</strong></div>
        <div class="session-summary-item"><span>Hourly 净利润</span><strong class="${summary.hourlyNetProfit >= 0 ? "positive" : "negative"}">${formatCurrency(summary.hourlyNetProfit)}</strong></div>
        <div class="session-summary-item"><span>总抽水</span><strong class="${summary.grossRake >= 0 ? "positive" : "negative"}">${formatCurrency(summary.grossRake)}</strong></div>
      </div>
    </section>
    <section class="stack">
      <section class="subcard">
        <div class="section-head compact">
          <div>
            <p class="section-kicker">Partner Detail</p>
            <h4>合伙人账务</h4>
          </div>
        </div>
        <div class="partner-detail-list">
          ${session.partners
            .map((partner, index) => {
              const detail = getSavedSessionPartnerDetail(session, partner);
              return `
                <article class="partner-detail-card">
                  <div class="section-head compact">
                    <div>
                      <h4>${escapeHtml(partner.name || `合伙人 ${index + 1}`)}</h4>
                      <p class="session-item-meta">应得分水 ${formatCurrency(detail.profitShare)} · 在桌输赢 ${formatCurrency(detail.tableProfit)}</p>
                    </div>
                  </div>
                  <div class="grid two">
                    <label>
                      <span>成本（可编辑）</span>
                      <input data-history-partner-field="cost" data-session-id="${session.id}" data-partner-index="${index}" type="number" step="0.01" value="${toNumber(partner.cost)}" />
                    </label>
                    <label>
                      <span>收账 / 垫账（可编辑）</span>
                      <input data-history-partner-field="manualAdvance" data-session-id="${session.id}" data-partner-index="${index}" type="number" step="0.01" value="${toNumber(partner.manualAdvance ?? partner.advance)}" />
                    </label>
                  </div>
                  <div class="session-summary-grid history-summary-grid">
                    <div class="session-summary-item"><span>应得分水</span><strong>${formatCurrency(detail.profitShare)}</strong></div>
                    <div class="session-summary-item"><span>当前收账 / 垫账</span><strong class="${detail.advance <= 0 ? "positive" : "negative"}">${formatCurrency(detail.advance)}</strong></div>
                    <div class="session-summary-item"><span>实际应到手利润</span><strong class="${detail.actualTakeHome >= 0 ? "positive" : "negative"}">${formatCurrency(detail.actualTakeHome)}</strong></div>
                    <div class="session-summary-item"><span>与局里账务</span><strong class="${detail.balanceWithSession >= 0 ? "positive" : "negative"}">${formatCurrency(detail.balanceWithSession)}</strong></div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    </section>
    <section class="stack">
      ${session.players
        .map(
          (player, index) => `
            <article class="subcard history-player-card">
              <div class="section-head compact">
                <div>
                  <h4>${escapeHtml(player.name || `玩家 ${index + 1}`)}</h4>
                  <p class="session-item-meta">总 Buyin ${formatCurrency(player.totalBuyIn)} · Cash Out ${formatCurrency(player.cashOut)} · 盈亏 ${formatCurrency(player.profit)}</p>
                </div>
              </div>
              <div class="session-summary-grid history-summary-grid">
                <div class="session-summary-item"><span>结账状态</span><strong>${escapeHtml(settlementLabel(player.settlementStatus))}</strong></div>
                <div class="session-summary-item"><span>已结金额</span><strong>${formatCurrency(toNumber(player.settledAmount))}</strong></div>
                <div class="session-summary-item"><span>未结金额</span><strong>${formatCurrency(getPlayerOutstandingAmount(player))}</strong></div>
                <div class="session-summary-item"><span>收款人</span><strong>${escapeHtml(player.partnerName || "未记录")}</strong></div>
              </div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderHistorySessionSettlement(session, partnerNames) {
  return session.players
    .map((player, index) => {
      const profit = toNumber(player.profit);
      const outstanding = getPlayerOutstandingAmount(player);
      const playerKey = `${session.id}:${index}`;
      const expanded = activeHistorySettlementPlayerKey === playerKey;
      return `
        <article class="subcard history-player-card">
          <button class="history-player-toggle" type="button" data-history-action="toggle-history-settlement-player" data-player-key="${playerKey}">
            <span>
              <strong>${escapeHtml(player.name || `玩家 ${index + 1}`)}</strong>
              <small>总 Buyin ${formatCurrency(player.totalBuyIn)} · Cash Out ${formatCurrency(player.cashOut)} · 盈亏 ${formatCurrency(player.profit)}</small>
            </span>
            <span>${expanded ? "收起" : "编辑结账"}</span>
          </button>
          <div class="grid four" ${expanded ? "" : "hidden"}>
            <label>
              <span>结账状态</span>
              <select data-history-player-field="settlementStatus" data-session-id="${session.id}" data-player-index="${index}">
                ${["pending", "partial", "settled"]
                  .map((status) => `<option value="${status}" ${player.settlementStatus === status ? "selected" : ""}>${settlementLabel(status)}</option>`)
                  .join("")}
              </select>
            </label>
            <label>
              <span>已结金额</span>
              <input data-history-player-field="settledAmount" data-session-id="${session.id}" data-player-index="${index}" type="number" step="0.01" value="${toNumber(player.settledAmount)}" />
            </label>
            <label>
              <span>${profit > 0 ? "未结金额" : "剩余欠款"}</span>
              <input data-history-player-field="remainingAmount" data-session-id="${session.id}" data-player-index="${index}" type="number" step="0.01" value="${profit > 0 ? outstanding : toNumber(player.remainingAmount)}" ${profit > 0 ? "readonly" : ""} />
            </label>
            <label>
              <span>收款人</span>
              <select data-history-player-field="partnerName" data-session-id="${session.id}" data-player-index="${index}">
                <option value="">未记录</option>
                ${partnerNames
                  .map((partnerName) => `<option value="${escapeHtml(partnerName)}" ${player.partnerName === partnerName ? "selected" : ""}>${escapeHtml(partnerName)}</option>`)
                  .join("")}
              </select>
            </label>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPlayerOptions() {
  const selected = elements.playerInsightSelect.value;
  const sortedPlayers = state.players
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
    .map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`)
    .join("");
  elements.playerInsightSelect.innerHTML = sortedPlayers;
  elements.mergeSourcePlayerSelect.innerHTML = `<option value="">选择需要合并的玩家</option>${sortedPlayers}`;
  if (selected) elements.playerInsightSelect.value = selected;
}

function mergePlayers() {
  const sourceId = elements.mergeSourcePlayerSelect.value;
  const targetName = String(elements.mergeTargetPlayerInput.value || "").trim();
  const sourcePlayer = state.players.find((player) => player.id === sourceId);
  if (!sourcePlayer || !targetName) return;
  const sourceName = sourcePlayer.name;
  const normalizedTargetName = targetName;
  const existingTarget = state.players.find(
    (player) => player.id !== sourceId && player.name.toLowerCase() === normalizedTargetName.toLowerCase()
  );
  const targetId = existingTarget?.id || sourcePlayer.id;
  const finalTargetName = existingTarget?.name || normalizedTargetName;

  state.sessions.forEach((session) => {
    session.players.forEach((player) => {
      const sameSource = player.playerId === sourceId || String(player.name || "").trim().toLowerCase() === sourceName.toLowerCase();
      if (!sameSource) return;
      player.playerId = targetId;
      player.name = finalTargetName;
    });
    Object.assign(session, recomputeSavedSession(session));
  });

  state.draftSession.players.forEach((player) => {
    if (String(player.name || "").trim().toLowerCase() === sourceName.toLowerCase()) {
      player.name = finalTargetName;
    }
  });

  if (existingTarget) {
    state.players = state.players.filter((player) => player.id !== sourceId);
  } else {
    sourcePlayer.name = finalTargetName;
  }

  elements.mergePlayersStatus.textContent = `${sourceName} 已合并到 ${finalTargetName}`;
  elements.mergeSourcePlayerSelect.value = "";
  elements.mergeTargetPlayerInput.value = finalTargetName;
  saveState();
  render();
}

function renderPlayerInsight() {
  const playerId = elements.playerInsightSelect.value || state.players[0]?.id;
  if (!playerId) {
    elements.playerInsight.className = "player-insight empty-state";
    elements.playerInsight.innerHTML = "暂无玩家数据。";
    return;
  }

  const stats = getPlayerStats(playerId);
  elements.playerInsight.className = "player-insight";
  elements.playerInsight.innerHTML = `
    <div class="insight-grid">
      ${metricCard("累计净盈利", formatCurrency(stats.netProfit), stats.netProfit >= 0)}
      ${metricCard("平均买入", formatCurrency(stats.averageBuyIn))}
      ${metricCard("每小时盈利", formatCurrency(stats.hourlyProfit), stats.hourlyProfit >= 0)}
      ${metricCard("参与场次", `${stats.sessionCount}`)}
      ${metricCard("累计 Cash Out", formatCurrency(stats.totalCashOut))}
      ${metricCard("ROI", `${stats.roi.toFixed(1)}%`, stats.roi >= 0)}
    </div>
    <div class="chart-card">
      <h3>${escapeHtml(stats.name)} 盈利曲线</h3>
      ${renderProfitChart(stats.profitCurve)}
    </div>
  `;
}

function getPlayerStats(playerId) {
  const player = state.players.find((item) => item.id === playerId);
  const entries = state.sessions
    .map((session) => session.players.find((entry) => entry.playerId === playerId))
    .filter(Boolean);
  const sessionCount = entries.length;
  const totalBuyIn = sum(entries.map((entry) => entry.totalBuyIn));
  const totalCashOut = sum(entries.map((entry) => entry.cashOut));
  const netProfit = sum(entries.map((entry) => entry.profit));
  const totalHours = sum(
    state.sessions
      .filter((session) => session.players.some((entry) => entry.playerId === playerId))
      .map((session) => session.durationHours)
  );
  let running = 0;
  const profitCurve = entries.map((entry, index) => {
    running += entry.profit;
    return { label: `${index + 1}`, value: running };
  });

  return {
    name: player?.name || "",
    sessionCount,
    averageBuyIn: sessionCount ? totalBuyIn / sessionCount : 0,
    totalCashOut,
    netProfit,
    hourlyProfit: totalHours ? netProfit / totalHours : 0,
    roi: totalBuyIn ? (netProfit / totalBuyIn) * 100 : 0,
    profitCurve,
  };
}

function renderLeaderboard() {
  const metric = elements.leaderboardMetric.value;
  const filters = elements.leaderboardFilter.value.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
  const stats = state.players
    .map((player) => ({ id: player.id, name: player.name, ...getPlayerStats(player.id) }))
    .filter((player) => !filters.length || filters.includes(player.name))
    .sort((a, b) => (b[metric] || 0) - (a[metric] || 0));

  elements.leaderboard.innerHTML = stats.length
    ? stats
        .map(
          (player, index) => `
            <article class="leaderboard-row">
              <div class="toolbar">
                <span class="leaderboard-rank">${index + 1}</span>
                <div>
                  <h3>${escapeHtml(player.name)}</h3>
                  <p>${player.sessionCount} 场 · ROI ${player.roi.toFixed(1)}%</p>
                </div>
              </div>
              <strong class="leaderboard-score ${(player[metric] || 0) >= 0 ? "positive" : "negative"}">${
                metric === "sessionCount" ? player[metric] : formatCurrency(player[metric] || 0)
              }</strong>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">暂无可统计数据。</div>`;
}

function renderHeroStats() {
  elements.heroSessionCount.textContent = `${state.sessions.length}`;
  elements.heroPlayerCount.textContent = `${state.players.length}`;
}

function upsertPlayer(name) {
  const normalized = name.trim();
  const existing = state.players.find((player) => player.name === normalized);
  if (existing) return existing.id;
  const player = { id: crypto.randomUUID(), name: normalized };
  state.players.push(player);
  return player.id;
}

function getAllKnownPlayerNames() {
  return [...new Set(state.players.map((player) => player.name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "zh-CN")
  );
}

function renderProfitChart(points) {
  if (!points.length) return `<div class="empty-state">暂无曲线数据。</div>`;
  const width = 640;
  const height = 200;
  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points
    .map((point, index) => `${index * step},${height - ((point.value - min) / range) * height}`)
    .join(" ");
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline class="baseline" points="0,${height - ((0 - min) / range) * height} ${width},${height - ((0 - min) / range) * height}"></polyline><polyline points="${coords}"></polyline></svg>`;
}

function metricCard(label, value, positive = null) {
  const className = positive === null ? "" : positive ? "positive" : "negative";
  return `<article class="overview-card"><p>${label}</p><strong class="${className}">${value}</strong></article>`;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toFixed(2)}`;
}

function formatCurrencyAbs(value) {
  return Number(Math.abs(value || 0)).toFixed(2);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sum(values) {
  return values.reduce((total, current) => total + Number(current || 0), 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
