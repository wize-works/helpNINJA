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
                advancedColors: dbConfig.advanced_colors || false,
                position: dbConfig.position,
                welcomeMessage: dbConfig.welcome_message,
                aiName: dbConfig.ai_name,
                showBranding: dbConfig.show_branding,
                autoOpenDelay: dbConfig.auto_open_delay,
                buttonIcon: dbConfig.button_icon,
                customIconUrl: dbConfig.custom_icon_url,
                theme: dbConfig.theme,
                fontFamily: dbConfig.font_family,
                voice: dbConfig.voice,
                // New styling options
                bubbleBackground: dbConfig.bubble_background || '#111',
                bubbleColor: dbConfig.bubble_color || '#fff',
                panelBackground: dbConfig.panel_background || '#fff',
                panelHeaderBackground: dbConfig.panel_header_background || '#f8fafc',
                panelColor: dbConfig.panel_color || '#333333',
                panelHeaderColor: dbConfig.panel_header_color || '#ffffff',
                messagesBackground: dbConfig.messages_background || '#f8fafc',
                messagesColor: dbConfig.messages_color || '#333333',
                userBubbleBackground: dbConfig.user_bubble_background || '#3b82f6',
                userBubbleColor: dbConfig.user_bubble_color || '#fff',
                assistantBubbleBackground: dbConfig.assistant_bubble_background || '#e5e7eb',
                assistantBubbleColor: dbConfig.assistant_bubble_color || '#111',
                buttonBackground: dbConfig.button_background || '#111',
                buttonColor: dbConfig.button_color || '#fff'
            };
            return NextResponse.json(clientConfig);
        }

        // Otherwise, return default configuration
        return NextResponse.json({
            primaryColor: "#7C3AED", // Purple
            advancedColors: false,
            position: "bottom-right",
            welcomeMessage: "👋 Hi there! How can I help you today?",
            aiName: "AI Assistant",
            showBranding: true,
            autoOpenDelay: 0,
            buttonIcon: "default",
            theme: "auto",
            voice: "friendly",
            // Default styling options
            bubbleBackground: '#111',
            bubbleColor: '#fff',
            panelBackground: '#fff',
            panelHeaderBackground: '#f8fafc',
            panelColor: '#333333',
            panelHeaderColor: '#ffffff',
            messagesBackground: '#f8fafc',
            messagesColor: '#333333',
            userBubbleBackground: '#3b82f6',
            userBubbleColor: '#fff',
            assistantBubbleBackground: '#e5e7eb',
            assistantBubbleColor: '#111',
            buttonBackground: '#111',
            buttonColor: '#fff'
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
            advancedColors,
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
            // New styling options
            bubbleBackground,
            bubbleColor,
            panelBackground,
            panelHeaderBackground,
            panelColor,
            panelHeaderColor,
            messagesBackground,
            messagesColor,
            userBubbleBackground,
            userBubbleColor,
            assistantBubbleBackground,
            assistantBubbleColor,
            buttonBackground,
            buttonColor
        } = config;

        if (existingConfig.rowCount && existingConfig.rowCount > 0) {
            // Update existing configuration
            result = await query(
                `UPDATE widget_configurations 
         SET 
           primary_color = $1,
           advanced_colors = $2,
           position = $3,
           welcome_message = $4,
           ai_name = $5,
           show_branding = $6,
           auto_open_delay = $7,
           button_icon = $8,
           custom_icon_url = $9,
           theme = $10,
           font_family = $11,
           voice = $12,
           bubble_background = $13,
           bubble_color = $14,
           panel_background = $15,
           panel_header_background = $16,
           panel_color = $17,
           panel_header_color = $18,
           messages_background = $19,
           messages_color = $20,
           user_bubble_background = $21,
           user_bubble_color = $22,
           assistant_bubble_background = $23,
           assistant_bubble_color = $24,
           button_background = $25,
           button_color = $26,
           updated_at = NOW()
         WHERE site_id = $27
         RETURNING *`,
                [
                    primaryColor,
                    advancedColors === true, // Convert to boolean to ensure proper type
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
                    bubbleBackground || '#111',
                    bubbleColor || '#fff',
                    panelBackground || '#fff',
                    panelHeaderBackground || '#f8fafc',
                    panelColor || '#333333',
                    panelHeaderColor || '#ffffff',
                    messagesBackground || '#f8fafc',
                    messagesColor || '#333333',
                    userBubbleBackground || '#3b82f6',
                    userBubbleColor || '#fff',
                    assistantBubbleBackground || '#e5e7eb',
                    assistantBubbleColor || '#111',
                    buttonBackground || '#111',
                    buttonColor || '#fff',
                    siteId
                ]
            );
        } else {
            // Insert new configuration
            result = await query(
                `INSERT INTO widget_configurations (
           site_id,
           primary_color,
           advanced_colors,
           position,
           welcome_message,
           ai_name,
           show_branding,
           auto_open_delay,
           button_icon,
           custom_icon_url,
           theme,
           font_family,
           voice,
           bubble_background,
           bubble_color,
           panel_background,
           panel_header_background,
           panel_color,
           panel_header_color,
           messages_background,
           messages_color,
           user_bubble_background,
           user_bubble_color,
           assistant_bubble_background,
           assistant_bubble_color,
           button_background,
           button_color
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
         RETURNING *`,
                [
                    siteId,
                    primaryColor,
                    advancedColors === true, // Convert to boolean to ensure proper type
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
                    bubbleBackground || '#111',
                    bubbleColor || '#fff',
                    panelBackground || '#fff',
                    panelHeaderBackground || '#f8fafc',
                    panelColor || '#333333',
                    panelHeaderColor || '#ffffff',
                    messagesBackground || '#f8fafc',
                    messagesColor || '#333333',
                    userBubbleBackground || '#3b82f6',
                    userBubbleColor || '#fff',
                    assistantBubbleBackground || '#e5e7eb',
                    assistantBubbleColor || '#111',
                    buttonBackground || '#111',
                    buttonColor || '#fff'
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
