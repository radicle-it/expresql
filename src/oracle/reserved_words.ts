/**
 * Oracle reserved and semi-reserved words.
 * 'Y' = fully reserved (cannot be used as identifier without quoting)
 * 'N' = semi-reserved (context-sensitive)
 *
 * Source: SELECT keyword, reserved FROM V$RESERVED_WORDS WHERE res_semi='Y' OR reserved='Y'
 */
const RESERVED_WORDS: Readonly<Record<string, 'Y' | 'N'>> = {
    ACCESS:'N', ADD:'N', ALL:'Y', ALTER:'Y', AND:'Y', ANY:'Y', AS:'Y', ASC:'Y',
    AUDIT:'N', BETWEEN:'Y', BY:'Y', CHAR:'Y', CHECK:'Y', CLUSTER:'Y', COLUMN:'N',
    COMMENT:'N', COMPRESS:'Y', CONNECT:'Y', CREATE:'Y', CURRENT:'N', DATE:'Y',
    DECIMAL:'Y', DEFAULT:'Y', DELETE:'Y', DESC:'Y', DISTINCT:'Y', DROP:'Y',
    ELSE:'Y', EXCEPT:'Y', EXCLUSIVE:'Y', EXISTS:'Y', FILE:'N', FLOAT:'Y',
    FOR:'Y', FROM:'Y', GRANT:'Y', GROUP:'Y', HAVING:'Y', IDENTIFIED:'Y',
    IMMEDIATE:'N', IN:'Y', INCREMENT:'N', INDEX:'Y', INITIAL:'N', INSERT:'Y',
    INTEGER:'Y', INTERSECT:'Y', INTO:'Y', IS:'Y', LEVEL:'N', LIKE:'Y', LOCK:'Y',
    LONG:'Y', MAXEXTENTS:'N', MINUS:'Y', MLSLABEL:'N', MODE:'Y', MODIFY:'N',
    NOAUDIT:'N', NOCOMPRESS:'Y', NOT:'Y', NOWAIT:'Y', NULL:'Y', NUMBER:'Y',
    OF:'Y', OFFLINE:'N', ON:'Y', ONLINE:'N', OPTION:'Y', OR:'Y', ORDER:'Y',
    PCTFREE:'Y', PRIOR:'Y', PUBLIC:'Y', RAW:'Y', RENAME:'Y', RESOURCE:'Y',
    REVOKE:'Y', ROW:'N', ROWID:'N', ROWNUM:'N', ROWS:'N', SELECT:'Y',
    SESSION:'N', SET:'Y', SHARE:'Y', SIZE:'Y', SMALLINT:'Y', START:'Y',
    SUCCESSFUL:'N', SYNONYM:'Y', SYSDATE:'N', TABLE:'Y', THEN:'Y', TO:'Y',
    TRIGGER:'Y', UID:'N', UNION:'Y', UNIQUE:'Y', UPDATE:'Y', USER:'N',
    VALIDATE:'N', VALUES:'Y', VARCHAR:'Y', VARCHAR2:'Y', VIEW:'Y',
    WHENEVER:'N', WHERE:'Y', WITH:'Y',
};

/**
 * Returns the input prefixed with "the_" if it is an Oracle reserved word,
 * otherwise returns it unchanged.
 */
function amend_reserved_word(input: string): string {
    if (RESERVED_WORDS[input.toUpperCase()] !== undefined)
        return 'the_' + input;
    return input;
}

export default amend_reserved_word;
