import { SURAH_EN } from "../data/constants";

export default function QuranHeader({ dark, setShowPickers, curSurahNum, mushafJuzNum }) {
  return (
      <div
        style={{
          flexShrink: 0,
          background: dark ? "#0B1220" : "#F3E9D2",
          paddingTop: 2,
          position: "sticky",
          top: 0,
          zIndex: 201,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 12px",
            gap: 10,
          }}
        >
          <div
            className="sbtn"
            onClick={() => setShowPickers(true)}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "4px",
              borderRadius: 8,
            }}
            aria-label="Open menu"
          >
            <div
              style={{
                width: 18,
                height: 2,
                borderRadius: 1,
                background: dark ? "rgba(232,200,120,0.85)" : "#6B4F00",
              }}
            />
            <div
              style={{
                width: 18,
                height: 2,
                borderRadius: 1,
                background: dark ? "rgba(232,200,120,0.85)" : "#6B4F00",
              }}
            />
            <div
              style={{
                width: 18,
                height: 2,
                borderRadius: 1,
                background: dark ? "rgba(232,200,120,0.85)" : "#6B4F00",
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "'Playfair Display',serif",
              fontSize: 14,
              fontWeight: 700,
              color: dark ? "#E8C878" : "#6B4F00",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "left",
            }}
          >
            {SURAH_EN[curSurahNum] || ""}
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 13,
              fontWeight: 700,
              color: dark ? "#E8C878" : "#6B4F00",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            Juz {mushafJuzNum}
          </div>
        </div>
      </div>
  );
}
