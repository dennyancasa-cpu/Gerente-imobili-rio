import { format, parseISO } from 'date-fns';

/**
 * Computes Easter Sunday for a given year using Gauss's algorithm.
 */
function getEaster(year: number): Date {
  const f = Math.floor;
  const a = year % 19;
  const b = f(year / 100);
  const c = year % 100;
  const d = f(b / 4);
  const e = b % 4;
  const g = f((8 * b + 13) / 25);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = f(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = f((a + 11 * h + 22 * l) / 451);
  const month = f((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Returns a dictionary of Brazilian national holidays for a given year.
 */
export function getBrazilianHolidays(year: number): { [key: string]: string } {
  const holidays: { [key: string]: string } = {
    [`${year}-01-01`]: 'Ano Novo (Confraternização Universal)',
    [`${year}-04-21`]: 'Tiradentes',
    [`${year}-05-01`]: 'Dia do Trabalho',
    [`${year}-09-07`]: 'Dia da Independência do Brasil',
    [`${year}-10-12`]: 'Nossa Senhora Aparecida',
    [`${year}-11-02`]: 'Finados',
    [`${year}-11-15`]: 'Proclamação da República',
    [`${year}-11-20`]: 'Dia da Consciência Negra',
    [`${year}-12-25`]: 'Natal',
  };

  const easter = getEaster(year);

  // Sexta-feira Santa (Good Friday) is Easter minus 2 days
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays[format(goodFriday, 'yyyy-MM-dd')] = 'Sexta-feira Santa';

  // Corpus Christi is Easter plus 60 days
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays[format(corpusChristi, 'yyyy-MM-dd')] = 'Corpus Christi';

  // Carnaval Tuesday is Easter minus 47 days
  const carnavalTuesday = new Date(easter);
  carnavalTuesday.setDate(easter.getDate() - 47);
  holidays[format(carnavalTuesday, 'yyyy-MM-dd')] = 'Carnaval (Terça-feira)';

  // Carnaval Monday is Easter minus 48 days
  const carnavalMonday = new Date(easter);
  carnavalMonday.setDate(easter.getDate() - 48);
  holidays[format(carnavalMonday, 'yyyy-MM-dd')] = 'Carnaval (Segunda-feira)';

  return holidays;
}

export interface AdjustmentResult {
  originalDate: string;
  adjustedDate: string;
  wasAdjusted: boolean;
  adjustmentReason?: string;
}

/**
 * Receives a date string in 'yyyy-MM-dd' format and returns the adjusted date 
 * to the next business day if it falls on a weekend or holiday in Brazil.
 */
export function adjustDateToNextBusinessDay(dateStr: string): AdjustmentResult {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return { originalDate: dateStr, adjustedDate: dateStr, wasAdjusted: false };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  // Use 12:00:00 (midday) to prevent daylight saving time / timezone shifts
  const date = new Date(year, month, day, 12, 0, 0);
  let currentYear = date.getFullYear();
  let holidays = getBrazilianHolidays(currentYear);

  let wasAdjusted = false;
  const reasons: string[] = [];

  while (true) {
    const checkYear = date.getFullYear();
    if (checkYear !== currentYear) {
      currentYear = checkYear;
      holidays = getBrazilianHolidays(currentYear);
    }

    const formattedStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWk = dayOfWeek === 0 || dayOfWeek === 6;
    const holidayName = holidays[formattedStr];

    if (isWk || holidayName) {
      wasAdjusted = true;
      if (dayOfWeek === 6) {
        reasons.push('Sábado');
      } else if (dayOfWeek === 0) {
        reasons.push('Domingo');
      } else if (holidayName) {
        reasons.push(holidayName);
      }

      // Roll to next calendar day
      date.setDate(date.getDate() + 1);
    } else {
      break;
    }
  }

  const adjustedDate = format(date, 'yyyy-MM-dd');

  return {
    originalDate: dateStr,
    adjustedDate: adjustedDate,
    wasAdjusted: wasAdjusted,
    adjustmentReason: wasAdjusted
      ? `Dia de pagamento original (${format(parseISO(dateStr), 'dd/MM/yyyy')}) coincidia com ${reasons.join(' / ')}. Alterado automaticamente para o próximo dia útil.`
      : undefined
  };
}
