interface DateInputProps {
  label: string;
  value: string;
  setValue: (value: string) => void;
}

export default function DateInput({ label, value, setValue }: DateInputProps) {
  return (
    <label className="flex flex-col">
      {label}:
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );
}
