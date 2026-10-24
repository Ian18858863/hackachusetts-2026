import React from 'react'

const HowItWorks: React.FC = () => {
  const steps = [
    {
      id: 1,
      title: 'Describe symptoms in plain words',
      description: 'Enter your observations, medical history, or existing notes in natural language. The tool extracts clinical features without requiring medical terminology knowledge.',
      features: [
        'No medical terminology required',
        'Supports English natural language',
        'Privacy-focused: your data stays secure'
      ],
      example: '"She can\'t climb stairs anymore, falls frequently, and has unusually large calf muscles"'
    },
    {
      id: 2,
      title: 'Confirm the extracted clinical features',
      description: 'Review the Human Phenotype Ontology (HPO) terms identified from your description. See exactly which parts of your text match each clinical feature.',
      features: [
        'Visual highlighting of source text',
        'Control over feature inclusion',
        'HPO term explanations available'
      ],
      example: 'Extracted features: Gowers sign (HP:0003391), Frequent falls (HP:0002359), Calf muscle hypertrophy (HP:0008981)'
    },
    {
      id: 3,
      title: 'See ranked possibilities with evidence',
      description: 'Get candidate diseases ranked by phenotypic similarity. Each suggestion shows which features matched and their frequency in that disease population.',
      features: [
        'Transparent ranking algorithm',
        'Evidence traceability',
        'Orphanet disease information'
      ],
      example: 'Top candidate: Duchenne muscular dystrophy • Matched features: Gowers sign, Frequent falls, Calf hypertrophy'
    },
    {
      id: 4,
      title: 'Take a one-page brief to the specialist',
      description: 'Generate a concise summary with timeline, confirmed features, candidate diseases, and suggested questions for your appointment.',
      features: [
        'Specialist-ready format',
        'Optional phenopacket export',
        'Questions to discuss'
      ],
      example: 'One-page summary: Timeline of symptoms, HPO-coded features, top candidate diseases, questions to ask the neurologist'
    }
  ]

  return (
    <section id="how-it-works" style={{
      backgroundColor: 'var(--bg)',
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
            How it works
          </h2>
          <p style={{
            fontSize: 'var(--t-base)',
            color: 'var(--ink-2)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 'var(--lh-text)'
          }}>
            A straightforward four‑step process to organize information and prepare for specialist consultations.
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-8)'
        }}>
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--s-8)',
                alignItems: 'center',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--r-m)',
                padding: 'var(--s-8)',
                boxShadow: 'var(--shadow-pop)'
              }}
            >
              <div style={{
                width: '100%',
                maxWidth: '400px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <div style={{
                    fontSize: 'var(--t-sm)',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    marginBottom: 'var(--s-2)'
                  }}>
                    Step {step.id}
                  </div>
                  <h3 style={{
                    fontSize: 'var(--t-xl)',
                    fontWeight: 700,
                    marginBottom: 'var(--s-4)',
                    color: 'var(--ink)',
                    textAlign: 'center',
                    fontFamily: 'var(--f-display)'
                  }}>
                    {step.title}
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--s-2)',
                    width: '100%'
                  }}>
                    {step.features.map((feature, featureIndex) => (
                      <div key={featureIndex} style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--ink-2)',
                        fontSize: 'var(--t-sm)'
                      }}>
                        <svg style={{
                          width: '20px',
                          height: '20px',
                          color: 'var(--mark)',
                          marginRight: 'var(--s-2)',
                          flexShrink: 0
                        }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{
                width: '100%',
                maxWidth: '600px'
              }}>
                <p style={{
                  fontSize: 'var(--t-base)',
                  marginBottom: 'var(--s-6)',
                  color: 'var(--ink-3)',
                  lineHeight: 'var(--lh-text)'
                }}>
                  {step.description}
                </p>
                
                <div style={{
                  backgroundColor: 'rgba(20, 22, 27, 0.05)',
                  borderRadius: 'var(--r-s)',
                  padding: 'var(--s-5)',
                  borderLeft: '4px solid var(--accent)'
                }}>
                  <p style={{
                    color: 'var(--ink-2)',
                    fontStyle: 'italic',
                    fontSize: 'var(--t-sm)',
                    margin: 0,
                    lineHeight: 'var(--lh-text)'
                  }}>
                    {step.example}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{
          marginTop: 'var(--s-8)',
          textAlign: 'center'
        }}>
          <a 
            href="/app/" 
            style={{ 
              backgroundColor: 'var(--accent)', 
              color: 'var(--on-dark)',
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
            Start with a demo case
          </a>
          <p style={{
            color: 'var(--ink-2)',
            marginTop: 'var(--s-4)',
            fontSize: 'var(--t-sm)'
          }}>
            Explore the workflow with sample data before entering personal information.
          </p>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks