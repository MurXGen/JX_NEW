const TextAreaField = ({ label, name, value, onChange, placeholder }) => {
  return (
    <div className="tradeGrid">
      <label className="label">{label}</label>
      <textarea
        className="textarea"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
};

export default TextAreaField;
