import React from 'react'

const Footer: React.FC = () => {
  const currentYear = 2026

  return (
    <footer style={{
      backgroundColor: 'var(--ink)',
      color: 'var(--on-dark)',
      padding: 'var(--s-8) var(--gutter)'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--s-8)',
          marginBottom: 'var(--s-8)'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s-2)',
              marginBottom: 'var(--s-4)'
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
                  color: 'var(--ink)',
                  fontWeight: 700,
                  fontSize: 'var(--t-sm)'
                }}>RD</span>
              </div>
              <h3 style={{
                fontSize: 'var(--t-lg)',
                fontWeight: 700,
                margin: 0,
                fontFamily: 'var(--f-display)'
              }}>Rare Disease Detective</h3>
            </div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: 'var(--s-4)',
              lineHeight: 'var(--lh-text)'
            }}>
              A clinical discussion support tool for rare disease patients and families.
            </p>
            <p style={{
              fontSize: 'var(--t-sm)',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              Built at Sundai • Hackachusetts powered by Kiro • {currentYear}
            </p>
          </div>
          
          <div>
            <h4 style={{
              fontSize: 'var(--t-lg)',
              fontWeight: 600,
              marginBottom: 'var(--s-4)',
              fontFamily: 'var(--f-display)'
            }}>
              Important notices
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s-3)'
            }}>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <svg style={{
                  width: '20px',
                  height: '20px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginRight: 'var(--s-2)',
                  marginTop: '2px',
                  flexShrink: 0
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{
                  fontSize: 'var(--t-sm)',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  Decision support, not a diagnosis
                </span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <svg style={{
                  width: '20px',
                  height: '20px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginRight: 'var(--s-2)',
                  marginTop: '2px',
                  flexShrink: 0
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span style={{
                  fontSize: 'var(--t-sm)',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  Your data is processed securely and privately
                </span>
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <svg style={{
                  width: '20px',
                  height: '20px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginRight: 'var(--s-2)',
                  marginTop: '2px',
                  flexShrink: 0
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span style={{
                  fontSize: 'var(--t-sm)',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  For research and educational purposes
                </span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 style={{
              fontSize: 'var(--t-lg)',
              fontWeight: 600,
              marginBottom: 'var(--s-4)',
              fontFamily: 'var(--f-display)'
            }}>
              Data attribution
            </h4>
            <div style={{
              fontSize: 'var(--t-sm)',
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s-2)'
            }}>
              <p style={{ margin: 0 }}>
                Uses the Human Phenotype Ontology (HPO). 
                The HPO is available at{' '}
                <a 
                  href="https://hpo.jax.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    textDecoration: 'underline',
                    textDecorationThickness: '1px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--on-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                >
                  hpo.jax.org
                </a>.
              </p>
              <p style={{ margin: 0 }}>
                Orphanet data used under CC BY 4.0 from{' '}
                <a 
                  href="https://www.orphadata.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    textDecoration: 'underline',
                    textDecorationThickness: '1px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--on-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                >
                  www.orphadata.com
                </a>.
              </p>
              <p style={{ margin: 0 }}>
                Monarch Initiative API used under BSD-3 Clause from{' '}
                <a 
                  href="https://monarchinitiative.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    textDecoration: 'underline',
                    textDecorationThickness: '1px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--on-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                >
                  monarchinitiative.org
                </a>.
              </p>
            </div>
          </div>
        </div>
        
        <div style={{
          marginTop: 'var(--s-8)',
          paddingTop: 'var(--s-8)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-4)',
            marginBottom: 'var(--s-6)'
          }}>
            <p style={{
              fontSize: 'var(--t-sm)',
              color: 'rgba(255, 255, 255, 0.5)',
              margin: 0
            }}>
              © {currentYear} Rare Disease Detective • This project is for educational and research purposes.
            </p>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--s-4)'
            }}>
              <a href="#problem" style={{
                fontSize: 'var(--t-sm)',
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--on-dark)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}>
                The Problem
              </a>
              <a href="#how-it-works" style={{
                fontSize: 'var(--t-sm)',
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--on-dark)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}>
                How It Works
              </a>
              <a href="#trust" style={{
                fontSize: 'var(--t-sm)',
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--on-dark)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}>
                Why Trust It
              </a>
              <a href="/app/" style={{
                fontSize: 'var(--t-sm)',
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--on-dark)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}>
                Try Demo
              </a>
            </div>
          </div>
          
          <div style={{
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: 'var(--t-lg)',
              fontWeight: 700,
              color: 'var(--on-dark)',
              fontFamily: 'var(--f-display)',
              marginBottom: 'var(--s-2)'
            }}>
              Decision support for a conversation with a doctor, not a medical diagnosis
            </p>
            <p style={{
              fontSize: 'var(--t-sm)',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0
            }}>
              Always consult qualified healthcare professionals for medical advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer