/**
 * Integration test suite — mirrors regression_test.js but:
 *   - Imports from the compiled TypeScript sources (src/ddl.ts etc.)
 *   - Each test file becomes an individual named test case
 *   - Reports which file failed, not just an offset mismatch
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import quicksql, { toDDL, fromJSON }    from '../../src/ddl.js';
import lexer,    { LexerToken }          from '../../src/lexer.js';
import errorMsgs                         from '../../src/errorMsgs.js';
import { resetSeed }                     from '../../src/sample.js';

// ── Token comparison (ported from regression_test.js) ─────────────────────────

/** Known constraint-name mismatches between the legacy and TS generators. */
const mismatches: Record<string, string> = {
    frc_patients_insurance_provider_fk:       'frc_patients_insurance_prov_fk',
    frc_patient_procedures_id_pk:             'frc_patient_proced_id_pk',
    frc_patient_procedures_patient_id_fk:     'frc_patient_pro_patient_id_fk',
    frc_patient_procedures_i1:                'frc_patient_proced_i1',
    frc_doctor_procedures_id_pk:              'frc_doctor_procedu_id_pk',
    med_coverage_plan_option_id_pk:           'med_coverage_plan_id_pk2',
    med_coverage_plan_option_coverage_plan_id_fk: 'med_coverage_coverage_plan_fk',
    med_coverage_plan_option_i1:              'med_coverage_plan_i1',
    med_users_coverage_plan_option_id_fk:     'med_users_coverage_plan_opt_fk',
    med_coverage_plan:                        'med_coverage_plan_option',
    med_users_i2:                             'med_users_i112',
    med_users_i3:                             'med_users_i123',
    med_user_claims_receipt_from_id_fk:       'med_user_clai_receipt_from_fk',
    med_user_claim_docs_id_pk:                'med_user_claim_doc_id_pk',
    med_user_claim_docs_claim_fk:             'med_user_claim_doc_claim_fk',
    med_user_claim_docs_i1:                   'med_user_claim_doc_i1',
    med_user_claim_notes_id_pk:               'med_user_claim_not_id_pk',
    med_user_claim_notes_claim_fk:            'med_user_claim_not_claim_fk',
    med_user_claim_notes_i1:                  'med_user_claim_not_i1',
    med_user_notifications_id_pk:             'med_user_notificat_id_pk',
    session_speakers_session_id_fk:           'session_speaker_session_id_fk',
    session_speakers_speaker_id_fk:           'session_speaker_speaker_id_fk',
    session_speakers_speaker_role_id_fk:      'session_speak_speaker_role_fk',
    session_speakers_i2:                      'session_speakers_i82',
    session_speakers_i3:                      'session_speakers_i93',
};

function compareTokens(so: LexerToken, sc: LexerToken, strict: boolean): boolean {
    const scc = sc.value.toLowerCase();
    const soc = so.value.toLowerCase();
    if (soc === scc) return true;
    if (strict) return false;
    if (soc.charAt(0) === '\'' && scc.charAt(0) === '\'') return true;
    if (sc.type === 'constant.numeric' && so.type === 'constant.numeric') return true;
    const mismatch = mismatches[soc];
    if (mismatch == null) return false;
    return mismatch.toLowerCase() === scc;
}

function assertTokensMatch(output: string, expected: string, strict: boolean, label: string): void {
    const so = lexer(output,   false, true, '');
    const sc = lexer(expected, false, true, '');

    for (let i = 0; i < so.length && i < sc.length; i++) {
        if (!compareTokens(so[i], sc[i], strict)) {
            const ctx = i >= 3
                ? `\n  got:      ...${output  .substring(so[i - 3].end, so[i].end)}...\n` +
                  `  expected: ...${expected.substring(sc[i - 3].end, sc[i].end)}...`
                : '';
            throw new Error(
                `${label}: token mismatch at offset ${so[i].begin} (expected ${sc[i].begin})` + ctx
            );
        }
    }
    expect(so.length, `${label}: token count`).toBe(sc.length);
}

function checkNoError(msgList: unknown[], msgPrefix?: string): void {
    for (const err of msgList as Array<{ message: string }>) {
        if (msgPrefix == null || err.message.startsWith(msgPrefix))
            throw new Error(`Unexpected error: "${err.message}"`);
    }
}

// ── Test-file discovery ───────────────────────────────────────────────────────

interface TestCase {
    label:    string;
    inputPath: string;
    ext:      '.quicksql' | '.qsql' | '.json';
    isERD:    boolean;
    strict:   boolean;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testRoot  = path.join(__dirname, '..');   // → project/test/

function collectCases(dir: string): TestCase[] {
    const results: TestCase[] = [];
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
            if (entry === 'experimental') continue;    // skip experimental subtree
            results.push(...collectCases(full));
        } else {
            const ext = (['.quicksql', '.qsql', '.json'] as const)
                .find(e => entry.endsWith(e));
            if (!ext) continue;
            results.push({
                label:     path.relative(testRoot, full).replace(/\\/g, '/'),
                inputPath: full,
                ext,
                isERD:     full.includes(path.sep + 'erd' + path.sep),
                strict:    full.includes(path.sep + 'star' + path.sep) ||
                           full.toLowerCase().includes(path.sep + 'json' + path.sep),
            });
        }
    }
    return results;
}

const testCases = collectCases(testRoot);

// ── Test suite ────────────────────────────────────────────────────────────────

describe('DDL regression (TypeScript sources)', () => {
    beforeEach(() => { resetSeed(); });

    for (const tc of testCases) {
        test(tc.label, () => {
            const text = fs.readFileSync(tc.inputPath, 'utf8');
            const baseName = tc.inputPath.slice(0, -tc.ext.length);

            let output: string;
            if (tc.isERD) {
                output = JSON.stringify(new (quicksql as any)(text).getERD(), null, 3);
            } else if (tc.ext === '.json') {
                const fileName = path.basename(baseName);
                output = fromJSON(text, fileName);
            } else {
                const p = new (quicksql as any)(text);
                output = p.getDDL();
                checkNoError(p.getErrors());
            }

            const cmpExt = tc.isERD ? '.erd' : tc.ext === '.json' ? '.qsql' : '.sql';
            let expected = fs.readFileSync(baseName + cmpExt, 'utf8');

            if (tc.isERD) {
                // ERD output is JSON — compare semantically, not token-by-token
                expect(JSON.parse(output), tc.label).toEqual(JSON.parse(expected));
            } else {
                expected = expected.replace(/default on null '0'/g, 'default on null  0 ');
                assertTokensMatch(output, expected, tc.strict, tc.label);
            }
        });
    }
});
