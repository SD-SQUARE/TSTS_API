import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * GET /api/v1/desktop/download
 * Serves the TSTS Desktop installer (.exe)
 */
router.get("/download", (req: Request, res: Response) => {
    // Look for the installer in the assets folder
    const installerPath = path.join(process.cwd(), "assets", "desktop", "TSTS-Desktop-Setup.exe");

    if (!fs.existsSync(installerPath)) {
        return res.status(404).json({
            error: "Desktop installer not found. Please build the Electron app first.",
            buildInstructions: "Run: cd electron && npm run release",
        });
    }

    const filename = "TSTS-Desktop-Setup.exe";
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    const stream = fs.createReadStream(installerPath);
    stream.pipe(res);
});

/**
 * GET /api/v1/desktop/info
 * Returns info about the latest desktop app version
 */
router.get("/info", (req: Request, res: Response) => {
    const installerPath = path.join(process.cwd(), "assets", "desktop", "TSTS-Desktop-Setup.exe");
    const available = fs.existsSync(installerPath);

    let size = 0;
    if (available) {
        try { size = fs.statSync(installerPath).size; } catch { /* ignore */ }
    }

    return res.json({
        available,
        filename: "TSTS-Desktop-Setup.exe",
        platform: "Windows 10/11 (64-bit)",
        size: available ? `${(size / 1024 / 1024).toFixed(1)} MB` : null,
        features: [
            "Remote control via RustDesk",
            "Native desktop experience",
            "Automatic RustDesk installation",
        ],
    });
});

export default router;
