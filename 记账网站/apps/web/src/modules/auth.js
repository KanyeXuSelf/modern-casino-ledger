export function createAuthModule(runtime) {
  const { config, authContext, elements } = runtime;

  function canAccessFullLedger() {
    if (config.syncProvider !== "supabase") return true;
    return Boolean(authContext.member);
  }

  function focusAuth() {
    if (elements.gateLoginDialog && !elements.gateLoginDialog.open) {
      elements.gateLoginDialog.showModal();
    }
    elements.gateUsernameInput?.focus();
    setAuthStatus("locked", "完整账本权限只开放给已登记的成员邮箱。");
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
      if (canAccessFullLedger() && !runtime.syncContext.manager) {
        await runtime.sync.connectAuthorizedWorkspace();
      } else {
        if (!canAccessFullLedger()) {
          await runtime.sync.teardownSyncManager();
          runtime.sync.setSyncStatus("locked", "已连接 Supabase，等待成员登录后加载完整账本。");
        }
        runtime.render.render();
      }
    });
  }

  async function fetchMembership(user) {
    if (!user?.email || !authContext.client) return null;
    const { data, error } = await authContext.client
      .from(config.workspaceMembersTable)
      .select("workspace_id,email,username,role,display_name")
      .eq("workspace_id", config.workspaceId)
      .eq("email", user.email)
      .maybeSingle();
    if (error) {
      console.error("membership lookup failed", error);
      return null;
    }
    return data || null;
  }

  async function resolveLoginEmail(identifier) {
    if (!identifier || !authContext.client) return "";
    if (identifier.includes("@")) return identifier;
    const { data, error } = await authContext.client.rpc("get_login_email", {
      p_workspace_id: config.workspaceId,
      p_username: identifier,
    });
    if (error) {
      console.error("resolve login email failed", error);
      return "";
    }
    const resolved = Array.isArray(data) ? data[0] : data;
    return resolved?.email || "";
  }

  async function loginWithPassword() {
    const identifier = elements.gateUsernameInput?.value.trim();
    const password = elements.gatePasswordInput?.value || "";
    if (!identifier || !password || !authContext.client) return;
    elements.gateLoginBtn.disabled = true;
    try {
      setAuthStatus("connecting", "正在验证用户名和密码。");
      const email = await resolveLoginEmail(identifier);
      if (!email) {
        setAuthStatus("error", "找不到这个用户名，请检查拼写或联系管理员。");
        return;
      }
      const { error } = await authContext.client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      elements.gatePasswordInput.value = "";
      setAuthStatus("synced", "登录成功，正在加载完整账本。");
    } catch (error) {
      console.error("password login failed", error);
      setAuthStatus("error", "用户名或密码错误，或者该账号尚未开通密码登录。");
    } finally {
      elements.gateLoginBtn.disabled = false;
    }
  }

  async function signOutMember() {
    if (!authContext.client) return;
    await authContext.client.auth.signOut();
    authContext.user = null;
    authContext.member = null;
    await runtime.sync.teardownSyncManager();
    runtime.sync.setSyncStatus("locked", "已退出登录，完整账本功能已锁定。");
    renderAuthState();
    runtime.render.render();
  }

  function renderAuthState() {
    if (!elements.authStatusBadge || !elements.authStatusText) return;
    if (authContext.member) {
      if (elements.gateLoginDialog?.open) elements.gateLoginDialog.close();
      setAuthStatus("synced", `已登录：${authContext.member.display_name || authContext.member.username || authContext.member.email}`);
      elements.currentUserEmail.textContent = authContext.user?.email || "";
      elements.signOutBtn.hidden = false;
      if (elements.gateUsernameInput) {
        elements.gateUsernameInput.value = authContext.member.username || "";
        elements.gateUsernameInput.disabled = true;
      }
      if (elements.gatePasswordInput) {
        elements.gatePasswordInput.value = "";
        elements.gatePasswordInput.disabled = true;
      }
      if (elements.gateLoginBtn) elements.gateLoginBtn.hidden = true;
    } else if (authContext.user) {
      setAuthStatus("error", "该邮箱已登录，但不在完整账本成员名单内。");
      elements.currentUserEmail.textContent = authContext.user.email || "";
      elements.signOutBtn.hidden = false;
      if (elements.gateUsernameInput) elements.gateUsernameInput.disabled = true;
      if (elements.gatePasswordInput) elements.gatePasswordInput.disabled = true;
      if (elements.gateLoginBtn) elements.gateLoginBtn.hidden = true;
    } else {
      setAuthStatus("local", "未登录。请输入用户名和密码。");
      elements.currentUserEmail.textContent = "";
      elements.signOutBtn.hidden = true;
      if (elements.gateUsernameInput) elements.gateUsernameInput.disabled = false;
      if (elements.gatePasswordInput) elements.gatePasswordInput.disabled = false;
      if (elements.gateLoginBtn) elements.gateLoginBtn.hidden = false;
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

  return {
    canAccessFullLedger,
    focusAuth,
    initializeAuth,
    fetchMembership,
    resolveLoginEmail,
    loginWithPassword,
    signOutMember,
    renderAuthState,
    setAuthStatus,
  };
}
