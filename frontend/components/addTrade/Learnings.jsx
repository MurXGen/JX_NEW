const Learnings = ({ label, name, value, onChange, placeholder }) => {
  return (
    <div className="tradeGrid" style={{borderBottom:'none'}}>
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

export default Learnings;
