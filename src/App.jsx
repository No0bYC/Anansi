import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContacts()
  }, [])

  async function fetchContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setContacts(data)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c18',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <svg width="40" height="40" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="none" stroke="#068ea9" strokeWidth="1.5"/>
        <circle cx="14" cy="8" r="3" fill="#068ea9"/>
        <circle cx="6" cy="20" r="3" fill="#89b44a"/>
        <circle cx="22" cy="20" r="3" fill="#f2bc18"/>
        <line x1="14" y1="8" x2="6" y2="20" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <line x1="14" y1="8" x2="22" y2="20" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <line x1="6" y1="20" x2="22" y2="20" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      </svg>
      <h1 style={{
        fontSize: '28px',
        fontWeight: '700',
        letterSpacing: '-0.03em',
        color: '#ffffff'
      }}>Anansi</h1>
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Connexion à la base...
        </p>
      ) : (
        <p style={{ color: '#068ea9', fontSize: '14px' }}>
          ✓ Base connectée · {contacts.length} contacts
        </p>
      )}
    </div>
  )
}
