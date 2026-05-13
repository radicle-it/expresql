// Sorgente per expresql_api_module (MLE).
// Importa dal modulo expresql caricato nell'environment Oracle MLE.
// NON usare JSON.parse sulle opzioni: toDDL/toERD accettano la stringa JSON direttamente.
import { toDDL, toERD, toErrors, expresql_version } from 'expresql';

export function getDDL(qsql, optionsJson) {
    // optionsJson è già una stringa JSON — NON fare JSON.parse
    return toDDL(qsql, optionsJson || undefined);
}

export function getERD(qsql, optionsJson) {
    // optionsJson è già una stringa JSON — NON fare JSON.parse
    return JSON.stringify(toERD(qsql, optionsJson || undefined));
}

export function validate(qsql) {
    const errors = toErrors(qsql) || [];
    return JSON.stringify(errors);
}

export function version() {
    return expresql_version();
}
