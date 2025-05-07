// TileCard.tsx

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import clsx from 'clsx'

interface TileCardProps {
  title: string
  icon?: IconDefinition
  children: React.ReactNode
  fixedHeight?: boolean
  fullHeight?: boolean
  actions?: React.ReactNode // Optional buttons or tools in the header
}

export default function TileCard({
  title,
  icon,
  children,
  fixedHeight = false,
  fullHeight = false,
  actions
}: TileCardProps) {
  return (
    <div
      className={clsx(
        'bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-md flex flex-col',
        {
          'min-h-[550px] max-h-[550px]': fixedHeight,
          'h-full': fullHeight,
          'overflow-hidden': fullHeight
        }
      )}
    >
      {/* Header */}
      <div className="text-indigo-400 text-lg font-bold mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <FontAwesomeIcon icon={icon} />}
          <span>{title}</span>
        </div>
        {actions && <div>{actions}</div>}
      </div>

      {/* Content */}
      <div className={clsx('pr-2', { 'overflow-y-auto flex-1': true })}>
        {children}
      </div>
    </div>
  )
}
