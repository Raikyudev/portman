interface FormatSelectProps {
  format: string;
  setFormat: (value: string) => void;
}

export default function FormatSelect({ format, setFormat }: FormatSelectProps) {
  return (
    <label className="flex flex-col">
      Report Format:
      <select value={format} onChange={(e) => setFormat(e.target.value)}>
        <option value="pdf">PDF</option>
        <option value="csv">CSV</option>
        <option value="xlsx">Excel</option>
      </select>
    </label>
  );
}
