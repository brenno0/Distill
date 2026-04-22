import { useRef, useEffect } from 'react'
import { animate, stagger } from 'animejs'
import { gsap } from 'gsap'
import { RecordingCard } from './RecordingCard'
import type { LibraryFolder, LibraryItem } from '../types'

interface Props {
  recordings: LibraryItem[]
  folders: LibraryFolder[]
  viewMode: 'grid' | 'list'
  onDelete: (id: string) => void
  onRenameDialog: (itemId: string, displayName: string) => void
  deletingId: string | null
}

export function RecordingList({
  recordings,
  folders,
  viewMode,
  onDelete,
  onRenameDialog,
  deletingId,
}: Props) {
  const cardsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    cardsRef.current = []
  }, [viewMode])

  useEffect(() => {
    if (cardsRef.current.length === 0) return
    animate(cardsRef.current, {
      opacity: [0, 1],
      translateY: [30, 0],
      scale: [0.95, 1],
      delay: stagger(80, { start: 200 }),
      duration: 600,
      easing: 'easeOutCubic',
    })
  }, [recordings.length, viewMode])

  const handleHover = (index: number, isEntering: boolean) => {
    const card = cardsRef.current[index]
    if (card) {
      gsap.to(card, {
        scale: isEntering ? 1.02 : 1,
        boxShadow: isEntering ? '0 20px 40px rgba(0,0,0,0.15)' : '0 4px 6px rgba(0,0,0,0.1)',
        duration: 0.3,
        ease: 'power2.out',
      })
    }
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordings.map((recording, index) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            folders={folders}
            viewMode="grid"
            onDelete={onDelete}
            onRenameDialog={onRenameDialog}
            isDeleting={deletingId === recording.id}
            cardRef={(el) => {
              if (el) cardsRef.current[index] = el
            }}
            onMouseEnter={() => handleHover(index, true)}
            onMouseLeave={() => handleHover(index, false)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recordings.map((recording, index) => (
        <RecordingCard
          key={recording.id}
          recording={recording}
          folders={folders}
          viewMode="list"
          onDelete={onDelete}
          onRenameDialog={onRenameDialog}
          isDeleting={deletingId === recording.id}
          cardRef={(el) => {
            if (el) cardsRef.current[index] = el
          }}
          onMouseEnter={() => handleHover(index, true)}
          onMouseLeave={() => handleHover(index, false)}
        />
      ))}
    </div>
  )
}
