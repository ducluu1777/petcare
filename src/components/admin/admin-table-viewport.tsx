import type { ReactNode } from "react";

interface AdminTableViewportProps {
	children: ReactNode;
	label: string;
}

export function AdminTableViewport({ children, label }: AdminTableViewportProps) {
	return (
		<div
			role="region"
			aria-label={label}
			tabIndex={0}
			className="w-full min-w-0 overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
		>
			{children}
		</div>
	);
}
