// App shell — top bar w/ brand + nav + user, route between Workspace / Dashboard / Redline / Diff / Share.
// Owns: active doc, active route, persisted review state.

const ROUTES = [
  { id: "workspace", label: "Workspace" },
  { id: "dashboard", label: "Risk briefing" },
  { id: "redline",   label: "Redline" },
  { id: "diff",      label: "Compare versions" },
  { id: "share",     label: "Share & export" },
];

function AppShell({ tweaks }) {
  const P = window.CRE.palettes[tweaks.palette];
  const F = window.CRE.fonts;

  const [route, setRoute] = React.useState("workspace");
  const [activeDocId, setActiveDocId] = React.useState(window.WORKSPACE.defaultActive);
  const activeDoc = window.WORKSPACE.docs.find((d) => d.id === activeDocId);

  // Open a doc → goes to the most useful surface for its state
  const openDoc = (id) => {
    const doc = window.WORKSPACE.docs.find((d) => d.id === id);
    setActiveDocId(id);
    if (doc.status === "complete" || doc.status === "all-clear") setRoute("dashboard");
    else if (doc.status === "streaming") setRoute("dashboard");
    else if (doc.status === "uploading" || doc.status === "error") setRoute("workspace");
  };

  // Disable routes that don't apply to current doc
  const routeDisabled = (id) => {
    if (id === "workspace") return false;
    if (!activeDoc) return true;
    if (activeDoc.status === "uploading" || activeDoc.status === "error") return true;
    if (id === "diff" && (activeDoc.versions || []).length < 2) return true;
    if ((id === "redline" || id === "share") && activeDoc.status === "all-clear") return id === "redline"; // share OK
    return false;
  };

  return (
    <div style={{
      width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
      background: P.bg, color: P.ink, fontFamily: F.ui, overflow: "hidden",
    }}>
      <TopBar
        route={route} setRoute={setRoute}
        activeDoc={activeDoc} routeDisabled={routeDisabled}
        P={P} F={F}
      />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex" }}>
        {route === "workspace" && (
          <WorkspaceView
            docs={window.WORKSPACE.docs}
            activeDocId={activeDocId}
            onOpen={openDoc}
            P={P} F={F}
          />
        )}
        {route === "dashboard" && activeDoc && (
          <DashboardRoute doc={activeDoc} tweaks={tweaks} onGoTo={setRoute} />
        )}
        {route === "redline" && activeDoc && activeDoc.payload && (
          <RedlineEditor doc={activeDoc} tweaks={tweaks} />
        )}
        {route === "diff" && activeDoc && (
          <VersionDiffView doc={activeDoc} tweaks={tweaks} />
        )}
        {route === "share" && activeDoc && (
          <ShareExportView doc={activeDoc} tweaks={tweaks} />
        )}
      </div>
    </div>
  );
}

function TopBar({ route, setRoute, activeDoc, routeDisabled, P, F }) {
  const { Logomark, Wordmark, name } = window.BRAND;
  return (
    <div style={{
      flexShrink: 0,
      borderBottom: `1px solid ${P.hair}`, background: P.surface,
      display: "flex", alignItems: "center", height: 52, padding: "0 18px", gap: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Logomark size={22} color={P.ink} />
        <Wordmark size={17} color={P.ink} />
      </div>

      <div style={{ width: 1, height: 22, background: P.hair }} />

      {activeDoc && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{
            fontFamily: F.mono, fontSize: 10.5, color: P.muted,
            letterSpacing: 0.06, textTransform: "uppercase", fontWeight: 600,
          }}>active</span>
          <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
            {activeDoc.name}
          </span>
          <span style={{
            padding: "1px 5px", borderRadius: 2, background: P.hair,
            fontFamily: F.mono, fontSize: 9.5, color: P.ink2, fontWeight: 600,
          }}>v{activeDoc.version}</span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <nav style={{ display: "flex", gap: 2 }}>
        {ROUTES.map((r) => {
          const active = route === r.id;
          const disabled = routeDisabled(r.id);
          return (
            <button key={r.id}
              onClick={() => !disabled && setRoute(r.id)}
              disabled={disabled}
              style={{
                padding: "6px 12px", fontSize: 12, fontFamily: F.ui, fontWeight: 500,
                border: "none", borderRadius: 3, cursor: disabled ? "default" : "pointer",
                background: active ? P.ink : "transparent",
                color: active ? P.bg : (disabled ? P.muted : P.ink2),
                opacity: disabled ? 0.45 : 1,
              }}>
              {r.label}
            </button>
          );
        })}
      </nav>

      <div style={{ width: 1, height: 22, background: P.hair, marginLeft: 6 }} />

      <div style={{
        width: 26, height: 26, borderRadius: "50%", background: P.ink2, color: P.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F.mono, fontSize: 10.5, fontWeight: 600,
      }}>TF</div>
    </div>
  );
}

window.AppShell = AppShell;
