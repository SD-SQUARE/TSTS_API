import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { User } from "../entities/User.js";
import { UserType } from "../enums/UserType.enum.js";

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
            buildInstructions: "Run from client/tsts: npm run desktop:release:backend",
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

/**
 * POST /api/v1/desktop/register-device
 * Registers the requester's RustDesk ID by email. Used by the Electron app
 * during setup or via silent CLI registration.
 */
router.post("/register-device", async (req: Request, res: Response) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const rustdeskId = typeof req.body?.rustdeskId === "string"
        ? req.body.rustdeskId.replace(/\s+/g, "").trim()
        : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "A valid email is required" });
    }

    if (!rustdeskId || !/^[a-zA-Z0-9_-]{4,64}$/.test(rustdeskId)) {
        return res.status(400).json({ message: "A valid RustDesk ID is required" });
    }

    const userRepo = PostgresDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
        return res.status(404).json({ message: "Requester email was not found" });
    }

    if (user.user_type !== UserType.REQUESTER) {
        return res.status(400).json({ message: "Only requester accounts can register a remote support device" });
    }

    user.rustdeskId = rustdeskId;
    await userRepo.save(user);

    return res.status(200).json({
        success: true,
        userId: user.id,
        rustdeskId,
    });
});

export default router;
