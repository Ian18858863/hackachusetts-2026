import { defineMessages } from '../define.ts';

/*
 * Shared UI text and the glossary for every T28 message area.
 *
 * Glossary (use these words in every area so the UI reads as one voice):
 *
 * | English                 | zh (Simplified) | ja                 | es                         | ko             | fr                          |
 * |-------------------------|-----------------|--------------------|----------------------------|----------------|-----------------------------|
 * | notes (symptom notes)   | 症状描述        | 症状の記録         | notas                      | 증상 기록      | notes                       |
 * | feature                 | 特征            | 特徴               | rasgo                      | 특징           | caractéristique             |
 * | not present             | 未出现          | なし               | no presente                | 없음           | absent / absente            |
 * | possible match          | 可能匹配        | 一致候補           | posible coincidencia       | 가능한 일치    | correspondance possible     |
 * | what to check next      | 接下来确认什么  | 次に確認すること   | qué comprobar después      | 다음에 확인할 것 | à vérifier ensuite        |
 * | brief                   | 简报            | サマリー           | resumen                    | 요약서         | synthèse                    |
 * | specialist brief        | 专科医生简报    | 専門医向けサマリー | resumen para el especialista | 전문의용 요약서 | synthèse pour le spécialiste |
 * | demo case               | 演示病例        | デモ症例           | caso de demostración       | 데모 사례      | cas de démonstration        |
 * | doctor                  | 医生            | 医師               | médico                     | 의사           | médecin                     |
 * | diagnosis               | 诊断            | 診断               | diagnóstico                | 진단           | diagnostic                  |
 * | trial / study           | 临床试验        | 臨床試験           | ensayo clínico             | 임상시험       | essai clinique              |
 *
 * Register: zh and ja polite neutral (您 / です・ます), es usted, ko 합니다/해요-neutral, fr vous.
 * Keep in English: HPO labels, disease names, gene symbols, ids, trial titles, anything from /api/*,
 * the notes, the demo case label and the contract section 13 licence lines.
 *
 * The safety sentence (contract section 13) is split as the Disclaimer renders it:
 * `disclaimerLead` in semibold, then `disclaimerRest` (which carries its own leading space
 * where the language uses spaces). `disclaimer` is the whole sentence and must equal lead + rest.
 */
