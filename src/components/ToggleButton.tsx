type Props = {
  readonly active: boolean;
  readonly color: string;
  readonly label: string;
  readonly onClick: () => void;
};

export function ToggleButton({ active, color, label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: "2px 10px",
        borderRadius: 12,
        border: `1px solid ${active ? color : "#ccc"}`,
        background: active ? color : "#fff",
        color: active ? "#fff" : "#666",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
