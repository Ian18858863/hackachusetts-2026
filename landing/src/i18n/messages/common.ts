import { defineMessages } from '../define.ts';

/*
 * The shared strings the landing page needs from app/src/shared/i18n/messages/common.ts (T28a),
 * copied exactly: the contract section 13 safety sentence (split as rendered), the
 * medical-terms note and the language-switcher label. messages.test.ts checks that every
 * value still equals the app's, so the two sites cannot drift apart.
 * Glossary and register: see the app's common.ts.
 */
export default defineMessages(
  {
    disclaimerLead: 'Decision support, not a diagnosis.',
    disclaimerRest: ' These are possible matches to discuss with a doctor.',
    disclaimer: 'Decision support, not a diagnosis. These are possible matches to discuss with a doctor.',
    medicalTermsNote: 'Medical terms are shown in English as published by HPO, Orphanet and ClinicalTrials.gov.',
    languageLabel: 'Language',
  },
  {
    zh: {
      disclaimerLead: '决策辅助，并非诊断。',
      disclaimerRest: '这些是可供与医生讨论的可能匹配。',
      disclaimer: '决策辅助，并非诊断。这些是可供与医生讨论的可能匹配。',
      medicalTermsNote: '医学术语按 HPO、Orphanet 和 ClinicalTrials.gov 发布的原文以英文显示。',
      languageLabel: '语言',
    },
    ja: {
      disclaimerLead: '意思決定の支援であり、診断ではありません。',
      disclaimerRest: 'これらは医師と相談するための一致候補です。',
      disclaimer: '意思決定の支援であり、診断ではありません。これらは医師と相談するための一致候補です。',
      medicalTermsNote: '医学用語は、HPO・Orphanet・ClinicalTrials.gov が公開している英語のまま表示しています。',
      languageLabel: '言語',
    },
    es: {
      disclaimerLead: 'Apoyo a la decisión, no un diagnóstico.',
      disclaimerRest: ' Estas son posibles coincidencias para comentar con un médico.',
      disclaimer: 'Apoyo a la decisión, no un diagnóstico. Estas son posibles coincidencias para comentar con un médico.',
      medicalTermsNote: 'Los términos médicos se muestran en inglés, tal como los publican HPO, Orphanet y ClinicalTrials.gov.',
      languageLabel: 'Idioma',
    },
    ko: {
      disclaimerLead: '의사결정 지원이며, 진단이 아닙니다.',
      disclaimerRest: ' 의사와 상의할 가능한 일치 항목입니다.',
      disclaimer: '의사결정 지원이며, 진단이 아닙니다. 의사와 상의할 가능한 일치 항목입니다.',
      medicalTermsNote: '의학 용어는 HPO, Orphanet, ClinicalTrials.gov에서 발표한 대로 영어로 표시됩니다.',
      languageLabel: '언어',
    },
    fr: {
      disclaimerLead: 'Aide à la décision, pas un diagnostic.',
      disclaimerRest: ' Ce sont des correspondances possibles à discuter avec un médecin.',
      disclaimer: 'Aide à la décision, pas un diagnostic. Ce sont des correspondances possibles à discuter avec un médecin.',
      medicalTermsNote: 'Les termes médicaux sont affichés en anglais, tels que publiés par HPO, Orphanet et ClinicalTrials.gov.',
      languageLabel: 'Langue',
    },
  },
);
