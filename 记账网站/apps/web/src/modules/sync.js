export function createSyncModule(runtime) {
  const { STORAGE_KEY, config, shareToken, state, authContext, syncContext, elements } = runtime;

  function queueRemoteSync() {
    if (!syncContext.initialized || !syncContext.manager || !runtime.auth.canAccessFullLedger()) return;
    if (syncContext.pendingTimer) {
      clearTimeout(syncContext.pendingTimer);
    }
    setSyncStatus("syncing", "正在把最新账单同步到云端。");
    syncContext.pendingTimer = window.setTimeout(() => {
      syncContext.pendingTimer = null;
      pushRemoteState(runtime.cloneState(state));
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

    await runtime.auth.initializeAuth();

    if (!runtime.auth.canAccessFullLedger()) {
      syncContext.initialized = true;
      setSyncStatus("locked", "已连接 Supabase，等待成员登录后加载完整账本。");
      runtime.render.render();
      return;
    }

    await connectAuthorizedWorkspace();
  }

  async function connectAuthorizedWorkspace() {
    setSyncStatus("connecting", "正在连接共享账本数据库。");

    try {
      await teardownSyncManager();
      syncContext.manager = createSupabaseManager();
      await syncContext.manager.bootstrap();
      syncContext.initialized = true;
      setSyncStatus("synced", `云端账本已连接，工作区：${config.workspaceId}`);
      runtime.render.render();
    } catch (error) {
      syncContext.initialized = true;
      await teardownSyncManager();
      console.error("sync bootstrap failed", error);
      setSyncStatus("error", "云端连接失败，当前仍可在本机使用。");
      runtime.render.render();
    }
  }

  async function teardownSyncManager() {
    if (syncContext.pendingTimer) {
      clearTimeout(syncContext.pendingTimer);
      syncContext.pendingTimer = null;
    }
    syncContext.pushing = false;
    syncContext.queuedSnapshot = null;
    syncContext.manager = null;
    if (syncContext.channel && authContext.client) {
      await authContext.client.removeChannel(syncContext.channel);
    }
    syncContext.channel = null;
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
          runtime.touchState();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          await pushRemoteState(runtime.cloneState(state));
        }

        syncContext.channel = client
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

  async function initializeShareView() {
    if (!window.supabase?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
      elements.shareView.hidden = false;
      elements.shareSessionDetail.innerHTML = `<div class="empty-state">分享视图初始化失败，缺少 Supabase 配置。</div>`;
      runtime.render.renderViews();
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
      runtime.render.renderViews();
      return;
    }

    const session = runtime.normalizeSession(shared.share_snapshot);
    elements.shareSessionDetail.innerHTML = `
      <section class="subcard history-detail-summary">
        <div class="section-head compact">
          <div>
            <h3>${runtime.escapeHtml(shared.session_name || session.name || "牌局账单")}</h3>
            <p class="session-item-meta">${runtime.escapeHtml(session.date)} · ${runtime.escapeHtml(session.location || "未填写地点")} · 仅限本场分享</p>
          </div>
        </div>
        <div class="session-summary-grid">
          <div class="session-summary-item"><span>总 Buyin</span><strong>${runtime.formatCurrency(session.totalBuyIn)}</strong></div>
          <div class="session-summary-item"><span>总 Cash Out</span><strong>${runtime.formatCurrency(session.totalCashOut)}</strong></div>
          <div class="session-summary-item"><span>总成本</span><strong>${runtime.formatCurrency(session.totalCosts)}</strong></div>
          <div class="session-summary-item"><span>盈利</span><strong class="${session.netProfit >= 0 ? "positive" : "negative"}">${runtime.formatCurrency(session.netProfit)}</strong></div>
        </div>
        <p class="session-item-meta">链接有效期：${shared.expires_at ? formatSyncTime(shared.expires_at) : "长期有效"}</p>
      </section>
      ${runtime.renderHistorySessionDetail(session, runtime.isSessionSettled(session))}
    `;
    runtime.render.renderViews();
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
    const incoming = runtime.normalizeRootState(remoteState);
    if (!isIncomingStateNewer(incoming, state)) return;
    replaceState(incoming);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSyncStatus("synced", `已接收合伙人的最新修改：${formatSyncTime(state.meta.updatedAt)}`);
    runtime.render.render();
  }

  function replaceState(nextState) {
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, runtime.cloneState(nextState));
    runtime.ensureDraftSession();
  }

  function isIncomingStateNewer(incoming, current) {
    const incomingStamp = getStateTimestamp(incoming);
    const currentStamp = getStateTimestamp(current);
    if (incomingStamp !== currentStamp) return incomingStamp > currentStamp;
    return runtime.normalizeMeta(incoming.meta).revision > runtime.normalizeMeta(current.meta).revision;
  }

  function getStateTimestamp(candidate) {
    const value = candidate?.meta?.updatedAt;
    const timestamp = value ? new Date(value).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
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

  return {
    queueRemoteSync,
    initializeSync,
    connectAuthorizedWorkspace,
    teardownSyncManager,
    createSupabaseManager,
    initializeShareView,
    pushRemoteState,
    applyRemoteState,
    replaceState,
    isIncomingStateNewer,
    setSyncStatus,
    renderSyncStatus,
    getSyncStatusLabel,
    formatSyncTime,
  };
}
