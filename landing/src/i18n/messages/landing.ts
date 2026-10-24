import { defineMessages } from '../define.ts';

/*
 * Landing page copy (T28e). English is byte-identical to the T04 page; facts, numbers
 * and links live in ../../content.ts next to their sources and are not changed here.
 *
 * Kept in English in every locale: the product name, disease names, source titles
 * (author, journal, year), DOIs and links, the demo case label, the quoted demo
 * sentence “I do not get headaches”, screenshot labels quoted in the alt text,
 * "Built at Sundai" and the contract section 13 licence and attribution lines.
 * Terminology follows the glossary in app/src/shared/i18n/messages/common.ts.
 * The safety sentence comes from ./common.ts, not from here.
 */
export default defineMessages(
  {
    metaTitle: 'Rare Disease Detective · a specialist-ready brief in minutes',
    metaDescription:
      'Turn years of scattered notes into a specialist-ready brief in minutes. Rare Disease Detective finds the medical features in a plain-language symptom history and lists possible rare conditions to discuss with a doctor, with the evidence behind each. Decision support, not a diagnosis.',
    skip: 'Skip to content',
    navLabel: 'Sections',
    navProblem: 'Problem',
    navHow: 'How it works',
    navEvidence: 'Evidence',
    navSources: 'Sources',
    openDemo: 'Open the demo',
    openDemoShort: 'Demo',

    kickerLead: 'For clinicians and genetic counselors',
    kickerRest: ' · families can prepare their notes',
    heroTitle: 'A specialist-ready brief in minutes',
    heroLede: 'Turn years of scattered notes into a specialist-ready brief in minutes.',
    heroSafetyRest: ' Possible matches to discuss with a doctor, each with the evidence behind it.',
    tryDemo: 'Try the demo case',
    howLink: 'How it works',
    familyCta: 'For families: prepare notes for your doctor',
    demoNote: 'Opens a synthetic demo case with no sign-up. Not a real patient.',
    proofAlt:
      "Screenshot of the app's Possible matches step for a demo case, not a real patient. The top possible match is Niemann-Pick disease, type C1, with Strong overlap.",
    proofCaption: 'The live app on the demo case, the top possible match, captured on 2026-10-24.',

    problemTitle: 'Rare diseases take years to name',
    problemDek:
      'Families and non-specialist clinicians hold the clues in plain words. Rare-disease tools expect ontology terms.',
    stat1Value: '263–446 million',
    stat1Label: 'people worldwide live with a rare disease',
    stat2Value: '4.7 years',
    stat2Label: 'mean time to diagnosis (the median is 0.8 years)',
    stat3Value: '73%',
    stat3Label: 'of patients were misdiagnosed at least once',
    surveyNote:
      'Time to diagnosis and misdiagnosis come from the Rare Barometer survey of 6,507 patients in 41 European countries, run in 2022.',

    howTitle: 'How it works',
    howDek: 'Five steps from a parent’s notes to something a specialist can check.',
    howFamily:
      'In family mode the app never shows disease names; it prepares the notes and the questions for a clinician.',
    step1Title: 'Notes',
    step1Body: 'Paste a symptom history in plain words, or open the demo case.',
    step2Title: 'Features with their source sentence',
    step2Body:
      'Each medical feature (an HPO term) sits next to the exact words it came from. Things the notes say are absent, such as “I do not get headaches”, go into a Not present group. You keep, remove or add features.',
    step3Title: 'Possible matches with evidence',
    step3Body:
      'Rare conditions ranked by how well the features overlap. Each shows which features match, which do not, and how often each occurs in that condition according to HPO annotations. Overlap is a word (strong, partial, weak), never a percentage.',
    step4Title: 'What to check next',
    step4Body: 'The features that best separate the top matches, written as plain questions for the appointment.',
    step5Title: 'Brief, phenopacket and trials',
    step5Body:
      'A one-page brief to print or save as PDF, a GA4GH Phenopacket file with the features and no diagnosis inside, and recruiting studies from ClinicalTrials.gov.',
    panelTitle: 'The LLM only translates',
    panelGrounding:
      'A language model proposes phrases from the notes. A feature is kept only if its phrase appears word for word in the notes and the Human Phenotype Ontology confirms the term.',
    panelSources:
      'The ranking comes from the Monarch Initiative’s semantic similarity service. Disease names come from Monarch, HPO annotations and Orphadata; frequencies and genes come from HPO annotations. None of them come from the model.',
    panelPrivacy:
      'Your notes are sent to the server only to extract features, using Cloudflare Workers AI. The app does not store them on a server or write them to logs; your case is kept in your browser.',

    evidenceTitle: 'Why the ontology does the ranking',
    evidenceDek: 'Published work points to the same split of roles that this tool uses.',
    study1Claim: 'LLM plus ontology beats either alone',
    study1Detail:
      'In 424 patients of the Undiagnosed Diseases Network, GPT-4o with the Exomiser ranking tool reached 30% differential accuracy, against 22.4% for GPT-4o and 13.9% for Exomiser on their own.',
    study2Claim: 'Agents with ontology tools and traceable evidence lead',
    study2Detail:
      'DeepRare, an LLM agent that calls more than 40 tools and shows its reasoning, ranked the right disease first in 57% of cases on average across HPO-based benchmarks.',
    ownTitle: 'Our own check',
    ownResult:
      'On 10 published cases selected by a fixed rule, the correct condition ranked first in 5 and in the top 3 in 6 (our own small evaluation).',
    ownCaveat:
      'The cases come from publications that may already feed the HPO annotations, so the result is likely optimistic. It is not a clinical validation.',
    ownRerank: 'A pre-registered frequency-aware re-rank did not improve the result, so it was not shipped.',
    methodLink: 'Method and results',

    closingTitle: 'See it on the demo case',
    closingDek: 'A 54-year-old with worsening memory and unsteady walking. Synthetic, not a real patient.',

    sourcesTitle: 'Sources and credits',
    sourceOnGithub: 'Source on GitHub',
  },
  {
    zh: {
      metaTitle: 'Rare Disease Detective · 几分钟内备好专科医生简报',
      metaDescription:
        '把多年零散的症状描述，在几分钟内整理成一份可交给专科医生的简报。Rare Disease Detective 从日常语言写下的症状经过中找出医学特征，列出可与医生讨论的可能罕见病，并附上每一项背后的证据。决策辅助，并非诊断。',
      skip: '跳到正文',
      navLabel: '页面章节',
      navProblem: '问题',
      navHow: '工作原理',
      navEvidence: '证据',
      navSources: '来源',
      openDemo: '打开演示',
      openDemoShort: '演示',

      kickerLead: '面向临床医生和遗传咨询师',
      kickerRest: ' · 家庭也可以整理自己的症状描述',
      heroTitle: '几分钟备好专科医生简报',
      heroLede: '把多年零散的症状描述，在几分钟内整理成一份可交给专科医生的简报。',
      heroSafetyRest: '列出可与医生讨论的可能匹配，并附上每一项背后的证据。',
      tryDemo: '试用演示病例',
      howLink: '工作原理',
      familyCta: '家庭使用：为医生整理症状描述',
      demoNote: '打开一个合成的演示病例，无需注册。并非真实患者。',
      proofAlt:
        '应用“可能匹配”步骤的截图，使用的是演示病例，并非真实患者。排名第一的可能匹配是 Niemann-Pick disease, type C1，重叠程度为 Strong overlap。',
      proofCaption: '实时应用中的演示病例：排名第一的可能匹配，截取于 2026-10-24。',

      problemTitle: '罕见病往往要很多年才能确诊',
      problemDek: '家庭和非专科临床医生掌握的线索是日常语言，而罕见病工具需要的是本体术语。',
      stat1Value: '2.63–4.46 亿',
      stat1Label: '全球罹患罕见病的人数',
      stat2Value: '4.7 年',
      stat2Label: '平均确诊时间（中位数为 0.8 年）',
      stat3Value: '73%',
      stat3Label: '的患者至少被误诊过一次',
      surveyNote: '确诊时间和误诊数据来自 2022 年开展的 Rare Barometer 调查，调查对象为欧洲 41 个国家的 6,507 名患者。',

      howTitle: '工作原理',
      howDek: '从家长的症状描述到专科医生可以核查的内容，共五步。',
      howFamily: '在家庭模式下，应用从不显示疾病名称，而是为临床医生整理症状描述和要问的问题。',
      step1Title: '症状描述',
      step1Body: '用日常语言粘贴症状经过，或打开演示病例。',
      step2Title: '特征及其原句',
      step2Body:
        '每个医学特征（一个 HPO 术语）都紧挨着它所来自的原话显示。描述中说没有的情况，例如 “I do not get headaches”，会归入“未出现”一组。您可以保留、删除或添加特征。',
      step3Title: '可能匹配及其证据',
      step3Body:
        '按特征的重叠程度对罕见病进行排序。每一项都会显示哪些特征匹配、哪些不匹配，以及根据 HPO 注释每个特征在该疾病中的出现频率。重叠程度用文字表示（强、部分、弱），从不使用百分比。',
      step4Title: '接下来确认什么',
      step4Body: '最能区分排名靠前的可能匹配的特征，写成就诊时可以提出的通俗问题。',
      step5Title: '简报、Phenopacket 和临床试验',
      step5Body:
        '一页简报，可打印或另存为 PDF；一个 GA4GH Phenopacket 文件，只含特征，不含任何诊断；以及来自 ClinicalTrials.gov 的正在招募的研究。',
      panelTitle: 'LLM 只负责转换语言',
      panelGrounding:
        '语言模型从症状描述中提出短语。只有当短语逐字出现在描述中，并且人类表型本体（Human Phenotype Ontology）确认了该术语时，这个特征才会被保留。',
      panelSources:
        '排序来自 Monarch Initiative 的语义相似度服务。疾病名称来自 Monarch、HPO 注释和 Orphadata；频率和基因来自 HPO 注释。这些都不是由模型生成的。',
      panelPrivacy:
        '您的症状描述只会为了提取特征而发送到服务器，由 Cloudflare Workers AI 处理。应用不会把它们存储在服务器上，也不会写入日志；您的病例保存在您的浏览器中。',

      evidenceTitle: '为什么由本体来排序',
      evidenceDek: '已发表的研究指向与本工具相同的分工。',
      study1Claim: 'LLM 与本体结合胜过单独使用',
      study1Detail:
        '在 Undiagnosed Diseases Network 的 424 名患者中，GPT-4o 结合 Exomiser 排序工具的鉴别诊断准确率达到 30%，而 GPT-4o 和 Exomiser 单独使用时分别为 22.4% 和 13.9%。',
      study2Claim: '使用本体工具并给出可追溯证据的智能体领先',
      study2Detail:
        'DeepRare 是一个调用 40 多种工具并展示推理过程的 LLM 智能体，在多个基于 HPO 的基准测试中，平均在 57% 的病例中把正确的疾病排在第一位。',
      ownTitle: '我们自己的检验',
      ownResult:
        '在按固定规则选出的 10 个已发表病例中，正确的疾病在 5 例中排第一，在 6 例中进入前三（我们自己的小规模评估）。',
      ownCaveat: '这些病例来自可能已被纳入 HPO 注释的文献，因此结果很可能偏乐观。这不是临床验证。',
      ownRerank: '一项预先登记的、考虑频率的重新排序没有改善结果，因此没有上线。',
      methodLink: '方法与结果',

      closingTitle: '在演示病例上看看效果',
      closingDek: '一位 54 岁的患者，记忆力逐渐减退，走路不稳。合成病例，并非真实患者。',

      sourcesTitle: '来源与致谢',
      sourceOnGithub: 'GitHub 上的源代码',
    },
    ja: {
      metaTitle: 'Rare Disease Detective · 数分で専門医向けサマリーを',
      metaDescription:
        '何年分もの散らばった記録を、数分で専門医向けサマリーにまとめます。Rare Disease Detective は、日常の言葉で書かれた症状の経過から医学的な特徴を見つけ、医師と相談するための希少疾患の候補を、それぞれの根拠とともに示します。意思決定の支援であり、診断ではありません。',
      skip: '本文へ移動',
      navLabel: 'セクション',
      navProblem: '課題',
      navHow: '仕組み',
      navEvidence: 'エビデンス',
      navSources: '出典',
      openDemo: 'デモを開く',
      openDemoShort: 'デモ',

      kickerLead: '臨床医と遺伝カウンセラーのために',
      kickerRest: ' · ご家族は記録を準備できます',
      heroTitle: '数分で専門医向けサマリーを',
      heroLede: '何年分もの散らばった記録を、数分で専門医向けサマリーにまとめます。',
      heroSafetyRest: '医師と相談するための一致候補を、それぞれの根拠とともに示します。',
      tryDemo: 'デモ症例を試す',
      howLink: '仕組み',
      familyCta: 'ご家族の方へ：医師に渡す記録を準備する',
      demoNote: '登録不要で、合成のデモ症例が開きます。実在の患者ではありません。',
      proofAlt:
        'アプリの「一致候補」ステップのスクリーンショット。デモ症例で、実在の患者ではありません。最上位の一致候補は Niemann-Pick disease, type C1 で、重なりは Strong overlap です。',
      proofCaption: 'デモ症例を表示した実際のアプリ。最上位の一致候補。2026-10-24 に撮影。',

      problemTitle: '希少疾患は診断がつくまでに何年もかかります',
      problemDek:
        'ご家族や専門外の臨床医は、手がかりを日常の言葉で持っています。一方、希少疾患のツールはオントロジーの用語を前提としています。',
      stat1Value: '2.63–4.46 億人',
      stat1Label: 'が世界で希少疾患とともに暮らしています',
      stat2Value: '4.7 年',
      stat2Label: '診断までの平均期間（中央値は 0.8 年）',
      stat3Value: '73%',
      stat3Label: 'の患者が少なくとも一度は誤診を経験しています',
      surveyNote:
        '診断までの期間と誤診の数値は、2022 年に欧州 41 か国の患者 6,507 人を対象に実施された Rare Barometer 調査によるものです。',

      howTitle: '仕組み',
      howDek: '保護者の記録から、専門医が確認できる形になるまでの 5 つのステップ。',
      howFamily: 'ご家族向けモードでは、アプリは疾患名を一切表示せず、臨床医のために記録と質問を準備します。',
      step1Title: '症状の記録',
      step1Body: '症状の経過を普段の言葉で貼り付けるか、デモ症例を開きます。',
      step2Title: '特徴と元の文',
      step2Body:
        '医学的な特徴（HPO 用語）は、それぞれ元になった言葉のすぐ横に表示されます。「I do not get headaches」のように記録で「ない」とされている事柄は、「なし」のグループに入ります。特徴は残す、削除する、追加することができます。',
      step3Title: '一致候補とその根拠',
      step3Body:
        '特徴の重なり具合で希少疾患を順位付けします。各候補について、どの特徴が一致し、どれが一致しないか、そして HPO アノテーションによるとその疾患で各特徴がどのくらいの頻度で見られるかを示します。重なりは言葉（強い・部分的・弱い）で表し、パーセントでは示しません。',
      step4Title: '次に確認すること',
      step4Body: '上位の一致候補を最もよく見分けられる特徴を、受診時に聞ける平易な質問として示します。',
      step5Title: 'サマリー、Phenopacket、臨床試験',
      step5Body:
        '印刷または PDF 保存ができる 1 ページのサマリー、特徴だけを含み診断を含まない GA4GH Phenopacket ファイル、そして ClinicalTrials.gov の募集中の研究。',
      panelTitle: 'LLM は言葉の変換だけ',
      panelGrounding:
        '言語モデルが記録から語句を提案します。特徴が残るのは、その語句が記録にそのまま含まれ、かつ Human Phenotype Ontology がその用語を確認した場合だけです。',
      panelSources:
        '順位付けは Monarch Initiative の意味的類似度サービスによるものです。疾患名は Monarch、HPO アノテーション、Orphadata から、頻度と遺伝子は HPO アノテーションから取得しています。いずれもモデルが生成したものではありません。',
      panelPrivacy:
        '記録は、特徴を抽出するためだけに Cloudflare Workers AI を使ってサーバーに送信されます。アプリは記録をサーバーに保存せず、ログにも書き込みません。症例はお使いのブラウザに保存されます。',

      evidenceTitle: 'なぜオントロジーが順位付けを担うのか',
      evidenceDek: '公表された研究は、このツールと同じ役割分担を示しています。',
      study1Claim: 'LLM とオントロジーの併用が単独に勝る',
      study1Detail:
        'Undiagnosed Diseases Network の患者 424 人で、GPT-4o と順位付けツール Exomiser の組み合わせは鑑別診断の正答率 30% に達し、GPT-4o 単独の 22.4%、Exomiser 単独の 13.9% を上回りました。',
      study2Claim: 'オントロジーツールと追跡可能な根拠を持つエージェントが先頭に',
      study2Detail:
        'DeepRare は 40 を超えるツールを呼び出し、推論の過程を示す LLM エージェントで、HPO に基づく複数のベンチマークで、平均 57% の症例で正しい疾患を 1 位に挙げました。',
      ownTitle: '私たち自身による検証',
      ownResult:
        '固定のルールで選んだ公表済みの 10 症例で、正しい疾患は 5 症例で 1 位、6 症例で上位 3 位以内に入りました（私たち自身による小規模な評価）。',
      ownCaveat:
        'これらの症例は HPO アノテーションの元になっている可能性のある文献に由来するため、結果は楽観的である可能性が高いです。臨床的な検証ではありません。',
      ownRerank: '事前登録した、頻度を考慮する再順位付けは結果を改善しなかったため、採用していません。',
      methodLink: '方法と結果',

      closingTitle: 'デモ症例で見てみる',
      closingDek: '記憶力の低下と歩行の不安定さが進む 54 歳の方。合成の症例で、実在の患者ではありません。',

      sourcesTitle: '出典とクレジット',
      sourceOnGithub: 'GitHub のソースコード',
    },
    es: {
      metaTitle: 'Rare Disease Detective · un resumen para el especialista en minutos',
      metaDescription:
        'Convierta años de notas dispersas en un resumen para el especialista en minutos. Rare Disease Detective encuentra los rasgos médicos en un historial de síntomas escrito con palabras sencillas y enumera posibles enfermedades raras para comentar con un médico, con la evidencia que respalda cada una. Apoyo a la decisión, no un diagnóstico.',
      skip: 'Saltar al contenido',
      navLabel: 'Secciones',
      navProblem: 'Problema',
      navHow: 'Cómo funciona',
      navEvidence: 'Evidencia',
      navSources: 'Fuentes',
      openDemo: 'Abrir la demostración',
      openDemoShort: 'Demo',

      kickerLead: 'Para profesionales clínicos y asesores genéticos',
      kickerRest: ' · las familias pueden preparar sus notas',
      heroTitle: 'Un resumen para el especialista en minutos',
      heroLede: 'Convierta años de notas dispersas en un resumen para el especialista en minutos.',
      heroSafetyRest: ' Posibles coincidencias para comentar con un médico, cada una con la evidencia que la respalda.',
      tryDemo: 'Probar el caso de demostración',
      howLink: 'Cómo funciona',
      familyCta: 'Para familias: prepare notas para su médico',
      demoNote: 'Abre un caso de demostración sintético, sin registro. No es un paciente real.',
      proofAlt:
        'Captura de pantalla del paso Possible matches (posibles coincidencias) de la aplicación con un caso de demostración, no un paciente real. La primera coincidencia posible es Niemann-Pick disease, type C1, con Strong overlap (solapamiento fuerte).',
      proofCaption: 'La aplicación en vivo con el caso de demostración, la primera coincidencia posible, capturada el 2026-10-24.',

      problemTitle: 'Las enfermedades raras tardan años en tener nombre',
      problemDek:
        'Las familias y los profesionales clínicos no especialistas tienen las pistas en palabras sencillas. Las herramientas para enfermedades raras esperan términos de ontología.',
      stat1Value: '263–446 millones',
      stat1Label: 'de personas en el mundo viven con una enfermedad rara',
      stat2Value: '4,7 años',
      stat2Label: 'tiempo medio hasta el diagnóstico (la mediana es de 0,8 años)',
      stat3Value: '73 %',
      stat3Label: 'de los pacientes recibieron al menos un diagnóstico erróneo',
      surveyNote:
        'Los datos sobre el tiempo hasta el diagnóstico y los diagnósticos erróneos proceden de la encuesta Rare Barometer, realizada en 2022 a 6507 pacientes de 41 países europeos.',

      howTitle: 'Cómo funciona',
      howDek: 'Cinco pasos desde las notas de una madre o un padre hasta algo que un especialista puede comprobar.',
      howFamily:
        'En el modo para familias, la aplicación nunca muestra nombres de enfermedades; prepara las notas y las preguntas para un profesional clínico.',
      step1Title: 'Notas',
      step1Body: 'Pegue un historial de síntomas en palabras sencillas o abra el caso de demostración.',
      step2Title: 'Rasgos con su frase de origen',
      step2Body:
        'Cada rasgo médico (un término HPO) aparece junto a las palabras exactas de las que salió. Lo que las notas dicen que no ocurre, como “I do not get headaches”, va a un grupo No presente. Usted conserva, elimina o añade rasgos.',
      step3Title: 'Posibles coincidencias con evidencia',
      step3Body:
        'Enfermedades raras ordenadas según cuánto se solapan los rasgos. Cada una muestra qué rasgos coinciden, cuáles no y con qué frecuencia aparece cada uno en esa enfermedad según las anotaciones de HPO. El solapamiento se expresa con una palabra (fuerte, parcial, débil), nunca con un porcentaje.',
      step4Title: 'Qué comprobar después',
      step4Body: 'Los rasgos que mejor distinguen las primeras coincidencias, escritos como preguntas sencillas para la consulta.',
      step5Title: 'Resumen, phenopacket y ensayos',
      step5Body:
        'Un resumen de una página para imprimir o guardar como PDF, un archivo GA4GH Phenopacket con los rasgos y sin ningún diagnóstico, y estudios con reclutamiento abierto de ClinicalTrials.gov.',
      panelTitle: 'El LLM solo traduce',
      panelGrounding:
        'Un modelo de lenguaje propone frases de las notas. Un rasgo se conserva solo si su frase aparece palabra por palabra en las notas y la Human Phenotype Ontology confirma el término.',
      panelSources:
        'La clasificación procede del servicio de similitud semántica de la Monarch Initiative. Los nombres de las enfermedades proceden de Monarch, de las anotaciones de HPO y de Orphadata; las frecuencias y los genes, de las anotaciones de HPO. Nada de esto procede del modelo.',
      panelPrivacy:
        'Sus notas se envían al servidor solo para extraer los rasgos, mediante Cloudflare Workers AI. La aplicación no las guarda en un servidor ni las escribe en registros; su caso se conserva en su navegador.',

      evidenceTitle: 'Por qué la ontología hace la clasificación',
      evidenceDek: 'Los trabajos publicados apuntan al mismo reparto de funciones que usa esta herramienta.',
      study1Claim: 'LLM y ontología juntos superan a cada uno',
      study1Detail:
        'En 424 pacientes de la Undiagnosed Diseases Network, GPT-4o con la herramienta de clasificación Exomiser alcanzó un 30 % de precisión en el diagnóstico diferencial, frente al 22,4 % de GPT-4o y el 13,9 % de Exomiser por separado.',
      study2Claim: 'Lideran los agentes con ontología y evidencia trazable',
      study2Detail:
        'DeepRare, un agente LLM que llama a más de 40 herramientas y muestra su razonamiento, situó la enfermedad correcta en primer lugar en el 57 % de los casos de media en las pruebas de referencia basadas en HPO.',
      ownTitle: 'Nuestra propia comprobación',
      ownResult:
        'En 10 casos publicados seleccionados con una regla fija, la enfermedad correcta quedó en primer lugar en 5 y entre las 3 primeras en 6 (nuestra propia evaluación, de pequeño tamaño).',
      ownCaveat:
        'Los casos proceden de publicaciones que quizá ya alimentan las anotaciones de HPO, por lo que el resultado probablemente sea optimista. No es una validación clínica.',
      ownRerank:
        'Una reclasificación que tiene en cuenta la frecuencia, registrada de antemano, no mejoró el resultado, así que no se incorporó.',
      methodLink: 'Método y resultados',

      closingTitle: 'Véalo en el caso de demostración',
      closingDek: 'Una persona de 54 años con memoria cada vez peor y marcha inestable. Sintético, no es un paciente real.',

      sourcesTitle: 'Fuentes y créditos',
      sourceOnGithub: 'Código fuente en GitHub',
    },
    ko: {
      metaTitle: 'Rare Disease Detective · 몇 분 만에 전문의용 요약서',
      metaDescription:
        '여러 해 동안 흩어진 기록을 몇 분 만에 전문의용 요약서로 정리합니다. Rare Disease Detective는 일상 언어로 쓴 증상 경과에서 의학적 특징을 찾아, 의사와 상의할 수 있는 희귀질환 후보를 각각의 근거와 함께 보여 줍니다. 의사결정 지원이며, 진단이 아닙니다.',
      skip: '본문으로 건너뛰기',
      navLabel: '섹션',
      navProblem: '문제',
      navHow: '작동 방식',
      navEvidence: '근거',
      navSources: '출처',
      openDemo: '데모 열기',
      openDemoShort: '데모',

      kickerLead: '임상의와 유전 상담사를 위한',
      kickerRest: ' · 가족은 기록을 준비할 수 있습니다',
      heroTitle: '몇 분 만에 전문의용 요약서를',
      heroLede: '여러 해 동안 흩어진 기록을 몇 분 만에 전문의용 요약서로 정리합니다.',
      heroSafetyRest: ' 의사와 상의할 가능한 일치 항목을 각각의 근거와 함께 보여 줍니다.',
      tryDemo: '데모 사례 사용해 보기',
      howLink: '작동 방식',
      familyCta: '가족용: 의사에게 전할 기록 준비하기',
      demoNote: '가입 없이 합성 데모 사례가 열립니다. 실제 환자가 아닙니다.',
      proofAlt:
        '데모 사례로 본 앱의 가능한 일치 단계 화면입니다. 실제 환자가 아닙니다. 가장 위의 가능한 일치는 Niemann-Pick disease, type C1이며 겹침 정도는 Strong overlap입니다.',
      proofCaption: '데모 사례를 띄운 실제 앱, 가장 위의 가능한 일치, 2026-10-24 캡처.',

      problemTitle: '희귀질환은 이름을 찾기까지 몇 년이 걸립니다',
      problemDek: '가족과 비전문 임상의는 단서를 일상 언어로 갖고 있습니다. 희귀질환 도구는 온톨로지 용어를 요구합니다.',
      stat1Value: '2.63–4.46억 명',
      stat1Label: '전 세계에서 희귀질환을 안고 살아가는 사람',
      stat2Value: '4.7년',
      stat2Label: '진단까지 걸리는 평균 기간(중앙값은 0.8년)',
      stat3Value: '73%',
      stat3Label: '한 번 이상 오진을 경험한 환자의 비율',
      surveyNote:
        '진단까지의 기간과 오진 수치는 2022년 유럽 41개국 환자 6,507명을 대상으로 실시한 Rare Barometer 조사에서 나왔습니다.',

      howTitle: '작동 방식',
      howDek: '부모의 기록에서 전문의가 확인할 수 있는 자료까지, 다섯 단계.',
      howFamily: '가족 모드에서는 앱이 질환 이름을 전혀 보여 주지 않고, 임상의를 위해 기록과 질문을 준비합니다.',
      step1Title: '증상 기록',
      step1Body: '증상 경과를 일상 언어로 붙여 넣거나 데모 사례를 엽니다.',
      step2Title: '특징과 원래 문장',
      step2Body:
        '각 의학적 특징(HPO 용어)은 그것이 나온 원래 말 바로 옆에 표시됩니다. “I do not get headaches”처럼 기록에서 없다고 한 내용은 없음 그룹으로 들어갑니다. 특징을 유지하거나 삭제하거나 추가할 수 있습니다.',
      step3Title: '근거가 있는 가능한 일치',
      step3Body:
        '특징이 얼마나 겹치는지에 따라 희귀질환의 순위를 매깁니다. 각 항목은 어떤 특징이 일치하고 어떤 특징이 일치하지 않는지, 그리고 HPO 주석에 따라 각 특징이 그 질환에서 얼마나 자주 나타나는지를 보여 줍니다. 겹침 정도는 백분율이 아니라 말(강함, 부분적, 약함)로 표시합니다.',
      step4Title: '다음에 확인할 것',
      step4Body: '상위 일치 항목을 가장 잘 구별하는 특징을 진료 때 물어볼 쉬운 질문으로 적어 줍니다.',
      step5Title: '요약서, Phenopacket, 임상시험',
      step5Body:
        '인쇄하거나 PDF로 저장할 수 있는 한 쪽짜리 요약서, 특징만 담고 진단은 담지 않은 GA4GH Phenopacket 파일, 그리고 ClinicalTrials.gov의 모집 중인 연구.',
      panelTitle: 'LLM은 말만 옮깁니다',
      panelGrounding:
        '언어 모델이 기록에서 문구를 제안합니다. 특징은 그 문구가 기록에 글자 그대로 있고 Human Phenotype Ontology가 그 용어를 확인한 경우에만 남습니다.',
      panelSources:
        '순위는 Monarch Initiative의 의미 유사도 서비스에서 나옵니다. 질환 이름은 Monarch, HPO 주석, Orphadata에서, 빈도와 유전자는 HPO 주석에서 가져옵니다. 어느 것도 모델에서 나오지 않습니다.',
      panelPrivacy:
        '기록은 특징을 추출하기 위해서만 Cloudflare Workers AI를 통해 서버로 전송됩니다. 앱은 기록을 서버에 저장하거나 로그에 남기지 않으며, 사례는 사용자의 브라우저에 보관됩니다.',

      evidenceTitle: '왜 온톨로지가 순위를 매기는가',
      evidenceDek: '발표된 연구들은 이 도구가 쓰는 것과 같은 역할 분담을 가리킵니다.',
      study1Claim: 'LLM과 온톨로지를 함께 쓰면 각각 따로 쓸 때보다 낫습니다',
      study1Detail:
        'Undiagnosed Diseases Network 환자 424명에서 GPT-4o와 순위 도구 Exomiser를 함께 쓴 경우 감별 진단 정확도가 30%였고, GPT-4o 단독은 22.4%, Exomiser 단독은 13.9%였습니다.',
      study2Claim: '온톨로지 도구와 추적 가능한 근거를 갖춘 에이전트가 앞섭니다',
      study2Detail:
        'DeepRare는 40개가 넘는 도구를 호출하고 추론 과정을 보여 주는 LLM 에이전트로, HPO 기반 벤치마크들에서 평균 57%의 사례에서 올바른 질환을 1위에 올렸습니다.',
      ownTitle: '자체 점검',
      ownResult:
        '고정된 규칙으로 고른 발표 사례 10건에서 올바른 질환이 5건에서 1위, 6건에서 상위 3위 안에 들었습니다(우리의 소규모 자체 평가).',
      ownCaveat:
        '이 사례들은 HPO 주석에 이미 반영되었을 수 있는 문헌에서 나왔으므로 결과가 낙관적일 가능성이 큽니다. 임상 검증이 아닙니다.',
      ownRerank: '사전 등록한 빈도 기반 재순위화는 결과를 개선하지 못해 적용하지 않았습니다.',
      methodLink: '방법과 결과',

      closingTitle: '데모 사례에서 확인해 보세요',
      closingDek: '기억력이 점점 나빠지고 걸음이 불안정한 54세 환자. 합성 사례이며 실제 환자가 아닙니다.',

      sourcesTitle: '출처와 크레딧',
      sourceOnGithub: 'GitHub 소스 코드',
    },
    fr: {
      metaTitle: 'Rare Disease Detective · une synthèse pour le spécialiste en quelques minutes',
      metaDescription:
        'Transformez des années de notes éparses en une synthèse pour le spécialiste en quelques minutes. Rare Disease Detective repère les caractéristiques médicales dans un historique des symptômes écrit en mots simples et liste des maladies rares possibles à discuter avec un médecin, chacune avec les éléments qui l’appuient. Aide à la décision, pas un diagnostic.',
      skip: 'Aller au contenu',
      navLabel: 'Sections',
      navProblem: 'Problème',
      navHow: 'Fonctionnement',
      navEvidence: 'Preuves',
      navSources: 'Sources',
      openDemo: 'Ouvrir la démo',
      openDemoShort: 'Démo',

      kickerLead: 'Pour les cliniciens et les conseillers en génétique',
      kickerRest: ' · les familles peuvent préparer leurs notes',
      heroTitle: 'Une synthèse pour le spécialiste en quelques minutes',
      heroLede: 'Transformez des années de notes éparses en une synthèse pour le spécialiste en quelques minutes.',
      heroSafetyRest: ' Des correspondances possibles à discuter avec un médecin, chacune avec les éléments qui l’appuient.',
      tryDemo: 'Essayer le cas de démonstration',
      howLink: 'Fonctionnement',
      familyCta: 'Pour les familles : préparer des notes pour votre médecin',
      demoNote: 'Ouvre un cas de démonstration synthétique, sans inscription. Ce n’est pas un vrai patient.',
      proofAlt:
        'Capture d’écran de l’étape Possible matches (correspondances possibles) de l’application, sur un cas de démonstration, pas un vrai patient. La première correspondance possible est Niemann-Pick disease, type C1, avec Strong overlap (recoupement fort).',
      proofCaption: 'L’application en direct sur le cas de démonstration, la première correspondance possible, capturée le 2026-10-24.',

      problemTitle: 'Il faut des années pour nommer une maladie rare',
      problemDek:
        'Les familles et les cliniciens non spécialistes détiennent les indices en mots simples. Les outils pour les maladies rares attendent des termes d’ontologie.',
      stat1Value: '263–446 millions',
      stat1Label: 'de personnes dans le monde vivent avec une maladie rare',
      stat2Value: '4,7 ans',
      stat2Label: 'délai moyen avant le diagnostic (la médiane est de 0,8 an)',
      stat3Value: '73 %',
      stat3Label: 'des patients ont reçu au moins un diagnostic erroné',
      surveyNote:
        'Le délai de diagnostic et les erreurs de diagnostic proviennent de l’enquête Rare Barometer menée en 2022 auprès de 6 507 patients dans 41 pays européens.',

      howTitle: 'Fonctionnement',
      howDek: 'Cinq étapes, des notes d’un parent à un document qu’un spécialiste peut vérifier.',
      howFamily:
        'En mode famille, l’application n’affiche jamais de noms de maladies ; elle prépare les notes et les questions pour un clinicien.',
      step1Title: 'Notes',
      step1Body: 'Collez un historique des symptômes en mots simples, ou ouvrez le cas de démonstration.',
      step2Title: 'Caractéristiques avec leur phrase source',
      step2Body:
        'Chaque caractéristique médicale (un terme HPO) figure à côté des mots exacts dont elle provient. Ce que les notes disent absent, comme « I do not get headaches », va dans un groupe Absente. Vous gardez, retirez ou ajoutez des caractéristiques.',
      step3Title: 'Correspondances possibles avec leurs preuves',
      step3Body:
        'Les maladies rares sont classées selon le recoupement des caractéristiques. Chacune indique quelles caractéristiques correspondent, lesquelles non, et à quelle fréquence chacune survient dans cette maladie selon les annotations HPO. Le recoupement est un mot (fort, partiel, faible), jamais un pourcentage.',
      step4Title: 'À vérifier ensuite',
      step4Body:
        'Les caractéristiques qui distinguent le mieux les premières correspondances, rédigées comme des questions simples pour le rendez-vous.',
      step5Title: 'Synthèse, phenopacket et essais',
      step5Body:
        'Une synthèse d’une page à imprimer ou à enregistrer en PDF, un fichier GA4GH Phenopacket avec les caractéristiques et aucun diagnostic, et des études en cours de recrutement issues de ClinicalTrials.gov.',
      panelTitle: 'Le LLM ne fait que traduire',
      panelGrounding:
        'Un modèle de langage propose des expressions tirées des notes. Une caractéristique n’est conservée que si son expression figure mot pour mot dans les notes et que la Human Phenotype Ontology confirme le terme.',
      panelSources:
        'Le classement vient du service de similarité sémantique de la Monarch Initiative. Les noms des maladies viennent de Monarch, des annotations HPO et d’Orphadata ; les fréquences et les gènes viennent des annotations HPO. Rien de tout cela ne vient du modèle.',
      panelPrivacy:
        'Vos notes ne sont envoyées au serveur que pour extraire les caractéristiques, avec Cloudflare Workers AI. L’application ne les stocke pas sur un serveur et ne les écrit pas dans des journaux ; votre cas reste dans votre navigateur.',

      evidenceTitle: 'Pourquoi l’ontologie fait le classement',
      evidenceDek: 'Les travaux publiés vont dans le sens de la même répartition des rôles que cet outil.',
      study1Claim: 'LLM et ontologie font mieux ensemble',
      study1Detail:
        'Chez 424 patients de l’Undiagnosed Diseases Network, GPT-4o associé à l’outil de classement Exomiser a atteint 30 % de précision du diagnostic différentiel, contre 22,4 % pour GPT-4o et 13,9 % pour Exomiser seuls.',
      study2Claim: 'Les agents à ontologie et preuves traçables sont en tête',
      study2Detail:
        'DeepRare, un agent LLM qui appelle plus de 40 outils et montre son raisonnement, a classé la bonne maladie en premier dans 57 % des cas en moyenne sur des bancs d’essai fondés sur HPO.',
      ownTitle: 'Notre propre vérification',
      ownResult:
        'Sur 10 cas publiés choisis selon une règle fixe, la bonne maladie est arrivée en premier dans 5 cas et dans les 3 premières dans 6 (notre propre petite évaluation).',
      ownCaveat:
        'Les cas proviennent de publications qui alimentent peut-être déjà les annotations HPO, donc le résultat est probablement optimiste. Ce n’est pas une validation clinique.',
      ownRerank:
        'Un reclassement tenant compte des fréquences, enregistré à l’avance, n’a pas amélioré le résultat ; il n’a donc pas été mis en service.',
      methodLink: 'Méthode et résultats',

      closingTitle: 'Voyez-le sur le cas de démonstration',
      closingDek:
        'Une personne de 54 ans dont la mémoire se dégrade et dont la marche est instable. Synthétique, pas un vrai patient.',

      sourcesTitle: 'Sources et crédits',
      sourceOnGithub: 'Code source sur GitHub',
    },
  },
);
