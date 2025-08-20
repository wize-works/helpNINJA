"use client";

import DefaultWidgetConfiguration from "./default-widget-configuration";

export default function DefaultWidgetConfigurationWrapper({ tenantId }: { tenantId: string }) {
    // The wrapper simply passes the component directly
    // This is needed to handle the "client-only" usage in a server component
    return <DefaultWidgetConfiguration />;
}
