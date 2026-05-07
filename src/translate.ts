/**
 * NLS sample-data translation table.
 * Maps English department/role names to Japanese and Korean equivalents
 * for multi-language sample INSERT generation.
 */

type Language = 'EN' | 'JP' | 'KO' | string;   // string = forward-compat for future locales

const EN: readonly string[] = [
    'Sales', 'Finance', 'Delivery', 'Manufacturing',
    'Engineer', 'Consultant', 'Architect', 'Manager',
    'Analyst', 'Specialist', 'Evangelist', 'Salesman',
];

const JP: readonly string[] = [
    '「販売」', '「財務」', '「配送」', '「製造」',
    '「エンジニア」', '「コンサルタント」', '「アーキテクト」', '「マネージャー」',
    '「アナリスト」', '「スペシャリスト」', '「エバンジェリスト」',
];

const KO: readonly string[] = [
    '영업', '금융', '배송', '제조',
    '엔지니어', '컨설턴트', '건축가', '관리자',
    '분석가', '전문가', '전도자', '판매원',
];

function translate(language: Language, input: unknown): unknown {
    if (typeof input !== 'string') return input;

    const lang = language.substring(0, 2).toLowerCase();
    if (lang === 'en') return input;

    const text = input.startsWith("'") ? input.slice(1, -1) : input;
    const pos = EN.indexOf(text);
    if (pos < 0) return input;

    if (lang === 'jp' && pos < JP.length) return "'" + JP[pos] + "'";
    if (lang === 'kr' && pos < KO.length) return "'" + KO[pos] + "'";

    return input;
}

export default translate;
