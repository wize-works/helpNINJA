"use client";

export default function QuickStartDismiss() {
    return (
        <button
            className="btn btn-ghost btn-sm rounded-lg"
            onClick={() => {
                const banner = document.querySelector('[data-banner="quickstart"]');
                if (banner) banner.remove();
            }}
        >
            <i className="fa-duotone fa-solid fa-times" aria-hidden />
        </button>
    );
}
