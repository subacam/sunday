export default function Toast({ message }: { message: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 20,
        right: 20,
        background: "#2E2B24",
        color: "#fff",
        padding: "14px 18px",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 600,
        textAlign: "center",
        zIndex: 60,
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
      }}
    >
      {message}
    </div>
  );
}
