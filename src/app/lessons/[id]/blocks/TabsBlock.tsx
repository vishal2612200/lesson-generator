'use client'

import React from 'react'
import { TabsBlock as TabsBlockType } from '../types/blocks'
import BlockRenderer from '../BlockRenderer'

export default function TabsBlock({ tabs }: TabsBlockType) {
  const [activeTab, setActiveTab] = React.useState(0)

  return (
    <div className="my-8">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
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


