import { addMinutes, format } from 'date-fns'

export function toFixed(value: number, count?: number) {
  try {
    return Number(value.toFixed(count || 6)).toString()
  } catch (e) {
    return value
  }
}

export function toFloor(value: number | string | undefined | null) {
  if (value === undefined || value === null) return ''

  try {
    return Number(Math.floor(Number(value) * 100) / 100).toString()
  } catch (e) {
    return value
  }
}

export function formatValue(
  value: number | string | undefined,
  decimals = 0,
  count?: number
) {
  if (value === undefined) return ''
  try {
    // eslint-disable-next-line no-restricted-properties
    const parts = (+toFixed(Number(value) / Math.pow(10, decimals), count))
      .toString()
      .split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
  } catch (e) {
    return value
  }
}

export function formatDate(dateProp: string | Date, formatDate = 'MM/dd/yyyy hh:mm aa') {
  if (!dateProp) {
    return ''
  }

  const date = new Date(dateProp)
  // return format(addMinutes(date, date.getTimezoneOffset()), formatDate)
  return format(date, formatDate)
}

export function formatDateToTimeUtc(dateProp: string | number | Date) {
  if (!dateProp) {
    return ''
  }
  const date = new Date(dateProp)
  return format(addMinutes(date, date.getTimezoneOffset()), 'hh:mm aaaa')
}

export function formatValueWithToFixed(value: number, decimals = 2) {
  if (value === undefined) return ''
  try {
    const parts = toFixed(value, decimals).toString().split('.')

    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    if (parts[1].length === 1) parts[1] = `${parts[1]}0` // :shrug:
    return parts.join('.')
  } catch (e) {
    return value
  }
}

export function formatNumberToUSD(value: number, decimals = 2) {
  if (value === undefined) return ''
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
    })

    return formatter.format(value)
  } catch (e) {
    return value
  }
}
