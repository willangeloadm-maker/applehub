import { formatInTimeZone } from 'date-fns-tz';

const BRASILIA_TZ = 'America/Sao_Paulo';

/**
 * Formata uma data no timezone de Brasília
 * @param date - Data a ser formatada
 * @param format - Formato desejado (padrão date-fns)
 * @returns String formatada no horário de Brasília
 */
export const formatDateBrasilia = (
  date: Date | string | number,
  format: string = 'dd/MM/yyyy HH:mm:ss'
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatInTimeZone(dateObj, BRASILIA_TZ, format);
};

/**
 * Formata uma data apenas com data (sem hora) no timezone de Brasília
 */
export const formatDateOnlyBrasilia = (date: Date | string | number): string => {
  return formatDateBrasilia(date, 'dd/MM/yyyy');
};

/**
 * Formata uma data apenas com hora (sem data) no timezone de Brasília
 */
export const formatTimeOnlyBrasilia = (date: Date | string | number): string => {
  return formatDateBrasilia(date, 'HH:mm:ss');
};

/**
 * Formata uma data com data e hora no timezone de Brasília
 */
export const formatDateTimeBrasilia = (date: Date | string | number): string => {
  return formatDateBrasilia(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Formata uma data com data e hora completa no timezone de Brasília
 */
export const formatDateTimeFullBrasilia = (date: Date | string | number): string => {
  return formatDateBrasilia(date, 'dd/MM/yyyy HH:mm:ss');
};

/**
 * Formata uma data em formato ISO no timezone de Brasília
 */
export const formatDateISOBrasilia = (date: Date | string | number): string => {
  return formatDateBrasilia(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
};
