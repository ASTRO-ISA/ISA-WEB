import api from '@/lib/api'
import { useState, useEffect, useRef, useCallback } from 'react'
import QrReader from 'react-qr-scanner'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'

// qr scanner wrapper (rear camera)
const QRScanner = ({ delay = 300, onScan, onError, style = {} }) => {
  return (
    <QrReader
      delay={delay}
      onScan={onScan}
      onError={onError}
      style={style}
      constraints={{
        video: {
          facingMode: { ideal: 'environment' },
        },
      }}
    />
  )
}

// status configuration for different scan results
const STATUS_CONFIG = {
  verified: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#10b981',
    text: '#10b981',
    icon: null,
  },
  already_used: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: '#f59e0b',
    text: '#f59e0b',
    icon: null,
  },
  invalid: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: '#ef4444',
    text: '#ef4444',
    icon: null,
  },
  unauthorized: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: '#ef4444',
    text: '#ef4444',
    icon: null,
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: '#ef4444',
    text: '#ef4444',
    icon: null,
  },
  scanning: {
    bg: 'rgba(99, 102, 241, 0.08)',
    border: '#6366f1',
    text: '#6366f1',
    icon: null,
  },
}

const COOLDOWN_MS = 2000

const QRScannerPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userInfo, isAdmin, refetchUser } = useAuth()

  // scanner state
  const [scanning, setScanning] = useState(true)
  const [cooldown, setCooldown] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [checkedInCount, setCheckedInCount] = useState(0)
  const [totalRegistrations, setTotalRegistrations] = useState(0)

  // result state
  const [scanResult, setScanResult] = useState<{
    status: string
    message: string
    attendeeName?: string
    attendeeEmail?: string
  } | null>(null)

  // add scanner panel
  const [showAddScanner, setShowAddScanner] = useState(false)
  const [scannerEmail, setScannerEmail] = useState('')
  const [addingScannerLoading, setAddingScannerLoading] = useState(false)

  // auto-login state
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false)

  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // auto-login via scanner token
  useEffect(() => {
    const scannerToken = searchParams.get('scannerToken')
    if (scannerToken && !userInfo && !autoLoginAttempted) {
      setAutoLoginAttempted(true)
      const autoLogin = async () => {
        try {
          await api.post('/auth/scanner-login', { scannerToken })
          await refetchUser()
          // remove token from url for security
          navigate(`/events/scanner/${slug}`, { replace: true })
        } catch (err) {
          console.error('auto-login failed:', err)
          navigate('/login', { state: { redirectTo: `/events/scanner/${slug}` } })
        }
      }
      autoLogin()
    }
  }, [searchParams, userInfo, autoLoginAttempted])

  // fetch event data
  const fetchEvent = useCallback(async () => {
    try {
      const res = await api.get(`/events/${slug}`)
      setEvent(res.data)
      setCheckedInCount(res.data.checkedInCount ?? 0)
      setTotalRegistrations(res.data.registeredUsers?.length ?? 0)
    } catch (err) {
      console.error('error fetching event:', err)
    }
  }, [slug])

  useEffect(() => {
    if (userInfo) {
      fetchEvent()
    }
  }, [slug, userInfo])

  // hide navbar/footer
  useEffect(() => {
    document.body.classList.add('scanner-mode')
    return () => {
      document.body.classList.remove('scanner-mode')
    }
  }, [])

  // authorization check
  const canScan = () => {
    if (!event || !userInfo) return false
    const userId = userInfo.user._id
    const isCreator = event.createdBy?._id === userId || event.createdBy === userId
    const isScanner = event.scanners?.some(
      (s: any) => (s?._id || s)?.toString() === userId?.toString()
    )
    return isCreator || isScanner || isAdmin
  }

  useEffect(() => {
    if (event && userInfo && !canScan()) {
      navigate(`/events/${event.slug}`)
    }
  }, [event, userInfo])

  // scan handler
  const handleScan = async (data: any) => {
    if (!scanning || cooldown || !data?.text) return

    setScanning(false)
    setCooldown(true)
    setScanResult(null)

    try {
      const res = await api.post('/events/scan', { token: data.text })
      const { status, message, attendeeName, attendeeEmail, newCheckInCount } = res.data

      setScanResult({ status, message, attendeeName, attendeeEmail })

      // zero-latency counter update from api response
      if (newCheckInCount !== undefined) {
        setCheckedInCount(newCheckInCount)
      }
    } catch (err: any) {
      const errData = err.response?.data
      setScanResult({
        status: errData?.status || 'error',
        message: errData?.message || 'server error, try again',
      })
    }

    // 2-second cooldown before next scan
    cooldownTimer.current = setTimeout(() => {
      setCooldown(false)
      setScanning(true)
    }, COOLDOWN_MS)
  }

  const handleError = (err: any) => {
    console.error('qr scan error:', err)
    setScanResult({
      status: 'error',
      message: 'unable to access camera',
    })
  }

  // add scanner
  const addScanner = async () => {
    if (!scannerEmail.trim()) return
    setAddingScannerLoading(true)
    try {
      await api.post(`/qr/add-scanner/${event.slug}`, { email: scannerEmail })
      setScannerEmail('')
      setShowAddScanner(false)
      fetchEvent()
      setScanResult({
        status: 'verified',
        message: `scanner added: ${scannerEmail}`,
      })
    } catch (err: any) {
      setScanResult({
        status: 'error',
        message: err.response?.data?.message || 'failed to add scanner',
      })
    } finally {
      setAddingScannerLoading(false)
    }
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
    }
  }, [])

  // loading state
  if (!userInfo) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center z-[9999]">
        <div className="text-gray-400 text-lg">Authenticating...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center z-[9999]">
        <div className="text-gray-400 text-lg">Loading event...</div>
      </div>
    )
  }

  const isCreator = event.createdBy?._id === userInfo?.user?._id || event.createdBy === userInfo?.user?._id
  const currentStatus = scanResult ? STATUS_CONFIG[scanResult.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.error : STATUS_CONFIG.scanning

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: '#151515' }}
    >
      <Helmet>
        <title>Scanner: {event.title} | ISA-India</title>
        <meta name="description" content={`QR ticket scanner for ${event.title}`} />
      </Helmet>

      {/* top bar (sticky) */}
      <div
        style={{
          background: 'rgba(21, 21, 21, 0.98)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
        className="px-4 py-3 flex-shrink-0"
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex-1 min-w-0 mr-3">
            <h1 className="text-white font-semibold text-sm truncate">
              {event.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
                className="px-2.5 py-0.5 rounded-full"
              >
                <span className="text-emerald-400 text-xs font-medium">
                  Checked In: {checkedInCount} / {totalRegistrations}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* add scanner button (creator/admin only) */}
            {(isCreator || isAdmin) && (
              <button
                onClick={() => setShowAddScanner(!showAddScanner)}
                style={{
                  background: '#ffffff',
                  color: '#151515',
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors duration-200"
                title="Add Scanner"
              >
                + Scanner
              </button>
            )}

            {/* back button */}
            <button
              onClick={() => navigate(`/events/${event.slug}`)}
              style={{
                background: '#ffffff',
                color: '#151515',
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors duration-200"
              title="Exit Scanner"
            >
              Back
            </button>
          </div>
        </div>

        {/* add scanner panel */}
        <AnimatePresence>
          {showAddScanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden max-w-lg mx-auto"
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                className="mt-3 p-3 rounded-xl"
              >
                <p className="text-gray-400 text-xs mb-2">Add scanner by email</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="scanner@example.com"
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      outline: 'none',
                    }}
                    value={scannerEmail}
                    onChange={(e) => setScannerEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addScanner()}
                  />
                  <button
                    onClick={addScanner}
                    disabled={addingScannerLoading || !scannerEmail.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 disabled:opacity-50 hover:bg-gray-100"
                    style={{
                      background: '#ffffff',
                      color: '#151515',
                    }}
                  >
                    {addingScannerLoading ? '...' : 'Add'}
                  </button>
                  <button
                    onClick={() => setShowAddScanner(false)}
                    className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* center: qr scanner (takes remaining space) */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div
          className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden relative"
          style={{
            border: `2px solid ${currentStatus.border}`,
            boxShadow: `0 0 30px ${currentStatus.border}18`,
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
        >
          <QRScanner
            onScan={handleScan}
            onError={handleError}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* scanning overlay indicator */}
          {scanning && !cooldown && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(transparent 40%, rgba(99, 102, 241, 0.04) 50%, transparent 60%)',
                animation: 'scanLine 2s ease-in-out infinite',
              }}
            />
          )}

          {/* cooldown overlay */}
          {cooldown && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              <div className="text-white text-sm font-medium opacity-70">Processing...</div>
            </div>
          )}
        </div>
      </div>

      {/* bottom bar: status zone */}
      <div className="flex-shrink-0 px-4 pb-6 pt-2">
        <AnimatePresence mode="wait">
          {scanResult ? (
            <motion.div
              key={scanResult.message}
              initial={scanResult.status === 'verified' ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 0 }}
              animate={scanResult.status === 'verified' ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={scanResult.status === 'verified' ? { duration: 0.4, ease: 'easeOut' } : { duration: 0.2 }}
              className="max-w-lg mx-auto rounded-xl p-4"
              style={{
                background: currentStatus.bg,
                border: `1px solid ${currentStatus.border}30`,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm"
                    style={{ color: currentStatus.text }}
                  >
                    {scanResult.message}
                  </p>
                  {scanResult.attendeeName && (
                    <p className="text-gray-400 text-xs mt-1 truncate">
                      {scanResult.attendeeName}
                      {scanResult.attendeeEmail && (
                        <span className="text-gray-500"> • {scanResult.attendeeEmail}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-lg mx-auto rounded-xl p-4 text-center"
              style={{
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
              }}
            >
              <p className="text-indigo-300 text-sm font-medium">
                Position camera at QR code to scan
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Logged in as {userInfo.user.email}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* scan line animation keyframes and success pulse animation */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { background-position: 0 0; }
          50% { background-position: 0 100%; }
        }
        
        @keyframes successPulse {
          0% { transform: scale(0.95); opacity: 0; }
          50% { transform: scale(1.01); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default QRScannerPage