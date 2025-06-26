import { describe, it, expect } from 'vitest'
import { formatTime, stripHtml, truncateText, getGlobalVar } from '../utils'

describe('formatTime', () => {
  it('formats seconds correctly for MM:SS format', () => {
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(30)).toBe('0:30')
    expect(formatTime(0)).toBe('0:00')
  })

  it('formats seconds correctly for HH:MM:SS format', () => {
    expect(formatTime(3665)).toBe('1:01:05') // 1 hour, 1 minute, 5 seconds
    expect(formatTime(7200)).toBe('2:00:00') // 2 hours
  })

  it('handles edge cases', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(-10)).toBe('0:00')
  })
})

describe('stripHtml', () => {
  it('removes HTML tags from text', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
    expect(stripHtml('<div><span>Test</span></div>')).toBe('Test')
    expect(stripHtml('No HTML here')).toBe('No HTML here')
  })

  it('handles empty and whitespace', () => {
    expect(stripHtml('')).toBe('')
    expect(stripHtml('<p></p>')).toBe('')
    expect(stripHtml('<br/>')).toBe('')
  })
})

describe('truncateText', () => {
  it('truncates text when longer than maxLength', () => {
    expect(truncateText('This is a long text', 10)).toBe('This is a ...')
    expect(truncateText('Short', 10)).toBe('Short')
    expect(truncateText('Exactly ten', 11)).toBe('Exactly ten')
  })

  it('handles edge cases', () => {
    expect(truncateText('', 10)).toBe('')
    expect(truncateText('Test', 0)).toBe('...')
  })
})

describe('getGlobalVar', () => {
  it('returns global variable if available', () => {
    // Mock window global variable
    const mockWindow = global.window as any
    mockWindow.testVar = 'test value'
    
    expect(getGlobalVar('testVar', 'default')).toBe('test value')
  })

  it('returns default value if global variable not available', () => {
    expect(getGlobalVar('nonExistentVar', 'default value')).toBe('default value')
  })
})
