import express from "express";
import multer from "multer";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ytdl from "ytdl-core";
import fs from "fs-extra";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
ffmpeg.setFfmpegPath(ffmpegPath);

const upload = multer({ dest: "uploads/" });

app.post("/process", upload.single("video"), async (req, res) => {
    try {
        const { start, end, format, youtube } = req.body;

        let inputPath;

        // YouTube Download
        if (youtube) {
            inputPath = `uploads/${Date.now()}.mp4`;
            await new Promise((resolve) => {
                ytdl(youtube, { quality: "highestvideo" })
                    .pipe(fs.createWriteStream(inputPath))
                    .on("finish", resolve);
            });
        } else {
            inputPath = req.file.path;
        }

        const clipPath = `output/clip-${Date.now()}.mp4`;

        // Resize format
        let size;
        if (format === "9:16") size = "1080x1920";
        else if (format === "1:1") size = "1080x1080";
        else size = "1920x1080";

        // Trim video
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .setStartTime(start)
                .setDuration(end - start)
                .size(size)
                .output(clipPath)
                .on("end", resolve)
                .on("error", reject)
                .run();
        });

        // Speech to Text
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(clipPath),
            model: "whisper-1"
        });

        const text = transcription.text;

        // Create Subtitle File
        const srtPath = `output/sub-${Date.now()}.srt`;
        fs.writeFileSync(srtPath, `1\n00:00:00,000 --> 00:00:10,000\n${text}`);

        const finalPath = `output/final-${Date.now()}.mp4`;

        // Burn Subtitle
        await new Promise((resolve, reject) => {
            ffmpeg(clipPath)
                .outputOptions([`-vf subtitles=${srtPath}`])
                .output(finalPath)
                .on("end", resolve)
                .on("error", reject)
                .run();
        });

        res.json({ url: "/" + finalPath });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Processing Failed" });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running...");
});
