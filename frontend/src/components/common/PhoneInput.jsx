export default function PhoneInput({ value, onChange, ...props }) {
  const format = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  const handleChange = (e) => {
    onChange(format(e.target.value));
  };

  return (
    <input
      type="tel"
      inputMode="numeric"
      className="input"
      value={value}
      onChange={handleChange}
      placeholder="06 12 34 56 78"
      maxLength={14}
      {...props}
    />
  );
}
