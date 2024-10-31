import { Theme } from '@mui/material/styles'

import { fontSourceCodePro } from './fonts'

export const getTypography = (baseTheme: Theme): any => {
  return {
    fontFamily: fontSourceCodePro,
    h2: {
      fontSize: 40,
      lineHeight: '100%',
      fontWeight: 700,

      [baseTheme.breakpoints.down('md')]: {
        fontSize: 28,
        lineHeight: 1.5,
      },
    },
    h3: {
      fontSize: 32,
      lineHeight: '38px',
      fontWeight: 700,

      [baseTheme.breakpoints.down('md')]: {
        fontSize: 25,
        lineHeight: 1.5,
      },
    },
    h4: {
      fontSize: 28,
      lineHeight: '34px',
      fontWeight: 700,

      [baseTheme.breakpoints.down('md')]: {
        fontSize: 20,
        lineHeight: 1.5,
      },
    },
    h5: {
      fontSize: 24,
      lineHeight: '28px',
      fontWeight: 600,

      [baseTheme.breakpoints.down('md')]: {
        fontSize: 18,
        lineHeight: 1.5,
      },
    },
    h6: {
      fontSize: 18,
      lineHeight: '22px',
      fontWeight: 700,
      textTransform: 'uppercase',

      [baseTheme.breakpoints.down('md')]: {
        fontSize: 14,
        lineHeight: 1.5,
      },
    },
    subtitle1: {
      fontSize: 12,
      lineHeight: '14px',
      fontWeight: 300,
    },
    subtitle2: {
      fontFamily: fontSourceCodePro,
      fontSize: 16,
      lineHeight: '18px',
      fontWeight: 500,
    },
    body1: {
      fontFamily: fontSourceCodePro,
      fontSize: 16,
      lineHeight: '22px',
      fontWeight: 400,

      [baseTheme.breakpoints.down('sm')]: {
        fontSize: 14,
        lineHeight: 1.5,
      },
    },
    body2: {
      fontSize: 12,
      lineHeight: '14px',
      fontWeight: 600,
    },
  }
}
