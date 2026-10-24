import React from 'react'

const ProblemSection: React.FC = () => {
  const statistics = [
    {
      id: 1,
      value: '263–446 million',
      description: 'people live with a rare disease worldwide',
      source: 'Orphanet data, Eur J Hum Genet 2020',
      sourceUrl: 'https://doi.org/10.1038/s41431-019-0508-0'
    },
    {
      id: 2,
      value: '4.7 years',
      description: 'average time to diagnosis',
      source: 'Survey of 6,507 patients, Eur J Hum Genet 2024',
      sourceUrl: 'https://doi.org/10.1038/s41431-024-01604-z'
    },
    {
      id: 3,
      value: '73%',
      description: 'were misdiagnosed at least once',
      source: 'Survey of 6,507 patients, Eur J Hum Genet 2024',
      sourceUrl: 'https://doi.org/10.1038/s41431-024-01604-z'
    },
    {
      id: 4,
      value: '22%',
      description: 'saw 8+ clinicians before diagnosis',
      source: 'Survey of 6,507 patients, Eur J Hum Genet 2024',
      sourceUrl: 'https://doi.org/10.1038/s41431-024-01604-z'
    }
  ]

  return (
    <section id="problem" style={{
      backgroundColor: 'var(--surface)',
      padding: 'var(--s-8) var(--gutter)'
    }}>
      <div className="container">
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--s-6)'
        }}>
          <h2 style={{
            fontFamily: 'var(--f-display)',
            fontSize: 'var(--t-2xl)',
            fontWeight: 700,
            marginBottom: 'var(--s-4)',
            color: 'var(--ink)'
          }}>
            The diagnostic odyssey is real
          </h2>
          <p style={{
            fontSize: 'var(--t-base)',
            color: 'var(--ink-2)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 'var(--lh-text)'
          }}>
            Families seeking answers face systemic challenges that delay care and add uncertainty. 
            These verified statistics highlight why better tools are needed.
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--s-6)',
          marginBottom: 'var(--s-8)'
        }}>
          {statistics.map((stat) => (
            <div 
              key={stat.id} 
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
                <div style={{
                  fontSize: 'var(--t-xl)',
                  fontWeight: 700,
                  marginBottom: 'var(--s-2)',
                  color: 'var(--accent)'
                }}>
                  {stat.value}
                </div>
                <p style={{
                  fontSize: 'var(--t-lg)',
                  color: 'var(--ink)',
                  margin: 0,
                  lineHeight: 'var(--lh-text)'
                }}>
                  {stat.description}
                </p>
              </div>
              
              <div style={{
                paddingTop: 'var(--s-4)',
                marginTop: 'var(--s-4)',
                borderTop: '1px solid var(--hair)'
              }}>
                <p style={{
                  fontSize: 'var(--t-sm)',
                  color: 'var(--ink-3)',
                  margin: 0
                }}>
                  <a 
                    href={stat.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--ink-3)',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                      e.currentTarget.style.textDecorationThickness = '2px';
                      e.currentTarget.style.textUnderlineOffset = '2px';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Source: {stat.source}
                  </a>
                </p>
                <p style={{
                  fontSize: 'var(--t-xs)',
                  color: 'var(--ink-3)',
                  marginTop: '4px',
                  opacity: 0.7
                }}>
                  These are peer‑reviewed figures from medical literature.
                </p>
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
          <h3 style={{
            fontSize: 'var(--t-xl)',
            fontWeight: 700,
            marginBottom: 'var(--s-6)',
            color: 'var(--accent)',
            fontFamily: 'var(--f-display)'
          }}>
            The human impact
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--s-6)'
          }}>
            <div>
              <p style={{
                fontSize: 'var(--t-base)',
                color: 'var(--ink-2)',
                marginBottom: 'var(--s-4)',
                lineHeight: 'var(--lh-text)'
              }}>
                When diagnosis takes years, families navigate a maze of specialists, 
                often repeating tests and stories while symptoms persist unexplained.
              </p>
              <p style={{
                color: 'var(--ink-2)',
                lineHeight: 'var(--lh-text)'
              }}>
                Each misdiagnosis can lead to inappropriate treatments, unnecessary procedures, 
                and emotional distress for patients already facing challenging health conditions.
              </p>
            </div>
            <div>
              <p style={{
                fontSize: 'var(--t-base)',
                color: 'var(--ink-2)',
                marginBottom: 'var(--s-4)',
                lineHeight: 'var(--lh-text)'
              }}>
                The financial burden compounds as families travel to multiple centers, 
                miss work for appointments, and pay for consultations that may not yield answers.
              </p>
              <p style={{
                color: 'var(--ink-2)',
                lineHeight: 'var(--lh-text)'
              }}>
                Early and accurate recognition of rare diseases can change trajectories, 
                connecting patients to appropriate specialists, clinical trials, and support communities sooner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProblemSection