-- =============================================================================
-- 05_install_test.sql  —  smoke test post-installazione espresql MLE
-- Eseguire dopo install_package.sql. Tutti i test devono passare (= PASS).
-- =============================================================================

SET SERVEROUTPUT ON SIZE UNLIMITED
SET FEEDBACK OFF

DECLARE
    l_result  CLOB;
    l_errors  CLOB;
    l_passed  PLS_INTEGER := 0;
    l_failed  PLS_INTEGER := 0;

    PROCEDURE check_test (
        p_label     IN VARCHAR2,
        p_condition IN BOOLEAN,
        p_detail    IN VARCHAR2 DEFAULT NULL
    ) IS
    BEGIN
        IF p_condition THEN
            DBMS_OUTPUT.put_line('  PASS  ' || p_label);
            l_passed := l_passed + 1;
        ELSE
            DBMS_OUTPUT.put_line('  FAIL  ' || p_label ||
                CASE WHEN p_detail IS NOT NULL THEN ' — ' || p_detail END);
            l_failed := l_failed + 1;
        END IF;
    END;

BEGIN
    DBMS_OUTPUT.put_line(CHR(10) || '--- Smoke test espresql_pkg ---' || CHR(10));

    -- Test 1: versione bundle
    l_result := espresql_pkg.version();
    check_test('version(): stringa non nulla', l_result IS NOT NULL, l_result);

    -- Test 2: tabella semplice
    l_result := espresql_pkg.to_ddl('employees' || CHR(10) || '  name /nn');
    check_test('to_ddl: contiene CREATE TABLE employees',
               INSTR(LOWER(l_result), 'create table employees') > 0);
    check_test('to_ddl: contiene NOT NULL',
               INSTR(LOWER(l_result), 'not null') > 0);

    -- Test 3: opzioni prefix
    l_result := espresql_pkg.to_ddl(
        'orders' || CHR(10) || '  amount num',
        '{"prefix":"sales"}'
    );
    check_test('to_ddl: prefix "sales" applicato correttamente',
               INSTR(LOWER(l_result), 'create table sales_orders') > 0);

    -- Test 4: gerarchia padre-figlio genera FK
    l_result := espresql_pkg.to_ddl(
        'departments' || CHR(10) ||
        '  name /nn' || CHR(10) ||
        '  employees' || CHR(10) ||
        '    name /nn vc50' || CHR(10) ||
        '    salary num'
    );
    check_test('to_ddl: FK figlio verso padre generata',
               INSTR(LOWER(l_result), 'departments_id') > 0);

    -- Test 5: validate — input OK ritorna array vuoto
    l_errors := espresql_pkg.validate('orders' || CHR(10) || '  amount num');
    check_test('validate: input valido ritorna []', l_errors = '[]');

    -- Test 6: struttura errore ha from.line (non line diretto)
    l_errors := espresql_pkg.validate('employees' || CHR(10) || '  - bad');
    DECLARE
        l_line NUMBER;
    BEGIN
        l_line := JSON_VALUE(l_errors, '$[0].from.line' RETURNING NUMBER);
        check_test('validate: struttura errore ha from.line', l_line IS NOT NULL,
                   'from.line=' || l_line);
    EXCEPTION
        WHEN OTHERS THEN
            check_test('validate: struttura errore ha from.line', FALSE, SQLERRM);
    END;

    -- Test 7: to_erd ritorna JSON non nullo
    l_result := espresql_pkg.to_erd(
        'departments' || CHR(10) || '  name' || CHR(10) ||
        '  employees' || CHR(10) || '    name'
    );
    check_test('to_erd: ritorna JSON non nullo', l_result IS NOT NULL AND LENGTH(l_result) > 2);

    -- Test 8: to_ddl con p_options NULL non solleva eccezione
    BEGIN
        l_result := espresql_pkg.to_ddl('simple_tbl', NULL);
        check_test('to_ddl: p_options NULL non solleva eccezione', TRUE);
    EXCEPTION
        WHEN OTHERS THEN
            check_test('to_ddl: p_options NULL non solleva eccezione', FALSE, SQLERRM);
    END;

    DBMS_OUTPUT.put_line(CHR(10) ||
        'Risultato: ' || l_passed || ' passed, ' || l_failed || ' failed' || CHR(10));

    IF l_failed > 0 THEN
        raise_application_error(-20099, 'Smoke test fallito: ' || l_failed || ' test non passati.');
    END IF;
END;
/

SET FEEDBACK ON
PROMPT >>> install_test.sql completato.
