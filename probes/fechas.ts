// F-008: los probes ya no pueden reservar en una fecha fija. "Cualquier fecha futura sirve" dejó de ser
// cierta con la ventana de 30 días (ADR 0005), así que las fechas se calculan acá, al correr, y llegan a
// Hurl como variables. Único lugar que las arma; siempre `Date` → ISO, nunca strings concatenados (§4b).
const MILISEGUNDOS_POR_DIA = 86_400_000;

export function variablesDeFechas(ahora = new Date()): Record<string, string> {
  const dentroDe = (dias: number, horaUtc: number, minutos = 0) => {
    const fecha = new Date(ahora.getTime() + dias * MILISEGUNDOS_POR_DIA);
    fecha.setUTCHours(horaUtc, minutos, 0, 0);
    return fecha.toISOString();
  };
  return {
    // Dentro de la ventana (F-008) y con más de 24 h de anticipación (regla 3): sirve para crear y cancelar.
    inicio: dentroDe(7, 18),
    fin: dentroDe(7, 19),
    // Corrida media hora: se pisa parcialmente con la anterior (regla 1).
    inicioCorrido: dentroDe(7, 18, 30),
    finCorrido: dentroDe(7, 19, 30),
    // Fuera de la ventana: más de 30 días.
    inicioLejano: dentroDe(45, 18),
    finLejano: dentroDe(45, 19),
  };
}

/** Los `--variable` que necesitan los probes: el host y las fechas. */
export function variablesHurl(host: string): string[] {
  return Object.entries({ host, ...variablesDeFechas() })
    .flatMap(([nombre, valor]) => ['--variable', `${nombre}=${valor}`]);
}
