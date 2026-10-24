import React, { useState } from 'react'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const menuItems = [
    { label: 'The Problem', href: '#problem' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Why Trust It', href: '#trust' },
    { label: 'Try Demo', href: '/app/', isButton: true }
  ]

  return (
    <header style={{
      backgroundColor: 'var(--accent)',
      color: 'var(--on-dark)',
      padding: 'var(--s-4) 0',
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-pop)'
    }}>
      <div className="container">
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--s-2)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'var(--on-dark)',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{
                color: 'var(--accent)',
                fontWeight: 700,
                fontSize: 'var(--t-sm)'
              }}>RD</span>
            </div>
            <h1 style={{
              fontSize: 'var(--t-lg)',
              fontWeight: 700,
              margin: 0,
              fontFamily: 'var(--f-display)'
            }}>Rare Disease Detective</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav style={{
            display: 'none',
            gap: 'var(--s-6)',
            alignItems: 'center'
          }}>
            {menuItems.map((item) => (
              item.isButton ? (
                <a 
                  key={item.label}
                  href={item.href}
                  style={{
                    backgroundColor: 'var(--on-dark)',
                    color: 'var(--accent)',
                    padding: 'var(--s-2) var(--s-4)',
                    borderRadius: 'var(--r-s)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all var(--dur-base) var(--ease)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--on-dark)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <a 
                  key={item.label}
                  href={item.href}
                  style={{
                    color: 'var(--on-dark)',
                    textDecoration: 'none',
                    transition: 'color var(--dur-base) var(--ease)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--on-dark)';
                  }}
                >
                  {item.label}
                </a>
              )
            ))}
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--on-dark)',
              cursor: 'pointer',
              padding: 'var(--s-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            <svg style={{
              width: '24px',
              height: '24px',
              transition: 'transform var(--dur-base) var(--ease)',
              transform: isMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)'
            }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--accent)',
            padding: 'var(--s-4) var(--gutter)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'var(--shadow-pop)',
            zIndex: 'var(--z-pop)'
          }}>
            <nav style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s-4)'
            }}>
              {menuItems.map((item) => (
                item.isButton ? (
                  <a 
                    key={item.label}
                    href={item.href}
                    style={{
                      backgroundColor: 'var(--on-dark)',
                      color: 'var(--accent)',
                      padding: 'var(--s-4)',
                      borderRadius: 'var(--r-s)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      textAlign: 'center',
                      fontSize: 'var(--t-base)'
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <a 
                    key={item.label}
                    href={item.href}
                    style={{
                      color: 'var(--on-dark)',
                      textDecoration: 'none',
                      padding: 'var(--s-4)',
                      fontSize: 'var(--t-base)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header