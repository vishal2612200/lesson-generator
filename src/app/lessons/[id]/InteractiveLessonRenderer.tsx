/**
 * Enhanced Interactive Lesson Renderer
 * Provides rich interactive features and improved UX
 */

import React from 'react'
import { Lesson } from '@/types/lesson'
import BlockRenderer from './BlockRenderer'
import { ContentBlock } from './types/blocks'

interface InteractiveLessonRendererProps {
  lesson: Lesson
}

interface LessonProgress {
  currentBlock: number
  completedBlocks: Set<number>
  totalBlocks: number
  timeSpent: number
  interactions: number
}

interface LessonAnalytics {
  startTime: Date
  endTime?: Date
  timeSpent: number
  blocksViewed: Set<number>
  interactions: number
  quizAttempts: number
  quizScore?: number
}

export default function InteractiveLessonRenderer({ lesson }: InteractiveLessonRendererProps) {
  // Handle case where lesson is undefined or null
  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading Lesson...</h1>
          <p className="text-gray-600">Please wait while we load the lesson content.</p>
        </div>
      </div>
    )
  }
  
  const [progress, setProgress] = React.useState({
    currentBlock: 0,
    completedBlocks: new Set(),
    totalBlocks: lesson.content?.blocks?.length || 0,
    timeSpent: 0,
    interactions: 0
  } as LessonProgress)
  
  const [analytics, setAnalytics] = React.useState({
    startTime: new Date(),
    timeSpent: 0,
    blocksViewed: new Set() as Set<number>,
    interactions: 0,
    quizAttempts: 0
  } as LessonAnalytics)
  
  const [showProgress, setShowProgress] = React.useState(true)
  const [showNavigation, setShowNavigation] = React.useState(true)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [bookmarks, setBookmarks] = React.useState(new Set() as Set<number>)
  const [notes, setNotes] = React.useState(new Map() as Map<number, string>)
  const [showNotes, setShowNotes] = React.useState(false)
  
  // Track time spent
  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev: LessonProgress) => ({
        ...prev,
        timeSpent: prev.timeSpent + 1
      }))
      setAnalytics((prev: LessonAnalytics) => ({
        ...prev,
        timeSpent: prev.timeSpent + 1
      }))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Track block viewing
  React.useEffect(() => {
    setAnalytics((prev: LessonAnalytics) => ({
      ...prev,
      blocksViewed: new Set([...prev.blocksViewed, progress.currentBlock])
    }))
  }, [progress.currentBlock])
  
  const handleBlockComplete = (blockIndex: number) => {
    setProgress((prev: LessonProgress) => ({
      ...prev,
      completedBlocks: new Set([...prev.completedBlocks, blockIndex])
    }))
  }
  
  const handleInteraction = () => {
    setProgress((prev: LessonProgress) => ({
      ...prev,
      interactions: prev.interactions + 1
    }))
    setAnalytics((prev: LessonAnalytics) => ({
      ...prev,
      interactions: prev.interactions + 1
    }))
  }
  
  const handleQuizAttempt = (score?: number) => {
    setAnalytics((prev: LessonAnalytics) => ({
      ...prev,
      quizAttempts: prev.quizAttempts + 1,
      quizScore: score
    }))
  }
  
  const navigateToBlock = (blockIndex: number) => {
    setProgress((prev: LessonProgress) => ({
      ...prev,
      currentBlock: Math.max(0, Math.min(blockIndex, prev.totalBlocks - 1))
    }))
  }
  
  const nextBlock = () => {
    if (progress.currentBlock < progress.totalBlocks - 1) {
      navigateToBlock(progress.currentBlock + 1)
    }
  }
  
  const previousBlock = () => {
    if (progress.currentBlock > 0) {
      navigateToBlock(progress.currentBlock - 1)
    }
  }
  
  const toggleBookmark = (blockIndex: number) => {
    setBookmarks((prev: Set<number>) => {
      const newBookmarks = new Set(prev)
      if (newBookmarks.has(blockIndex)) {
        newBookmarks.delete(blockIndex)
      } else {
        newBookmarks.add(blockIndex)
      }
      return newBookmarks
    })
  }
  
  const updateNote = (blockIndex: number, note: string) => {
    setNotes((prev: Map<number, string>) => {
      const newNotes = new Map(prev)
      if (note.trim()) {
        newNotes.set(blockIndex, note)
      } else {
        newNotes.delete(blockIndex)
      }
      return newNotes
    })
  }
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }
  
  const getProgressPercentage = () => {
    return progress.totalBlocks > 0 ? (progress.completedBlocks.size / progress.totalBlocks) * 100 : 0
  }
  
  const getTimeSpentFormatted = () => {
    const minutes = Math.floor(progress.timeSpent / 60)
    const seconds = progress.timeSpent % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Additional safety checks for lesson content structure
  if (!lesson.content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lesson Content Missing</h1>
          <p className="text-gray-600">The lesson content is not available.</p>
        </div>
      </div>
    )
  }

  if (!lesson.content.blocks || !Array.isArray(lesson.content.blocks) || lesson.content.blocks.length === 0) {
            return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Content Blocks</h1>
          <p className="text-gray-600">The lesson has no content blocks to display.</p>
                </div>
              </div>
            )
  }

  const currentBlock = lesson.content.blocks[progress.currentBlock]
  
  if (!currentBlock) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Block Not Found</h1>
          <p className="text-gray-600">The requested content block could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
              {lesson.description && (
                <p className="text-gray-600 mt-1">{lesson.description}</p>
              )}
      </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowProgress(!showProgress)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Toggle Progress"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
        <button
                onClick={() => setShowNotes(!showNotes)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Toggle Notes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
        </button>
        <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Toggle Fullscreen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
        </button>
      </div>
    </div>
          
          {/* Progress Bar */}
          {showProgress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress: {progress.completedBlocks.size} / {progress.totalBlocks} blocks</span>
                <span>Time: {getTimeSpentFormatted()}</span>
      </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Block Navigation */}
              {showNavigation && progress.totalBlocks > 1 && (
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={previousBlock}
                    disabled={progress.currentBlock === 0}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Block {progress.currentBlock + 1} of {progress.totalBlocks}
                    </span>
                    <button
                      onClick={() => toggleBookmark(progress.currentBlock)}
                      className={`p-2 rounded-full transition-colors ${
                        bookmarks.has(progress.currentBlock)
                          ? 'text-yellow-500 bg-yellow-50'
                          : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                      }`}
                      title="Bookmark this block"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                  
              <button
                    onClick={nextBlock}
                    disabled={progress.currentBlock === progress.totalBlocks - 1}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Block Content */}
              <div className="prose max-w-none">
                <BlockRenderer 
                  block={currentBlock} 
                  onComplete={() => handleBlockComplete(progress.currentBlock)}
                  onInteraction={handleInteraction}
                  onQuizAttempt={handleQuizAttempt}
                />
              </div>
              
              {/* Block Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleBlockComplete(progress.currentBlock)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      progress.completedBlocks.has(progress.currentBlock)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {progress.completedBlocks.has(progress.currentBlock) ? 'Completed' : 'Mark Complete'}
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {progress.interactions} interactions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Block Navigation */}
              {progress.totalBlocks > 1 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Navigation</h3>
                  <div className="space-y-2">
                    {lesson.content.blocks.map((block: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => navigateToBlock(index)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          index === progress.currentBlock
                            ? 'bg-blue-100 text-blue-800'
                            : progress.completedBlocks.has(index)
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Block {index + 1}</span>
                          <div className="flex items-center space-x-1">
                            {progress.completedBlocks.has(index) && (
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                            )}
                            {bookmarks.has(index) && (
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Notes */}
              {showNotes && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                  <textarea
                    value={notes.get(progress.currentBlock) || ''}
                    onChange={(e) => updateNote(progress.currentBlock, e.target.value)}
                    placeholder="Add your notes here..."
                    className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              
              {/* Analytics */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Progress</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time Spent:</span>
                    <span className="font-medium">{getTimeSpentFormatted()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Blocks Completed:</span>
                    <span className="font-medium">{progress.completedBlocks.size} / {progress.totalBlocks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Interactions:</span>
                    <span className="font-medium">{progress.interactions}</span>
                  </div>
                  {analytics.quizAttempts > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quiz Attempts:</span>
                      <span className="font-medium">{analytics.quizAttempts}</span>
                    </div>
                  )}
                  {analytics.quizScore !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quiz Score:</span>
                      <span className="font-medium">{analytics.quizScore}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
      </div>
        </div>
      </div>
    </div>
  )
}