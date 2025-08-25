"use client";

import DefaultWidgetConfiguration from "./default-widget-configuration";

export default function DefaultWidgetConfigurationWrapper({ tenantId: _tenantId }: { tenantId: string }) {
    void _tenantId; // reserved for future; suppress unused var lint
    return <DefaultWidgetConfiguration />;
}
