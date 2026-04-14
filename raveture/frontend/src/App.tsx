import { BrowserRouter, Routes, Route } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { AuthProvider } from '@/context'
import { ToastProvider } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Home, Login, Register, CreateEvent, EditEvent, MyEvents, TicketAdmin, EventShop, Checkout, MyTickets, TicketDetail, OrganizerDashboard, NewDesign, Events, Profile, AdminDashboard, ScannerPage, ScanDashboard, Picks, Magazine, ArticleDetail } from '@/pages'

// Register GSAP plugins
gsap.registerPlugin(useGSAP)

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/edit-event/:eventId" element={<EditEvent />} />
              <Route path="/my-events" element={<MyEvents />} />
              <Route path="/ticket-admin" element={<TicketAdmin />} />
              <Route path="/events/:eventId" element={<EventShop />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/my-tickets" element={<MyTickets />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
              <Route path="/organizer" element={<OrganizerDashboard />} />
              <Route path="/new-design" element={<NewDesign />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/scan" element={<ScannerPage />} />
              <Route path="/organizer/live/:eventId" element={<ScanDashboard />} />
              <Route path="/picks" element={<Picks />} />
              <Route path="/magazine" element={<Magazine />} />
              <Route path="/magazine/articles/:id" element={<ArticleDetail />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
