const B2 = require("backblaze-b2");

const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APP_KEY,
});

async function deleteImageFromB2(fileUrl) {
    try {
        await b2.authorize();

        // Normalize: strip CDN prefix if present
        const cdnPrefix = "https://cdn.journalx.app/";
        let fileName = fileUrl;

        if (fileUrl.startsWith(cdnPrefix)) {
            fileName = fileUrl.replace(cdnPrefix, "");
        } else {
            // fallback for B2 direct URLs
            const parts = fileUrl.split("/trades/");
            if (parts.length < 2) {
                console.warn("⚠️ Invalid fileUrl format:", fileUrl);
                return;
            }
            fileName = "trades/" + decodeURIComponent(parts[1]);
        }

        console.log("📝 Normalized fileName:", fileName);

        const fileId = await getFileId(fileName);
        if (!fileId) {
            console.warn("⚠️ File not found in B2:", fileName);
            return;
        }

        console.log("🪵 Deleting from B2 with:", {
            bucketId: process.env.B2_BUCKET_ID,
            fileName,
            fileId,
        });

        await b2.deleteFileVersion({
            bucketId: process.env.B2_BUCKET_ID,
            fileName,
            fileId,
        });

        console.log("🗑 Deleted image from B2:", fileName);
    } catch (err) {
        console.error(
            "❌ Error deleting image from B2:",
            err.response?.data || err.message
        );
    }
}

async function getFileId(fileName) {
    try {
        const res = await b2.listFileNames({
            bucketId: process.env.B2_BUCKET_ID,
            prefix: fileName,
            maxFileCount: 1,
        });

        const file = res.data.files.find(f => f.fileName === fileName);
        return file?.fileId || null;
    } catch (err) {
        console.error("❌ Error fetching fileId:", err.response?.data || err.message);
        return null;
    }
}

module.exports = { deleteImageFromB2 };