export default defineMessages(
  {
    disclaimerLead: 'Decision support, not a diagnosis.',
    disclaimerRest: ' These are possible matches to discuss with a doctor.',
    disclaimer: 'Decision support, not a diagnosis. These are possible matches to discuss with a doctor.',
    medicalTermsNote: 'Medical terms are shown in English as published by HPO, Orphanet and ClinicalTrials.gov.',
    languageLabel: 'Language',
    demoDataOffline: 'Demo data (offline mock)',
    demoDataRecorded: 'Demo data (recorded {date})',
    demoDataRecordedNoDate: 'Demo data (recorded)',
    offlineNotice:
      'You are offline. Your case is saved in this browser. Actions that need the network are paused until you reconnect.',
    errTimeout: 'The service is slow right now',
    errUpstreamTimeout: 'A data service is slow right now',
    errUpstreamError: 'A data service did not answer',
    errRateLimited: 'Too many requests for a moment',
    errOffline: 'You are offline',
    errUnreachable: 'The service could not be reached',
    errNoTermsFound: 'No features found in this text',
    errTextTooLong: 'Text is too long',
    errLlmUnavailable: 'Reading notes is not available here',
    errInvalidRequest: 'This request could not be sent',
    errBadResponse: 'The answer could not be read',
    errGeneric: 'Something went wrong',
    tryAgain: 'Try again',
  },
  {
    zh: {
      disclaimerLead: '决策辅助，并非诊断。',
      disclaimerRest: '这些是可供与医生讨论的可能匹配。',
      disclaimer: '决策辅助，并非诊断。这些是可供与医生讨论的可能匹配。',
      medicalTermsNote: '医学术语按 HPO、Orphanet 和 ClinicalTrials.gov 发布的原文以英文显示。',
      languageLabel: '语言',
      demoDataOffline: '演示数据（离线模拟）',
      demoDataRecorded: '演示数据（录制于 {date}）',
      demoDataRecordedNoDate: '演示数据（已录制）',
      offlineNotice: '您已离线。您的病例保存在此浏览器中。需要联网的操作会暂停，直到重新连接。',
      errTimeout: '服务目前响应较慢',
      errUpstreamTimeout: '某个数据服务目前响应较慢',
      errUpstreamError: '某个数据服务没有响应',
      errRateLimited: '请求过多，请稍候',
      errOffline: '您已离线',
      errUnreachable: '无法连接到服务',
      errNoTermsFound: '在这段文字中没有找到特征',
      errTextTooLong: '文字过长',
      errLlmUnavailable: '此处无法解读症状描述',
      errInvalidRequest: '无法发送此请求',
      errBadResponse: '无法读取返回结果',
      errGeneric: '出了点问题',
      tryAgain: '重试',
    },
    ja: {
      disclaimerLead: '意思決定の支援であり、診断ではありません。',
      disclaimerRest: 'これらは医師と相談するための一致候補です。',
      disclaimer: '意思決定の支援であり、診断ではありません。これらは医師と相談するための一致候補です。',
      medicalTermsNote: '医学用語は、HPO・Orphanet・ClinicalTrials.gov が公開している英語のまま表示しています。',
      languageLabel: '言語',
      demoDataOffline: 'デモデータ（オフラインの模擬データ）',
      demoDataRecorded: 'デモデータ（{date} に記録）',
      demoDataRecordedNoDate: 'デモデータ（記録済み）',
      offlineNotice:
        'オフラインです。症例はこのブラウザに保存されています。ネットワークが必要な操作は、再接続するまで一時停止します。',
      errTimeout: '現在サービスの応答が遅くなっています',
      errUpstreamTimeout: 'データサービスの応答が遅くなっています',
      errUpstreamError: 'データサービスから応答がありませんでした',
      errRateLimited: 'リクエストが集中しています。少しお待ちください',
      errOffline: 'オフラインです',
      errUnreachable: 'サービスに接続できませんでした',
      errNoTermsFound: 'この文章から特徴が見つかりませんでした',
      errTextTooLong: '文章が長すぎます',
      errLlmUnavailable: 'ここでは記録の読み取りを利用できません',
      errInvalidRequest: 'このリクエストは送信できませんでした',
      errBadResponse: '応答を読み取れませんでした',
      errGeneric: '問題が発生しました',
      tryAgain: '再試行',
    },
    es: {
      disclaimerLead: 'Apoyo a la decisión, no un diagnóstico.',
      disclaimerRest: ' Estas son posibles coincidencias para comentar con un médico.',
      disclaimer: 'Apoyo a la decisión, no un diagnóstico. Estas son posibles coincidencias para comentar con un médico.',
      medicalTermsNote: 'Los términos médicos se muestran en inglés, tal como los publican HPO, Orphanet y ClinicalTrials.gov.',
      languageLabel: 'Idioma',
      demoDataOffline: 'Datos de demostración (simulación sin conexión)',
      demoDataRecorded: 'Datos de demostración (registrados el {date})',
      demoDataRecordedNoDate: 'Datos de demostración (registrados)',
      offlineNotice:
        'Está sin conexión. Su caso está guardado en este navegador. Las acciones que necesitan la red quedan en pausa hasta que se vuelva a conectar.',
      errTimeout: 'El servicio va lento en este momento',
      errUpstreamTimeout: 'Un servicio de datos va lento en este momento',
      errUpstreamError: 'Un servicio de datos no respondió',
      errRateLimited: 'Demasiadas solicitudes por un momento',
      errOffline: 'Está sin conexión',
      errUnreachable: 'No se pudo contactar con el servicio',
      errNoTermsFound: 'No se encontraron rasgos en este texto',
      errTextTooLong: 'El texto es demasiado largo',
      errLlmUnavailable: 'La lectura de notas no está disponible aquí',
      errInvalidRequest: 'No se pudo enviar esta solicitud',
      errBadResponse: 'No se pudo leer la respuesta',
      errGeneric: 'Algo salió mal',
      tryAgain: 'Reintentar',
    },
    ko: {
      disclaimerLead: '의사결정 지원이며, 진단이 아닙니다.',
      disclaimerRest: ' 의사와 상의할 가능한 일치 항목입니다.',
      disclaimer: '의사결정 지원이며, 진단이 아닙니다. 의사와 상의할 가능한 일치 항목입니다.',
      medicalTermsNote: '의학 용어는 HPO, Orphanet, ClinicalTrials.gov에서 발표한 대로 영어로 표시됩니다.',
      languageLabel: '언어',
      demoDataOffline: '데모 데이터(오프라인 모의 데이터)',
      demoDataRecorded: '데모 데이터({date} 기록)',
      demoDataRecordedNoDate: '데모 데이터(기록됨)',
      offlineNotice:
        '오프라인 상태입니다. 사례는 이 브라우저에 저장되어 있습니다. 네트워크가 필요한 작업은 다시 연결될 때까지 일시 중지됩니다.',
      errTimeout: '지금 서비스 응답이 느립니다',
      errUpstreamTimeout: '데이터 서비스 응답이 지금 느립니다',
      errUpstreamError: '데이터 서비스가 응답하지 않았습니다',
      errRateLimited: '잠시 요청이 너무 많습니다',
      errOffline: '오프라인 상태입니다',
      errUnreachable: '서비스에 연결할 수 없습니다',
      errNoTermsFound: '이 글에서 특징을 찾지 못했습니다',
      errTextTooLong: '글이 너무 깁니다',
      errLlmUnavailable: '여기서는 기록 읽기를 사용할 수 없습니다',
      errInvalidRequest: '이 요청을 보낼 수 없습니다',
      errBadResponse: '응답을 읽을 수 없습니다',
      errGeneric: '문제가 발생했습니다',
      tryAgain: '다시 시도',
    },
    fr: {
      disclaimerLead: 'Aide à la décision, pas un diagnostic.',
      disclaimerRest: ' Ce sont des correspondances possibles à discuter avec un médecin.',
      disclaimer: 'Aide à la décision, pas un diagnostic. Ce sont des correspondances possibles à discuter avec un médecin.',
      medicalTermsNote: 'Les termes médicaux sont affichés en anglais, tels que publiés par HPO, Orphanet et ClinicalTrials.gov.',
      languageLabel: 'Langue',
      demoDataOffline: 'Données de démonstration (simulation hors ligne)',
      demoDataRecorded: 'Données de démonstration (enregistrées le {date})',
      demoDataRecordedNoDate: 'Données de démonstration (enregistrées)',
      offlineNotice:
        'Vous êtes hors ligne. Votre cas est enregistré dans ce navigateur. Les actions qui ont besoin du réseau sont suspendues jusqu’à la reconnexion.',
      errTimeout: 'Le service est lent pour le moment',
      errUpstreamTimeout: 'Un service de données est lent pour le moment',
      errUpstreamError: 'Un service de données n’a pas répondu',
      errRateLimited: 'Trop de demandes pour le moment',
      errOffline: 'Vous êtes hors ligne',
      errUnreachable: 'Le service est injoignable',
      errNoTermsFound: 'Aucune caractéristique trouvée dans ce texte',
      errTextTooLong: 'Le texte est trop long',
      errLlmUnavailable: 'La lecture des notes n’est pas disponible ici',
      errInvalidRequest: 'Cette demande n’a pas pu être envoyée',
      errBadResponse: 'La réponse n’a pas pu être lue',
      errGeneric: 'Un problème est survenu',
      tryAgain: 'Réessayer',
    },
  },
);
