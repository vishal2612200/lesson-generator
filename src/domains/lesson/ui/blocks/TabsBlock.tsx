'use client'

import React from 'react'
import { TabsBlock as TabsBlockType } from '@domains/lesson/domain/blocks'
import BlockRenderer from '@domains/lesson/ui/BlockRenderer'

function TabsBlockComponent({ tabs }: TabsBlockType) {
  const [activeTab, setActiveTab] = React.useState(0)
  const handleSetActiveTab = React.useCallback((i: number) => setActiveTab(i), [])

  return (
    <div className="my-8">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
        {tabs.map((tab, i) => (
          <button
            key={tab.label ?? i}
            onClick={() => handleSetActiveTab(i)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === i
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {tabs[activeTab].content.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </div>
  )
}

export default React.memo(TabsBlockComponent)


