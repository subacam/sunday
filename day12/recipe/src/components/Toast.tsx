export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: 96,
        background: "#1C1E1D",
        color: "#fff",
        borderRadius: 12,
        padding: "13px 16px",
        fontSize: 14,
        textAlign: "center",
        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        zIndex: 40,
      }}
    >
      {message}
    </div>
  );
}
