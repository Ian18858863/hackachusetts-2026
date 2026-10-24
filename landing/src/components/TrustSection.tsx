import React from 'react'

const TrustSection: React.FC = () => {
  const trustPoints = [
    {
      id: 1,
      title: 'Traceable evidence',
      description: 'Every suggestion shows which features matched, their HPO annotation frequencies, and the ranking algorithm behind the results.',
      details: [
        'Direct links to HPO term definitions',
        'Transparent matching scores',
        'Orphanet disease information integration'
      ]
    },
    {
      id: 2,
      title: 'Open ontologies & data',
      description: 'Built on publicly available, peer‑reviewed resources that medical specialists already use in clinical practice and research.',
      details: [
        'Human Phenotype Ontology (HPO)',
        'Orphanet rare disease knowledge',
        'Monarch Initiative semantic similarity'
      ]
    },
    {
      id: 3,
      title: 'Clinical collaboration focus',
      description: 'Designed to support conversations with healthcare providers, not replace them.',
      details: [
        'Specialist‑ready output format',
        'Questions to discuss with your doctor',
        'GA4GH phenopacket export option'
      ]
    },
    {
      id: 4,
      title: 'Safety‑first design',
      description: 'Clear boundaries about what this tool can and cannot do, with appropriate disclaimers throughout.',
      details: [
        'No medical diagnosis claims',
        'Decision support framing',
        'Professional medical consultation always recommended'
      ]
    }
  ]

  const dataSources = [
    {
      name: 'Human Phenotype Ontology (HPO)',
      license: 'Free use with attribution',
      description: 'Standardized vocabulary for phenotypic abnormalities'
    },
    {
      name: 'Orphanet',
      license: 'CC BY 4.0',
      description: 'Reference portal for rare diseases and orphan drugs'
    },
    {
      name: 'Monarch Initiative',
      license: 'BSD-3 Clause',
      description: 'Cross-species phenotype and disease analysis'
    },
    {
      name: 'HPO annotations',
      license: 'Free use with attribution',
      description: 'Disease-phenotype associations with frequencies'
    }
  ]

  return (
    <section id="trust" style={{
      backgroundColor: 'var(--surface)',
      padding: 'var(--s-8) var(--gutter)'
    }}>
      <div className="container">
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--s-8)'
        }}>
          <h2 style={{
            fontFamily: 'var(--f-display)',
            fontSize: 'var(--t-2xl)',
            fontWeight: 700,
            marginBottom: 'var(--s-4)',
            color: 'var(--ink)'
          }}>
            Why trust this approach
          </h2>
          <p style={{
            fontSize: 'var(--t-base)',
            color: 'var(--ink-2)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 'var(--lh-text)'
          }}>
            Built on evidence‑based methods, open science principles, and clear boundaries about clinical decision support.
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--s-6)',
          marginBottom: 'var(--s-8)'
        }}>
          {trustPoints.map((point) => (
            <div 
              key={point.id} 
              style={{
                backgroundColor: 'var(--bg)',
                borderRadius: 'var(--r-s)',
                padding: 'var(--s-6)',
                boxShadow: 'var(--shadow-pop)',
                transition: 'box-shadow var(--dur-base) var(--ease)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 16px 40px -16px rgba(20, 22, 27, 0.25), 0 4px 12px rgba(20, 22, 27, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-pop)';
              }}
            >
              <div>
                <h3 style={{
                  fontSize: 'var(--t-lg)',
                  fontWeight: 700,
                  marginBottom: 'var(--s-3)',
                  color: 'var(--accent)',
                  fontFamily: 'var(--f-display)'
                }}>
                  {point.title}
                </h3>
                <p style={{
                  color: 'var(--ink-2)',
                  marginBottom: 'var(--s-4)',
                  fontSize: 'var(--t-base)',
                  lineHeight: 'var(--lh-text)'
                }}>
                  {point.description}
                </p>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--s-2)'
                }}>
                  {point.details.map((detail, index) => (
                    <li key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 'var(--t-sm)',
                      color: 'var(--ink-2)'
                    }}>
                      <svg style={{
                        width: '16px',
                        height: '16px',
                        color: 'var(--mark)',
                        marginRight: 'var(--s-2)',
                        flexShrink: 0
                      }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{
          backgroundColor: 'var(--bg)',
          borderRadius: 'var(--r-m)',
          padding: 'var(--s-8)',
          boxShadow: 'var(--shadow-pop)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--s-8)'
          }}>
            <div>
              <h3 style={{
                fontSize: 'var(--t-xl)',
                fontWeight: 700,
                marginBottom: 'var(--s-6)',
                color: 'var(--ink)',
                fontFamily: 'var(--f-display)'
              }}>
                Open data sources
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--s-4)'
              }}>
                {dataSources.map((source, index) => (
                  <div key={index} style={{
                    borderBottom: '1px solid var(--hair)',
                    paddingBottom: 'var(--s-4)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 'var(--s-2)'
                    }}>
                      <h4 style={{
                        fontWeight: 600,
                        color: 'var(--ink-2)',
                        fontSize: 'var(--t-base)'
                      }}>
                        {source.name}
                      </h4>
                      <span style={{
                        fontSize: 'var(--t-xs)',
                        backgroundColor: 'var(--ink-2)',
                        color: 'var(--on-dark)',
                        padding: '2px 8px',
                        borderRadius: 'var(--r-pill)',
                        fontWeight: 600
                      }}>
                        {source.license}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 'var(--t-sm)',
                      color: 'var(--ink-3)',
                      margin: 0
                    }}>
                      {source.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div style={{
                backgroundColor: 'rgba(234, 88, 88, 0.1)',
                borderLeft: '4px solid #e53e3e',
                padding: 'var(--s-4)',
                marginBottom: 'var(--s-6)'
              }}>
                <div style={{ display: 'flex' }}>
                  <svg style={{
                    width: '24px',
                    height: '24px',
                    color: '#e53e3e',
                    marginRight: 'var(--s-3)',
                    flexShrink: 0
                  }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.1 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 style={{
                      fontWeight: 700,
                      color: 'var(--ink)',
                      fontSize: 'var(--t-base)'
                    }}>
                      Important limitations
                    </h4>
                    <p style={{
                      fontSize: 'var(--t-sm)',
                      color: 'var(--ink-2)',
                      marginTop: '4px'
                    }}>
                      This tool provides decision support for clinical conversations, not medical diagnosis. 
                      Always consult qualified healthcare professionals for medical advice.
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(56, 161, 105, 0.1)',
                borderLeft: '4px solid #38a169',
                padding: 'var(--s-4)'
              }}>
                <div style={{ display: 'flex' }}>
                  <svg style={{
                    width: '24px',
                    height: '24px',
                    color: '#38a169',
                    marginRight: 'var(--s-3)',
                    flexShrink: 0
                  }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 style={{
                      fontWeight: 700,
                      color: 'var(--ink)',
                      fontSize: 'var(--t-base)'
                    }}>
                      Clinical value
                    </h4>
                    <p style={{
                      fontSize: 'var(--t-sm)',
                      color: 'var(--ink-2)',
                      marginTop: '4px'
                    }}>
                      Research shows that combining patient‑reported information with ontology‑based 
                      matching can improve early recognition of rare conditions compared to either approach alone.
                    </p>
                    <p style={{
                      fontSize: 'var(--t-xs)',
                      color: 'var(--ink-3)',
                      marginTop: '8px'
                    }}>
                      Evidence based on: Köhler et al., Nucleic Acids Research 2021; Zemojtel et al., Genome Medicine 2014
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={{
                marginTop: 'var(--s-6)',
                textAlign: 'center',
                paddingTop: 'var(--s-6)',
                borderTop: '1px solid var(--hair)'
              }}>
                <p style={{
                  fontSize: 'var(--t-lg)',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontFamily: 'var(--f-display)',
                  marginBottom: 'var(--s-2)'
                }}>
                  Decision support, not a diagnosis
                </p>
                <p style={{
                  fontSize: 'var(--t-sm)',
                  color: 'var(--ink-2)',
                  margin: 0,
                  lineHeight: 'var(--lh-text)'
                }}>
                  This tool helps organize information for specialist consultation. 
                  It does not provide medical advice, diagnosis, or treatment recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TrustSection