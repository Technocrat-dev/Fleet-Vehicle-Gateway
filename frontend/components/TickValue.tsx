'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Renders a value that briefly flashes signal-orange whenever it changes —
 * a quiet cue that the number is live, borrowed from trading terminals.
 */
export function TickValue({ value, className = '' }: { value: string | number; className?: string }) {
    const [ticking, setTicking] = useState(false)
    const prevRef = useRef(value)

    useEffect(() => {
        if (prevRef.current !== value) {
            prevRef.current = value
            setTicking(true)
            const t = setTimeout(() => setTicking(false), 600)
            return () => clearTimeout(t)
        }
    }, [value])

    return (
        <span className={`${className} ${ticking ? 'value-tick' : ''}`}>
            {value}
        </span>
    )
}
