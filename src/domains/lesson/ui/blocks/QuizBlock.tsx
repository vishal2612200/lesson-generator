'use client'

import React from 'react'
import { QuizBlock as QuizBlockType } from '@domains/lesson/domain/blocks'

interface QuizBlockProps extends QuizBlockType {
  onInteraction?: () => void
  onQuizAttempt?: (score?: number) => void
}

export default function QuizBlock({ questions, onInteraction, onQuizAttempt }: QuizBlockProps) {
  const [currentQuestion, setCurrentQuestion] = React.useState(0)
  const [selectedAnswers, setSelectedAnswers] = React.useState([] as number[])
  const [showResults, setShowResults] = React.useState(false)

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newAnswers)
    onInteraction?.()
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResults(true)
      const score = selectedAnswers.reduce((acc: number, answer: number, i: number) => {
        return acc + (answer === questions[i].correct ? 1 : 0)
      }, 0)
      const percentage = Math.round((score / questions.length) * 100)
      onQuizAttempt?.(percentage)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      onInteraction?.()
    }
  }

  const handleReset = () => {
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
    onInteraction?.()
  }

  if (showResults) {
    const score = selectedAnswers.reduce((acc: number, answer: number, i: number) => {
      return acc + (answer === questions[i].correct ? 1 : 0)
    }, 0)
    const percentage = Math.round((score / questions.length) * 100)

    return (
      <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-8 my-6 shadow-lg">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Quiz Complete!
          </h3>
          <div className="inline-flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md border border-gray-200">
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                {score}/{questions.length}
              </div>
              <div className="text-sm font-medium text-gray-500">
                Score
              </div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div>
              <div className={`text-5xl font-bold mb-1 ${
                percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {percentage}%
              </div>
              <div className="text-sm font-medium text-gray-500">
                Accuracy
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const userAnswer = selectedAnswers[i]
            const isCorrect = userAnswer === q.correct

            return (
              <div key={i} className={`border-2 rounded-xl p-5 ${
                isCorrect 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {isCorrect ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-3">{q.q}</p>
                    <div className="space-y-2">
                      <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-100 border-l-4 border-green-500' : 'bg-red-100 border-l-4 border-red-500'}`}>
                        <span className="text-sm font-medium text-gray-600">Your answer: </span>
                        <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {q.options[userAnswer]}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div className="p-3 bg-green-100 rounded-lg border-l-4 border-green-500">
                          <span className="text-sm font-medium text-gray-600">Correct answer: </span>
                          <span className="font-semibold text-green-700">
                            {q.options[q.correct]}
                          </span>
                        </div>
                      )}
                      {q.explanation && (
                        <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-blue-800">{q.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={handleReset}
          className="mt-8 w-full btn-primary flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-8 my-6 shadow-lg">
      <div className="mb-8">
        <div className="flex justify-between items-center text-sm font-medium mb-3">
          <span className="text-gray-700">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse-soft"></div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 leading-relaxed">{question.q}</h3>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {question.options.map((option, i) => (
          <label
            key={i}
            className={`block group cursor-pointer transition-all duration-200 ${
              selectedAnswers[currentQuestion] === i
                ? 'scale-[1.02]'
                : 'hover:scale-[1.01]'
            }`}
          >
            <div className={`p-5 border-2 rounded-xl transition-all duration-200 ${
              selectedAnswers[currentQuestion] === i
                ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedAnswers[currentQuestion] === i
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 group-hover:border-blue-400'
                }`}>
                  {selectedAnswers[currentQuestion] === i && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`flex-1 font-medium ${
                  selectedAnswers[currentQuestion] === i
                    ? 'text-gray-900'
                    : 'text-gray-700'
                }`}>
                  {option}
                </span>
              </div>
            </div>
            <input
              type="radio"
              name={`question-${currentQuestion}`}
              checked={selectedAnswers[currentQuestion] === i}
              onChange={() => handleAnswer(i)}
              className="sr-only"
            />
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        {currentQuestion > 0 && (
          <button
            onClick={handlePrevious}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={selectedAnswers[currentQuestion] === undefined}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          {currentQuestion === questions.length - 1 ? (
            <>
              Finish Quiz
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </>
          ) : (
            <>
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}


