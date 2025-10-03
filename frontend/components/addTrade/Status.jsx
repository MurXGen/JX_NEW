const TradeStatusGrid = ({ form, handleChange, statuses }) => {
  return (
    <div className="tradeGrid">
      {/* <span className="label">Trade Status</span> */}
      <div className="flexRow flexRow_stretch gap_12">
        {statuses.map((status) => (
          <button
            key={status.value}
            type="button"
            className={`button_sec width100 ${
              form.tradeStatus === status.value ? "selected" : ""
            }`}
            onClick={() =>
              handleChange({
                target: { name: "tradeStatus", value: status.value },
              })
            }
          >
            {status.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TradeStatusGrid;
