import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
    title: string
    backHref?: string
    children?: React.ReactNode
}

/** Flat toolbar header shared by the secondary pages. */
export function PageHeader({ title, backHref, children }: PageHeaderProps) {
    return (
        <header className="bg-surface border-b border-line sticky top-0 z-40">
            <div className="container mx-auto px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {backHref && (
                        <Link
                            href={backHref}
                            className="p-1.5 -ml-1.5 text-ink-secondary hover:text-ink hover:bg-sunken rounded transition-colors"
                            title="Back to dashboard"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    )}
                    <h1 className="text-sm font-semibold">{title}</h1>
                </div>
                <div className="flex items-center gap-2">{children}</div>
            </div>
        </header>
    )
}
