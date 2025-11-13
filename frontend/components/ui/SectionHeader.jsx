import { Plus } from "lucide-react";

const SectionHeader = ({
  title,
  description,
  level = level, // allows <h2>, <h3>, etc. for flexibility
  showButton = false,
  buttonLabel = "",
  onButtonClick,
  loading = false,
}) => {
  const HeadingTag = `h${level}`;

  return (
    <header
      className="flexRow flexRow_stretch"
      role="banner"
      aria-label={title}
    >
      <div className="flexClm">
        <HeadingTag className="font_weight_400 marg_0">{title}</HeadingTag>
        <p className="font_14 shade_50 marg_0">{description}</p>
      </div>

      {showButton && (
        <button
          className="button_sec flexRow gap_8"
          onClick={onButtonClick}
          disabled={loading}
          aria-label={buttonLabel}
        >
          <Plus size={16} />
          <span>{buttonLabel}</span>
        </button>
      )}
    </header>
  );
};

export default SectionHeader;
