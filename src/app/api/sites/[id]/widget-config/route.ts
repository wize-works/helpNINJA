import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

// GET /api/sites/[id]/widget-config
export async function GET(
    req: NextRequest,
    ctx: Context
) {
    try {
        const { id: siteId } = await ctx.params;

        if (!siteId) {
            return NextResponse.json(
                { error: "Site ID is required" },
                { status: 400 }
            );
        }

        // First check if the site exists and belongs to the current tenant
        const tenantId = req.headers.get("x-tenant-id");

        if (!tenantId) {
            return NextResponse.json(
                { error: "Unauthorized - Missing tenant ID" },
                { status: 401 }
            );
        }

        // Verify site belongs to this tenant
        const siteResult = await query(
            "SELECT * FROM tenant_sites WHERE id = $1 AND tenant_id = $2",
            [siteId, tenantId]
        );

        if (siteResult.rowCount === 0) {
            return NextResponse.json(
                { error: "Site not found or not authorized" },
                { status: 404 }
            );
        }

        // Get widget configuration
        const configResult = await query(
            `SELECT * FROM widget_configurations WHERE site_id = $1`,
            [siteId]
        );

        // If configuration exists, return it with properly mapped field names
        if (configResult.rowCount && configResult.rowCount > 0) {
            const dbConfig = configResult.rows[0];
            // Transform snake_case to camelCase
            const clientConfig = {
                primaryColor: dbConfig.primary_color,
                position: dbConfig.position,
                welcomeMessage: dbConfig.welcome_message,
                aiName: dbConfig.ai_name,
                showBranding: dbConfig.show_branding,
                autoOpenDelay: dbConfig.auto_open_delay,
                buttonIcon: dbConfig.button_icon,
                customIconUrl: dbConfig.custom_icon_url,
                theme: dbConfig.theme,
                fontFamily: dbConfig.font_family,
                voice: dbConfig.voice
            };
            return NextResponse.json(clientConfig);
        }

        // Otherwise, return default configuration
        return NextResponse.json({
            primaryColor: "#7C3AED", // Purple
            position: "bottom-right",
            welcomeMessage: "👋 Hi there! How can I help you today?",
            aiName: "AI Assistant",
            showBranding: true,
            autoOpenDelay: 0,
            buttonIcon: "default",
            theme: "auto",
            voice: "friendly"
        });
    } catch (error) {
        console.error("Error getting widget configuration:", error);
        return NextResponse.json(
            { error: "Failed to get widget configuration" },
            { status: 500 }
        );
    }
}

// POST /api/sites/[id]/widget-config
export async function POST(
    req: NextRequest,
    ctx: Context
) {
    try {
        const { id: siteId } = await ctx.params;

        if (!siteId) {
            return NextResponse.json(
                { error: "Site ID is required" },
                { status: 400 }
            );
        }

        // Parse the request body
        let config;
        try {
            config = await req.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 }
            );
        }

        // Validate required fields
        const requiredFields = ["primaryColor", "position", "welcomeMessage", "voice"];
        for (const field of requiredFields) {
            if (!config[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Get tenant ID from headers
        const tenantId = req.headers.get("x-tenant-id");

        if (!tenantId) {
            return NextResponse.json(
                { error: "Unauthorized - Missing tenant ID" },
                { status: 401 }
            );
        }

        // Verify site belongs to this tenant
        const siteResult = await query(
            "SELECT * FROM tenant_sites WHERE id = $1 AND tenant_id = $2",
            [siteId, tenantId]
        );

        if (siteResult.rowCount === 0) {
            return NextResponse.json(
                { error: "Site not found or not authorized" },
                { status: 404 }
            );
        }

        // Check if configuration already exists
        const existingConfig = await query(
            "SELECT id FROM widget_configurations WHERE site_id = $1",
            [siteId]
        );

        let result;

        // Extract the fields we want to store
        const {
            primaryColor,
            position,
            welcomeMessage,
            aiName,
            showBranding,
            autoOpenDelay,
            buttonIcon,
            customIconUrl,
            theme,
            fontFamily,
            voice
        } = config;

        if (existingConfig.rowCount && existingConfig.rowCount > 0) {
            // Update existing configuration
            result = await query(
                `UPDATE widget_configurations 
         SET 
           primary_color = $1,
           position = $2,
           welcome_message = $3,
           ai_name = $4,
           show_branding = $5,
           auto_open_delay = $6,
           button_icon = $7,
           custom_icon_url = $8,
           theme = $9,
           font_family = $10,
           voice = $11,
           updated_at = NOW()
         WHERE site_id = $12
         RETURNING *`,
                [
                    primaryColor,
                    position,
                    welcomeMessage,
                    aiName,
                    showBranding,
                    autoOpenDelay,
                    buttonIcon,
                    customIconUrl,
                    theme,
                    fontFamily,
                    voice,
                    siteId
                ]
            );
        } else {
            // Insert new configuration
            result = await query(
                `INSERT INTO widget_configurations (
           site_id,
           primary_color,
           position,
           welcome_message,
           ai_name,
           show_branding,
           auto_open_delay,
           button_icon,
           custom_icon_url,
           theme,
           font_family,
           voice
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
                [
                    siteId,
                    primaryColor,
                    position,
                    welcomeMessage,
                    aiName,
                    showBranding,
                    autoOpenDelay,
                    buttonIcon,
                    customIconUrl,
                    theme,
                    fontFamily,
                    voice
                ]
            );
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error("Error saving widget configuration:", error);
        return NextResponse.json(
            { error: "Failed to save widget configuration" },
            { status: 500 }
        );
    }
}
