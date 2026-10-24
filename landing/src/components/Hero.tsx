import React from 'react'

const Hero: React.FC = () => {
  return (
    <section className="hero" style={{
      backgroundColor: 'var(--accent)',
      color: 'var(--on-dark)',
      padding: 'var(--s-10) var(--gutter)'
    }}>
      <div className="container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-12)',
          alignItems: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '500px' }}>
            <h1 style={{
              fontFamily: 'var(--f-display)',
              fontSize: 'var(--t-2xl)',
              fontWeight: 700,
              marginBottom: 'var(--s-6)',
              lineHeight: 'var(--lh-head)'
            }}>
              A specialist‑ready brief in minutes, not a diagnosis in years
            </h1>
            <p style={{
              fontSize: 'var(--t-base)',
              marginBottom: 'var(--s-8)',
              opacity: 0.9,
              lineHeight: 'var(--lh-text)'
            }}>
              Transform years of scattered notes into a structured, evidence‑based brief for your specialist. 
              Rare Disease Detective helps families navigate the diagnostic journey with clarity and confidence.
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s-4)'
            }}>
              <a 
                href="/app/" 
                style={{ 
                  backgroundColor: 'var(--surface)', 
                  color: 'var(--ink)',
                  borderRadius: 'var(--r-l)',
                  padding: 'var(--s-5) var(--s-7)',
                  fontSize: 'var(--t-base)',
                  fontWeight: 600,
                  display: 'inline-block',
                  textDecoration: 'none',
                  transition: 'all var(--dur-base) var(--ease)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-pop)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Try a demo case
              </a>
              <a 
                href="#how-it-works" 
                style={{ 
                  border: '2px solid var(--surface)',
                  color: 'var(--surface)',
                  borderRadius: 'var(--r-l)',
                  padding: 'var(--s-5) var(--s-7)',
                  fontSize: 'var(--t-base)',
                  fontWeight: 600,
                  display: 'inline-block',
                  textDecoration: 'none',
                  transition: 'all var(--dur-base) var(--ease)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface)';
                  e.currentTarget.style.color = 'var(--ink)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-pop)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--surface)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                How it works
              </a>
            </div>
          </div>
          
          <div style={{
            width: '100%',
            maxWidth: '500px',
            position: 'relative'
          }}>
            <div style={{ 
              backgroundColor: 'rgba(245, 246, 248, 0.1)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--r-m)',
              border: '1px solid rgba(245, 246, 248, 0.2)',
              boxShadow: 'var(--shadow-pop)',
              padding: 'var(--s-8)'
            }}>
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--s-4)'
              }}>
                {[
                  'Describe symptoms in plain words',
                  'Confirm extracted clinical features',
                  'See ranked possibilities with evidence',
                  'Take a one‑page brief to your specialist'
                ].map((text, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--s-3)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: 'rgba(245, 246, 248, 0.2)',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ color: 'var(--on-dark)' }}>{index + 1}</span>
                    </div>
                    <p style={{ 
                      fontSize: 'var(--t-base)', 
                      color: 'var(--on-dark)',
                      margin: 0
                    }}>
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{
              position: 'absolute',
              top: '-16px',
              right: '-16px',
              width: '96px',
              height: '96px',
              backgroundColor: 'var(--accent)',
              opacity: 0.2,
              borderRadius: '999px',
              filter: 'blur(32px)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-16px',
              left: '-16px',
              width: '128px',
              height: '128px',
              backgroundColor: 'var(--mark)',
              opacity: 0.2,
              borderRadius: '999px',
              filter: 'blur(32px)'
            }}></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero