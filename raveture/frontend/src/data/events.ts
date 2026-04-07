import type { Event } from '@/types'
import { TEST_EVENT } from './testEvent'

export const sampleEvents: Event[] = [
  {
    id: TEST_EVENT.id,
    title: TEST_EVENT.name,
    location: TEST_EVENT.location,
    date: '15.08.25',
    bpm: 150,
    imageUrl:
      'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80',
    description: TEST_EVENT.description,
    time: TEST_EVENT.time,
  },
  {
    id: 'void-berlin',
    title: 'VOID//BERLIN',
    location: 'REINICKENDORF',
    date: '24.08.25',
    bpm: 142,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAFwj9GLGCTxbYdfwWuFkq88vptWKTtkPMd42ut0TjGce03UUbtI6UHKHGQ_TACBqPKoIpxohJVFKEt93hDy5JZFAXafjLv8Sk-0gnPGgrJgi-BfjB5Oxsy3QqJwItHGE2Hjzud7WYuOlor4yCPtXacFpmXW2A_GXzBOHhVM6OTciYG6MBsaGNdD6weG6QzvN9vYKs2jNPkFvqshVPy431TUhwFwlOKJ2r0PQSXxCWT4h3okCK-3JoupPHzFxNkavprB7qtFdSMGvGI',
  },
  {
    id: 'kollectiv-04',
    title: 'KOLLECTIV_04',
    location: 'LONDON SE1',
    date: '31.08.25',
    bpm: 138,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBtEvxaF9XDzcWPKYxmGYyUtwUv8JBLRIu-G7PCA9UK28rwlWlM1VpUVpGSG7XD0Irrs6lsPlInVB1kNU0X5Is29IG-fj0PWGQIw-kbnIIJFtvkyHNwi_lH9pjLfeEzS-KBSSfA_ytQqxBf3Fk-S7CRU43rXCR7Y895Cky5nDbzP92n7qs9oDj3wvOH5pNW9r0gUPJGgQYrfQjCRLcYEvvLwV2aNCBzIQcHcocZSzXYTG38-3DhwG968eRHwPhB54L3f2uJUbH3B7tp',
  },
]
