// Module-level so they aren't re-created each render (react-hooks/static-components).
// `dark` is threaded in as a prop; behavior is identical to the inline versions.
function Row({ icon, label, onClick, disabled, dark }) {
  return (
    <div
      className={disabled ? undefined : "sbtn"}
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 10px",
        borderRadius: 10,
        marginBottom: 2,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "default" : "pointer",
        color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <span
        style={{
          fontSize: 16,
          width: 22,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    </div>
  );
}

function NavRow({ img, emoji, label, onClick, dark }) {
  return (
    <div
      className="sbtn"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 10px",
        borderRadius: 10,
        marginBottom: 2,
        color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {img ? (
        <img
          src={img}
          alt=""
          style={{
            width: 44,
            height: 44,
            objectFit: "contain",
            flexShrink: 0,
            opacity: 0.95,
          }}
        />
      ) : (
        <span
          style={{
            fontSize: 28,
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {emoji}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    </div>
  );
}

export default function QuranSideMenu({ dark, setShowPickers, setShowQuranSurahModal, setDrawerView, setReciterMode, setShowReciterModal, setActiveTab, setRihlahTab, setShowQuranSettings }) {
  return (
    <>
      <div
        onClick={() => setShowPickers(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          zIndex: 300,
          animation: "fi .18s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          width: "min(280px,78vw)",
          zIndex: 301,
          background: dark
            ? "linear-gradient(180deg,#0E1628 0%,#080E1A 100%)"
            : "#EADFC8",
          borderRight: dark
            ? "1px solid rgba(217,177,95,0.18)"
            : "1px solid rgba(139,106,16,0.18)",
          boxShadow: "6px 0 28px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          animation: "sideMenuIn .22s ease-out",
          paddingTop: "env(safe-area-inset-top,28px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close + label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 8px",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: dark
                ? "rgba(217,177,95,0.50)"
                : "rgba(140,100,20,0.55)",
              letterSpacing: ".18em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Menu
          </div>
          <div
            className="sbtn"
            onClick={() => setShowPickers(false)}
            style={{
              fontSize: 20,
              color: dark ? "rgba(243,231,200,0.55)" : "rgba(0,0,0,0.55)",
              lineHeight: 1,
              padding: "0 6px",
              fontWeight: 300,
            }}
          >
            ×
          </div>
        </div>
        <div
          style={{ flex: 1, overflowY: "auto", padding: "4px 12px 16px" }}
        >
          {/* QURAN section */}
          <div
            style={{
              fontSize: 9,
              color: dark
                ? "rgba(217,177,95,0.45)"
                : "rgba(140,100,20,0.55)",
              letterSpacing: ".18em",
              textTransform: "uppercase",
              fontWeight: 700,
              padding: "6px 8px",
            }}
          >
            Qur'an
          </div>
          <Row
            dark={dark}
            icon="📋"
            label="Surah"
            onClick={() => {
              setShowQuranSurahModal(true);
              setShowPickers(false);
            }}
          />
          <Row
            dark={dark}
            icon="🌐"
            label="Translation"
            onClick={() => {
              setDrawerView("translation");
              setShowPickers(false);
            }}
          />
          <Row
            dark={dark}
            icon="📖"
            label="Tafsir"
            onClick={() => {
              setDrawerView("tafsir-page");
              setShowPickers(false);
            }}
          />
          <Row
            dark={dark}
            icon="🎙️"
            label="Reciter"
            onClick={() => {
              setReciterMode("quran");
              setShowReciterModal(true);
              setShowPickers(false);
            }}
          />
          {/* Divider */}
          <div
            style={{
              height: 1,
              background: dark
                ? "linear-gradient(90deg,transparent,rgba(217,177,95,0.18),transparent)"
                : "linear-gradient(90deg,transparent,rgba(139,106,16,0.18),transparent)",
              margin: "14px 0 10px",
            }}
          />
          {/* NAVIGATE section */}
          <div
            style={{
              fontSize: 9,
              color: dark
                ? "rgba(217,177,95,0.45)"
                : "rgba(140,100,20,0.55)",
              letterSpacing: ".18em",
              textTransform: "uppercase",
              fontWeight: 700,
              padding: "6px 8px",
            }}
          >
            Navigate
          </div>
          {setActiveTab && (
            <NavRow
              dark={dark}
              img="/tab-hifz.png"
              label="My Hifz"
              onClick={() => {
                setActiveTab("myhifz");
                setShowPickers(false);
              }}
            />
          )}
          {setActiveTab && setRihlahTab && (
            <NavRow
              dark={dark}
              img="/tab-rihlah.png"
              label="Journey"
              onClick={() => {
                setRihlahTab("home");
                setActiveTab("rihlah");
                setShowPickers(false);
              }}
            />
          )}
          {setActiveTab && (
            <NavRow
              dark={dark}
              emoji="🕋"
              label="Haramain"
              onClick={() => {
                setActiveTab("masjidayn");
                setShowPickers(false);
              }}
            />
          )}
        </div>
        {/* Settings — pinned to bottom */}
        <div
          style={{
            borderTop: dark
              ? "1px solid rgba(217,177,95,0.10)"
              : "1px solid rgba(139,106,16,0.12)",
            padding: "10px 12px",
          }}
        >
          <div
            className="sbtn"
            onClick={() => {
              setShowQuranSettings(true);
              setShowPickers(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 10px",
              borderRadius: 10,
              color: dark ? "rgba(243,231,200,0.85)" : "#2D2A26",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: 18,
                width: 22,
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              ⚙️
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>Settings</span>
          </div>
        </div>
      </div>
    </>
  );
}
