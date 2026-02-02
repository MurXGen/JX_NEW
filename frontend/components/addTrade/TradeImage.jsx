import { X, Upload } from "lucide-react";

const ImageBox = ({ label, imagePreview, onChange, onRemove }) => {
  return (
    <div className="imagePicker">
      {imagePreview ? (
        <div className="preview">
          <img src={imagePreview} alt={`${label} Preview`} />
          <button
            type="button"
            className="removeBtn flexRow flex_center button_ter"
            onClick={onRemove}
            aria-label={`Remove ${label} image`}
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <label className="uploadBox flexRow flex_center">
          <input type="file" accept="image/*" hidden onChange={onChange} />
          <div className="placeholder flexRow flex_center gap_24">
            <div className="iconCircle">
              <Upload size={20} />
            </div>
            <div className="gap_8 flexClm flex_center">
              <span className="title font_14">Upload {label} Chart</span>
              <span className="subtitle font_12">PNG, JPG up to 5MB</span>
            </div>
          </div>
        </label>
      )}
    </div>
  );
};

const TradeImagesSection = ({
  openImagePreview,
  closeImagePreview,
  onOpenImageChange,
  onCloseImageChange,
  onRemoveOpenImage,
  onRemoveCloseImage,
}) => {
  return (
    <div className="tradeGrid">
      <span className="label shade_50">Trade Images</span>

      <div className="flexClm gap_16 flexRow_stretch">
        <ImageBox
          label="Open"
          imagePreview={openImagePreview}
          onChange={onOpenImageChange}
          onRemove={onRemoveOpenImage}
        />

        <ImageBox
          label="Close"
          imagePreview={closeImagePreview}
          onChange={onCloseImageChange}
          onRemove={onRemoveCloseImage}
        />
      </div>
    </div>
  );
};

export default TradeImagesSection;
