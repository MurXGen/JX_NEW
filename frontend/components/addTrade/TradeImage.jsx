import { X, Upload, Image, Camera, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ImageBox = ({ label, imagePreview, onChange, onRemove }) => {
  return (
    <motion.div
      className="imagePicker"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        flex: 1,
        minWidth: "200px",
        position: "relative",
      }}
    >
      <AnimatePresence mode="wait">
        {imagePreview ? (
          <motion.div
            key="preview"
            className="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              aspectRatio: "16/9",
              background: "var(--card-bg)",
              border: "2px solid var(--primary-20)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={imagePreview}
              alt={`${label} Preview`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            />

            {/* Gradient Overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
                pointerEvents: "none",
              }}
            />

            {/* Label Badge */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                background: "var(--primary)",
                color: "white",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.5px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                zIndex: 2,
              }}
            >
              {label} Chart
            </div>

            {/* Remove Button */}
            <motion.button
              type="button"
              className="removeBtn"
              onClick={onRemove}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.9)",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                backdropFilter: "blur(4px)",
                zIndex: 2,
              }}
              aria-label={`Remove ${label} image`}
            >
              <X size={18} />
            </motion.button>
          </motion.div>
        ) : (
          <motion.label
            key="upload"
            className="uploadBox"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              aspectRatio: "16/9",
              borderRadius: "20px",
              background: "var(--card-bg)",
              border: "2px dashed var(--primary-20)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <input type="file" accept="image/*" hidden onChange={onChange} />

            {/* Animated Background Pattern */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 30% 50%, var(--primary-10) 0%, transparent 50%)",
                opacity: 0.5,
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                padding: "24px",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Icon with Animation */}
              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "var(--primary-10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)",
                }}
              >
                <Upload size={28} />
              </motion.div>

              <div style={{ textAlign: "center" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "var(--text-primary)",
                    marginBottom: "4px",
                  }}
                >
                  Upload {label} Chart
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  PNG, JPG up to 5MB
                </span>
              </div>

              {/* Decorative Elements */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--primary-50)",
                      opacity: 0.5,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.label>
        )}
      </AnimatePresence>
    </motion.div>
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
    <motion.div
      className="tradeGrid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header with Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "var(--primary-10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
          }}
        >
          <Camera size={20} />
        </div>
        <div className="flexClm">
          <span className="font_14 black-text font_weight_600">
            Add Trade Screenshots
          </span>
        </div>

        {/* Optional Sparkle Badge */}
        <div
          style={{
            marginLeft: "auto",
            background: "var(--primary-10)",
            padding: "6px 12px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Sparkles size={12} color="var(--primary)" />
          <span className="font_14 black-text">Enhances analysis</span>
        </div>
      </div>

      {/* Image Boxes Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        <ImageBox
          label="Entry"
          imagePreview={openImagePreview}
          onChange={onOpenImageChange}
          onRemove={onRemoveOpenImage}
        />

        <ImageBox
          label="Exit"
          imagePreview={closeImagePreview}
          onChange={onCloseImageChange}
          onRemove={onRemoveCloseImage}
        />
      </div>

      {/* Tips Section */}
      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          background: "var(--black-4)",
          borderRadius: "16px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "8px",
            background: "var(--primary-10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
            flexShrink: 0,
          }}
        >
          <Image size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <span className="font_14 black-text font_weight_600">Pro Tip : </span>
          <span className="font_14 black-text">
            Adding screenshots helps track your entries and exits visually.
            Great for reviewing your trading patterns!
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default TradeImagesSection;
