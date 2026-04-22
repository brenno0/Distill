import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageLoadingSkeleton } from './page-loading-skeleton'

describe('PageLoadingSkeleton', () => {
  it('renders the requested amount of skeleton rows', () => {
    render(<PageLoadingSkeleton rows={4} />)
    expect(screen.getAllByTestId('page-skeleton-row')).toHaveLength(4)
  })

  it('renders default 6 rows when rows prop not provided', () => {
    render(<PageLoadingSkeleton />)
    expect(screen.getAllByTestId('page-skeleton-row')).toHaveLength(6)
  })
})