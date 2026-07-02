export function createRenderModule(runtime) {
  const { shareToken, state, elements } = runtime;
  let timerInterval = null;

  function render() {
    renderViews();
    syncDraftFields();
    syncTimer();
    renderStartAccountingButton();
    renderHeroStats();
    runtime.sync.renderSyncStatus();
    runtime.auth.renderAuthState();
    runtime.renderPlayerRows();
    runtime.renderPartnerRows();
    runtime.renderFinancials();
    runtime.renderHistory();
    runtime.renderStats();
  }

  function renderViews() {
    if (shareToken) {
      elements.accessGateView.hidden = true;
      elements.heroHeader.hidden = true;
      elements.homeView.hidden = true;
      elements.accountingView.hidden = true;
      elements.historyView.hidden = true;
      elements.statsView.hidden = true;
      elements.shareView.hidden = false;
      return;
    }

    const active = state.ui.activeView || "home";
    const allowed = runtime.auth.canAccessFullLedger();
    elements.heroHeader.hidden = !allowed;
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
    elements.modernShareDisplay.value = runtime.calculateModernSharePercent(draft).toFixed(2);
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
      <span>牌局：<strong>${runtime.escapeHtml(draft.name)}</strong></span>
      <span>时间：<strong>${runtime.escapeHtml(runtime.formatSetupDate(draft.date))}</strong></span>
      <span>地点：<strong>${runtime.escapeHtml(draft.location)}</strong></span>
      <span>合作开局：<strong>${runtime.escapeHtml(draft.collaboration)}</strong></span>
      <span>荷关：<strong>${runtime.escapeHtml(draft.dealerNames || "未填写")}</strong></span>
      <span>Dealer 分红：<strong>${runtime.escapeHtml(runtime.formatPercent(draft.dealerSharePercent))}</strong></span>
      <span>合作方分红：<strong>${runtime.escapeHtml(runtime.formatPercent(draft.collaborationSharePercent))}</strong></span>
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
    const durationMs = runtime.getSessionDurationMs();
    const durationHours = durationMs / 3600000;
    elements.sessionTimerDisplay.textContent = runtime.formatDuration(durationMs);
    elements.sessionDuration.value = runtime.formatDuration(durationMs);
    state.draftSession.durationHours = Number(durationHours.toFixed(2));
  }

  function renderHeroStats() {
    elements.heroSessionCount.textContent = `${state.sessions.length}`;
    elements.heroPlayerCount.textContent = `${state.players.length}`;
  }

  function renderStartAccountingButton() {
    if (!elements.startAccountingBtn) return;
    const title = elements.startAccountingBtn.querySelector("span");
    const subtitle = elements.startAccountingBtn.querySelector("small");
    const hasActiveDraft = runtime.hasDraftActivity();

    if (title) {
      title.textContent = hasActiveDraft ? "继续记账" : "开始记账";
    }
    if (subtitle) {
      subtitle.textContent = hasActiveDraft ? "进入当前进行中的实时账本" : "进入实时牌局记录界面";
    }
  }

  return {
    render,
    renderViews,
    syncDraftFields,
    syncTimer,
    updateTimerDisplay,
    renderStartAccountingButton,
    renderHeroStats,
  };
}
