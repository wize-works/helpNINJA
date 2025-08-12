import Link from "next/link";

export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: string;
}

export interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
    return (
        <nav className={`breadcrumbs text-sm ${className}`} aria-label="Breadcrumb">
            <ul>
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    
                    return (
                        <li key={index}>
                            {item.href && !isLast ? (
                                <Link 
                                    href={item.href} 
                                    className="link link-hover opacity-70 hover:opacity-100 transition-opacity"
                                >
                                    {item.icon && (
                                        <i className={`fa-duotone fa-solid ${item.icon} mr-2`} aria-hidden />
                                    )}
                                    {item.label}
                                </Link>
                            ) : (
                                <span className={isLast ? "text-base-content" : "opacity-70"}>
                                    {item.icon && (
                                        <i className={`fa-duotone fa-solid ${item.icon} mr-2`} aria-hidden />
                                    )}
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
} 